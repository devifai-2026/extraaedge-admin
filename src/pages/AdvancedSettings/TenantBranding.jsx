// Tenant Logo — super_admin uploads their organisation's logo (PNG). It's
// stored on the tenant and shown in the navbar (replacing the brand-name text)
// for every role. Flow: pick file → /uploads presign → direct PUT to GCS →
// confirm(public) → brandingApi.updateLogo(key) → refresh the cached tenant so
// the navbar repaints immediately.
import { useRef, useState } from 'react';
import {
  Box, Typography, Button, Alert, CircularProgress, Paper,
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
    </Box>
  );
}
