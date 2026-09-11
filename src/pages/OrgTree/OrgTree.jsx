// Org Tree canvas — super_admin sees the full tenant tree; sales_manager
// sees the chain they're part of (managers above + counsellors below).
// Counsellors are blocked at the route layer.
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Background, Controls, Handle, MarkerType, MiniMap, Position,
  ReactFlow, ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Alert, AlertTitle, Box, Chip, Drawer, IconButton, Snackbar, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../../lib/endpoints';

// Full-institute tiers: owner → branch → department leads → team leads →
// front-line staff. Sales, Accounts, Training, HR and Placement all sit under
// the branch tier.
//
// The front line splits three ways under a sales manager: counsellors report
// to the sales manager directly, while telecallers report to a telecaller
// lead, who sits one tier below the sales manager. Hence tier 4 — telecallers
// are the only role that hangs off a tier-3 node.
const ROLE_TIER = {
  super_admin: 0,
  branch_manager: 1,
  sales_manager: 2, account_manager: 2, head_trainer: 2, hr: 2, placement: 2,
  counsellor: 3, trainer: 3, telecaller_lead: 3, qa: 3,
  telecaller: 4,
};
const ROLE_COLOR = {
  super_admin: '#E53935',
  branch_manager: '#8e24aa',
  sales_manager: '#1976d2',
  account_manager: '#0891b2',
  head_trainer: '#c2410c',
  hr: '#0d9488',
  placement: '#7c3aed',
  counsellor: '#2e7d32',
  trainer: '#ea580c',
  // Telecalling pair — teal family, so it reads as its own branch of the org
  // next to the green counsellor line.
  telecaller_lead: '#0369a1',
  telecaller: '#0ea5e9',
  qa: '#64748b',
};
const ROLE_LABEL = {
  super_admin: 'Super Admin',
  branch_manager: 'Branch Manager',
  sales_manager: 'Sales Manager',
  account_manager: 'Accounts',
  head_trainer: 'Head Trainer',
  hr: 'HR',
  placement: 'Placement',
  counsellor: 'Counsellor',
  trainer: 'Trainer',
  telecaller_lead: 'Telecaller Lead',
  telecaller: 'Telecaller',
  qa: 'QA',
};

// The legend chips across the top. Each maps to the set of roles it stands
// for, so clicking one can flash exactly those cards. "Manager" is the tier-2
// bucket (sales manager + the sibling department heads) rather than a single
// role, which is why this is an explicit list and not derived from ROLE_LABEL.
const LEGEND = [
  { key: 'super_admin', label: 'Super admin', bg: '#fee2e2', fg: '#E53935', roles: ['super_admin'] },
  { key: 'branch_manager', label: 'Branch mgr', bg: '#f3e5f5', fg: '#8e24aa', roles: ['branch_manager'] },
  { key: 'manager', label: 'Manager', bg: '#dbeafe', fg: '#1976d2', roles: ['sales_manager'] },
  { key: 'counsellor', label: 'Counsellor', bg: '#dcfce7', fg: '#2e7d32', roles: ['counsellor'] },
  { key: 'telecaller_lead', label: 'Telecaller lead', bg: '#e0f2fe', fg: '#0369a1', roles: ['telecaller_lead'] },
  { key: 'telecaller', label: 'Telecaller', bg: '#f0f9ff', fg: '#0ea5e9', roles: ['telecaller'] },
];

// How long a legend click keeps the matching cards lit.
const HIGHLIGHT_MS = 3000;

// Tier-based layout: place each role tier on its own horizontal row,
// spread members evenly along the X axis. Good enough for normal team
// sizes; for >50 nodes per tier we'd switch to dagre, but simpler is fine
// for the Stage 3 release.
// Deepest tier any role maps to, so the bucket set grows with ROLE_TIER
// instead of being hardcoded — a role added at a new depth used to land in an
// undefined bucket and throw.
const MAX_TIER = Math.max(...Object.values(ROLE_TIER));

