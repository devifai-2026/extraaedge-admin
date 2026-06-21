// First-run onboarding modal. Shown to a super_admin when the tenant has no
// branches yet (tenant_setup.needs_branch_setup from /auth/me). It creates the
// first branch AND moves every existing user + lead into it in one call
// (branchesApi.adoptAll). Non-dismissable until setup completes — the org is
// branch-wise and nothing scopes correctly until a branch exists.
import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Alert, MenuItem, Box, Typography,
} from '@mui/material';
import { branchesApi, usersApi, authApi } from '../../lib/endpoints';
import { auth } from '../../lib/api';
import { ROLES } from '../../lib/rbac';

export default function BranchSetupDialog({ open, onDone, onManage }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [managerId, setManagerId] = useState('');
  const [managers, setManagers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!open) return;
    setName('Main Branch'); setCode(''); setManagerId(''); setError(''); setResult(null);
    // Candidate branch managers — only users already holding the
    // branch_manager role can head a branch (backend enforces this too).
    usersApi.list({ role: ROLES.BRANCH_MANAGER, is_active: 'true', page: 1, limit: 100 })
      .then((res) => setManagers(res?.data || []))
      .catch(() => setManagers([]));
  }, [open]);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!name.trim()) { setError('Branch name is required'); return; }
    setBusy(true); setError('');
    try {
      const res = await branchesApi.adoptAll({
        name: name.trim(),
        code: code.trim() || undefined,
        branch_manager_id: managerId || undefined,
      });
      setResult(res?.data || null);
      // Refresh /me so needs_branch_setup clears, then re-cache and let the host close.
      try {
        const meRes = await authApi.me();
        const me = meRes?.data ?? meRes; // api client returns { data, meta }
        if (me?.tenant_setup) auth.setTenantSetup(me.tenant_setup);
        if (me?.user) auth.setSession({ user: me.user });
        if (me?.allowed_tabs) auth.setSession({ allowed_tabs: me.allowed_tabs });
      } catch { /* non-fatal — the flag will refresh on next /me */ }
    } catch (err) {
      const detail = err?.data?.error?.details;
      const detailText = detail && typeof detail === 'object'
        ? Object.entries(detail).map(([k, v]) => `${k}: ${v}`).join('; ')
        : null;
      setError(detailText || err?.data?.error?.message || err?.message || 'Failed to set up branch');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog
      open={open}
      // Non-dismissable: no onClose handler while setup is pending.
      maxWidth="sm"
      fullWidth
      sx={{ zIndex: (theme) => theme.zIndex.modal + 5 }}
    >
      <DialogTitle>Set up your first branch</DialogTitle>

      {result ? (
        <>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Alert severity="success">
              Branch <strong>{result.branch?.name}</strong> created.
            </Alert>
            <Typography variant="body2">
              Moved <strong>{result.users_adopted}</strong> user(s) and{' '}
              <strong>{result.leads_backfilled}</strong> lead(s) into this branch.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button variant="contained" onClick={() => onDone?.()}>Done</Button>
          </DialogActions>
        </>
      ) : (
        <form onSubmit={submit}>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Your account is now branch-wise. Create your first branch — all
              existing users and leads will be moved into it. You can add more
              branches later from Settings → Branches.
            </Typography>

            <TextField
              size="small" label="Branch name *" autoFocus fullWidth
              value={name} onChange={(e) => setName(e.target.value)}
            />
            <TextField
              size="small" label="Code (optional)" placeholder="e.g. MUM" fullWidth
              value={code} onChange={(e) => setCode(e.target.value)}
            />

            {managers.length > 0 ? (
              <TextField
                size="small" select label="Branch manager (optional)" fullWidth
                value={managerId} onChange={(e) => setManagerId(e.target.value)}
                helperText="The head of this branch. You can set or change this later."
              >
                <MenuItem value=""><em>None for now</em></MenuItem>
                {managers.map((m) => (
                  <MenuItem key={m.id} value={m.id}>{m.name} — {m.email}</MenuItem>
                ))}
              </TextField>
            ) : (
              <Alert severity="info" sx={{ fontSize: 13 }}>
                No branch-manager users yet. You can create the branch now and
                assign a branch manager later (create a user with the “Branch
                Manager” role, then set them as head from Settings → Branches).
              </Alert>
            )}

            {error && <Alert severity="error" sx={{ fontSize: 13, whiteSpace: 'pre-line' }}>{error}</Alert>}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            {onManage && (
              <Button onClick={onManage} disabled={busy} sx={{ color: '#666' }}>
                Manage branches
              </Button>
            )}
            <Box sx={{ flex: 1 }} />
            <Button type="submit" variant="contained" disabled={busy}>
              {busy ? 'Setting up…' : 'Create branch & move all leads and users in'}
            </Button>
          </DialogActions>
        </form>
      )}
    </Dialog>
  );
}
