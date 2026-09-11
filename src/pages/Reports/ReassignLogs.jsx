// Reassign Logs — super_admin only. Who moved leads between owners, when, and
// how many at a time.
//
// Why this page exists: a lead distribution rule can be configured perfectly
// and still look broken, because a manual reassign silently overrides it. The
// live lead row shows only its CURRENT owner, so from the Lead Manager a bulk
// move is indistinguishable from bad routing. This reads the immutable
// lead_assignments ledger from the ACTOR's side and makes bulk moves obvious.
//
// Rows are BATCHES, not individual transfers — a bulk reassign writes one
// ledger row per lead, so we group by (actor, from, to, type, second) and show
// the lead count. "Auto" rows (the routing engine's own writes) are hidden by
// default; the Scope filter brings them back.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CircularProgress, MenuItem, TextField, Chip, Tooltip,
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { reportsApi, usersApi } from '../../lib/endpoints';

const TYPES = [
  { v: '', label: 'All manual types' },
  { v: 'reassign', label: 'Reassign' },
  { v: 'assign', label: 'Assign' },
  { v: 'refer', label: 'Refer' },
  { v: 'unassign', label: 'Unassign' },
  { v: 'auto_assign', label: 'Auto-assign (engine)' },
];

const fmtDateTime = (v) => {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: '2-digit',
      hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
    });
  } catch { return String(v); }
};

const roleLabel = (r) => (r ? String(r).replaceAll('_', ' ') : '');

// A batch of more than ~25 leads moved in one second is almost always a bulk
// action from the lead list rather than someone working a queue by hand.
const BULK_HIGHLIGHT = 25;

export default function ReassignLogs() {
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({
    date_from: '', date_to: '', by_user_id: '', from_user_id: '', to_user_id: '',
    assignment_type: '', scope: 'manual', min_leads: '',
  });
  const [debounced, setDebounced] = useState(filters);
  const fkey = JSON.stringify(filters);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(JSON.parse(fkey)), 300);
    return () => clearTimeout(t);
  }, [fkey]);

  useEffect(() => {
    (async () => {
      // Active users only, capped at the server's 200 limit. Dropdowns degrade
      // to "Anyone" if this fails; the table still works.
      try { const r = await usersApi.list({ limit: 200, is_active: 'true' }); setUsers(r?.data || []); } catch { /* ignore */ }
    })();
  }, []);

  // Drop empty strings so we never send `by_user_id=` and fail uuid validation.
  const params = useMemo(() => {
    const p = { limit: 200 };
    for (const [k, v] of Object.entries(debounced)) { if (v !== '' && v != null) p[k] = v; }
    return p;
  }, [debounced]);

  const reload = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await reportsApi.reassignLogs(params);
      setRows(res?.data || []);
    } catch (e) {
      setError(e?.message || 'Could not load reassign logs'); setRows([]);
    } finally { setLoading(false); }
  }, [params]);

  useEffect(() => { reload(); }, [reload]);

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  const totals = useMemo(() => ({
    batches: rows.length,
    leads: rows.reduce((n, r) => n + (r.lead_count || 0), 0),
  }), [rows]);

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 4px' }}>
        <SwapHorizIcon /> Reassign Logs
      </h2>
      <p style={{ margin: '0 0 20px', color: '#666', fontSize: 14, maxWidth: 820 }}>
        Every manual lead move, newest first. One row is one action — a bulk reassign
        of 200 leads appears once, with its count. Use this when leads show up under an
        owner your distribution rules never sent them to.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }}
          value={filters.date_from} onChange={set('date_from')} />
        <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }}
          value={filters.date_to} onChange={set('date_to')} />
        <TextField size="small" select label="Performed by" sx={{ minWidth: 180 }}
          value={filters.by_user_id} onChange={set('by_user_id')}>
          <MenuItem value="">Anyone</MenuItem>
          {users.map((u) => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
        </TextField>
        <TextField size="small" select label="From owner" sx={{ minWidth: 170 }}
          value={filters.from_user_id} onChange={set('from_user_id')}>
          <MenuItem value="">Anyone</MenuItem>
          {users.map((u) => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
        </TextField>
        <TextField size="small" select label="To owner" sx={{ minWidth: 170 }}
          value={filters.to_user_id} onChange={set('to_user_id')}>
          <MenuItem value="">Anyone</MenuItem>
          {users.map((u) => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
        </TextField>
        <TextField size="small" select label="Type" sx={{ minWidth: 170 }}
          value={filters.assignment_type} onChange={set('assignment_type')}>
          {TYPES.map((t) => <MenuItem key={t.v} value={t.v}>{t.label}</MenuItem>)}
        </TextField>
        <TextField size="small" select label="Scope" sx={{ minWidth: 150 }}
          value={filters.scope} onChange={set('scope')}>
          <MenuItem value="manual">Manual only</MenuItem>
          <MenuItem value="all">Include auto-assign</MenuItem>
        </TextField>
        <TextField size="small" type="number" label="Min leads" sx={{ width: 110 }}
          inputProps={{ min: 1 }} value={filters.min_leads} onChange={set('min_leads')} />
      </div>

      {error && <div style={{ color: '#c62828', marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}><CircularProgress size={28} /></div>
      ) : rows.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
          No lead moves match these filters.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #eee', borderRadius: 8 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#fafafa', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px' }}>When</th>
                <th style={{ padding: '10px 12px' }}>Leads</th>
                <th style={{ padding: '10px 12px' }}>Performed by</th>
                <th style={{ padding: '10px 12px' }}>From</th>
                <th style={{ padding: '10px 12px' }}>To</th>
                <th style={{ padding: '10px 12px' }}>Type</th>
                <th style={{ padding: '10px 12px' }}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const big = (r.lead_count || 0) >= BULK_HIGHLIGHT;
                return (
                  <tr key={`${r.batch_at}-${r.by_user_id}-${r.to_user_id}-${i}`}
                    style={{ borderTop: '1px solid #f0f0f0', background: big ? '#fff8e1' : undefined }}>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{fmtDateTime(r.batch_at)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <Tooltip title={(r.sample_leads || []).join(', ') || ''}>
                        <span style={{ fontWeight: big ? 700 : 500 }}>
                          {r.lead_count}
                          {r.bulk && <Chip size="small" label="bulk" sx={{ ml: 1, height: 18, fontSize: 11 }} />}
                        </span>
                      </Tooltip>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {r.by_name || '—'}
                      <div style={{ fontSize: 12, color: '#888' }}>{roleLabel(r.by_role)}</div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>{r.from_name || <span style={{ color: '#aaa' }}>unassigned</span>}</td>
                    <td style={{ padding: '10px 12px' }}>
                      {r.to_name || <span style={{ color: '#aaa' }}>unassigned</span>}
                      <div style={{ fontSize: 12, color: '#888' }}>{roleLabel(r.to_role)}</div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>{String(r.assignment_type || '').replaceAll('_', ' ')}</td>
                    <td style={{ padding: '10px 12px', color: '#666', maxWidth: 260 }}>{r.reason || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div style={{ marginTop: 12, color: '#666', fontSize: 13 }}>
          {totals.batches} action{totals.batches === 1 ? '' : 's'} · {totals.leads} lead move{totals.leads === 1 ? '' : 's'}
          {rows.length >= 200 && ' (showing the most recent 200 — narrow the dates to see more)'}
        </div>
      )}
    </div>
  );
}