const layout = (rawNodes, rawEdges) => {
  const buckets = {};
  for (let t = 0; t <= MAX_TIER; t += 1) buckets[t] = [];
  for (const n of rawNodes) {
    // Unknown role (a genuine custom role) → drop it on the front-line row.
    const tier = ROLE_TIER[n.role] ?? MAX_TIER;
    buckets[tier].push(n);
  }
  const ROW_GAP = 180;
  const COL_GAP = 240;
  const nodes = [];
  Object.entries(buckets).forEach(([tier, list]) => {
    const tierNum = Number(tier);
    list.forEach((u, idx) => {
      const x = idx * COL_GAP - ((list.length - 1) * COL_GAP) / 2;
      nodes.push({
        id: u.id,
        position: { x, y: tierNum * ROW_GAP },
        data: u,
        type: 'orgNode',
        // sourceHandle / targetHandle defaults are top↔bottom which is
        // exactly what we want for a top-down hierarchy.
      });
    });
  });

  const edges = rawEdges.map((e, i) => ({
    id: `e-${e.user_id}-${e.manager_id}-${i}`,
    source: e.manager_id,
    target: e.user_id,
    type: 'smoothstep',
    animated: false,
    pathOptions: { borderRadius: 16, offset: 20 },
    style: { stroke: '#cbd5e1', strokeWidth: 2 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#cbd5e1',
      width: 14,
      height: 14,
    },
  }));
  return { nodes, edges };
};

// Custom card. Handles are required for xyflow to know where edges attach;
// without them edges silently fail to render. We use top=target, bottom=source
// so a top-down hierarchy hooks up cleanly. The handles themselves are
// invisible — we only want their position, not the dot.
const handleStyle = { width: 1, height: 1, background: 'transparent', border: 'none' };

