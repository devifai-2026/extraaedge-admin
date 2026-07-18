// WhatsApp Settings — super_admin configures this tenant's OWN WhatsApp
// Business number via its OWN WABridge account. Credentials are stored per
// tenant (never in server env), so each institute sends from its own number.
// Shows the tenant-specific webhook URL to paste into the WABridge portal.
import { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Alert, CircularProgress, Paper, TextField,
  FormControlLabel, Switch, InputAdornment, IconButton, Tooltip,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { whatsappApi } from '../../lib/endpoints';
import { isRole, ROLES } from '../../lib/rbac';

export default function WhatsAppSettings() {
  const canManage = isRole(ROLES.SUPER_ADMIN);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [form, setForm] = useState({ enabled: false, app_key: '', auth_key: '', device_id: '', business_phone: '' });
  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => {
    if (!canManage) { setLoading(false); return; }
    whatsappApi.inbox.getSettings()
      .then((r) => {
        const d = r?.data || {};
        setForm({
          enabled: !!d.enabled, app_key: d.app_key || '', auth_key: d.auth_key || '',
          device_id: d.device_id || '', business_phone: d.business_phone || '',
        });
        setWebhookUrl(d.webhook_url || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [canManage]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setMsg(null); setBusy(true);
    try {
      const r = await whatsappApi.inbox.saveSettings(form);
      const d = r?.data || {};
      if (d.webhook_url) setWebhookUrl(d.webhook_url);
      setMsg({ severity: 'success', text: 'WhatsApp settings saved. Register the webhook URL below in your WABridge portal.' });
    } catch (err) {
      setMsg({ severity: 'error', text: err.message || 'Failed to save WhatsApp settings' });
    } finally { setBusy(false); }
  };

  const copy = () => { try { navigator.clipboard.writeText(webhookUrl); setMsg({ severity: 'info', text: 'Webhook URL copied.' }); } catch { /* no-op */ } };

  if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3, maxWidth: 720, mx: 'auto' }}>
      <Typography variant="h6" sx={{ mb: 0.5 }}>WhatsApp Settings</Typography>
      <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
        Connect your institute's own WhatsApp Business number through your WABridge account. Sending
        uses these keys; incoming messages arrive via the webhook URL below (paste it into your
        WABridge portal). Free text only delivers within 24 hours of a customer's last message —
        otherwise use an approved template.
      </Typography>

      {!canManage && <Alert severity="info">Only a super admin can change WhatsApp settings.</Alert>}

      {canManage && (
        <>
          {msg && <Alert severity={msg.severity} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <FormControlLabel
              control={<Switch checked={form.enabled} onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))} />}
              label="WhatsApp enabled"
            />
            <TextField label="WABridge App Key" fullWidth size="small" sx={{ mt: 2 }} value={form.app_key} onChange={set('app_key')} />
            <TextField label="WABridge Auth Key" fullWidth size="small" sx={{ mt: 2 }} value={form.auth_key} onChange={set('auth_key')}
              helperText="Leave the masked value to keep the current key." />
            <TextField label="WABridge Device ID" fullWidth size="small" sx={{ mt: 2 }} value={form.device_id} onChange={set('device_id')} />
            <TextField label="Business WhatsApp Number" fullWidth size="small" sx={{ mt: 2 }} value={form.business_phone} onChange={set('business_phone')}
              placeholder="919876543210" helperText="Your WhatsApp Business number (with country code)." />

            <Box sx={{ mt: 3 }}>
              <Button variant="contained" disableElevation disabled={busy} onClick={save}
                startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}
                sx={{ bgcolor: '#E53935', '&:hover': { bgcolor: '#c62828' }, textTransform: 'none' }}>
                {busy ? 'Saving…' : 'Save WhatsApp settings'}
              </Button>
            </Box>
          </Paper>

          {webhookUrl && (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mt: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Incoming messages webhook</Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 1.5 }}>
                Paste this URL into your WABridge portal's <strong>Webhook URL (POST Method)</strong> field so replies
                land in this inbox. It is unique to your institute.
              </Typography>
              <TextField fullWidth size="small" value={webhookUrl} InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Copy"><IconButton size="small" onClick={copy}><ContentCopyIcon fontSize="small" /></IconButton></Tooltip>
                  </InputAdornment>
                ),
              }} />
            </Paper>
          )}
        </>
      )}
    </Box>
  );
}
