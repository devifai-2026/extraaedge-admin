// Receipt Settings — super_admin configures the fee-receipt header (org
// contact block), number format, and footer terms. A live preview renders the
// SAME buildReceiptHtml() the student/PDF gets, so changes are visible as you
// type. Saved to the tenant via the shared /tenant-branding endpoint.
import { useState, useMemo } from 'react';
import {
  Box, Typography, Button, Alert, CircularProgress, Paper, TextField, Divider,
} from '@mui/material';
import { brandingApi } from '../../lib/endpoints';
import { auth } from '../../lib/api';
import { isRole, ROLES } from '../../lib/rbac';
import { buildReceiptHtml } from '../../lib/receiptTemplate';

export default function ReceiptSettings() {
  const canManage = isRole(ROLES.SUPER_ADMIN);
  const t0 = auth.getTenant() || {};
  const [rc, setRc] = useState({
    // Organisation contact block on the receipt header.
    phone: t0.phone || '',
    website: t0.website || '',
    email: t0.email || '',
    address_line1: t0.address_line1 || '',
    address_line2: t0.address_line2 || '',
    city: t0.city || '',
    state: t0.state || '',
    pincode: t0.pincode || '',
    // Numbering + footer.
    receipt_no_prefix: t0.receipt_no_prefix || '',
    receipt_no_start: t0.receipt_no_start ?? 1,
    receipt_no_pad: t0.receipt_no_pad ?? 5,
    receipt_signatory_label: t0.receipt_signatory_label || 'Authorized Signatory',
    receipt_terms: Array.isArray(t0.receipt_terms) ? t0.receipt_terms.join('\n') : '',
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const setF = (k) => (e) => setRc((s) => ({ ...s, [k]: e.target.value }));

  // Derive the "next receipt number" from the current form values. Pure fn of
  // its args so both the inline hint and the live preview stay in lockstep.
  const formatReceiptNo = (prefixRaw, startRaw, padRaw) => {
    const prefix = String(prefixRaw || '').trim();
    const start = Math.max(1, Number(startRaw) || 1);
    const pad = Math.max(1, Number(padRaw) || 5);
    return prefix ? `${prefix}-${String(start).padStart(pad, '0')}` : 'RC-YYYYMMDD-0001 (default)';
  };
  const previewNo = () => formatReceiptNo(rc.receipt_no_prefix, rc.receipt_no_start, rc.receipt_no_pad);

  // Live preview — build the SAME receipt HTML the student/PDF will get, using
  // sample student/payment data merged with the admin's in-progress settings.
  // Depend on the individual number fields (not just the rc object) so the
  // preview's receipt number recomputes on every keystroke.
  const previewHtml = useMemo(() => {
    const now = new Date();
    const due = (m) => new Date(now.getFullYear(), now.getMonth() + m, 15).toISOString();
    const sample = {
      receipt: {
        receipt_no: formatReceiptNo(rc.receipt_no_prefix, rc.receipt_no_start, rc.receipt_no_pad),
        receipt_date: now.toISOString(), amount: 5000, mode_of_payment: 'upi',
      },
      admission: {
        student_name: 'Nayan Kumar Patil', contact: '+91 98765 43210',
        program_name: 'Data Analytics', admission_date: now.toISOString(),
        center_name: 'JM Road', mode_of_training: 'Offline',
      },
      tenant: {
        name: t0.brand_name || t0.name || 'Your Institute',
        brand_name: t0.brand_name || t0.name || 'Your Institute',
        logo_url: t0.logo_url || null,
        brand_primary_color: t0.brand_primary_color || '#E53935',
        currency: t0.currency || 'INR',
        phone: rc.phone, website: rc.website, email: rc.email,
        address_line1: rc.address_line1, address_line2: rc.address_line2,
        city: rc.city, state: rc.state, pincode: rc.pincode,
        receipt_terms: rc.receipt_terms.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 6),
        receipt_signatory_label: String(rc.receipt_signatory_label || '').trim() || 'Authorized Signatory',
      },
      fee_schedule: { totals: { total: 40000, paid: 5000, due: 35000 } },
      upcoming: [
        { due_date: due(1), amount: 10000 },
        { due_date: due(2), amount: 15000 },
        { due_date: due(3), amount: 10000 },
      ],
    };
    return buildReceiptHtml(sample);
    // Depend on every rc field explicitly (primitives) so the preview — and the
    // receipt number in particular — recomputes on each keystroke regardless of
    // object identity.
  }, [
    rc.phone, rc.website, rc.email, rc.address_line1, rc.address_line2,
    rc.city, rc.state, rc.pincode, rc.receipt_no_prefix, rc.receipt_no_start,
    rc.receipt_no_pad, rc.receipt_signatory_label, rc.receipt_terms,
    t0.brand_name, t0.name, t0.logo_url, t0.brand_primary_color, t0.currency,
  ]);

  const save = async () => {
    setMsg(null); setBusy(true);
    try {
      const body = {
        phone: rc.phone.trim() || null,
        website: rc.website.trim() || null,
        email: rc.email.trim() || null,
        address_line1: rc.address_line1.trim() || null,
        address_line2: rc.address_line2.trim() || null,
        city: rc.city.trim() || null,
        state: rc.state.trim() || null,
        pincode: rc.pincode.trim() || null,
        receipt_no_prefix: String(rc.receipt_no_prefix || '').trim() || null,
        receipt_no_start: Math.max(1, Number(rc.receipt_no_start) || 1),
        receipt_no_pad: Math.max(1, Number(rc.receipt_no_pad) || 5),
        receipt_signatory_label: String(rc.receipt_signatory_label || '').trim() || 'Authorized Signatory',
        receipt_terms: rc.receipt_terms.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 6),
      };
      const res = await brandingApi.updateReceiptSettings(body);
      // Reflect the saved config on the cached tenant so a re-open prefills it
      // and other pages see the new contact details immediately.
      const saved = res?.data ?? res ?? {};
      const nextTenant = { ...(auth.getTenant() || {}), ...body, ...saved };
      auth.setSession({ tenant: nextTenant });
      try { window.dispatchEvent(new CustomEvent('ee:user-updated')); } catch { /* no-op */ }
      setMsg({ severity: 'success', text: 'Receipt settings saved. New receipts use this format; existing ones are unchanged.' });
    } catch (err) {
      setMsg({ severity: 'error', text: err.message || 'Failed to save receipt settings' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
      <Typography variant="h6" sx={{ mb: 0.5 }}>Receipt Settings</Typography>
      <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
        Set the organisation details, number format and footer text shown on your fee receipts.
        The live preview on the right updates as you type. Number changes apply to new receipts only —
        receipts already issued keep their number.
      </Typography>

      {!canManage && (
        <Alert severity="info">Only a super admin can change receipt settings.</Alert>
      )}

      {canManage && (
        <>
          {msg && <Alert severity={msg.severity} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0,1fr) minmax(0,1fr)' }, gap: 3, alignItems: 'start' }}>
            {/* ---- Form ---- */}
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1.5 }}>Organisation details (receipt header)</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField label="Phone" size="small" value={rc.phone} onChange={setF('phone')} placeholder="+91-7219777599" />
                <TextField label="Website" size="small" value={rc.website} onChange={setF('website')} placeholder="www.example.com" />
                <TextField label="Email" size="small" value={rc.email} onChange={setF('email')} sx={{ gridColumn: '1 / -1' }} />
                <TextField label="Address line 1" size="small" value={rc.address_line1} onChange={setF('address_line1')} sx={{ gridColumn: '1 / -1' }} />
                <TextField label="Address line 2" size="small" value={rc.address_line2} onChange={setF('address_line2')} sx={{ gridColumn: '1 / -1' }} />
                <TextField label="City" size="small" value={rc.city} onChange={setF('city')} />
                <TextField label="State" size="small" value={rc.state} onChange={setF('state')} />
                <TextField label="Pincode" size="small" value={rc.pincode} onChange={setF('pincode')} />
              </Box>

              <Divider sx={{ my: 3 }} />

              <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1.5 }}>Receipt number</Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <TextField
                  label="Prefix" size="small" value={rc.receipt_no_prefix} onChange={setF('receipt_no_prefix')}
                  placeholder="2026" sx={{ width: 140 }} helperText="Blank = default RC-"
                />
                <TextField label="Start" size="small" type="number" value={rc.receipt_no_start} onChange={setF('receipt_no_start')} sx={{ width: 120 }} inputProps={{ min: 1 }} />
                <TextField label="Digits" size="small" type="number" value={rc.receipt_no_pad} onChange={setF('receipt_no_pad')} sx={{ width: 110 }} inputProps={{ min: 1, max: 12 }} />
              </Box>
              <Typography sx={{ mt: 1, fontSize: 13, color: '#475569' }}>
                Next receipt: <b style={{ color: '#0f172a' }}>{previewNo()}</b>
              </Typography>

              <Divider sx={{ my: 3 }} />

              <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1.5 }}>Footer terms &amp; signatory</Typography>
              <TextField
                label="Terms (one line per rule, max 6)" fullWidth multiline minRows={2} maxRows={6} size="small"
                value={rc.receipt_terms} onChange={setF('receipt_terms')}
                placeholder={'Training fees are strictly non-refundable under any circumstances.\nA late fee of ₹50 per day applies to any installment paid after its due date.'}
              />
              <TextField label="Signatory label" size="small" sx={{ mt: 2, width: 260 }} value={rc.receipt_signatory_label} onChange={setF('receipt_signatory_label')} />

              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained" disableElevation disabled={busy} onClick={save}
                  startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}
                  sx={{ bgcolor: '#E53935', '&:hover': { bgcolor: '#c62828' }, textTransform: 'none' }}
                >
                  {busy ? 'Saving…' : 'Save receipt settings'}
                </Button>
              </Box>
            </Paper>

            {/* ---- Live preview ---- */}
            <Box sx={{ position: { md: 'sticky' }, top: 16 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#64748b', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Live preview
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, background: '#f1f5f9', overflow: 'hidden' }}>
                {/* Scale the full-width receipt down to fit the panel. */}
                <Box sx={{ width: 760, transform: 'scale(0.52)', transformOrigin: 'top left', mb: '-46%' }}>
                  <Box sx={{ background: '#fff', borderRadius: 1, boxShadow: '0 8px 24px -12px rgba(15,23,42,0.3)' }}
                       dangerouslySetInnerHTML={{ __html: previewHtml }} />
                </Box>
              </Paper>
              <Typography sx={{ mt: 1, fontSize: 11, color: '#94a3b8' }}>
                Sample student &amp; amounts — your real receipts use live data.
              </Typography>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}
