// Lead Transfer Report — admin + sales_manager. Every assign/reassign as a
// row: previous owner, current owner, the stage the lead was at when
// transferred, who performed it, and the lead's qualification (first time it
// hit a success stage + who owned it then). Filter by date range + user +
// transfer type, and download the whole filtered set as Excel.
//
// Why this exists: once a counsellor moves a reassigned lead forward, the
// lead's live owner/stage overwrite the old values — so "how many leads did
// this telecaller qualify last week" was impossible to answer from the live
// row. This report reads the immutable lead_assignments ledger + stage
// snapshot instead.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CircularProgress, MenuItem, TextField, Button, Chip, Tooltip, IconButton,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { reportsApi, usersApi } from '../../lib/endpoints';

const TYPES = [
  { v: 'assign', label: 'Assign' },
  { v: 'reassign', label: 'Reassign' },
  { v: 'auto_assign', label: 'Auto-assign' },
  { v: 'refer', label: 'Refer' },
  { v: 'unassign', label: 'Unassign' },
];

const fmtDateTime = (v) => {
  if (!v) return '—';
  try { return new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: 'numeric', minute: '2-digit', hour12: true }); }
  catch { return String(v); }
};
const roleLabel = (r) => (r ? String(r).replace('_', ' ') : '');

export default function LeadTransferReport() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  // { leads, transfers } from the API meta — drives the "N leads · M
  // transfers" footer. Rows are one-per-transfer; never-transferred leads
  // still appear once, so the two counts differ.
  const [counts, setCounts] = useState({ leads: 0, transfers: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [users, setUsers] = useState([]);

  const [filters, setFilters] = useState({
    date_from: '', date_to: '', from_user_id: '', to_user_id: '', by_user_id: '', assignment_type: '', role: '',
    qualified_by_user_id: '', qualified_date_from: '', qualified_date_to: '',
  });
  const [debounced, setDebounced] = useState(filters);
  const fkey = JSON.stringify(filters);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(filters), 300);
    return () => clearTimeout(t);
  }, [fkey, filters]);

  useEffect(() => {
    (async () => {
      // limit is capped at 200 server-side; 300 would 400 and leave the
      // owner dropdowns empty (showing only "Any"). Fetch active users only.
      try { const r = await usersApi.list({ limit: 200, is_active: 'true' }); setUsers(r?.data || []); } catch { /* ignore */ }
    })();
  }, []);

  const params = useMemo(() => {
    const p = { limit: 1000 };
    for (const [k, v] of Object.entries(debounced)) { if (v) p[k] = v; }
    return p;
  }, [debounced]);

  const reload = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await reportsApi.leadTransfers(params);
      setRows(res?.data || []);
      setCounts({ leads: res?.meta?.lead_count ?? 0, transfers: res?.meta?.transfer_count ?? 0 });
    } catch (e) {
      setError(e?.message || 'Failed to load report'); setRows([]); setCounts({ leads: 0, transfers: 0 });
    } finally { setLoading(false); }
  }, [params]);

  useEffect(() => { reload(); }, [reload]);

  const setF = (k) => (e) => setFilters((p) => ({ ...p, [k]: e.target.value }));
  const clear = () => setFilters({
    date_from: '', date_to: '', from_user_id: '', to_user_id: '', by_user_id: '', assignment_type: '', role: '',
    qualified_by_user_id: '', qualified_date_from: '', qualified_date_to: '',
  });
  const activeFilters = Object.values(filters).filter(Boolean).length;

  const onExport = async () => {
    setExporting(true);
    try {
      const p = {};
      for (const [k, v] of Object.entries(debounced)) { if (v) p[k] = v; }
      await reportsApi.downloadLeadTransfers(p);
    } catch (e) {
      setError(e?.message || 'Export failed');
    } finally { setExporting(false); }
  };

  return (
    <div style={{ background: '#fafafa', minHeight: '100vh', padding: '20px 24px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>Lead Report</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
            Every lead with its transfer history — previous &amp; current owner, the stage at the moment of
            transfer, and qualification. One row per transfer; never-transferred leads still appear.
          </div>
        </div>
        <Button
          variant="contained"
          startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
          onClick={onExport}
          disabled={exporting || loading}
          sx={{ textTransform: 'none', bgcolor: '#15803d', '&:hover': { bgcolor: '#166534' } }}
        >
          {exporting ? 'Exporting…' : 'Export Excel'}
        </Button>
      </div>

      {/* Filter bar */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, marginBottom: 14, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
        <DateField label="Transfer From" value={filters.date_from} onChange={setF('date_from')} />
        <DateField label="Transfer To" value={filters.date_to} onChange={setF('date_to')} />
        <TextField select size="small" label="Transferred From" value={filters.from_user_id} onChange={setF('from_user_id')} sx={{ minWidth: 170 }}>
          <MenuItem value="">Any</MenuItem>
          {users.map((u) => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Transferred To" value={filters.to_user_id} onChange={setF('to_user_id')} sx={{ minWidth: 170 }}>
          <MenuItem value="">Any</MenuItem>
          {users.map((u) => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Performed By" value={filters.by_user_id} onChange={setF('by_user_id')} sx={{ minWidth: 160 }}>
          <MenuItem value="">Any</MenuItem>
          {users.map((u) => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Type" value={filters.assignment_type} onChange={setF('assignment_type')} sx={{ minWidth: 130 }}>
          <MenuItem value="">All</MenuItem>
          {TYPES.map((t) => <MenuItem key={t.v} value={t.v}>{t.label}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Owner Role" value={filters.role} onChange={setF('role')} sx={{ minWidth: 140 }}>
          <MenuItem value="">All roles</MenuItem>
          <MenuItem value="counsellor">Counsellor</MenuItem>
          <MenuItem value="sales_manager">Sales Manager</MenuItem>
          <MenuItem value="super_admin">Admin</MenuItem>
        </TextField>
        <TextField select size="small" label="Qualified By" value={filters.qualified_by_user_id} onChange={setF('qualified_by_user_id')} sx={{ minWidth: 170 }}>
          <MenuItem value="">Any</MenuItem>
          {users.map((u) => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
        </TextField>
        <DateField label="Qualified From" value={filters.qualified_date_from} onChange={setF('qualified_date_from')} />
        <DateField label="Qualified To" value={filters.qualified_date_to} onChange={setF('qualified_date_to')} />
        {activeFilters > 0 && <Button size="small" onClick={clear} sx={{ textTransform: 'none' }}>Clear ({activeFilters})</Button>}
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#6b7280' }}>
          {counts.leads} lead{counts.leads === 1 ? '' : 's'} · {counts.transfers} transfer{counts.transfers === 1 ? '' : 's'}
        </span>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={th}>Lead</th>
              <th style={th}>Type</th>
              <th style={th}>Transferred From</th>
              <th style={th}>Transferred To</th>
              <th style={th}>Stage at Transfer</th>
              <th style={th}>Performed By</th>
              <th style={th}>Qualified By</th>
              <th style={th}>Qualified Date</th>
              <th style={th}>Transferred At</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center' }}><CircularProgress size={22} /></td></tr>
            ) : error ? (
              <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: '#dc2626' }}>{error}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No leads match these filters.</td></tr>
            ) : rows.map((r, i) => (
              <tr key={r.id || `lead-${r.lead_id}-${i}`} style={{ borderTop: '1px solid #f1f3f5' }}>
                <td style={td}>
                  <button style={linkBtn} onClick={() => r.lead_id && navigate(`/leadlist?focus=${r.lead_id}`)} title="Open lead">
                    {r.lead_name || '—'} <OpenInNewIcon sx={{ fontSize: 12 }} />
                  </button>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{r.lead_phone || ''}</div>
                </td>
                <td style={td}>{r.assignment_type
                  ? <Chip size="small" label={r.assignment_type} sx={{ height: 20, fontSize: 10, textTransform: 'capitalize' }} />
                  : <span style={{ color: '#9ca3af' }}>No transfer</span>}</td>
                <td style={td}>{r.previous_owner || <span style={{ color: '#9ca3af' }}>—</span>}{r.previous_owner_role && <div style={{ fontSize: 11, color: '#9ca3af' }}>{roleLabel(r.previous_owner_role)}</div>}</td>
                <td style={td}>{r.current_owner || <span style={{ color: '#9ca3af' }}>—</span>}{r.current_owner_role && <div style={{ fontSize: 11, color: '#9ca3af' }}>{roleLabel(r.current_owner_role)}</div>}</td>
                <td style={td}>{r.stage_at_transfer ? <Chip size="small" label={r.stage_at_transfer} sx={{ height: 20, fontSize: 10 }} /> : <span style={{ color: '#9ca3af' }}>—</span>}{r.sub_stage_at_transfer && <div style={{ fontSize: 11, color: '#9ca3af' }}>{r.sub_stage_at_transfer}</div>}</td>
                <td style={td}>{r.performed_by || <span style={{ color: '#9ca3af' }}>system</span>}</td>
                <td style={td}>{r.qualified_by || <span style={{ color: '#9ca3af' }}>—</span>}</td>
                <td style={td}>{r.qualified_at ? fmtDateTime(r.qualified_at) : <span style={{ color: '#9ca3af' }}>—</span>}</td>
                <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmtDateTime(r.transferred_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Date filter with the label rendered ABOVE the box (not floating inside).
// A native <input type="date"> always shows its own dd/mm/yyyy placeholder,
// so MUI's floating label overlaps it and renders as garbled text. Stacking
// the label on top sidesteps that entirely.
const DateField = ({ label, value, onChange }) => (
  <label style={{ display: 'inline-flex', flexDirection: 'column', gap: 3 }}>
    <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280' }}>{label}</span>
    <input
      type="date"
      value={value || ''}
      onChange={onChange}
      style={{
        height: 38, width: 150, padding: '0 10px', fontSize: 13, color: '#111827',
        border: '1px solid #c4c4c4', borderRadius: 4, background: '#fff',
        fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
      }}
    />
  </label>
);

const th = { padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.03em', borderBottom: '1px solid #eef0f3', whiteSpace: 'nowrap' };
const td = { padding: '10px 12px', fontSize: 13, verticalAlign: 'top' };
const linkBtn = { background: 'none', border: 'none', padding: 0, color: '#2563eb', cursor: 'pointer', font: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 3 };
