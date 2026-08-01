// Recorder App Settings — super_admin configures the counsellor Android
// recorder app. The app scans the WHOLE phone storage for call recordings
// (.mp3/.m4a), so the only setting is the local hour the daily auto-upload
// runs. Saved to the tenant via the shared /tenant-branding endpoint; the app
// reads it from /auth/me on open and before each sync, and re-pins its daily
// job to the new hour.
import { useState } from 'react';
import {
  Box, Typography, Button, Alert, CircularProgress, Paper,
  Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import { brandingApi } from '../../lib/endpoints';
import { auth } from '../../lib/api';
import { isRole, ROLES } from '../../lib/rbac';

// "9:00 PM"-style label for an hour 0-23.
const hourLabel = (h) => {
  const ampm = h < 12 ? 'AM' : 'PM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${ampm}`;
};

export default function RecorderSettings() {
  const canManage = isRole(ROLES.SUPER_ADMIN);
  const t0 = auth.getTenant() || {};
  const [syncHour, setSyncHour] = useState(t0.recorder_sync_hour ?? 21);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const save = async () => {
    setMsg(null);
    setBusy(true);
    try {
      const body = { recorder_sync_hour: Number(syncHour) };
      const res = await brandingApi.update(body);
      const saved = res?.data ?? res ?? {};
      // Reflect on the cached tenant so a re-open prefills the saved values.
      const nextTenant = { ...(auth.getTenant() || {}), ...body, ...saved };
      auth.setSession({ tenant: nextTenant });
      try { window.dispatchEvent(new CustomEvent('ee:user-updated')); } catch { /* no-op */ }
      setMsg({ severity: 'success', text: 'Recorder settings saved. Counsellor apps re-schedule to this time the next time they open or sync.' });
    } catch (err) {
      setMsg({ severity: 'error', text: err.message || 'Failed to save recorder settings' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 720, mx: 'auto' }}>
      <Typography variant="h6" sx={{ mb: 0.5 }}>Recorder App Settings</Typography>
      <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
        The counsellor mobile app scans the phone&apos;s storage every day and uploads every call
        recording (.mp3 or .m4a) it finds. Recordings whose number matches a lead attach
        automatically; the rest appear under Call Recordings → Unmatched.
      </Typography>

      {!canManage && (
        <Alert severity="info">Only a super admin can change recorder settings.</Alert>
      )}

      {canManage && (
        <>
          {msg && <Alert severity={msg.severity} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <FormControl size="small" sx={{ width: 220 }}>
              <InputLabel id="recorder-sync-hour-label">Daily upload time</InputLabel>
              <Select
                labelId="recorder-sync-hour-label" label="Daily upload time"
                value={syncHour} onChange={(e) => setSyncHour(e.target.value)}
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <MenuItem key={h} value={h}>{hourLabel(h)}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography sx={{ mt: 1, fontSize: 12, color: '#94a3b8' }}>
              The app uploads once a day at this time (phone&apos;s local time). If the phone is off, it
              catches up the next time the app opens. Counsellors can also upload on demand with the
              app&apos;s &quot;Upload all recordings&quot; button.
            </Typography>

            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained" disableElevation disabled={busy} onClick={save}
                startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}
                sx={{ bgcolor: '#E53935', '&:hover': { bgcolor: '#c62828' }, textTransform: 'none' }}
              >
                {busy ? 'Saving…' : 'Save recorder settings'}
              </Button>
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
}
