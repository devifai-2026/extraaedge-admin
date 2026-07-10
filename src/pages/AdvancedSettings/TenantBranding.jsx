// Tenant Logo — super_admin uploads their organisation's logo (PNG). It's
// stored on the tenant and shown in the navbar (replacing the brand-name text)
// for every role. Flow: pick file → /uploads presign → direct PUT to GCS →
// confirm(public) → brandingApi.updateLogo(key) → refresh the cached tenant so
// the navbar repaints immediately.
import { useRef, useState } from 'react';
import {
  Box, Typography, Button, Alert, CircularProgress, Paper, TextField, Divider,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { uploadsApi, brandingApi } from '../../lib/endpoints';
import { auth } from '../../lib/api';
import { isRole, ROLES } from '../../lib/rbac';
import { resolveAssetUrl } from '../../lib/config';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB (matches backend tenant_logo limit)

export default function TenantBranding() {
  const canManage = isRole(ROLES.SUPER_ADMIN);
  const [tenant, setTenant] = useState(() => auth.getTenant() || {});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const fileRef = useRef(null);

  // After a change, sync the cached tenant + tell the navbar to repaint.
  const applyLogo = (logo_url) => {
    const next = { ...(auth.getTenant() || {}), logo_url };
    auth.setSession({ tenant: next });
    setTenant(next);
    try { window.dispatchEvent(new CustomEvent('ee:user-updated')); } catch { /* no-op */ }
  };

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    setError(''); setOk('');
    if (!/^image\/(png|jpeg|svg\+xml|webp)$/.test(file.type)) {
      setError('Please choose a PNG, JPG, SVG or WebP image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Logo must be 5 MB or smaller.');
      return;
    }
    setBusy(true);
    try {
      // 1. presign
      const pre = await uploadsApi.presign({
        purpose: 'tenant_logo',
        content_type: file.type,
        size_bytes: file.size,
        filename: file.name || 'logo',
      });
      const { upload_url, method, headers, r2_key } = pre?.data ?? pre;
      // 2. direct PUT to GCS (bare fetch — no auth header)
      const put = await fetch(upload_url, { method: method || 'PUT', headers: headers || { 'Content-Type': file.type }, body: file });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);
      // 3. confirm (public so the navbar/receipt can render it directly)
      await uploadsApi.confirm({ purpose: 'tenant_logo', r2_key, visibility: 'public' });
      // 4. save on the tenant → returns the public logo_url
      const res = await brandingApi.updateLogo(r2_key);
      const logoUrl = (res?.data ?? res)?.logo_url || null;
      applyLogo(logoUrl);
      setOk('Logo updated. It now shows in the navbar for everyone on your account.');
    } catch (err) {
      setError(err.message || 'Failed to upload logo');
    } finally {
      setBusy(false);
    }
  };

  const removeLogo = async () => {
    setError(''); setOk(''); setBusy(true);
    try {
      await brandingApi.updateLogo(null);
      applyLogo(null);
      setOk('Logo removed. The navbar now shows your brand name.');
    } catch (err) {
      setError(err.message || 'Failed to remove logo');
    } finally {
      setBusy(false);
    }
  };

  // ---- Receipt settings (number format + footer terms + signatory) ----
  const t0 = auth.getTenant() || {};
  const [rc, setRc] = useState({
    receipt_no_prefix: t0.receipt_no_prefix || '',
    receipt_no_start: t0.receipt_no_start ?? 1,
    receipt_no_pad: t0.receipt_no_pad ?? 5,
    receipt_signatory_label: t0.receipt_signatory_label || 'Authorized Signatory',
    receipt_terms: Array.isArray(t0.receipt_terms) ? t0.receipt_terms.join('\n') : '',
  });
  const [rcBusy, setRcBusy] = useState(false);
  const [rcMsg, setRcMsg] = useState(null);

  const previewNo = () => {
    const prefix = String(rc.receipt_no_prefix || '').trim();
    const start = Math.max(1, Number(rc.receipt_no_start) || 1);
    const pad = Math.max(1, Number(rc.receipt_no_pad) || 5);
    return prefix ? `${prefix}-${String(start).padStart(pad, '0')}` : `RC-YYYYMMDD-0001 (default)`;
  };

  const saveReceiptSettings = async () => {
    setRcMsg(null); setRcBusy(true);
    try {
      const body = {
        receipt_no_prefix: String(rc.receipt_no_prefix || '').trim() || null,
        receipt_no_start: Math.max(1, Number(rc.receipt_no_start) || 1),
        receipt_no_pad: Math.max(1, Number(rc.receipt_no_pad) || 5),
        receipt_signatory_label: String(rc.receipt_signatory_label || '').trim() || 'Authorized Signatory',
        receipt_terms: rc.receipt_terms.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 6),
      };
      const res = await brandingApi.updateReceiptSettings(body);
      // Reflect the saved config on the cached tenant so a re-open prefills it.
      const saved = res?.data ?? res ?? {};
      const nextTenant = {
        ...(auth.getTenant() || {}),
        receipt_no_prefix: saved.receipt_no_prefix ?? body.receipt_no_prefix,
        receipt_no_start: saved.receipt_no_start ?? body.receipt_no_start,
        receipt_no_pad: saved.receipt_no_pad ?? body.receipt_no_pad,
        receipt_signatory_label: saved.receipt_signatory_label ?? body.receipt_signatory_label,
        receipt_terms: Array.isArray(saved.receipt_terms) ? saved.receipt_terms : body.receipt_terms,
      };
      auth.setSession({ tenant: nextTenant });
      setRcMsg({ severity: 'success', text: 'Receipt settings saved. New receipts use this format; existing ones are unchanged.' });
    } catch (err) {
      setRcMsg({ severity: 'error', text: err.message || 'Failed to save receipt settings' });
    } finally {
      setRcBusy(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 640, mx: 'auto' }}>
      <Typography variant="h6" sx={{ mb: 0.5 }}>Tenant Logo</Typography>
      <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
        Upload your organisation’s logo. It replaces the brand-name text in the top navbar for every
        user on your account. PNG with transparency works best. Max 5 MB.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {ok && <Alert severity="success" sx={{ mb: 2 }}>{ok}</Alert>}

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
        <Box sx={{
          width: 220, height: 80, border: '1px dashed #cbd5e1', borderRadius: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#0f172a', overflow: 'hidden',
        }}>
          {tenant?.logo_url
            ? <img src={resolveAssetUrl(tenant.logo_url)} alt="Current logo" style={{ maxHeight: 64, maxWidth: 200, objectFit: 'contain' }} />
            : <Typography sx={{ color: '#94a3b8', fontSize: 13 }}>No logo — brand name shown</Typography>}
        </Box>

        {canManage && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden onChange={onPick} />
            <Button
              variant="contained" disableElevation startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
              disabled={busy} onClick={() => fileRef.current?.click()}
              sx={{ bgcolor: '#E53935', '&:hover': { bgcolor: '#c62828' }, textTransform: 'none' }}
            >
              {busy ? 'Uploading…' : (tenant?.logo_url ? 'Replace logo' : 'Upload logo')}
            </Button>
            {tenant?.logo_url && (
              <Button color="inherit" size="small" startIcon={<DeleteOutlineIcon />} disabled={busy} onClick={removeLogo} sx={{ textTransform: 'none', color: '#64748b' }}>
                Remove logo
              </Button>
            )}
          </Box>
        )}
      </Paper>

      {!canManage && (
        <Alert severity="info" sx={{ mt: 2 }}>Only a super admin can change the tenant logo.</Alert>
      )}

      {canManage && (
        <>
          <Typography variant="h6" sx={{ mt: 4, mb: 0.5 }}>Receipt Settings</Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
            Controls the fee-receipt number format and the footer text shown to students.
            Number changes apply to new receipts only — receipts already issued keep their number.
          </Typography>

          {rcMsg && <Alert severity={rcMsg.severity} sx={{ mb: 2 }} onClose={() => setRcMsg(null)}>{rcMsg.text}</Alert>}

          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1.5 }}>Receipt number</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <TextField
                label="Prefix" size="small" value={rc.receipt_no_prefix}
                onChange={(e) => setRc((s) => ({ ...s, receipt_no_prefix: e.target.value }))}
                placeholder="2026" sx={{ width: 160 }}
                helperText="Blank = keep default RC- numbering"
              />
              <TextField
                label="Starting number" size="small" type="number" value={rc.receipt_no_start}
                onChange={(e) => setRc((s) => ({ ...s, receipt_no_start: e.target.value }))}
                sx={{ width: 160 }} inputProps={{ min: 1 }}
              />
              <TextField
                label="Digits (zero-pad)" size="small" type="number" value={rc.receipt_no_pad}
                onChange={(e) => setRc((s) => ({ ...s, receipt_no_pad: e.target.value }))}
                sx={{ width: 150 }} inputProps={{ min: 1, max: 12 }}
              />
            </Box>
            <Typography sx={{ mt: 1, fontSize: 13, color: '#475569' }}>
              Next receipt will look like: <b style={{ color: '#0f172a' }}>{previewNo()}</b>
            </Typography>

            <Divider sx={{ my: 3 }} />

            <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1.5 }}>Footer terms &amp; signatory</Typography>
            <TextField
              label="Terms (one line per rule, max 6)" fullWidth multiline minRows={2} maxRows={6} size="small"
              value={rc.receipt_terms}
              onChange={(e) => setRc((s) => ({ ...s, receipt_terms: e.target.value }))}
              placeholder={'Training fees are strictly non-refundable under any circumstances.\nA late fee of ₹50 per day applies to any installment paid after its due date.'}
            />
            <TextField
              label="Signatory label" size="small" sx={{ mt: 2, width: 260 }}
              value={rc.receipt_signatory_label}
              onChange={(e) => setRc((s) => ({ ...s, receipt_signatory_label: e.target.value }))}
            />

            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained" disableElevation disabled={rcBusy} onClick={saveReceiptSettings}
                startIcon={rcBusy ? <CircularProgress size={16} color="inherit" /> : null}
                sx={{ bgcolor: '#E53935', '&:hover': { bgcolor: '#c62828' }, textTransform: 'none' }}
              >
                {rcBusy ? 'Saving…' : 'Save receipt settings'}
              </Button>
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
}
