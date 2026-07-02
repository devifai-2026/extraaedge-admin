// Mandatory phone-capture modal. Shown to any logged-in tenant user whose
// user record has no phone number (decided in Layout from /auth/me). The
// number is required because the mobile call-recorder app uploads recordings
// tagged with the counsellor's phone — the backend matches it against
// users.phone to attribute each recording to the right person and their leads.
//
// Non-dismissable (no onClose): the user cannot proceed without a phone. On a
// platform-wide uniqueness conflict (409) the error is shown and the modal
// stays open. Mirrors BranchSetupDialog's structure + error extraction.
import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Alert, Box, Typography,
} from '@mui/material';
import { usersApi } from '../../lib/endpoints';
import { auth } from '../../lib/api';

export default function PhoneCaptureDialog({ open, onDone }) {
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e?.preventDefault?.();
    const trimmed = phone.trim();
    if (trimmed.length < 4) { setError('Please enter a valid phone number'); return; }
    setBusy(true); setError('');
    try {
      const res = await usersApi.updateMyPhone(trimmed);
      const saved = res?.data?.phone ?? trimmed;
      // Cache the phone on the stored user so the gate doesn't re-trigger and
      // the navbar reflects it. Fire the same event Layout/Header listen for.
      const user = auth.getUser() || {};
      auth.setSession({ user: { ...user, phone: saved } });
      try { window.dispatchEvent(new CustomEvent('ee:user-updated')); } catch { /* no-op */ }
      onDone?.();
    } catch (err) {
      const detail = err?.data?.error?.details;
      const detailText = detail && typeof detail === 'object'
        ? Object.entries(detail).map(([k, v]) => `${k}: ${v}`).join('; ')
        : (Array.isArray(detail) ? detail.map((d) => d.message || d).join('; ') : null);
      setError(detailText || err?.data?.error?.message || err?.message || 'Could not save your phone number');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog
      open={open}
      // Non-dismissable: no onClose while a phone is required.
      maxWidth="xs"
      fullWidth
      sx={{ zIndex: (theme) => theme.zIndex.modal + 5 }}
    >
      <DialogTitle>Add your phone number</DialogTitle>
      <form onSubmit={submit}>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            We need your phone number so your call recordings from the mobile app
            sync to the right leads. Use the <strong>same number</strong> you’ll
            sign in with on the call-recorder app.
          </Typography>
          <TextField
            size="small" label="Your phone number *" autoFocus fullWidth
            value={phone} onChange={(e) => setPhone(e.target.value)}
            slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*', maxLength: 15 } }}
          />
          {error && <Alert severity="error" sx={{ fontSize: 13, whiteSpace: 'pre-line' }}>{error}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Box sx={{ flex: 1 }} />
          <Button type="submit" variant="contained" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
