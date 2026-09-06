// Org Tree canvas — super_admin sees the full tenant tree; sales_manager
// sees the chain they're part of (managers above + counsellors below).
// Counsellors are blocked at the route layer.
import { useEffect, useMemo, useState } from 'react';
import {
  Background, Controls, Handle, MarkerType, MiniMap, Position,
  ReactFlow, ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box, Chip, Drawer, IconButton, Typography } from '@mui/material';
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
  return (
    <div
      style={{
        background: '#fff',
        border: `2px solid ${selected ? color : '#e2e8f0'}`,
        borderRadius: 12,
        padding: '12px 16px',
        minWidth: 200,
        boxShadow: selected
          ? `0 8px 24px ${color}33, 0 2px 6px rgba(15,23,42,0.06)`
          : '0 4px 12px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
        cursor: 'pointer',
        transition: 'all 0.15s',
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

  const reload = () => {
    setLoading(true); setErr('');
    usersApi.orgTree()
      .then((r) => setRaw(r?.data || { nodes: [], edges: [] }))
      .catch((e) => setErr(e.message || 'Failed to load org tree'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);

  const { nodes, edges } = useMemo(() => layout(raw.nodes, raw.edges), [raw]);

  const tierCounts = useMemo(() => {
    const c = {};
    for (const n of raw.nodes) c[n.role] = (c[n.role] || 0) + 1;
    return c;
  }, [raw]);
  // A compact "N Label · M Label" summary across every role actually present,
  // ordered by tier then label.
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
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip label="Super admin" size="small" sx={{ background: '#fee2e2', color: '#E53935', fontWeight: 600 }} />
          <Chip label="Branch mgr" size="small" sx={{ background: '#f3e5f5', color: '#8e24aa', fontWeight: 600 }} />
          <Chip label="Manager" size="small" sx={{ background: '#dbeafe', color: '#1976d2', fontWeight: 600 }} />
          <Chip label="Counsellor" size="small" sx={{ background: '#dcfce7', color: '#2e7d32', fontWeight: 600 }} />
          <Chip label="Telecaller lead" size="small" sx={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 600 }} />
          <Chip label="Telecaller" size="small" sx={{ background: '#f0f9ff', color: '#0ea5e9', fontWeight: 600 }} />
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
    </Box>
  );
}

const Row = ({ label, value }) => (
  <Box sx={{ display: 'flex', py: 1, borderBottom: '1px solid #f1f5f9' }}>
    <span style={{ minWidth: 110, color: '#64748b', fontSize: 13 }}>{label}</span>
    <span style={{ flex: 1, fontSize: 13 }}>{value}</span>
  </Box>
);
