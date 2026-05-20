import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button, TextField, MenuItem, Select, FormControl, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { admissionsApi } from '../../lib/endpoints';
import { fullName, fmtDate, fmtMoney } from './utils';
import StatusPill from './StatusPill';
import './Accounts.css';

// Per-admission detail page. Shows the student snapshot, education,
// fee schedule + receipts, plus a money "Add receipt" workflow.
const AdmissionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [receiptOpen, setReceiptOpen] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    return admissionsApi.get(id)
      .then((r) => setData(r?.data || null))
      .catch((e) => setError(e?.message || 'Failed to load admission'))
      .finally(() => setLoading(false));
  }, [id]);

  // Wrap in an async IIFE so the synchronous-setState-in-effect lint
  // rule isn't tripped. reload() itself does the actual fetch.
  useEffect(() => { (async () => { await reload(); })(); }, [reload]);

  if (loading) return <div className="accounts-page"><div className="accounts-empty"><CircularProgress size={20} /></div></div>;
  if (!data) return <div className="accounts-page"><Alert severity="error">{error || 'Not found'}</Alert></div>;

  return (
    <div className="accounts-page">
      <div className="accounts-page-head">
        <div>
          <div className="accounts-page-title">{fullName(data)}</div>
          <div className="accounts-page-subtitle">
            <StatusPill status={data.status} />
            {' '}· {data.program_name || '—'}{' '}· Admitted {fmtDate(data.admission_date)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(`/accounts/admission/${id}/edit`)} sx={{ textTransform: 'none' }}>
            Edit
          </Button>
          {data.status === 'pending_approval' && (
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircleIcon />}
              onClick={async () => { await admissionsApi.approve(id); await reload(); }}
              sx={{ textTransform: 'none' }}
            >
              Verify &amp; Approve
            </Button>
          )}
        </div>
      </div>

      <div className="accounts-kpi-row">
        <div className="accounts-kpi-card" style={{ '--kpi-accent': '#4f46e5' }}>
          <div className="accounts-kpi-label">Total Fees</div>
          <div className="accounts-kpi-value">₹ {fmtMoney(data.total_fees)}</div>
        </div>
        <div className="accounts-kpi-card" style={{ '--kpi-accent': '#10b981' }}>
          <div className="accounts-kpi-label">Paid Till Date</div>
          <div className="accounts-kpi-value">₹ {fmtMoney(data.paid_till_date)}</div>
        </div>
        <div className="accounts-kpi-card" style={{ '--kpi-accent': '#f59e0b' }}>
          <div className="accounts-kpi-label">Pending</div>
          <div className="accounts-kpi-value">₹ {fmtMoney(data.pending_fees)}</div>
        </div>
      </div>

      <div className="accounts-table-card" style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <KV label="Email" value={data.email} />
          <KV label="WhatsApp" value={data.whatsapp_number} />
          <KV label="Alt Contact" value={data.alternate_contact} />
          <KV label="Mode of Training" value={data.mode_of_training} />
          <KV label="Center" value={data.center_name} />
          <KV label="Counsellor" value={data.guided_by_counsellor_name} />
          <KV label="Manager" value={data.guided_by_manager_name} />
          <KV label="Source" value={data.source} />
          <KV label="Address" value={data.address} />
        </div>
      </div>

      {data.education?.length > 0 && (
        <Section title="Education">
          <table className="accounts-table">
            <thead><tr>
              <th>Examination</th><th>Stream</th><th>College</th>
              <th>Board / University</th><th>Year</th><th>%</th>
            </tr></thead>
            <tbody>
              {data.education.map((e) => (
                <tr key={e.id}>
                  <td>{e.examination}</td>
                  <td>{e.stream || '—'}</td>
                  <td>{e.college_name || '—'}</td>
                  <td>{e.board_university || '—'}</td>
                  <td>{e.year_of_passing || '—'}</td>
                  <td>{e.percentage || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      <Section
        title="Receipts"
        right={
          <Button startIcon={<AddIcon />} onClick={() => setReceiptOpen(true)} variant="outlined" sx={{ textTransform: 'none' }}>
            Add receipt
          </Button>
        }
      >
        {(!data.receipts || data.receipts.length === 0) ? (
          <div className="accounts-empty">No receipts yet.</div>
        ) : (
          <table className="accounts-table">
            <thead><tr>
              <th>Receipt No.</th><th>Date</th><th>Mode</th>
              <th style={{ textAlign: 'right' }}>Amount</th><th>Notes</th><th />
            </tr></thead>
            <tbody>
              {data.receipts.map((r) => (
                <tr key={r.id}>
                  <td>{r.receipt_no}</td>
                  <td>{fmtDate(r.receipt_date)}</td>
                  <td>{r.mode_of_payment}{r.is_old_collection ? ' · Old' : ''}</td>
                  <td style={{ textAlign: 'right' }}>{fmtMoney(r.amount)}</td>
                  <td style={{ fontSize: 12, color: '#6b7280' }}>{r.transaction_details || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={async () => {
                        if (!window.confirm('Delete this receipt?')) return;
                        await admissionsApi.deleteReceipt(r.id);
                        reload();
                      }} sx={{ color: '#dc2626' }}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <AddReceiptDialog
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        admissionId={id}
        onSaved={() => { setReceiptOpen(false); reload(); }}
      />
    </div>
  );
};

const Section = ({ title, right, children }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.04 }}>{title}</div>
      {right}
    </div>
    <div className="accounts-table-card">{children}</div>
  </div>
);

const KV = ({ label, value }) => (
  <div>
    <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.04 }}>{label}</div>
    <div style={{ fontSize: 13, color: '#111827', marginTop: 2 }}>{value || '—'}</div>
  </div>
);

const MODES = ['cash', 'online', 'cheque', 'upi', 'card'];

const AddReceiptDialog = ({ open, onClose, admissionId, onSaved }) => {
  const [form, setForm] = useState({
    receipt_date: new Date().toISOString().slice(0, 10),
    amount: '',
    mode_of_payment: 'cash',
    transaction_details: '',
    is_old_collection: false,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setErr('');
    if (!form.amount || Number(form.amount) <= 0) { setErr('Enter a positive amount'); return; }
    setSaving(true);
    try {
      await admissionsApi.createReceipt(admissionId, {
        ...form, amount: Number(form.amount),
      });
      onSaved?.();
    } catch (e) {
      setErr(e?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add Receipt</DialogTitle>
      <DialogContent>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
          <TextField label="Date" type="date" size="small" value={form.receipt_date} onChange={(e) => setForm({ ...form, receipt_date: e.target.value })} />
          <TextField label="Amount (₹)" type="number" size="small" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <FormControl size="small">
            <Select value={form.mode_of_payment} onChange={(e) => setForm({ ...form, mode_of_payment: e.target.value })}>
              {MODES.map((m) => <MenuItem key={m} value={m}>{m.toUpperCase()}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Transaction details" size="small" value={form.transaction_details} onChange={(e) => setForm({ ...form, transaction_details: e.target.value })} multiline minRows={2} />
          <label style={{ fontSize: 12, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={form.is_old_collection} onChange={(e) => setForm({ ...form, is_old_collection: e.target.checked })} />
            Old collection (pre-system entry)
          </label>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={saving} sx={{ textTransform: 'none', bgcolor: 'var(--primary)' }}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdmissionDetail;
