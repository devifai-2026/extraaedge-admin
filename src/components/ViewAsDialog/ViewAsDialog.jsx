import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  MenuItem, Alert, Typography, Box, CircularProgress,
} from '@mui/material';
import { auth } from '../../lib/api';
import { usersApi, viewAsApi } from '../../lib/endpoints';

/**
 * "View as" launcher for a branch manager.
 *
 * The staff list comes from usersApi.list, which is ALREADY scoped to the
 * branch manager's own team subtree server-side (users/service.listUsers), so
 * this picker cannot offer someone outside their branch. The server re-checks
 * on start anyway — view-as/service.loadTargetInBranch — so a hand-crafted
 * request gets the same answer.
 */
export default function ViewAsDialog({ open, onClose, presetUser = null }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [targetId, setTargetId] = useState('');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const [starting, setStarting] = useState(false);

  // Opened from a specific row → preselect that person and skip the hunt.
  // Opened from a generic entry point → presetUser is null and the picker
  // starts empty.
  useEffect(() => {
    if (!open) return;
    setTargetId(presetUser?.id ?? '');
    setReason('');
    setErr('');
    setLoading(true);
    usersApi.list({ limit: 200 })
      .then((res) => {
        const rows = res?.data ?? res ?? [];
        // A branch manager may not view an admin or another branch manager
        // (server: loadTargetInBranch). Filter here too so the picker does not
        // offer a choice that is going to be refused.
        const list = rows.filter((u) => u.is_active
          && u.role !== 'super_admin' && u.role !== 'branch_manager');
        // The row that opened this dialog may sit outside the fetched page
        // (the list is capped), which would leave the select showing a blank
        // value for an id it cannot resolve. Put it in explicitly.
        if (presetUser && !list.some((u) => u.id === presetUser.id)) list.unshift(presetUser);
        setUsers(list);
      })
      .catch((e) => setErr(e?.message || 'Could not load your team'))
      .finally(() => setLoading(false));
  }, [open, presetUser]);

  const start = async () => {
    setErr('');
    setStarting(true);
    try {
      const res = await viewAsApi.start({ target_user_id: targetId, reason: reason.trim() });
      const data = res?.data ?? res;
      auth.startViewAs({ access_token: data.access_token, target_user: data.target_user });
      // Full reload: the sidebar, allowed_tabs and every open query were built
      // from the previous token.
      window.location.href = '/dashboard';
    } catch (e) {
      setErr(e?.message || 'Could not start the session');
      setStarting(false);
    }
  };

  return (
    <Dialog open={open} onClose={starting ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 16, fontWeight: 700 }}>View as a team member</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
          See the product as one of your team sees it. This is read-only — you stay
          signed in as yourself and nothing you do is saved. The session lasts 30
          minutes and is recorded.
        </Typography>
        {err ? <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert> : null}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={22} /></Box>
        ) : (
          <>
            <TextField
              select fullWidth size="small" label="Team member" value={targetId}
              onChange={(e) => setTargetId(e.target.value)} sx={{ mb: 2 }}
            >
              {users.length === 0
                ? <MenuItem value="" disabled>No one in your branch</MenuItem>
                : users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.name} — {String(u.role || '').replace(/_/g, ' ')}
                  </MenuItem>
                ))}
            </TextField>
            <TextField
              fullWidth size="small" label="Reason" value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Checking a reported issue with their follow-up list"
              // The server requires min 5 characters and stores this on the
              // audit row, so it is validated here rather than failing on submit.
              helperText={`${reason.trim().length < 5 ? 'At least 5 characters. ' : ''}Recorded against this session.`}
              multiline minRows={2}
            />
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={starting} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button
          variant="contained" onClick={start}
          disabled={starting || loading || !targetId || reason.trim().length < 5}
          sx={{ textTransform: 'none' }}
        >
          {starting ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Start viewing'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
