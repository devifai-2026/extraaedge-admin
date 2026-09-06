// Lead Distribution — route incoming leads to a named person or a named group,
// per acquisition channel.
//
//   "WhatsApp                        -> Person X"
//   "WhatsApp + Facebook + Instagram -> Person Z + Person B"
//
// Each row is a POOL: one or more origins, plus the people who should receive
// those leads. Pools are checked in priority order BEFORE the tenant-wide
// assignment rule, so a lead whose channel isn't claimed by any pool still
// falls through to the existing round-robin. This is the JustDial assignment
// pattern generalised — see extraaedge-server/src/modules/lead-routing.
import { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Button, Alert, CircularProgress, Paper, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Autocomplete, Switch, Tooltip, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import { leadRoutingApi, usersApi, dropdownsApi } from '../../lib/endpoints';
import { isRole, ROLES, LEAD_OWNER_ROLES_PARAM } from '../../lib/rbac';

// Keep in sync with LEAD_ORIGINS in extraaedge-server/src/lib/leadOrigin.js.
// The server also serves this list at GET /lead-routing-pools/origins; we
// fetch it and fall back to this so the page still renders if that call fails.
const FALLBACK_ORIGINS = ['whatsapp', 'instagram', 'facebook', 'justdial', 'website'];
const ORIGIN_META = {
  whatsapp: { label: 'WhatsApp', color: '#25D366' },
  instagram: { label: 'Instagram', color: '#E1306C' },
  facebook: { label: 'Facebook', color: '#1877F2' },
  justdial: { label: 'JustDial', color: '#F26722' },
  website: { label: 'Website', color: '#5C6BC0' },
};
const originLabel = (o) => ORIGIN_META[o]?.label || o;
const originColor = (o) => ORIGIN_META[o]?.color || '#64748b';

const STRATEGY_LABEL = {
  load_balanced: 'Load balanced (fewest leads from this channel wins)',
  round_robin: 'Round robin (strict rotation through the list)',
};

const blankPool = () => ({
  name: '',
  origins: [],
  source_names: [],
  member_ids: [],
  strategy: 'load_balanced',
  priority: 100,
  is_active: true,
});

export default function LeadDistribution() {
  const canManage = isRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [pools, setPools] = useState([]);
  const [owners, setOwners] = useState([]);
  const [origins, setOrigins] = useState(FALLBACK_ORIGINS);
  // The tenant's own source + channel names, for pools that route by the
  // marketing vocabulary rather than a built-in channel (e.g. "Social Media").
  const [sourceNames, setSourceNames] = useState([]);
  const [editing, setEditing] = useState(null); // pool object or blankPool()
  const [deleting, setDeleting] = useState(null);

  // Bumped to re-run the fetch after a save/delete. Nothing setStates
  // synchronously in the effect body — the writes all land after the await.
  const [reloadKey, setReloadKey] = useState(0);
  const load = () => setReloadKey((v) => v + 1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [p, u, o, src, ch] = await Promise.allSettled([
        leadRoutingApi.list(),
        usersApi.list({ role: LEAD_OWNER_ROLES_PARAM, limit: 200 }),
        leadRoutingApi.origins(),
        dropdownsApi.sources(),
        dropdownsApi.channels(),
      ]);
      if (cancelled) return;
      setPools(p.value?.data || []);
      setOwners((u.value?.data || []).filter((x) => x.is_active !== false));
      if (Array.isArray(o.value?.data) && o.value.data.length) setOrigins(o.value.data);
      // Sources and channels are matched the same way server-side, so offer
      // both in one list and de-duplicate.
      const names = [...(src.value?.data || []), ...(ch.value?.data || [])]
        .map((r) => r?.name).filter(Boolean);
      setSourceNames([...new Set(names)].sort((a, b) => a.localeCompare(b)));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [reloadKey]);

  const ownerById = useMemo(
    () => new Map(owners.map((u) => [u.id, u])),
    [owners],
  );

  const save = async (form) => {
    setMsg(null);
    const body = {
      name: form.name.trim(),
      origins: form.origins,
      source_names: form.source_names,
      member_ids: form.member_ids,
      strategy: form.strategy,
      priority: Number(form.priority) || 100,
      is_active: form.is_active,
    };
    if (form.id) await leadRoutingApi.update(form.id, body);
    else await leadRoutingApi.create(body);
    setEditing(null);
    setMsg({ severity: 'success', text: 'Saved.' });
    load();
  };

  const toggleActive = async (pool) => {
    try {
      await leadRoutingApi.update(pool.id, { is_active: !pool.is_active });
      load();
    } catch (e) {
      setMsg({ severity: 'error', text: e?.message || 'Could not update' });
    }
  };

  const confirmDelete = async () => {
    try {
      await leadRoutingApi.delete(deleting.id);
      setDeleting(null);
      setMsg({ severity: 'success', text: 'Pool removed. Existing leads keep their owner.' });
      load();
    } catch (e) {
      setMsg({ severity: 'error', text: e?.message || 'Could not remove' });
    }
  };

  if (!canManage) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Only a super admin or branch manager can configure lead distribution.</Alert>
      </Box>
    );
  }
  if (loading) return <Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3, maxWidth: 900 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <CallSplitIcon sx={{ color: '#7c3aed' }} />
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Lead Distribution</Typography>
      </Box>
      <Typography color="text.secondary" sx={{ mb: 2, fontSize: 14 }}>
        Send leads from a channel to specific people. Pick one name or several —
        with several, leads rotate among them. Pools are checked top to bottom by
        priority; anything not claimed by a pool falls through to your
        Assignment Rule.
      </Typography>

      {msg && <Alert severity={msg.severity} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      <Button
        variant="contained" startIcon={<AddIcon />} onClick={() => setEditing(blankPool())}
        sx={{ mb: 2, background: '#7c3aed', '&:hover': { background: '#6d28d9' }, textTransform: 'none' }}
      >
        New distribution rule
      </Button>

      {pools.length === 0 && (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', color: '#64748b' }}>
          No distribution rules yet — every lead goes through your Assignment Rule.
        </Paper>
      )}

      {pools.map((p) => {
        const members = (p.member_ids || []).map((id) => ownerById.get(id)).filter(Boolean);
        const missing = (p.member_ids || []).length - members.length;
        return (
          <Paper key={p.id} variant="outlined" sx={{ p: 2, mb: 1.5, opacity: p.is_active ? 1 : 0.6 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography sx={{ fontWeight: 600 }}>{p.name}</Typography>
                  <Chip size="small" label={`Priority ${p.priority}`} sx={{ background: '#f1f5f9' }} />
                  {p.total_assignments > 0 && (
                    <Chip size="small" label={`${p.total_assignments} assigned`} sx={{ background: '#f1f5f9' }} />
                  )}
                </Box>

                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                  {(p.origins || []).map((o) => (
                    <Chip
                      key={o} size="small" label={originLabel(o)}
                      sx={{ background: `${originColor(o)}18`, color: originColor(o), fontWeight: 600 }}
                    />
                  ))}
                  {(p.source_names || []).map((n) => (
                    <Chip key={`s-${n}`} size="small" label={n} sx={{ background: '#f1f5f9', color: '#334155', fontWeight: 600 }} />
                  ))}
                  <Box sx={{ alignSelf: 'center', color: '#94a3b8', px: 0.5 }}>→</Box>
                  {members.map((m) => (
                    <Chip key={m.id} size="small" label={m.name || m.email} sx={{ background: '#ede9fe', color: '#5b21b6' }} />
                  ))}
                  {members.length === 0 && (
                    <Chip size="small" label="No eligible members — falls through" sx={{ background: '#fef3c7', color: '#92400e' }} />
                  )}
                </Box>

                {missing > 0 && (
                  <Typography sx={{ fontSize: 12, color: '#b45309', mt: 0.75 }}>
                    {missing} listed member(s) can no longer receive leads (deactivated, or
                    moved to a role that doesn&apos;t own leads). They&apos;re skipped, not removed.
                  </Typography>
                )}
                <Typography sx={{ fontSize: 12, color: '#64748b', mt: 0.5 }}>
                  {STRATEGY_LABEL[p.strategy] || p.strategy}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Tooltip title={p.is_active ? 'Active' : 'Paused'}>
                  <Switch size="small" checked={Boolean(p.is_active)} onChange={() => toggleActive(p)} />
                </Tooltip>
                <IconButton size="small" onClick={() => setEditing(p)} sx={{ color: '#1565C0' }}>
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => setDeleting(p)} sx={{ color: '#dc2626' }}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          </Paper>
        );
      })}

      <PoolEditor
        pool={editing}
        owners={owners}
        origins={origins}
        sourceNames={sourceNames}
        onClose={() => setEditing(null)}
        onSave={save}
      />

      <Dialog open={Boolean(deleting)} onClose={() => setDeleting(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#dc2626', fontWeight: 700 }}>Remove “{deleting?.name}”?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: '#555' }}>
            New leads from {[...(deleting?.origins || []).map(originLabel), ...(deleting?.source_names || [])].join(', ') || 'these channels'} will
            fall through to your Assignment Rule instead. Leads already assigned keep their owner.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmDelete}>Remove</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function PoolEditor({ pool, owners, origins, sourceNames, onClose, onSave }) {
  const [form, setForm] = useState(blankPool());
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pool) return;
    setForm({ ...blankPool(), ...pool });
    setErr('');
  }, [pool]);

  if (!pool) return null;

  const selectedOwners = owners.filter((u) => (form.member_ids || []).includes(u.id));

  const submit = async () => {
    if (!form.name.trim()) { setErr('Give the rule a name'); return; }
    if (!form.origins.length && !form.source_names.length) {
      setErr('Pick at least one channel or source — a rule with none can never match a lead');
      return;
    }
    setBusy(true); setErr('');
    try {
      await onSave(form);
    } catch (e) {
      setErr(e?.message || 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {form.id ? 'Edit distribution rule' : 'New distribution rule'}
      </DialogTitle>
      <DialogContent>
        <TextField
          fullWidth size="small" margin="dense" label="Name *"
          placeholder="e.g. Social leads"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <Autocomplete
          multiple size="small"
          options={origins}
          getOptionLabel={originLabel}
          value={form.origins}
          onChange={(_e, picked) => setForm({ ...form, origins: picked })}
          renderInput={(params) => (
            <TextField
              {...params} margin="dense" label="Channels"
              helperText="Leads arriving through any of these go to the people below."
            />
          )}
        />

        <Autocomplete
          multiple freeSolo size="small"
          options={sourceNames || []}
          value={form.source_names || []}
          onChange={(_e, picked) => setForm({ ...form, source_names: picked })}
          renderInput={(params) => (
            <TextField
              {...params} margin="dense" label="…or your own sources"
              helperText={'Matches the lead\'s Source or Channel text exactly (case-insensitive). Use this for values the channels above don\'t cover — e.g. "Social Media".'}
            />
          )}
        />

        <Autocomplete
          multiple size="small"
          options={owners}
          getOptionLabel={(o) => `${o.name || o.email}${o.role ? ` (${o.role})` : ''}`}
          isOptionEqualToValue={(o, v) => o.id === (v?.id ?? v)}
          value={selectedOwners}
          onChange={(_e, picked) => setForm({ ...form, member_ids: picked.map((u) => u.id) })}
          renderInput={(params) => (
            <TextField
              {...params} margin="dense" label="Assign to"
              helperText="One name sends every lead to them; several rotate. Counsellors and telecallers only — manager roles don't carry leads."
            />
          )}
        />

        <Divider sx={{ my: 1.5 }} />

        <TextField
          select fullWidth size="small" margin="dense" label="How to spread them"
          value={form.strategy}
          onChange={(e) => setForm({ ...form, strategy: e.target.value })}
        >
          {Object.entries(STRATEGY_LABEL).map(([v, label]) => (
            <MenuItem key={v} value={v}>{label}</MenuItem>
          ))}
        </TextField>

        <TextField
          fullWidth size="small" margin="dense" type="number" label="Priority"
          value={form.priority}
          onChange={(e) => setForm({ ...form, priority: e.target.value })}
          helperText="Lower wins. Put a narrow rule (one channel) above a broad one so it gets first claim."
        />

        {err && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 12 }}>{err}</div>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
