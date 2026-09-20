// Bulk reassign a selection of leads across MANY people at once.
//
// Two modes, both ending in an even spread (server: leads/service.distributeLeads):
//   • Round-robin — every ACTIVE COUNSELLOR in the chosen branch. Counsellors
//     only, by product decision: telecallers never receive leads from an
//     automatic spread, only from an explicit pick.
//   • Pick people — whoever is ticked, counsellors and telecallers together.
//
// The server re-validates every target (active, not deleted, a lead-owner
// role), so this dialog is convenience, not a security boundary.
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
  RadioGroup, FormControlLabel, Radio, TextField, MenuItem, Checkbox, Chip,
  Autocomplete, Alert, CircularProgress, Divider,
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/GroupsOutlined';
import { leadsApi, usersApi, branchesApi } from '../../lib/endpoints';
import { LEAD_OWNER_ROLES_PARAM, ROLES } from '../../lib/rbac';

const DistributeLeadsDialog = ({ open, leadIds = [], onClose, onDone }) => {
  const [mode, setMode] = useState('round_robin');
  const [branchId, setBranchId] = useState('');
  const [picked, setPicked] = useState([]);
  const [reason, setReason] = useState('');
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    setErr('');
    setLoading(true);
    Promise.all([
      usersApi.list({ role: LEAD_OWNER_ROLES_PARAM, limit: 500 }).then((r) => r?.data || []).catch(() => []),
      branchesApi.list().then((r) => r?.data || []).catch(() => []),
    ])
      .then(([u, b]) => { setUsers(u); setBranches(b); })
      .finally(() => setLoading(false));
  }, [open]);

  // Counsellors in the chosen branch — the exact pool the server will build
  // for round-robin, so the preview cannot disagree with what happens.
  const rrPool = useMemo(
    () => users.filter((u) => u.role === ROLES.COUNSELLOR && u.branch_id === branchId && u.is_active !== false),
    [users, branchId],
  );

  const poolSize = mode === 'round_robin' ? rrPool.length : picked.length;
  // Even split, remainder dealt one-per-person from the top.
  const per = poolSize ? Math.floor(leadIds.length / poolSize) : 0;
  const remainder = poolSize ? leadIds.length % poolSize : 0;

  const reset = () => {
    setMode('round_robin'); setBranchId(''); setPicked([]); setReason(''); setErr('');
  };
  const handleClose = () => { reset(); onClose?.(); };

  const submit = async () => {
    setErr('');
    if (mode === 'round_robin' && !branchId) { setErr('Pick a branch to round-robin within'); return; }
    if (mode === 'round_robin' && !rrPool.length) { setErr('That branch has no active counsellors'); return; }
    if (mode === 'manual' && !picked.length) { setErr('Pick at least one person'); return; }
    setBusy(true);
    try {
      const r = await leadsApi.distribute({
        lead_ids: leadIds,
        mode,
        ...(mode === 'round_robin' ? { branch_id: branchId } : { assignee_ids: picked.map((u) => u.id) }),
        reason: reason || undefined,
      });
      const n = r?.data?.affected ?? 0;
      reset();
      onDone?.(`Reassigned ${n} lead${n === 1 ? '' : 's'} across ${poolSize} ${poolSize === 1 ? 'person' : 'people'}`);
    } catch (e) {
      setErr(e?.message || 'Reassign failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 17, fontWeight: 700 }}>
        <GroupsIcon sx={{ color: '#E87B2F' }} />
        Reassign {leadIds.length} lead{leadIds.length === 1 ? '' : 's'}
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress size={28} /></Box>
        ) : (
          <>
            <RadioGroup value={mode} onChange={(e) => { setMode(e.target.value); setErr(''); }}>
              <FormControlLabel
                value="round_robin"
                control={<Radio size="small" />}
                label={(
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Round-robin across a branch</Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#64748b' }}>
                      Split evenly between every active counsellor in that branch. Telecallers are not included.
                    </Typography>
                  </Box>
                )}
              />
              {mode === 'round_robin' && (
                <Box sx={{ pl: 4, pb: 1.5 }}>
                  <TextField
                    select size="small" fullWidth label="Branch"
                    value={branchId} onChange={(e) => setBranchId(e.target.value)}
                  >
                    {branches.map((b) => (
                      <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                    ))}
                  </TextField>
                  {branchId && (
                    <Typography sx={{ fontSize: 12.5, color: rrPool.length ? '#64748b' : '#dc2626', mt: 0.75 }}>
                      {rrPool.length
                        ? `${rrPool.length} counsellor${rrPool.length === 1 ? '' : 's'}: ${rrPool.map((u) => u.name || u.email).join(', ')}`
                        : 'No active counsellors in this branch.'}
                    </Typography>
                  )}
                </Box>
              )}

              <FormControlLabel
                value="manual"
                control={<Radio size="small" />}
                label={(
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Pick people</Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#64748b' }}>
                      Split evenly between the counsellors and telecallers you choose.
                    </Typography>
                  </Box>
                )}
              />
              {mode === 'manual' && (
                <Box sx={{ pl: 4, pb: 1 }}>
                  <Autocomplete
                    multiple disableCloseOnSelect size="small"
                    options={users}
                    value={picked}
                    onChange={(_e, v) => setPicked(v)}
                    getOptionLabel={(o) => o.name || o.email || ''}
                    isOptionEqualToValue={(o, v) => o.id === v.id}
                    groupBy={(o) => (o.role === ROLES.COUNSELLOR ? 'Counsellors' : 'Telecallers')}
                    renderOption={(props, option, { selected }) => (
                      <li {...props} key={option.id}>
                        <Checkbox size="small" checked={selected} sx={{ mr: 1 }} />
                        <Box>
                          <Typography sx={{ fontSize: 13.5 }}>{option.name || option.email}</Typography>
                          <Typography sx={{ fontSize: 11.5, color: '#94a3b8' }}>
                            {String(option.role || '').replace('_', ' ')}
                          </Typography>
                        </Box>
                      </li>
                    )}
                    renderTags={(value, getTagProps) => value.map((o, i) => (
                      <Chip size="small" label={o.name || o.email} {...getTagProps({ index: i })} key={o.id} />
                    ))}
                    renderInput={(p) => <TextField {...p} label="Assign to" placeholder="Search people…" />}
                  />
                </Box>
              )}
            </RadioGroup>

            <Divider sx={{ my: 1.5 }} />

            <TextField
              size="small" fullWidth label="Reason (optional)"
              value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Why are these being moved?"
            />

            {poolSize > 0 && (
              <Alert severity="info" sx={{ mt: 2, fontSize: 13 }}>
                {leadIds.length} lead{leadIds.length === 1 ? '' : 's'} across {poolSize}{' '}
                {poolSize === 1 ? 'person' : 'people'} — about {per}
                {remainder ? `–${per + 1}` : ''} each.
              </Alert>
            )}
            {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button
          variant="contained" onClick={submit}
          disabled={busy || loading || !poolSize}
          sx={{ textTransform: 'none', bgcolor: '#E87B2F' }}
        >
          {busy ? 'Reassigning…' : `Reassign ${leadIds.length}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DistributeLeadsDialog;
