// Stale Leads — visibility for the 6-day / 7-day auto-handover rule.
//
// The rule (workers/sla-scanner.js + the "Stale lead — 6 days no activity"
// SLA policy): a lead with no activity for 6 days notifies its owner AND their
// manager chain; on day 7 it is auto-reassigned to someone else in the SAME
// role class — counsellor to counsellor, telecaller to telecaller. An owner
// who touches the lead on day 6 keeps it and nothing moves.
//
// All of that ran headless, so "what moved to whom?" could only be answered
// from the database. This page is that answer.
//
// Outcomes:
//   pending  — flagged on day 6, not yet escalated. Still saveable by the owner.
//   moved    — day 7 fired and the lead changed hands. `to` is the new owner.
//   held     — day 7 fired but nobody else in the same role class was free, so
//              the lead deliberately stayed put (we never cross the class, and
//              never unassign).
//   resolved — the owner acted in time. No handover.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CircularProgress, MenuItem, TextField, Chip, Tooltip } from '@mui/material';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import { reportsApi, usersApi } from '../../lib/endpoints';

const OUTCOMES = [
  { v: '', label: 'All outcomes' },
  { v: 'moved', label: 'Moved' },
  { v: 'held', label: 'Held (nobody free)' },
  { v: 'pending', label: 'Pending (day 6)' },
  { v: 'resolved', label: 'Resolved in time' },
];

const OUTCOME_STYLE = {
  moved: { bg: '#e8f5e9', fg: '#1b5e20', label: 'Moved' },
  held: { bg: '#fff3e0', fg: '#e65100', label: 'Held' },
  pending: { bg: '#e3f2fd', fg: '#0d47a1', label: 'Pending' },
  resolved: { bg: '#f5f5f5', fg: '#555', label: 'Resolved' },
};

const fmt = (v) => {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: '2-digit', hour: 'numeric', minute: '2-digit', hour12: true,
    });
  } catch { return String(v); }
};
const roleLabel = (r) => (r ? String(r).replaceAll('_', ' ') : '');

export default function StaleHandovers() {
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ pending: 0, moved: 0, held: 0 });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({
    date_from: '', date_to: '', from_user_id: '', to_user_id: '', outcome: '',
  });
  const [debounced, setDebounced] = useState(filters);
  const fkey = JSON.stringify(filters);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(JSON.parse(fkey)), 300);
    return () => clearTimeout(t);
  }, [fkey]);

  useEffect(() => {
    (async () => {
      try { const r = await usersApi.list({ limit: 200, is_active: 'true' }); setUsers(r?.data || []); }
      catch { /* dropdowns degrade to "Anyone" */ }
    })();
  }, []);

  const params = useMemo(() => {
    const p = { limit: 200 };
    for (const [k, v] of Object.entries(debounced)) { if (v !== '' && v != null) p[k] = v; }
    return p;
  }, [debounced]);

  const reload = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await reportsApi.staleHandovers(params);
      setRows(res?.data || []);
      if (res?.meta?.totals) setTotals(res.meta.totals);
    } catch (e) {
      setError(e?.message || 'Could not load stale-lead handovers'); setRows([]);
    } finally { setLoading(false); }
  }, [params]);

  useEffect(() => { reload(); }, [reload]);

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  const Stat = ({ label, value, color }) => (
    <div style={{ padding: '10px 16px', border: '1px solid #eee', borderRadius: 8, minWidth: 110 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: '#777' }}>{label}</div>
    </div>
  );

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 4px' }}>
        <HourglassBottomIcon /> Stale Leads
      </h2>
      <p style={{ margin: '0 0 16px', color: '#666', fontSize: 14, maxWidth: 860 }}>
        Leads with no activity for 6 days. On day 6 the owner and their managers are
        notified; on day 7 the lead moves to someone else in the same role — counsellors
        to counsellors, telecallers to telecallers. Touch a lead on day 6 and it stays put.
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        <Stat label="Moved (day 7)" value={totals.moved ?? 0} color="#1b5e20" />
        <Stat label="Held — nobody free" value={totals.held ?? 0} color="#e65100" />
        <Stat label="Pending (day 6)" value={totals.pending ?? 0} color="#0d47a1" />
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }}
          value={filters.date_from} onChange={set('date_from')} />
        <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }}
          value={filters.date_to} onChange={set('date_to')} />
        <TextField size="small" select label="Lost by" sx={{ minWidth: 180 }}
          value={filters.from_user_id} onChange={set('from_user_id')}>
          <MenuItem value="">Anyone</MenuItem>
          {users.map((u) => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
        </TextField>
        <TextField size="small" select label="Received by" sx={{ minWidth: 180 }}
          value={filters.to_user_id} onChange={set('to_user_id')}>
          <MenuItem value="">Anyone</MenuItem>
          {users.map((u) => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
        </TextField>
        <TextField size="small" select label="Outcome" sx={{ minWidth: 180 }}
          value={filters.outcome} onChange={set('outcome')}>
          {OUTCOMES.map((o) => <MenuItem key={o.v} value={o.v}>{o.label}</MenuItem>)}
        </TextField>
      </div>

      {error && <div style={{ color: '#c62828', marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}><CircularProgress size={28} /></div>
      ) : rows.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
          No stale-lead activity matches these filters.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #eee', borderRadius: 8 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#fafafa', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px' }}>Outcome</th>
                <th style={{ padding: '10px 12px' }}>Lead</th>
                <th style={{ padding: '10px 12px' }}>Lost by</th>
                <th style={{ padding: '10px 12px' }}>Moved to</th>
                <th style={{ padding: '10px 12px' }}>Flagged (day 6)</th>
                <th style={{ padding: '10px 12px' }}>Moved (day 7)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const st = OUTCOME_STYLE[r.outcome] || OUTCOME_STYLE.pending;
                const crossed = r.from_role && r.to_role && r.from_role !== r.to_role;
                return (
                  <tr key={r.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        background: st.bg, color: st.fg, padding: '3px 10px',
                        borderRadius: 12, fontSize: 12, fontWeight: 600,
                      }}>{st.label}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {r.lead_name || '—'}
                      <div style={{ fontSize: 12, color: '#888' }}>{r.lead_phone || ''}</div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {r.from_name || '—'}
                      <div style={{ fontSize: 12, color: '#888' }}>{roleLabel(r.from_role)}</div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {r.to_name || <span style={{ color: '#aaa' }}>—</span>}
                      <div style={{ fontSize: 12, color: '#888' }}>
                        {roleLabel(r.to_role)}
                        {crossed && (
                          <Tooltip title="This handover crossed role classes — it predates the same-role fix">
                            <Chip size="small" label="crossed" color="warning"
                              sx={{ ml: 0.5, height: 16, fontSize: 10 }} />
                          </Tooltip>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{fmt(r.flagged_at)}</td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{fmt(r.moved_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div style={{ marginTop: 12, color: '#666', fontSize: 13 }}>
          Showing {rows.length} record{rows.length === 1 ? '' : 's'}
          {rows.length >= 200 && ' (most recent 200 — narrow the dates to see more)'}
        </div>
      )}
    </div>
  );
}
