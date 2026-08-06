// Full counsellor / user profile page (replaces the old in-place popup).
// Sections:
//   - Basic info card (name, email, phone, role, designation, manager hierarchy)
//   - KPI strip (current leads, past leads, login days, total active hours 30d)
//   - Tabs: Current Leads · Past Leads · Time Sheet · Login Activity
//
// Reads:
//   /users/:id                           → user header
//   /users/:id/leads?status=current|past → tabbed lead lists
//   /users/:id/work-sessions             → time sheet
//   /users/:id/login-events              → login audit
//   /analytics/login-events?user_id=     → daily aggregate (chart)
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Avatar, Typography, Chip, Tabs, Tab, IconButton, CircularProgress,
  Table, TableHead, TableRow, TableCell, TableBody, Tooltip, Button, Menu, MenuItem,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import BadgeIcon from '@mui/icons-material/Badge';
import DownloadIcon from '@mui/icons-material/Download';
import { usersApi, analyticsApi } from '../../lib/endpoints';
import AddNewLead from '../../components/AddNewLead/AddNewLead';
import LoginActivityMap from '../../components/LoginActivityMap/LoginActivityMap';
import { downloadXls, downloadCsv } from '../../lib/exportTable';

const fmt = (v) => {
  if (!v) return '-';
  try { return new Date(v).toLocaleString(); } catch { return String(v); }
};
const fmtDate = (v) => {
  if (!v) return '-';
  try { return new Date(v).toLocaleDateString(); } catch { return ''; }
};
const fmtDuration = (sec) => {
  if (sec == null) return '-';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const Kpi = ({ label, value, accent, hint }) => (
  <Tooltip title={hint || ''} disableHoverListener={!hint}>
    <Box sx={{
      flex: 1, minWidth: 160, background: '#fff', border: '1px solid #e8e8e8',
      borderRadius: 1.5, p: 2, borderLeft: `4px solid ${accent || '#E53935'}`,
    }}>
      <Box sx={{ fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</Box>
      <Box sx={{ fontSize: 24, fontWeight: 700, color: '#222', mt: 0.5 }}>{value}</Box>
    </Box>
  </Tooltip>
);

// hours=87600 (~10y) is the backend's own cap for "lifetime" — sending a
// literal no-filter option would need a separate code path server-side for
// no real benefit at this scale.
const RANGES = [
  { key: '6h', label: '6h', hours: 6 },
  { key: '24h', label: '24h', hours: 24 },
  { key: '7d', label: '7d', hours: 168 },
  { key: '30d', label: '30d', hours: 720 },
  { key: 'lifetime', label: 'Lifetime', hours: 87600 },
];

export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [tab, setTab] = useState(0);
  const [editLead, setEditLead] = useState(null);
  const [downloadAnchor, setDownloadAnchor] = useState(null);
  const [rangeKey, setRangeKey] = useState('30d');
  const range = RANGES.find((r) => r.key === rangeKey) || RANGES[3];

  // Tab data buckets
  const [currentLeads, setCurrentLeads] = useState([]);
  const [pastLeads, setPastLeads] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loginEvents, setLoginEvents] = useState([]);
  const [loginAgg, setLoginAgg] = useState([]); // per-day aggregate
  const [activitySummary, setActivitySummary] = useState(null); // { active_minutes, genuine_minutes, leads_created_*, lead_activity_count }
  const [loadingTab, setLoadingTab] = useState(false);

  // Header
  useEffect(() => {
    let alive = true;
    setLoadingUser(true);
    usersApi.get(id)
      .then((r) => { if (alive) setUser(r?.data || null); })
      .catch(() => { if (alive) setUser(null); })
      .finally(() => { if (alive) setLoadingUser(false); });
    return () => { alive = false; };
  }, [id]);

  // Current/past leads are present-state, not historical events — they don't
  // depend on the time-range filter, so they're fetched once per id rather
  // than re-fetched on every range change.
  useEffect(() => {
    if (!id) return;
    let alive = true;
    Promise.all([
      usersApi.leads(id, { status: 'current' }).then((r) => r?.data || []).catch(() => []),
      usersApi.leads(id, { status: 'past' }).then((r) => r?.data || []).catch(() => []),
    ]).then(([cur, past]) => {
      if (!alive) return;
      setCurrentLeads(cur);
      setPastLeads(past);
    });
    return () => { alive = false; };
  }, [id]);

  // Everything else is time-ranged — re-fetches whenever the 6h/24h/7d/30d/
  // lifetime filter changes.
  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoadingTab(true);
    const hours = range.hours;
    Promise.all([
      usersApi.workSessions(id, { hours }).then((r) => r?.data || []).catch(() => []),
      usersApi.loginEvents(id, { hours }).then((r) => r?.data || []).catch(() => []),
      analyticsApi.loginEvents({ user_id: id, days: Math.max(1, Math.ceil(hours / 24)) }).then((r) => r?.data || []).catch(() => []),
      usersApi.activitySummary(id, { hours }).then((r) => r?.data || null).catch(() => null),
    ]).then(([ws, le, agg, activity]) => {
      if (!alive) return;
      setSessions(ws);
      setLoginEvents(le);
      setLoginAgg(agg);
      setActivitySummary(activity);
    }).finally(() => { if (alive) setLoadingTab(false); });
    return () => { alive = false; };
  }, [id, range.hours]);

  const totalActiveSeconds = useMemo(
    () => sessions.reduce((sum, s) => sum + (s.active_seconds ?? (s.active_minutes ?? 0) * 60), 0),
    [sessions],
  );
  const distinctLoginDays = useMemo(
    () => new Set(loginAgg.map((r) => r.day?.slice(0, 10))).size,
    [loginAgg],
  );
  const autoClosedCount = useMemo(
    () => sessions.filter((s) => s.auto_closed).length,
    [sessions],
  );
  // % of tracked minutes backed by a real mouse/keyboard pattern, not just an
  // API call happening — see useGenuineActivity / work_activity_minutes.source.
  const genuinePct = useMemo(() => {
    if (!activitySummary || !activitySummary.active_minutes) return null;
    return Math.round((activitySummary.genuine_minutes / activitySummary.active_minutes) * 100);
  }, [activitySummary]);

  // Export the time-sheet to Excel (.xls) or CSV. Format mirrors the on-screen
  // table so users can audit / share without re-formatting.
  const exportTimeSheet = (format) => {
    const safeName = (user?.name || 'user').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const today = new Date().toISOString().slice(0, 10);
    const filename = `timesheet-${safeName}-${today}.${format === 'xls' ? 'xls' : 'csv'}`;
    const cols = [
      { key: 'date',    label: 'Date',        get: (s) => s.started_at ? new Date(s.started_at).toLocaleDateString() : '' },
      { key: 'started', label: 'Started',     get: (s) => s.started_at ? new Date(s.started_at).toLocaleTimeString() : '' },
      { key: 'ended',   label: 'Ended',       get: (s) => s.ended_at ? new Date(s.ended_at).toLocaleTimeString() : '' },
      { key: 'active_seconds', label: 'Active seconds',  get: (s) => s.active_seconds ?? 0 },
      { key: 'active_pretty',  label: 'Active time',     get: (s) => fmtDuration(s.active_seconds) },
      { key: 'paused_seconds', label: 'Paused seconds',  get: (s) => s.paused_seconds ?? 0 },
      { key: 'paused_pretty',  label: 'Paused time',     get: (s) => fmtDuration(s.paused_seconds) },
      { key: 'status',  label: 'Status',      get: (s) => s.status + (s.restart_of_day ? ' · restarted' : '') },
    ];
    if (format === 'xls') downloadXls(filename, 'Time Sheet', cols, sessions);
    else downloadCsv(filename, cols, sessions);
  };

  if (loadingUser) {
    return <Box sx={{ p: 8, textAlign: 'center' }}><CircularProgress /></Box>;
  }
  if (!user) {
    return <Box sx={{ p: 4, color: '#888' }}>User not found.</Box>;
  }

  const initial = (user.name || user.email || '?')[0].toUpperCase();

  return (
    <Box sx={{ pb: 4 }}>
      {/* Back + title */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <IconButton onClick={() => navigate(-1)} title="Back">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>User Profile</Typography>
      </Box>

      {/* Basic info card */}
      <Box sx={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 1.5, p: 3, mb: 2, display: 'flex', gap: 3, alignItems: 'flex-start' }}>
        <Avatar sx={{ width: 80, height: 80, bgcolor: '#E53935', fontSize: 32 }}>{initial}</Avatar>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>{user.name}</Typography>
            <Chip
              label={String(user.role || '').replace('_', ' ')}
              size="small"
              sx={{ background: '#fdf3ed', color: '#c84200', fontWeight: 600, textTransform: 'uppercase' }}
            />
            {user.is_active === false && <Chip label="INACTIVE" size="small" color="default" />}
          </Box>
          {user.designation && (
            <Typography variant="body2" sx={{ color: '#666', mt: 0.5 }}>
              <BadgeIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
              {user.designation}
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 3, mt: 1.5, flexWrap: 'wrap', fontSize: 13, color: '#444' }}>
            <span><EmailIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5, color: '#888' }} />{user.email}</span>
            {user.phone && <span><PhoneIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5, color: '#888' }} />{user.phone}</span>}
          </Box>
          {user.role_name && (
            <Typography variant="body2" sx={{ color: '#666', mt: 1 }}>
              <b>Custom role:</b> {user.role_name}
            </Typography>
          )}
          <Typography variant="body2" sx={{ color: '#666', mt: 0.5 }}>
            <b>Last login:</b> {fmt(user.last_login_at)}
          </Typography>
          <Typography variant="body2" sx={{ color: '#666', mt: 0.5 }}>
            <b>Joined:</b> {fmt(user.created_at)}
          </Typography>
        </Box>
      </Box>

      {/* Time-range filter — everything below except Current/Past leads
          (those are present-state, not history) re-fetches on change. */}
      <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
        {RANGES.map((r) => (
          <Button
            key={r.key}
            size="small"
            variant={r.key === rangeKey ? 'contained' : 'outlined'}
            onClick={() => setRangeKey(r.key)}
            sx={{ textTransform: 'none', minWidth: 0, px: 1.5 }}
          >
            {r.label}
          </Button>
        ))}
      </Box>

      {/* KPI strip */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <Kpi label="Current leads" value={currentLeads.length} accent="#E53935" />
        <Kpi label="Past leads" value={pastLeads.length} accent="#FB8C00" />
        <Kpi label={`Login days (${range.label})`} value={distinctLoginDays} accent="#1E88E5" />
        <Kpi label={`Active time (${range.label})`} value={fmtDuration(totalActiveSeconds)} accent="#43A047" />
        <Kpi
          label={`Genuine activity (${range.label})`}
          value={genuinePct == null ? '—' : `${genuinePct}%`}
          accent={genuinePct != null && genuinePct < 50 ? '#dc2626' : '#00897B'}
        />
        <Kpi
          label={`Forgot to clock out (${range.label})`}
          value={autoClosedCount}
          accent={autoClosedCount > 0 ? '#dc2626' : '#8E24AA'}
        />
        <Kpi
          label={`Leads created/assigned (${range.label})`}
          value={(activitySummary?.leads_created_total ?? 0) + (activitySummary?.leads_assigned_by_system ?? 0)}
          accent="#00838F"
          hint={activitySummary
            ? `${activitySummary.leads_created_manual ?? 0} manually created · ${activitySummary.leads_created_bulk ?? 0} via bulk upload · ${activitySummary.leads_assigned_by_system ?? 0} system-assigned (round-robin)`
            : ''}
        />
        <Kpi
          label={`Lead activity (${range.label})`}
          value={activitySummary?.lead_activity_count ?? 0}
          accent="#6D4C41"
          hint="Stage moves + any other lead activity logged for this user"
        />
      </Box>

      {/* Tabs */}
      <Box sx={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 1.5 }}>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ borderBottom: '1px solid #eee' }}>
          <Tab label={`Current Leads (${currentLeads.length})`} />
          <Tab label={`Past Leads (${pastLeads.length})`} />
          <Tab label={`Time Sheet (${sessions.length})`} />
          <Tab label={`Login Activity (${loginEvents.length})`} />
        </Tabs>

        {loadingTab && <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={24} /></Box>}

        {!loadingTab && tab === 0 && (
          <LeadsTable rows={currentLeads} onClick={setEditLead} emptyText="No leads currently assigned." />
        )}
        {!loadingTab && tab === 1 && (
          <LeadsTable rows={pastLeads} onClick={setEditLead} emptyText="No past leads." showAssigned />
        )}

        {!loadingTab && tab === 2 && (
          <Box>
            {/* Toolbar above the time-sheet — Download → Excel | CSV */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', p: 1, borderBottom: '1px solid #f0f0f0' }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<DownloadIcon fontSize="small" />}
                onClick={(e) => setDownloadAnchor(e.currentTarget)}
                disabled={sessions.length === 0}
                sx={{ textTransform: 'none' }}
              >
                Download
              </Button>
              <Menu
                anchorEl={downloadAnchor}
                open={Boolean(downloadAnchor)}
                onClose={() => setDownloadAnchor(null)}
              >
                <MenuItem onClick={() => { setDownloadAnchor(null); exportTimeSheet('xls'); }}>
                  Download as Excel (.xls)
                </MenuItem>
                <MenuItem onClick={() => { setDownloadAnchor(null); exportTimeSheet('csv'); }}>
                  Download as CSV
                </MenuItem>
              </Menu>
            </Box>
          <Box sx={{ overflow: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ background: '#fdf3ed' }}>
                  <TableCell>Date</TableCell>
                  <TableCell>Started</TableCell>
                  <TableCell>Ended</TableCell>
                  <TableCell>Active time</TableCell>
                  <TableCell>Paused</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sessions.length === 0 && (
                  <TableRow><TableCell colSpan={6} sx={{ p: 3, color: '#888', textAlign: 'center' }}>No sessions in this range.</TableCell></TableRow>
                )}
                {sessions.map((s) => (
                  <TableRow key={s.id} hover>
                    <TableCell>{fmtDate(s.started_at)}</TableCell>
                    <TableCell>{new Date(s.started_at).toLocaleTimeString()}</TableCell>
                    <TableCell>{s.ended_at ? new Date(s.ended_at).toLocaleTimeString() : '—'}</TableCell>
                    <TableCell>{fmtDuration(s.active_seconds)}</TableCell>
                    <TableCell>{fmtDuration(s.paused_seconds)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={s.status + (s.restart_of_day ? ' · restarted' : '')}
                        sx={{ height: 20, fontSize: 11, background: s.status === 'active' ? '#e8f5e9' : s.status === 'stopped' ? '#fbe9e7' : '#fff8e1' }}
                      />
                      {s.auto_closed && (
                        <Tooltip title="Forgot to clock out — the system auto-closed this session at midnight">
                          <Chip
                            size="small"
                            label="Auto-closed"
                            sx={{ height: 20, fontSize: 11, ml: 0.5, background: '#fdecea', color: '#c62828', fontWeight: 600 }}
                          />
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
          </Box>
        )}

        {!loadingTab && tab === 3 && (
          <Box sx={{ overflow: 'auto' }}>
            <Box sx={{ p: 1.5 }}>
              <LoginActivityMap events={loginEvents} />
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ background: '#fdf3ed' }}>
                  <TableCell>When</TableCell>
                  <TableCell>Event</TableCell>
                  <TableCell>IP</TableCell>
                  <TableCell>ISP</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>User-Agent</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loginEvents.length === 0 && (
                  <TableRow><TableCell colSpan={6} sx={{ p: 3, color: '#888', textAlign: 'center' }}>No login activity in this range.</TableCell></TableRow>
                )}
                {loginEvents.map((e, i) => (
                  <TableRow key={i} hover>
                    <TableCell>{fmt(e.created_at)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={e.kind}
                        sx={{
                          height: 20, fontSize: 11,
                          background: e.kind === 'login' ? '#e8f5e9' : e.kind === 'logout' ? '#fff8e1' : '#fbe9e7',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, color: '#666' }}>{e.ip || '—'}</TableCell>
                    <TableCell sx={{ fontSize: 12, color: '#666', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Tooltip title={e.geo_isp || ''}><span>{e.geo_isp || '—'}</span></Tooltip>
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, color: '#666' }}>
                      {e.geo_city || e.geo_country ? `${e.geo_city || ''}${e.geo_city && e.geo_country ? ', ' : ''}${e.geo_country || ''}` : '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, color: '#666', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Tooltip title={e.user_agent || ''}><span>{e.user_agent || '—'}</span></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Box>

      <AddNewLead
        open={!!editLead}
        leadData={editLead}
        onClose={() => setEditLead(null)}
        onSaved={() => { setEditLead(null); }}
      />
    </Box>
  );
}

function LeadsTable({ rows, onClick, emptyText, showAssigned = false }) {
  return (
    <Box sx={{ overflow: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ background: '#fdf3ed' }}>
            <TableCell>Name</TableCell>
            <TableCell>Phone</TableCell>
            <TableCell>Stage</TableCell>
            <TableCell>Program</TableCell>
            <TableCell>Score</TableCell>
            <TableCell>Updated</TableCell>
            {showAssigned && <TableCell>Now owned by</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={showAssigned ? 7 : 6} sx={{ p: 3, color: '#888', textAlign: 'center' }}>
                {emptyText}
              </TableCell>
            </TableRow>
          )}
          {rows.map((l) => (
            <TableRow
              key={l.id + (l.assigned_at || '')}
              hover
              sx={{ cursor: 'pointer' }}
              onClick={() => onClick?.(l)}
            >
              <TableCell sx={{ fontWeight: 600 }}>{l.name || '—'}</TableCell>
              <TableCell>{l.phone || l.email || '—'}</TableCell>
              <TableCell>{l.stage_name || '—'}</TableCell>
              <TableCell>{l.program_name || '—'}</TableCell>
              <TableCell>{l.lead_score != null ? Number(l.lead_score).toFixed(0) : '0'}</TableCell>
              <TableCell sx={{ fontSize: 12, color: '#666' }}>{fmt(l.updated_at)}</TableCell>
              {showAssigned && <TableCell>{l.current_owner_name || '—'}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