const OrgNode = ({ data, selected }) => {
  const color = ROLE_COLOR[data.role] || '#666';
  // `highlighted` is set for ~3s when the matching legend chip is clicked.
  // It borrows the selected styling and adds a ring + lift so a whole role
  // reads as one group at a glance, then fades back on its own.
  const lit = data.highlighted;
  const active = selected || lit;
  return (
    <div
      style={{
        background: lit ? `${color}0c` : '#fff',
        border: `2px solid ${active ? color : '#e2e8f0'}`,
        borderRadius: 12,
        padding: '12px 16px',
        minWidth: 200,
        boxShadow: lit
          ? `0 0 0 4px ${color}33, 0 10px 28px ${color}40`
          : selected
            ? `0 8px 24px ${color}33, 0 2px 6px rgba(15,23,42,0.06)`
            : '0 4px 12px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
        cursor: 'pointer',
        // Dim everything that is NOT part of the highlighted set, so the group
        // stands out instead of merely being brighter.
        opacity: data.dimmed ? 0.35 : 1,
        transform: lit ? 'scale(1.04)' : 'scale(1)',
        transition: 'box-shadow 0.25s, transform 0.25s, opacity 0.25s, border-color 0.25s, background 0.25s',
      }}
    >
      <Handle type="target" position={Position.Top} style={handleStyle} isConnectable={false} />
      <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {data.name || data.email}
      </div>
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
        {data.designation || data.email}
      </div>
      <div style={{ marginTop: 6, display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, fontWeight: 600, color, background: `${color}15`, padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase' }}>
          {ROLE_LABEL[data.role] || data.role}
        </span>
        {data.branch_name && (
          <span style={{ fontSize: 10, fontWeight: 600, color: '#475569', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
            {data.branch_name}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={handleStyle} isConnectable={false} />
    </div>
  );
};

const nodeTypes = { orgNode: OrgNode };

export default function OrgTree() {
  const navigate = useNavigate();
  const [raw, setRaw] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  // Which legend chip is currently flashing its group (null = none).
  const [litKey, setLitKey] = useState(null);
  const litTimer = useRef(null);

  // Flash every card of a role group for HIGHLIGHT_MS, then clear. Clicking
  // the same chip again toggles it off; clicking another switches immediately
  // (the previous timer is cancelled so it can't clear the new highlight).
  const flashRole = (key) => {
    if (litTimer.current) clearTimeout(litTimer.current);
    setLitKey((prev) => {
      const next = prev === key ? null : key;
      if (next) {
        litTimer.current = setTimeout(() => setLitKey(null), HIGHLIGHT_MS);
      }
      return next;
    });
  };

  // Don't leave a timer running against an unmounted component.
  useEffect(() => () => { if (litTimer.current) clearTimeout(litTimer.current); }, []);

  const reload = () => {
    setLoading(true); setErr('');
    usersApi.orgTree()
      .then((r) => setRaw(r?.data || { nodes: [], edges: [] }))
      .catch((e) => setErr(e.message || 'Failed to load org tree'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);

  const base = useMemo(() => layout(raw.nodes, raw.edges), [raw]);

  // Re-stamp the laid-out nodes with the highlight flags. Kept separate from
  // `layout` so flashing a group never recomputes positions (which would make
  // the whole tree jump).
  const { nodes, edges } = useMemo(() => {
    if (!litKey) return base;
    const roles = new Set(LEGEND.find((l) => l.key === litKey)?.roles || []);
    return {
      edges: base.edges,
      nodes: base.nodes.map((n) => {
        const hit = roles.has(n.data?.role);
        return { ...n, data: { ...n.data, highlighted: hit, dimmed: !hit } };
      }),
    };
  }, [base, litKey]);

  const tierCounts = useMemo(() => {
    const c = {};
    for (const n of raw.nodes) c[n.role] = (c[n.role] || 0) + 1;
    return c;
  }, [raw]);
  // A compact "N Label · M Label" summary across every role actually present,
  // ordered by tier then label.
  // Structural gaps come from the API (/users/org-tree -> gaps), computed from
  // EXPECTED_SUPERVISOR against the real reporting edges. Deliberately NOT
  // re-derived here: the server already knows the visible scope and the role
  // hierarchy, and duplicating the rule in the client is how the two drift.
  const orgGaps = useMemo(() => raw.gaps || [], [raw]);

  // Surface the gaps as a toast as well as inline text: the inline line is
  // easy to scroll past, and the people who can act on this (branch manager /
  // admin) are exactly the ones who open this page.
  //
  // Derived rather than set from an effect: we remember which gap set the user
  // dismissed, and the toast is open whenever the CURRENT set differs from it.
  // So a refresh that still has gaps re-opens it, a re-render does not, and
  // there is no setState-in-effect cascade.
  const gapKey = orgGaps.map((g) => `${g.code}:${g.role}:${g.count}`).join('|');
  const [dismissedGapKey, setDismissedGapKey] = useState(null);
  const gapToastOpen = !!gapKey && gapKey !== dismissedGapKey;

  const summary = useMemo(() => Object.entries(tierCounts)
    .filter(([, n]) => n > 0)
    .sort((a, b) => (ROLE_TIER[a[0]] ?? MAX_TIER) - (ROLE_TIER[b[0]] ?? MAX_TIER))
    .map(([role, n]) => `${n} ${ROLE_LABEL[role] || role}`)
    .join(' · '), [tierCounts]);

  return (
    <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, borderBottom: '1px solid #e5e7eb' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>Org Tree</Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
            {summary || 'No staff yet'}
          </Typography>
          {orgGaps.map((g) => (
            <Typography key={`${g.code}-${g.role}`} variant="body2" sx={{ color: '#b45309', mt: 0.5, fontSize: 13 }}>
              ⚠ {g.message}
              {g.members?.length ? ` — ${g.members.slice(0, 3).join(', ')}${g.count > 3 ? ` +${g.count - 3} more` : ''}` : ''}
            </Typography>
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {LEGEND.map((l) => {
            const count = raw.nodes.filter((n) => l.roles.includes(n.role)).length;
            const on = litKey === l.key;
            return (
              <Chip
                key={l.key}
                label={l.label}
                size="small"
                onClick={() => flashRole(l.key)}
                disabled={count === 0}
                title={count ? `Highlight ${count} ${l.label.toLowerCase()}${count === 1 ? '' : 's'}` : `No ${l.label.toLowerCase()} in this tree`}
                sx={{
                  background: l.bg,
                  color: l.fg,
                  fontWeight: 600,
                  cursor: count ? 'pointer' : 'default',
                  // Ring the active chip so it's obvious which group is lit.
                  boxShadow: on ? `0 0 0 2px ${l.fg}` : 'none',
                  transition: 'box-shadow 0.2s, opacity 0.2s',
                  '&:hover': { background: l.bg, opacity: count ? 0.85 : 1 },
                }}
              />
            );
          })}
          <IconButton size="small" onClick={reload} title="Refresh"><RefreshIcon /></IconButton>
        </Box>
      </Box>

      {err && <div style={{ color: '#d32f2f', padding: 16 }}>{err}</div>}

      <Box sx={{ flex: 1, position: 'relative', background: '#f8fafc' }}>
        {loading ? (
          <Box sx={{ p: 4, color: '#64748b' }}>Loading…</Box>
        ) : raw.nodes.length === 0 ? (
          <Box sx={{ p: 4, color: '#64748b' }}>No users in your scope yet.</Box>
        ) : (
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              onNodeClick={(_e, n) => setSelectedNode(n.data)}
              onPaneClick={() => setSelectedNode(null)}
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={16} size={1} color="#e2e8f0" />
              <Controls showInteractive={false} />
              <MiniMap nodeColor={(n) => ROLE_COLOR[n.data?.role] || '#888'} maskColor="rgba(241,245,249,0.7)" />
            </ReactFlow>
          </ReactFlowProvider>
        )}
      </Box>

      <Drawer anchor="right" open={!!selectedNode} onClose={() => setSelectedNode(null)}>
        {selectedNode && (
          <Box sx={{ width: 360, p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>{selectedNode.name || selectedNode.email}</Typography>
                <Chip
                  label={ROLE_LABEL[selectedNode.role] || selectedNode.role}
                  size="small"
                  sx={{ mt: 1, background: `${ROLE_COLOR[selectedNode.role]}15`, color: ROLE_COLOR[selectedNode.role], fontWeight: 600 }}
                />
              </Box>
              <IconButton size="small" onClick={() => setSelectedNode(null)}><CloseIcon /></IconButton>
            </Box>
            <Box sx={{ mt: 3, fontSize: 14 }}>
              <Row label="Email" value={selectedNode.email} />
              {selectedNode.designation && <Row label="Designation" value={selectedNode.designation} />}
              <Row label="Branch" value={selectedNode.branch_name || '—'} />
              <Row label="Status" value={selectedNode.is_active ? 'Active' : 'Inactive'} />
            </Box>
            <Box sx={{ mt: 3 }}>
              <button
                onClick={() => navigate(`/users/${selectedNode.id}`)}
                style={{ background: '#E53935', color: '#fff', border: 'none', padding: '10px 14px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, width: '100%' }}
              >
                Open user profile
              </button>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* Org structure warning. Stays until dismissed rather than auto-hiding:
          this is a "go fix your org" message, not a confirmation, and the
          affected names are worth reading. */}
      <Snackbar
        open={gapToastOpen && orgGaps.length > 0}
        onClose={(_e, reason) => { if (reason !== 'clickaway') setDismissedGapKey(gapKey); }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="warning" variant="filled" onClose={() => setDismissedGapKey(gapKey)} sx={{ maxWidth: 460 }}>
          <AlertTitle sx={{ fontWeight: 700 }}>
            {orgGaps.length === 1 ? 'Org structure gap' : `${orgGaps.length} org structure gaps`}
          </AlertTitle>
          {orgGaps.map((g) => (
            <div key={`${g.code}-${g.role}`} style={{ fontSize: 13, marginTop: 2 }}>
              • {g.message}
              {g.members?.length ? (
                <div style={{ fontSize: 12, opacity: 0.9, paddingLeft: 10 }}>
                  {g.members.slice(0, 3).join(', ')}{g.count > 3 ? ` +${g.count - 3} more` : ''}
                </div>
              ) : null}
            </div>
          ))}
          <div style={{ fontSize: 12, marginTop: 6, opacity: 0.95 }}>
            Fix in Advanced Settings → Users &amp; Roles (Switch Role / Reporting To).
          </div>
        </Alert>
      </Snackbar>
    </Box>
  );
}

const Row = ({ label, value }) => (
  <Box sx={{ display: 'flex', py: 1, borderBottom: '1px solid #f1f5f9' }}>
    <span style={{ minWidth: 110, color: '#64748b', fontSize: 13 }}>{label}</span>
    <span style={{ flex: 1, fontSize: 13 }}>{value}</span>
  </Box>
);
