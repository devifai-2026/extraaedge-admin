// Recorder App Settings — super_admin configures the counsellor Android
// recorder app: the folder on the phone that is scanned for call recordings
// (.mp3/.m4a) and the local hour the daily auto-upload runs. Saved to the
// tenant via the shared /tenant-branding endpoint; the app reads both from
// /auth/me.
import { useState } from 'react';
import {
  Box, Typography, Button, Alert, CircularProgress, Paper, TextField,
  Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import { brandingApi } from '../../lib/endpoints';
import { auth } from '../../lib/api';
import { isRole, ROLES } from '../../lib/rbac';

const DEFAULT_PATH = '/storage/emulated/0/Recordings/sound_recorder/call_rec';

// "9:00 PM"-style label for an hour 0-23.
const hourLabel = (h) => {
  const ampm = h < 12 ? 'AM' : 'PM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${ampm}`;
};

export default function RecorderSettings() {
  const canManage = isRole(ROLES.SUPER_ADMIN);
  const t0 = auth.getTenant() || {};
  const [folderPath, setFolderPath] = useState(t0.recorder_folder_path || '');
  const [syncHour, setSyncHour] = useState(t0.recorder_sync_hour ?? 21);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const save = async () => {
    setMsg(null);
    setBusy(true);
    try {
      const trimmedPath = folderPath.trim();
      // A relative path (no leading slash) silently breaks the app's file
      // scan — it resolves against the wrong base directory on the device
      // and always finds zero recordings, with no error surfaced anywhere.
      const normalizedPath = trimmedPath && !trimmedPath.startsWith('/') ? `/${trimmedPath}` : trimmedPath;
      const body = {
        recorder_folder_path: normalizedPath || null,
        recorder_sync_hour: Number(syncHour),
      };
      const res = await brandingApi.update(body);
      const saved = res?.data ?? res ?? {};
      // Reflect on the cached tenant so a re-open prefills the saved values.
      const nextTenant = { ...(auth.getTenant() || {}), ...body, ...saved };
      auth.setSession({ tenant: nextTenant });
      setFolderPath(normalizedPath);
      try { window.dispatchEvent(new CustomEvent('ee:user-updated')); } catch { /* no-op */ }
      setMsg({ severity: 'success', text: 'Recorder settings saved. Counsellor apps pick this up before their next sync.' });
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
        The counsellor mobile app scans this folder on the phone every day and uploads each call
        recording (.mp3 or .m4a). Recordings whose number matches a lead attach automatically; the
        rest appear under Unmatched Recordings.
      </Typography>

      {!canManage && (
        <Alert severity="info">Only a super admin can change recorder settings.</Alert>
      )}

      {canManage && (
        <>
          {msg && <Alert severity={msg.severity} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <TextField
              label="Recording folder path" fullWidth size="small"
              value={folderPath} onChange={(e) => setFolderPath(e.target.value)}
              placeholder={DEFAULT_PATH}
              helperText="Folder on the counsellor's phone that the recorder app scans for .mp3/.m4a files. Must start with a leading slash (e.g. /storage/...). Leave blank to disable syncing until configured."
            />
            <FormControl size="small" sx={{ mt: 3, width: 220 }}>
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
              The app uploads once a day at this time (phone's local time). If the phone is off, it
              catches up the next time the app opens.
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
