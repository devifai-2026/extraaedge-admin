// Standalone "Payments" tracker — a super_admin-only, in-depth financial
// ledger across every recorded payment (admission_receipts). It reuses the
// same backend surface as the Accounts > Payment Details page
// (GET /admissions/payment-details) but wraps it in a richer view:
//   • KPI summary cards (collected today / this period / outstanding-ish),
//     fed by GET /admissions/payment-analytics
//   • a by-mode breakdown strip
//   • the full filter bar (date range, program, mode, kind, status,
//     collected-by, amount range, free-text search)
//   • a sortable, paginated ledger table with drill-in to admission + lead
//   • CSV + PDF export of the current (filtered) view
//
// RBAC: gated by the `payments` tab key. super_admin gets allowed_tabs:['*']
// from the backend so hasTab('payments') resolves true automatically — no
// backend tab-registry change is required.
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
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import RefreshIcon from '@mui/icons-material/Refresh';
import TodayIcon from '@mui/icons-material/Today';
import DateRangeIcon from '@mui/icons-material/DateRange';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PaidIcon from '@mui/icons-material/Paid';
import { admissionsApi, programsApi, usersApi } from '../../lib/endpoints';
import ViewTimelineModal from '../../components/ViewTimelineModal/ViewTimelineModal';
import { downloadCsv } from '../Accounts/utils';

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

const EMPTY_FILTERS = {
  q: '', date_from: '', date_to: '', program_id: '', mode_of_payment: '',
  receipt_kind: '', admission_status: '', collected_by: '', amount_min: '', amount_max: '',
};

const fmtDate = (v) => {
  if (!v) return '—';
  try { return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return String(v); }
};
const fmtMoney = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const fullName = (r) => [r.first_name, r.middle_name, r.last_name].filter(Boolean).join(' ').trim();

