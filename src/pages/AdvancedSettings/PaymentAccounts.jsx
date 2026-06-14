// Payment Accounts admin — tenant-managed bank accounts + UPI IDs used to
// collect fee payments (registration, installments & other dues). Lives
// under Advanced Settings.
// super_admin only. MULTIPLE accounts can be primary (≥1 required) — admin
// multi-selects rows and bulk marks/unmarks primary; the backend blocks any
// action that would leave zero primaries. Each account may carry a QR image.
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, IconButton, Tooltip, CircularProgress,
  MenuItem, Chip, Snackbar, Alert, Checkbox,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import SearchIcon from '@mui/icons-material/Search';
import { paymentAccountsApi, uploadsApi } from '../../lib/endpoints';
import { isRole, ROLES } from '../../lib/rbac';
import Breadcrumb from './Breadcrumb';

export default function PaymentAccounts() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [search, setSearch] = useState('');
  const canEdit = isRole(ROLES.SUPER_ADMIN);

  // Client-side search across label / holder / account no / IFSC / bank /
  // branch / UPI / type. The list is small (no pagination) so this is exact.
  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => [
      r.label, r.account_holder_name, r.account_number, r.ifsc, r.bank_name,
      r.branch, r.upi_id, r.type,
    ].filter(Boolean).some((v) => String(v).toLowerCase().includes(term)));
  }, [rows, search]);

  const reload = () => {
    setLoading(true);
    return paymentAccountsApi.list({ include_inactive: true })
      .then((r) => setRows(r?.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { (async () => { await reload(); })(); }, []);

  const toggleSelect = (id) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const selectedActiveIds = useMemo(
    () => rows.filter((r) => selected.has(r.id) && r.is_active).map((r) => r.id),
    [rows, selected],
  );

  const onBulkSetPrimary = async () => {
    if (!selectedActiveIds.length) return;
    try {
      await paymentAccountsApi.setPrimary(selectedActiveIds);
      setSelected(new Set());
      await reload();
      setToast({ kind: 'success', msg: 'Marked selected as primary.' });
    } catch (e) {
      setToast({ kind: 'error', msg: e?.message || 'Could not set primary.' });
    }
  };

  const onBulkUnsetPrimary = async () => {
    const ids = rows.filter((r) => selected.has(r.id) && r.is_primary).map((r) => r.id);
    if (!ids.length) return;
    try {
      await paymentAccountsApi.unsetPrimary(ids);
      setSelected(new Set());
      await reload();
      setToast({ kind: 'success', msg: 'Removed primary from selected.' });
    } catch (e) {
      setToast({ kind: 'error', msg: e?.message || 'Could not unset primary.' });
    }
  };

  const onDelete = async () => {
    try {
      await paymentAccountsApi.delete(deleteRow.id);
      setDeleteRow(null);
      await reload();
      setToast({ kind: 'success', msg: 'Account deleted.' });
    } catch (e) {
      setDeleteRow(null);
      setToast({ kind: 'error', msg: e?.message || 'Delete failed.' });
    }
  };

  return (
    <div style={{ background: '#fafafa', minHeight: '100vh' }}>
      <Breadcrumb trail={[
        { label: 'Settings', path: '/advancedsettings' },
        { label: 'Payment Accounts' },
      ]} />

      <div style={{ padding: '0 24px 32px', maxWidth: 1040 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          gap: 16, marginBottom: 16, padding: '18px 20px', background: '#fff',
          border: '1px solid #e5e7eb', borderRadius: 12, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', minWidth: 0 }}>
            <span style={{
              width: 42, height: 42, borderRadius: 10, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--primary-light)', color: 'var(--primary)',
            }}>
              <AccountBalanceIcon />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 19, fontWeight: 700, color: '#111827' }}>Payment Accounts</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 3, lineHeight: 1.5, maxWidth: 560 }}>
                Bank accounts &amp; UPI IDs the accounts team uses to collect fee
                payments — registration, installments and other dues. Mark one or
                more as primary (at least one required).
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <TextField
              size="small"
              placeholder="Search accounts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 18, color: '#9ca3af', mr: 0.75 }} /> }}
              sx={{ minWidth: 240, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fafafa' } }}
            />
            {canEdit && (
              <Button
                variant="contained"
                disableElevation
                startIcon={<AddIcon />}
                onClick={() => setAddOpen(true)}
                sx={{
                  textTransform: 'none', fontWeight: 600, borderRadius: 2,
                  px: 2, height: 40, whiteSpace: 'nowrap',
                  bgcolor: 'var(--primary)', boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                  '&:hover': { bgcolor: 'var(--primary-dark)', boxShadow: '0 2px 6px rgba(0,0,0,0.12)' },
                }}
              >
                Add Account
              </Button>
            )}
          </div>
        </div>

        {/* Bulk action bar — appears when rows are selected. */}
        {canEdit && selected.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '8px 12px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8 }}>
            <span style={{ fontSize: 13, color: '#9a3412', fontWeight: 600 }}>{selected.size} selected</span>
            <Button size="small" variant="contained" startIcon={<StarIcon />} onClick={onBulkSetPrimary} sx={{ textTransform: 'none', bgcolor: '#f59e0b', '&:hover': { bgcolor: '#d97706' } }}>
              Mark as primary
            </Button>
            <Button size="small" variant="outlined" onClick={onBulkUnsetPrimary} sx={{ textTransform: 'none' }}>
              Remove primary
            </Button>
            <Button size="small" onClick={() => setSelected(new Set())} sx={{ textTransform: 'none', marginLeft: 'auto' }}>Clear</Button>
          </div>
        )}

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><CircularProgress size={20} /></div>
          ) : rows.length === 0 ? (
            <div style={{ padding: '56px 40px', textAlign: 'center' }}>
              <span style={{
                width: 56, height: 56, borderRadius: 14, margin: '0 auto 14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--primary-light)', color: 'var(--primary)',
              }}>
                <AccountBalanceIcon sx={{ fontSize: 28 }} />
              </span>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#374151' }}>No payment accounts yet</div>
              <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4, marginBottom: 18 }}>
                Add a bank account, UPI ID, or QR code so the accounts team can collect payments.
              </div>
              {canEdit && (
                <Button
                  variant="contained" disableElevation startIcon={<AddIcon />}
                  onClick={() => setAddOpen(true)}
                  sx={{
                    textTransform: 'none', fontWeight: 600, borderRadius: 2, px: 2.5, height: 40,
                    bgcolor: 'var(--primary)', '&:hover': { bgcolor: 'var(--primary-dark)' },
                  }}
                >
                  Add Account
                </Button>
              )}
            </div>
          ) : filteredRows.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              No accounts match &quot;{search}&quot;.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {canEdit && <th style={{ ...th, width: 40 }}></th>}
                  <th style={th}>Sections</th>
                  <th style={th}>Details</th>
                  <th style={th}>QR</th>
                  <th style={th}>Primary</th>
                  <th style={th}>Status</th>
                  {canEdit && <th style={{ ...th, textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => (
                  <tr key={r.id} style={{ background: selected.has(r.id) ? '#fffbeb' : r.is_primary ? '#fff7ed' : 'transparent' }}>
                    {canEdit && (
                      <td style={td}>
                        <Checkbox size="small" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} />
                      </td>
                    )}
                    <td style={td}>
                      <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
                        {r.account_number && <Chip size="small" icon={<AccountBalanceIcon sx={{ fontSize: 13 }} />} label="Bank" sx={{ height: 20, fontSize: 10 }} />}
                        {r.upi_id && <Chip size="small" icon={<QrCode2Icon sx={{ fontSize: 13 }} />} label="UPI" sx={{ height: 20, fontSize: 10 }} />}
                        {r.qr_r2_key && <Chip size="small" label="QR" sx={{ height: 20, fontSize: 10 }} />}
                      </span>
                    </td>
                    <td style={td}>
                      {r.label && <div style={{ fontWeight: 600, color: '#111827' }}>{r.label}</div>}
                      {r.account_number && (
                        <div style={{ color: '#4b5563', fontSize: 12 }}>
                          🏦 {r.account_holder_name} · A/C {maskAcct(r.account_number)} · {r.ifsc}
                          {r.bank_name ? ` · ${r.bank_name}` : ''}
                        </div>
                      )}
                      {r.upi_id && (
                        <div style={{ color: '#4b5563', fontSize: 12 }}>
                          📲 {r.upi_id}
                        </div>
                      )}
                      {!r.account_number && !r.upi_id && !r.label && <span style={{ color: '#9ca3af' }}>—</span>}
                    </td>
                    <td style={td}><QrThumb r2Key={r.qr_r2_key} /></td>
                    <td style={td}>
                      {r.is_primary
                        ? <Chip size="small" icon={<StarIcon sx={{ fontSize: 14 }} />} label="Primary"
                            sx={{ height: 22, fontSize: 11, bgcolor: '#f59e0b', color: '#fff', '& .MuiChip-icon': { color: '#fff' } }} />
                        : <span style={{ color: '#9ca3af' }}>—</span>}
                    </td>
                    <td style={td}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontSize: 12, fontWeight: 600,
                        color: r.is_active ? '#15803d' : '#9ca3af',
                      }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: r.is_active ? '#22c55e' : '#d1d5db' }} />
                        {r.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {canEdit && (
                      <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <Tooltip title="Edit"><IconButton size="small" onClick={() => setEditRow(r)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Delete"><IconButton size="small" onClick={() => setDeleteRow(r)} sx={{ color: '#dc2626' }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {(addOpen || editRow) && (
        <AccountDialog
          row={editRow}
          isFirst={rows.length === 0}
          onClose={() => { setAddOpen(false); setEditRow(null); }}
          onSaved={() => { setAddOpen(false); setEditRow(null); reload(); }}
          onError={(msg) => setToast({ kind: 'error', msg })}
        />
      )}

      {deleteRow && (
        <Dialog open onClose={() => setDeleteRow(null)} maxWidth="xs" fullWidth>
          <DialogTitle>Delete this account?</DialogTitle>
          <DialogContent>
            <p style={{ fontSize: 13, color: '#555' }}>
              {deleteRow.label
                || (deleteRow.account_number ? `Bank A/C ${maskAcct(deleteRow.account_number)}` : null)
                || (deleteRow.upi_id ? `UPI ${deleteRow.upi_id}` : null)
                || 'This account'} will no longer be available for collecting payments.
              {deleteRow.is_primary && rows.filter((r) => r.id !== deleteRow.id && r.is_primary).length === 0 && rows.length > 1 && (
                <> This is the only primary — mark another account primary first, or this delete will be blocked.</>
              )}
            </p>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteRow(null)}>Cancel</Button>
            <Button variant="contained" color="error" onClick={onDelete}>Delete</Button>
          </DialogActions>
        </Dialog>
      )}

      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? <Alert severity={toast.kind} onClose={() => setToast(null)} variant="filled">{toast.msg}</Alert> : undefined}
      </Snackbar>
    </div>
  );
}

