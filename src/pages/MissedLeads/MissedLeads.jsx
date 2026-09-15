// Missed Leads — every broken follow-up promise, scoped to who is asking.
//
// Why this page exists: leads that have a follow-up on them are deliberately
// exempt from the 6-day auto-rotation (workers/sla-scanner.js), INCLUDING ones
// whose follow-up was missed. That exemption is correct — a missed follow-up
// means the OWNER needs chasing, not that the lead should be taken off them —
// but on its own it would let those leads go quiet. This tab is the
// counterweight: it puts every broken commitment in front of the owner and
// everyone above them.
//
// Scoping is entirely server-side (GET /follow-ups/missed): a counsellor or
// telecaller sees only their own, a sales manager / telecaller lead / branch
// manager sees their team's, a super admin sees the tenant's. The owner column
// and the owner filter are therefore only meaningful for the manager tiers, and
// are hidden for lead owners looking at their own list.
//
// Rows are grouped per LEAD, not per follow-up: one lead with four missed
// follow-ups is one problem to solve, not four. missed_count carries the
// repetition, which is the part worth acting on.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircularProgress, MenuItem, TextField, Chip } from '@mui/material';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import { followUpsApi, usersApi } from '../../lib/endpoints';
import { isLeadOwnerRole, LEAD_OWNER_ROLES_PARAM } from '../../lib/rbac';

const fmtDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    day: 'numeric', month: 'short', year: '2-digit', hour: 'numeric', minute: '2-digit',
  });
};

// How overdue the promise is. The number is what makes a row urgent, so it
// leads the column rather than hiding inside a date string.
const overdueFor = (v) => {
  if (!v) return null;
  const ms = Date.now() - new Date(v).getTime();
  if (Number.isNaN(ms) || ms < 0) return null;
  const days = Math.floor(ms / 86400000);
  if (days >= 1) return `${days}d overdue`;
  const hours = Math.floor(ms / 3600000);
  return hours >= 1 ? `${hours}h overdue` : 'just now';
};

export default function MissedLeads() {
  const navigate = useNavigate();
  const ownerScoped = isLeadOwnerRole();

  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ leads: 0, missed_followups: 0 });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ user_id: '', q: '' });
  const [debounced, setDebounced] = useState(filters);

  const fkey = JSON.stringify(filters);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(JSON.parse(fkey)), 300);
    return () => clearTimeout(t);
  }, [fkey]);

  // Owner dropdown is a manager-tier affordance; a lead owner's list is
  // already only their own, so we don't fetch the roster for them.
  useEffect(() => {
    if (ownerScoped) return;
    (async () => {
      try {
        const r = await usersApi.list({ limit: 200, is_active: 'true', role: LEAD_OWNER_ROLES_PARAM });
        setUsers(r?.data || []);
      } catch { /* dropdown degrades to "Anyone" */ }
    })();
  }, [ownerScoped]);

  const params = useMemo(() => {
    const p = { limit: 200 };
    if (debounced.q) p.q = debounced.q;
    if (debounced.user_id && !ownerScoped) p.user_id = debounced.user_id;
    return p;
  }, [debounced, ownerScoped]);

  const reload = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await followUpsApi.missed(params);
      setRows(res?.data || []);
      if (res?.meta?.totals) setTotals(res.meta.totals);
    } catch (e) {
      setError(e?.message || 'Could not load missed leads');
    } finally {
      setLoading(false);
    }
  }, [params]);
  useEffect(() => { reload(); }, [reload]);

  // Clicking a row opens that lead's card, which lands on the tab carrying the
  // follow-up schedule. `?focus=<id>` is the existing deep-link LeadList
  // already honours (it also powers notification clicks), and `highlight`
  // drives the 3-second ring on the row it came from.
  const openLead = (leadId) => {
    navigate(`/leadlist?focus=${leadId}&highlight=${leadId}`);
  };

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
        <EventBusyIcon /> Missed Leads
      </h2>
      <p style={{ margin: '0 0 16px', color: '#666', fontSize: 14, maxWidth: 860 }}>
        Leads whose follow-up was promised and not kept. {ownerScoped
          ? 'These are yours to reschedule — open one to pick a new date.'
          : 'Scoped to your team. Open a lead to see its follow-up schedule.'}{' '}
        A lead with a follow-up is never auto-reassigned, so these need chasing here.
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        <Stat label="Leads" value={totals.leads ?? 0} color="#c62828" />
        <Stat label="Missed follow-ups" value={totals.missed_followups ?? 0} color="#e65100" />
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <TextField
          size="small"
          label="Search lead"
          placeholder="Name or phone"
          sx={{ minWidth: 220 }}
          value={filters.q}
          onChange={set('q')}
        />
        {!ownerScoped && (
          <TextField size="small" select label="Owner" sx={{ minWidth: 200 }}
            value={filters.user_id} onChange={set('user_id')}>
            <MenuItem value="">Anyone</MenuItem>
            {users.map((u) => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
          </TextField>
        )}
      </div>

      {error && <div style={{ color: '#c62828', marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}><CircularProgress size={28} /></div>
      ) : rows.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
          No missed follow-ups{ownerScoped ? '' : ' in your team'}. Nothing to chase.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #eee', borderRadius: 8 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#fafafa', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px' }}>Lead</th>
                {!ownerScoped && <th style={{ padding: '10px 12px' }}>Owner</th>}
                <th style={{ padding: '10px 12px' }}>Missed</th>
                <th style={{ padding: '10px 12px' }}>Was due</th>
                <th style={{ padding: '10px 12px' }}>What was promised</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.lead_id}
                  onClick={() => openLead(r.lead_id)}
                  style={{ borderTop: '1px solid #f0f0f0', cursor: 'pointer' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#fffdf5'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  title="Open this lead's follow-up schedule"
                >
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 600 }}>{r.lead_name || 'Unknown'}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{r.lead_phone || '—'}</div>
                  </td>
                  {!ownerScoped && (
                    <td style={{ padding: '10px 12px' }}>
                      <div>{r.owner_name || '—'}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{r.owner_role || ''}</div>
                    </td>
                  )}
                  <td style={{ padding: '10px 12px' }}>
                    <Chip
                      size="small"
                      label={r.missed_count}
                      sx={{
                        background: r.missed_count > 1 ? '#ffebee' : '#fff3e0',
                        color: r.missed_count > 1 ? '#c62828' : '#e65100',
                        fontWeight: 700,
                      }}
                    />
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div>{fmtDate(r.last_missed_at)}</div>
                    <div style={{ fontSize: 12, color: '#c62828' }}>{overdueFor(r.last_missed_at)}</div>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#555', maxWidth: 340 }}>
                    {r.last_comment || <span style={{ color: '#bbb' }}>No note</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
