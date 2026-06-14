// Admin "Payment Details" — server-side paginated/filterable/sortable/
// searchable ledger of every recorded payment (admission_receipts), enriched
// with admission code, lead, program, payer, the accounts person who
// collected it, and the linked payment account. Rows link out to the
// admission form and the lead, and a row action opens the lead timeline.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CircularProgress, IconButton, Tooltip, Chip, Pagination, MenuItem, TextField, Button,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import TimelineIcon from '@mui/icons-material/Timeline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PersonIcon from '@mui/icons-material/Person';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import { admissionsApi, programsApi, usersApi } from '../../lib/endpoints';
import ViewTimelineModal from '../../components/ViewTimelineModal/ViewTimelineModal';

const PAGE_SIZE = 50;

const MODES = ['cash', 'online', 'upi', 'card', 'cheque', 'neft', 'bank_transfer'];
const KINDS = [
  { v: 'installment', label: 'Installment' },
  { v: 'registration', label: 'Registration' },
  { v: 'misc', label: 'Misc' },
];
const STATUSES = [
  { v: 'pending_approval', label: 'Pending Approval' },
  { v: 'attending', label: 'Attending' },
  { v: 'on_break', label: 'On Break' },
  { v: 'completed', label: 'Completed' },
  { v: 'rejected', label: 'Rejected' },
];

// Header key → server sort base. asc/desc appended on click.
const COLUMNS = [
  { key: 'receipt_no', label: 'Receipt No', sort: 'receipt_no' },
  { key: 'date', label: 'Date', sort: 'date' },
  { key: 'admission', label: 'Admission', sort: 'admission' },
  { key: 'lead', label: 'Lead', sort: null },
  { key: 'payer', label: 'Payer', sort: null },
  { key: 'program', label: 'Program', sort: null },
  { key: 'amount', label: 'Amount', sort: 'amount', align: 'right' },
  { key: 'paid_till_date', label: 'Paid Till Date', sort: null, align: 'right' },
  { key: 'due_amount', label: 'Due', sort: null, align: 'right' },
  { key: 'mode', label: 'Mode', sort: null },
  { key: 'kind', label: 'Kind', sort: null },
  { key: 'collected_by', label: 'Collected By', sort: 'collected_by' },
  { key: 'status', label: 'Status', sort: null },
  { key: 'actions', label: 'Actions', sort: null, align: 'right' },
];