export default function PaymentsTracker() {
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
  const [exporting, setExporting] = useState(false);

  // Analytics for the KPI cards. Independent of the ledger filters so the
  // headline "today / this month" numbers stay stable while you slice the
  // table below. `days` controls the trend lookback (also used for the
  // "this period" card).
  const [analytics, setAnalytics] = useState(null);
  const [analyticsDays, setAnalyticsDays] = useState(30);

  // Filters — seed receipt_kind / admission_status from the URL so deep
  // links (e.g. ?receipt_kind=registration) land on a pre-filtered view.
  const [filters, setFilters] = useState({
    ...EMPTY_FILTERS,
    receipt_kind: searchParams.get('receipt_kind') || '',
    admission_status: searchParams.get('admission_status') || '',
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

  // KPI analytics fetch — re-runs when the lookback window changes.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await admissionsApi.paymentAnalytics({ days: analyticsDays });
        if (alive) setAnalytics(res || null);
      } catch { if (alive) setAnalytics(null); }
    })();
    return () => { alive = false; };
  }, [analyticsDays]);

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
  const clearFilters = () => setFilters({ ...EMPTY_FILTERS });
  const activeFilterCount = Object.values(filters).filter((v) => v !== '' && v != null).length;

  // ----- KPI cards derived from analytics -----
  // The analytics endpoint returns { trend:[{day,amount,count}], by_mode,
  // by_kind, totals:{amount,count}, days }. We derive "today" from the
  // last trend bucket and "this period" from totals.
  const todayBucket = useMemo(() => {
    const t = analytics?.trend;
    if (!Array.isArray(t) || !t.length) return null;
    return t[t.length - 1];
  }, [analytics]);
  const periodTotal = analytics?.totals?.amount ?? null;
  const periodCount = analytics?.totals?.count ?? null;
  const regKind = useMemo(
    () => (analytics?.by_kind || []).find((k) => k.kind === 'registration'),
    [analytics],
  );

  // ----- Export helpers -----
  // CSV: fetch the full filtered set (not just the visible page) so the
  // export matches what the filters describe, then stream it through the
  // shared downloadCsv util.
  const exportColumns = [
    { key: 'receipt_no', label: 'Receipt No' },
    { key: 'receipt_date', label: 'Date', value: (r) => fmtDate(r.receipt_date) },
    { key: 'admission_code', label: 'Admission Code' },
    { key: 'payer', label: 'Payer', value: (r) => fullName(r) },
    { key: 'whatsapp_number', label: 'Phone' },
    { key: 'lead_name', label: 'Lead' },
    { key: 'program_name', label: 'Program' },
    { key: 'amount', label: 'Amount', value: (r) => Number(r.amount || 0) },
    { key: 'mode_of_payment', label: 'Mode' },
    { key: 'receipt_kind', label: 'Kind' },
    { key: 'installment_no', label: 'Installment #' },
    { key: 'transaction_details', label: 'Txn / UTR', value: (r) => r.transaction_details || r.payment_utr || '' },
    { key: 'collected_by_name', label: 'Collected By' },
    { key: 'admission_status', label: 'Status' },
  ];

  const fetchAllForExport = useCallback(async () => {
    // Walk pages (200 at a time) until we've pulled `total`. Cap at a sane
    // ceiling so a huge tenant doesn't lock the tab; we surface the cap.
    const LIMIT = 200;
    const MAX = 5000;
    const out = [];
    let p = 1;
    const baseParams = { ...params };
    delete baseParams.page;
    delete baseParams.limit;
    while (true) {
      const res = await admissionsApi.paymentDetails({ ...baseParams, page: p, limit: LIMIT });
      const chunk = res?.data || [];
      out.push(...chunk);
      const tot = res?.meta?.total ?? out.length;
      if (out.length >= tot || out.length >= MAX || chunk.length < LIMIT) break;
      p += 1;
    }
    return out.slice(0, MAX);
  }, [params]);

  const handleExportCsv = useCallback(async () => {
    setExporting(true);
    try {
      const all = await fetchAllForExport();
      downloadCsv(`payments-${new Date().toISOString().slice(0, 10)}.csv`, exportColumns, all);
    } catch (e) {
      setError(e?.message || 'CSV export failed');
    } finally {
      setExporting(false);
    }
    // exportColumns is a stable literal; intentionally omitted from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchAllForExport]);

  const handleExportPdf = useCallback(async () => {
    setExporting(true);
    try {
      const all = await fetchAllForExport();
      const [{ default: jsPDF }, autoTableMod] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable').catch(() => null),
      ]);
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const stamp = new Date().toLocaleString('en-IN');
      doc.setFontSize(14);
      doc.text('Payments Ledger', 40, 36);
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`Generated ${stamp}  ·  ${all.length} payment(s)  ·  Total ${fmtMoney(all.reduce((s, r) => s + Number(r.amount || 0), 0))}`, 40, 52);
      doc.setTextColor(0);

      const head = [['Receipt', 'Date', 'Admission', 'Payer', 'Program', 'Amount', 'Mode', 'Kind', 'Collected By', 'Status']];
      const body = all.map((r) => [
        r.receipt_no || '',
        fmtDate(r.receipt_date),
        r.admission_code || '',
        fullName(r) || '—',
        r.program_name || '',
        fmtMoney(r.amount),
        r.mode_of_payment || '',
        r.receipt_kind || '',
        r.collected_by_name || '',
        r.admission_status || '',
      ]);

      const autoTable = autoTableMod?.default || doc.autoTable;
      if (typeof autoTable === 'function') {
        autoTable(doc, { head, body, startY: 64, styles: { fontSize: 7, cellPadding: 3 }, headStyles: { fillColor: [37, 99, 235] } });
      } else {
        // Fallback: dump rows as plain lines if autotable plugin is absent.
        let y = 70;
        doc.setFontSize(8);
        body.forEach((line) => {
          doc.text(line.join('  |  ').slice(0, 200), 40, y);
          y += 12;
          if (y > 540) { doc.addPage(); y = 40; }
        });
      }
      doc.save(`payments-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      setError(e?.message || 'PDF export failed');
    } finally {
      setExporting(false);
    }
  }, [fetchAllForExport]);

  return (
    <div style={{ background: '#fafafa', minHeight: '100vh', padding: '20px 24px 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>Payments Ledger</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
            In-depth payment tracking across every admission — filter, sort, search, drill in, and export.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <TextField select size="small" label="Period" value={analyticsDays} onChange={(e) => setAnalyticsDays(Number(e.target.value))} sx={{ width: 130 }}>
            <MenuItem value={7}>Last 7 days</MenuItem>
            <MenuItem value={30}>Last 30 days</MenuItem>
            <MenuItem value={90}>Last 90 days</MenuItem>
            <MenuItem value={365}>Last 1 year</MenuItem>
          </TextField>
          <Tooltip title="Refresh"><span><IconButton size="small" onClick={reload} disabled={loading}><RefreshIcon fontSize="small" /></IconButton></span></Tooltip>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, marginBottom: 14 }}>
        <KpiCard
          icon={<TodayIcon />} tint="#2563eb"
          label="Collected today"
          value={todayBucket ? fmtMoney(todayBucket.amount) : '—'}
          sub={todayBucket ? `${todayBucket.count} payment${todayBucket.count === 1 ? '' : 's'}` : 'No data'}
        />
        <KpiCard
          icon={<DateRangeIcon />} tint="#15803d"
          label={`Collected · last ${analyticsDays}d`}
          value={periodTotal != null ? fmtMoney(periodTotal) : '—'}
          sub={periodCount != null ? `${periodCount} payment${periodCount === 1 ? '' : 's'}` : 'No data'}
        />
        <KpiCard
          icon={<ReceiptLongIcon />} tint="#7c3aed"
          label={`Registrations · last ${analyticsDays}d`}
          value={regKind ? fmtMoney(regKind.amount) : fmtMoney(0)}
          sub={regKind ? `${regKind.count} new admission${regKind.count === 1 ? '' : 's'}` : '0 new admissions'}
        />
        <KpiCard
          icon={<PaidIcon />} tint="#d46b08"
          label="Filtered total"
          value={fmtMoney(totalAmount)}
          sub={`${total} payment${total === 1 ? '' : 's'} in current view`}
        />
      </div>

      {/* By-mode breakdown strip */}
      {Array.isArray(analytics?.by_mode) && analytics.by_mode.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>By mode</span>
          {analytics.by_mode.map((m) => (
            <span key={m.mode} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 13, color: '#374151', textTransform: 'capitalize' }}>{m.mode || 'other'}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{fmtMoney(m.amount)}</span>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>({m.count})</span>
            </span>
          ))}
        </div>
      )}

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
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 8 }}>
          <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportCsv} disabled={exporting || total === 0} sx={{ textTransform: 'none' }}>
            CSV
          </Button>
          <Button size="small" variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={handleExportPdf} disabled={exporting || total === 0} sx={{ textTransform: 'none' }}>
            PDF
          </Button>
        </span>
      </div>

      {/* Ledger table */}
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
                  <div>{fullName(r) || '—'}</div>
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

const KpiCard = ({ icon, tint, label, value, sub }) => (
  <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
    <span style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${tint}1a`, color: tint, flexShrink: 0 }}>
      {icon}
    </span>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#9ca3af' }}>{sub}</div>
    </div>
  </div>
);

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