// Regex helpers shared by the section validators.
const ACCT_RE = /^\d{6,20}$/;
const IFSC_RE = /^[A-Za-z]{4}[A-Za-z0-9]{2,11}$/;
const UPI_RE = /^[\w.@-]{3,64}$/;

const AccountDialog = ({ row, isFirst, onClose, onSaved, onError }) => {
  const isEdit = Boolean(row);
  const [form, setForm] = useState({
    label: row?.label || '',
    account_holder_name: row?.account_holder_name || '',
    account_number: row?.account_number || '',
    ifsc: row?.ifsc || '',
    bank_name: row?.bank_name || '',
    branch: row?.branch || '',
    account_type: row?.account_type || '',
    upi_id: row?.upi_id || '',
  });
  // First account is always primary, so the checkbox is forced + disabled.
  const [isPrimary, setIsPrimary] = useState(isFirst || row?.is_primary || false);
  const [isActive, setIsActive] = useState(row?.is_active !== false);
  const [qrKey, setQrKey] = useState(row?.qr_r2_key || null);
  const [qrUploading, setQrUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  // QR upload: /uploads/presign → direct PUT to GCS → /uploads/confirm.
  const uploadQr = async (file) => {
    if (!file) return;
    if (!file.type?.startsWith('image/')) { onError?.('QR must be an image.'); return; }
    if (file.size > 5 * 1024 * 1024) { onError?.('QR image must be 5 MB or smaller.'); return; }
    setQrUploading(true);
    try {
      const ps = await uploadsApi.presign({ purpose: 'payment_qr', content_type: file.type, size_bytes: file.size, filename: file.name });
      const presign = ps?.data;
      if (!presign?.upload_url || !presign?.r2_key) throw new Error('Presign failed');
      const put = await fetch(presign.upload_url, { method: 'PUT', headers: presign.headers || { 'Content-Type': file.type }, body: file });
      if (!put.ok) throw new Error('Upload failed');
      // `purpose` is required by the confirm schema. The public admission
      // form serves the QR by signing its r2_key directly (it doesn't go
      // through the uploaded_files visibility gate), so the default
      // 'private' visibility is fine here.
      await uploadsApi.confirm({ r2_key: presign.r2_key, content_type: file.type, purpose: 'payment_qr' });
      setQrKey(presign.r2_key);
    } catch (e) {
      onError?.(e?.message || 'QR upload failed.');
    } finally {
      setQrUploading(false);
    }
  };

  // Section completeness — mirrors the backend rules. A row is saveable when
  // at least one section is complete; a partially-filled bank section blocks.
  const bankTouched = Boolean(form.account_holder_name || form.account_number || form.ifsc || form.bank_name || form.branch || form.account_type);
  const bankComplete = Boolean(form.account_holder_name.trim()) && ACCT_RE.test(form.account_number.trim()) && IFSC_RE.test(form.ifsc.trim());
  const bankPartial = bankTouched && !bankComplete;
  const upiComplete = UPI_RE.test(form.upi_id.trim());
  const qrComplete = Boolean(qrKey);
  const valid = !bankPartial && (bankComplete || upiComplete || qrComplete);

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      const body = {
        label: form.label || null,
        is_active: isActive,
        is_primary: isFirst ? true : isPrimary,
        // Bank section — only sent when complete, else cleared.
        account_holder_name: bankComplete ? form.account_holder_name.trim() : (form.account_holder_name.trim() || null),
        account_number: bankComplete ? form.account_number.trim() : null,
        ifsc: bankComplete ? form.ifsc.trim().toUpperCase() : null,
        bank_name: bankComplete ? (form.bank_name || null) : null,
        branch: bankComplete ? (form.branch || null) : null,
        account_type: bankComplete ? (form.account_type || null) : null,
        // UPI + QR sections.
        upi_id: upiComplete ? form.upi_id.trim() : null,
        qr_r2_key: qrKey || null,
      };
      if (isEdit) {
        await paymentAccountsApi.update(row.id, body);
      } else {
        await paymentAccountsApi.create(body);
      }
      onSaved?.();
    } catch (e) {
      onError?.(e?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Payment Account' : 'Add Payment Account'}</DialogTitle>
      <DialogContent>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
          <TextField label="Label (optional)" size="small" value={form.label} onChange={set('label')} placeholder="e.g. HDFC Current / Office UPI" />
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: -6 }}>
            Fill at least one section below. You can add bank details, a UPI ID, a QR image — or all three on one account.
          </div>

          {/* ---- Bank section ---- */}
          <Section icon={<AccountBalanceIcon sx={{ fontSize: 18 }} />} title="Bank Account" complete={bankComplete} partial={bankPartial}>
            <TextField label="Account Holder Name" size="small" value={form.account_holder_name} onChange={set('account_holder_name')} fullWidth sx={{ mb: 1.25 }} />
            <TextField label="Account Number" size="small" value={form.account_number} onChange={set('account_number')} fullWidth sx={{ mb: 1.25 }}
              error={!!form.account_number && !ACCT_RE.test(form.account_number.trim())}
              helperText={form.account_number && !ACCT_RE.test(form.account_number.trim()) ? '6–20 digits' : ' '} />
            <TextField label="IFSC" size="small" value={form.ifsc} onChange={set('ifsc')} fullWidth sx={{ mb: 1.25 }}
              error={!!form.ifsc && !IFSC_RE.test(form.ifsc.trim())}
              helperText={form.ifsc && !IFSC_RE.test(form.ifsc.trim()) ? '4 letters then digits/letters, e.g. SBIN0017760' : ' '} />
            <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
              <TextField label="Bank Name" size="small" value={form.bank_name} onChange={set('bank_name')} fullWidth />
              <TextField label="Branch" size="small" value={form.branch} onChange={set('branch')} fullWidth />
            </div>
            <TextField select label="Account Type" size="small" value={form.account_type} onChange={set('account_type')} sx={{ minWidth: 160 }}>
              <MenuItem value="">—</MenuItem>
              <MenuItem value="savings">Savings</MenuItem>
              <MenuItem value="current">Current</MenuItem>
            </TextField>
          </Section>

          {/* ---- UPI section ---- */}
          <Section icon={<QrCode2Icon sx={{ fontSize: 18 }} />} title="UPI" complete={upiComplete}>
            <TextField label="UPI ID" size="small" value={form.upi_id} onChange={set('upi_id')} placeholder="name@bank" fullWidth
              error={!!form.upi_id && !UPI_RE.test(form.upi_id.trim())}
              helperText={form.upi_id && !UPI_RE.test(form.upi_id.trim()) ? 'e.g. name@hdfcbank' : ' '} />
          </Section>

          {/* ---- QR section ---- */}
          <Section icon={<QrCode2Icon sx={{ fontSize: 18 }} />} title="QR Code" complete={qrComplete}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {qrKey ? <QrThumb r2Key={qrKey} size={72} /> : (
                <div style={{ width: 72, height: 72, borderRadius: 8, border: '1px dashed #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                  <QrCode2Icon />
                </div>
              )}
              <Button component="label" size="small" variant="outlined" disabled={qrUploading} sx={{ textTransform: 'none' }}>
                {qrUploading ? 'Uploading…' : qrKey ? 'Replace QR' : 'Upload QR'}
                <input type="file" accept="image/*" hidden onChange={(e) => uploadQr(e.target.files?.[0])} />
              </Button>
              {qrKey && !qrUploading && (
                <Button size="small" color="error" onClick={() => setQrKey(null)} sx={{ textTransform: 'none' }}>Remove</Button>
              )}
            </div>
          </Section>

          {!valid && bankPartial && (
            <div style={{ fontSize: 12, color: '#dc2626' }}>Complete the bank section (holder, account no, IFSC) or clear it.</div>
          )}

          <label style={{ fontSize: 13, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={isPrimary} disabled={isFirst} onChange={(e) => setIsPrimary(e.target.checked)} />
            Set as primary {isFirst && <span style={{ color: '#9ca3af' }}>(first account is always primary)</span>}
          </label>
          <label style={{ fontSize: 13, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained" disableElevation onClick={save} disabled={saving || !valid}
          sx={{
            textTransform: 'none', fontWeight: 600, borderRadius: 2, px: 2.5,
            bgcolor: 'var(--primary)', '&:hover': { bgcolor: 'var(--primary-dark)' },
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// A titled section box in the add/edit form, with a "complete" check or a
// "needs all fields" warning badge so the admin sees which section qualifies.
const Section = ({ icon, title, complete, partial, children }) => (
  <div style={{ border: `1px solid ${partial ? '#fecaca' : complete ? '#bbf7d0' : '#e5e7eb'}`, borderRadius: 8, padding: 12, background: complete ? '#f0fdf4' : '#fff' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: '#374151', fontWeight: 600, fontSize: 14 }}>
      {icon}{title}
      {complete && <Chip size="small" label="✓ Will be saved" sx={{ height: 18, fontSize: 10, bgcolor: '#16a34a', color: '#fff' }} />}
      {partial && <Chip size="small" label="Incomplete" sx={{ height: 18, fontSize: 10, bgcolor: '#dc2626', color: '#fff' }} />}
    </div>
    {children}
  </div>
);

// Show only the last 4 digits of an account number.
const maskAcct = (n) => (n && n.length > 4 ? `••••${n.slice(-4)}` : n || '');

// Resolves a stored QR r2_key → signed URL and renders a thumbnail. Click
// opens the full-size image in a new tab. Renders nothing when no QR.
const QrThumb = ({ r2Key, size = 40 }) => {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!r2Key) return undefined;
    let alive = true;
    uploadsApi.signedUrl(r2Key)
      .then((r) => { if (alive) setUrl(r?.data?.url || r?.url || null); })
      .catch(() => { if (alive) setUrl(null); });
    return () => { alive = false; };
  }, [r2Key]);
  if (!r2Key) return <span style={{ color: '#9ca3af' }}>—</span>;
  if (!url) return <div style={{ width: size, height: size, borderRadius: 6, background: '#f3f4f6' }} />;
  return (
    <a href={url} target="_blank" rel="noreferrer" title="Open QR">
      <img src={url} alt="QR" style={{ width: size, height: size, objectFit: 'cover', borderRadius: 6, border: '1px solid #e5e7eb' }} />
    </a>
  );
};

const th = { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #eef0f3' };
const td = { padding: '10px 14px', fontSize: 13, borderBottom: '1px solid #eef0f3', verticalAlign: 'top' };