const fmtDate = (v) => {
  if (!v) return '—';
  try { return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return String(v); }
};
const fmtMoney = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export default function PaymentDetails() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('date_desc');
  const [timelineLead, setTimelineLead] = useState(null);

  // Filters — seed receipt_kind / admission_status / lead_id from the URL so
  // dashboard CTAs (e.g. ?receipt_kind=registration) deep-link into a filtered
  // view. Read once on mount.
  const [filters, setFilters] = useState({
    q: '', date_from: '', date_to: '', program_id: '', mode_of_payment: '',
    receipt_kind: searchParams.get('receipt_kind') || '',
    admission_status: searchParams.get('admission_status') || '',
    collected_by: '', amount_min: '', amount_max: '',
  });
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const filtersKey = JSON.stringify(filters);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedFilters(filters), 350);
    return () => clearTimeout(t);
  }, [filtersKey, filters]);
  const debKey = JSON.stringify(debouncedFilters);
  useEffect(() => { setPage(1); }, [debKey, sort]);

  // Filter dropdown sources
  const [programs, setPrograms] = useState([]);
  const [users, setUsers] = useState([]);
  useEffect(() => {
    (async () => {
      try { const r = await programsApi.list(); setPrograms(r?.data || []); } catch { /* ignore */ }
      try { const r = await usersApi.list({ limit: 200 }); setUsers(r?.data || []); } catch { /* ignore */ }
    })();
  }, []);

  const params = useMemo(() => {
    const p = { page, limit: PAGE_SIZE, sort };
    for (const [k, v] of Object.entries(debouncedFilters)) {
      const val = typeof v === 'string' ? v.trim() : v;
      if (val !== '' && val != null) p[k] = val;
    }
    return p;
  }, [page, sort, debouncedFilters]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await admissionsApi.paymentDetails(params);
      setRows(res?.data || []);
      setTotal(res?.meta?.total ?? 0);
      setTotalAmount(res?.meta?.total_amount ?? 0);
    } catch (e) {
      setError(e?.message || 'Failed to load payments');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { reload(); }, [reload]);

  const toggleSort = (base) => {
    if (!base) return;
    setSort((prev) => (prev === `${base}_asc` ? `${base}_desc` : prev === `${base}_desc` ? 'date_desc' : `${base}_asc`));
  };
  const setF = (k) => (e) => setFilters((p) => ({ ...p, [k]: e.target.value }));
  const clearFilters = () => setFilters({
    q: '', date_from: '', date_to: '', program_id: '', mode_of_payment: '',
    receipt_kind: '', admission_status: '', collected_by: '', amount_min: '', amount_max: '',
  });
  const activeFilterCount = Object.values(filters).filter((v) => v !== '' && v != null).length;

  return (
    <div style={{ background: '#fafafa', minHeight: '100vh', padding: '20px 24px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>Payment Details</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
            Every recorded payment across admissions — filter, sort, search and drill into the admission or lead.
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: '#6b7280' }}>{total} payment{total === 1 ? '' : 's'} · total</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#15803d' }}>{fmtMoney(totalAmount)}</div>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, marginBottom: 14, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <TextField size="small" label="Search" placeholder="Receipt / ADM / name / phone / txn" value={filters.q} onChange={setF('q')} sx={{ minWidth: 250 }} />
        <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={filters.date_from} onChange={setF('date_from')} />
        <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={filters.date_to} onChange={setF('date_to')} />
        <TextField select size="small" label="Program" value={filters.program_id} onChange={setF('program_id')} sx={{ minWidth: 150 }}>
          <MenuItem value="">All</MenuItem>
          {programs.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Mode" value={filters.mode_of_payment} onChange={setF('mode_of_payment')} sx={{ minWidth: 120 }}>
          <MenuItem value="">All</MenuItem>
          {MODES.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Kind" value={filters.receipt_kind} onChange={setF('receipt_kind')} sx={{ minWidth: 130 }}>
          <MenuItem value="">All</MenuItem>
          {KINDS.map((k) => <MenuItem key={k.v} value={k.v}>{k.label}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Admission Status" value={filters.admission_status} onChange={setF('admission_status')} sx={{ minWidth: 160 }}>
          <MenuItem value="">All</MenuItem>
          {STATUSES.map((s) => <MenuItem key={s.v} value={s.v}>{s.label}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Collected By" value={filters.collected_by} onChange={setF('collected_by')} sx={{ minWidth: 150 }}>
          <MenuItem value="">All</MenuItem>
          {users.map((u) => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
        </TextField>
        <TextField size="small" type="number" label="Min ₹" value={filters.amount_min} onChange={setF('amount_min')} sx={{ width: 100 }} />
        <TextField size="small" type="number" label="Max ₹" value={filters.amount_max} onChange={setF('amount_max')} sx={{ width: 100 }} />
        {activeFilterCount > 0 && (
          <Button size="small" startIcon={<ClearAllIcon />} onClick={clearFilters} sx={{ textTransform: 'none' }}>
            Clear ({activeFilterCount})
          </Button>
        )}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1200 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {COLUMNS.map((c) => {
                const asc = c.sort && `${c.sort}_asc`;
                const desc = c.sort && `${c.sort}_desc`;
                const active = c.sort && (sort === asc || sort === desc);
                const Icon = !active ? UnfoldMoreIcon : (sort === asc ? ArrowUpwardIcon : ArrowDownwardIcon);
                return (
                  <th key={c.key} style={{ ...th, textAlign: c.align || 'left', cursor: c.sort ? 'pointer' : 'default' }}
                    onClick={() => toggleSort(c.sort)}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, justifyContent: c.align === 'right' ? 'flex-end' : 'flex-start' }}>
                      {c.label}
                      {c.sort && <Icon sx={{ fontSize: 13, color: active ? '#d46b08' : '#c9a98f' }} />}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={COLUMNS.length} style={{ padding: 40, textAlign: 'center' }}><CircularProgress size={22} /></td></tr>
            ) : error ? (
              <tr><td colSpan={COLUMNS.length} style={{ padding: 32, textAlign: 'center', color: '#dc2626' }}>{error}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={COLUMNS.length} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No payments match these filters.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid #f1f3f5', background: r.is_pending ? '#fffbeb' : undefined }}>
                <td style={td}>
                  {r.is_pending ? (
                    <Chip size="small" label="Pending verification" sx={{ height: 20, fontSize: 10, bgcolor: '#f59e0b', color: '#fff' }} />
                  ) : (
                    <div style={{ fontWeight: 600 }}>{r.receipt_no}</div>
                  )}
                  {r.payment_utr && <div style={{ fontSize: 11, color: '#6b7280' }}>UTR {r.payment_utr}</div>}
                </td>
                <td style={td}>{fmtDate(r.receipt_date)}</td>
                <td style={td}>
                  {/* Admission code → admission detail / form */}
                  <button style={linkBtn} onClick={() => navigate(`/accounts/admission/${r.admission_id}`)} title="Open admission">
                    {r.admission_code || '—'} <OpenInNewIcon sx={{ fontSize: 12 }} />
                  </button>
                </td>
                <td style={td}>
                  {r.lead_id ? (
                    <button style={linkBtn} onClick={() => navigate(`/leadlist?focus=${r.lead_id}`)} title="Open lead">
                      {r.lead_name || 'Lead'} <OpenInNewIcon sx={{ fontSize: 12 }} />
                    </button>
                  ) : <span style={{ color: '#9ca3af' }}>—</span>}
                </td>
                <td style={td}>
                  <div>{[r.first_name, r.last_name].filter(Boolean).join(' ') || '—'}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{r.whatsapp_number || r.email || ''}</div>
                </td>
                <td style={{ ...td, color: '#4b5563' }}>{r.program_name || '—'}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{fmtMoney(r.amount)}</td>
                <td style={{ ...td, textAlign: 'right', color: '#15803d', fontWeight: 600 }}>
                  {r.paid_till_date != null ? fmtMoney(r.paid_till_date) : '—'}
                </td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 600, color: Number(r.due_amount) > 0 ? '#dc2626' : '#9ca3af' }}>
                  {r.due_amount != null ? fmtMoney(r.due_amount) : '—'}
                </td>
                <td style={td}>{r.mode_of_payment || '—'}{r.is_old_collection && <span style={{ fontSize: 10, color: '#9ca3af' }}> (old)</span>}</td>
                <td style={td}>
                  <Chip size="small" label={r.receipt_kind || 'misc'} sx={{ height: 20, fontSize: 10, textTransform: 'capitalize' }} />
                  {r.receipt_kind === 'installment' && r.installment_no ? <span style={{ fontSize: 11, color: '#6b7280' }}> #{r.installment_no}</span> : null}
                </td>
                <td style={td}>
                  {r.collected_by_name ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <PersonIcon sx={{ fontSize: 14, color: '#9ca3af' }} />{r.collected_by_name}
                    </span>
                  ) : <span style={{ color: '#9ca3af' }}>—</span>}
                </td>
                <td style={td}><StatusChip status={r.admission_status} /></td>
                <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <Tooltip title="Open admission"><IconButton size="small" onClick={() => navigate(`/accounts/admission/${r.admission_id}`)}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
                  {r.lead_id && (
                    <Tooltip title="View lead timeline"><IconButton size="small" onClick={() => setTimelineLead({ id: r.lead_id, name: r.lead_name })}><TimelineIcon fontSize="small" /></IconButton></Tooltip>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && total > PAGE_SIZE && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '18px 0' }}>
          <Pagination count={Math.ceil(total / PAGE_SIZE)} page={page} onChange={(_e, p) => setPage(p)} color="primary" />
        </div>
      )}

      <ViewTimelineModal open={!!timelineLead} lead={timelineLead} onClose={() => setTimelineLead(null)} />
    </div>
  );
}

const StatusChip = ({ status }) => {
  const map = {
    pending_approval: { label: 'Pending', bg: '#f59e0b' },
    attending: { label: 'Attending', bg: '#2563eb' },
    on_break: { label: 'On Break', bg: '#9ca3af' },
    completed: { label: 'Completed', bg: '#15803d' },
    rejected: { label: 'Rejected', bg: '#dc2626' },
  };
  const m = map[status] || { label: status || '—', bg: '#9ca3af' };
  return <Chip size="small" label={m.label} sx={{ height: 20, fontSize: 10, bgcolor: m.bg, color: '#fff' }} />;
};

const th = { padding: '10px 12px', fontSize: 11, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.03em', borderBottom: '1px solid #eef0f3', whiteSpace: 'nowrap', userSelect: 'none' };
const td = { padding: '10px 12px', fontSize: 13, verticalAlign: 'top' };
const linkBtn = { background: 'none', border: 'none', padding: 0, color: '#2563eb', cursor: 'pointer', font: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 3 };
