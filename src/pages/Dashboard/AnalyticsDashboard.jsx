// Role-aware Analytics Dashboard.
//
//   Counsellor    → personal stats only (my leads, my comms, my funnel, my followups)
//   Sales Manager → team stats + counsellor leaderboard within their team
//   Super Admin   → org-wide totals, all charts, communications breakdown, full leaderboard
//
// Backend already scopes every analytics endpoint by role (see analytics/routes.js).
// FE simply chooses which cards to render and which header controls to show.
import React, { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete, TextField, Box, Divider, Typography, Modal, Button, IconButton,
} from '@mui/material';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, FunnelChart, Funnel,
  CartesianGrid, XAxis, YAxis, Tooltip as RTooltip, Legend, LabelList, Cell,
  PieChart, Pie,
} from 'recharts';
import RefreshIcon from '@mui/icons-material/Refresh';
import SummarizeIcon from '@mui/icons-material/Summarize';
import CloseIcon from '@mui/icons-material/Close';
import { colors } from '../../theme/colors';
import { auth, analyticsApi, usersApi, followUpsApi, leadsApi, notificationsApi } from '../../lib/endpoints';
import { useNavigate } from 'react-router-dom';
import DateRangePicker from '../../components/DatePicker/DatePicker';
import ChartCard from '../../components/ChartCard/ChartCard';
import './AnalyticsDashboard.css';

const ROLES = {
  SUPER_ADMIN: 'super_admin',
  SALES_MANAGER: 'sales_manager',
  COUNSELLOR: 'counsellor',
};

const STAGE_PALETTE = ['#E53935', '#FB8C00', '#FDD835', '#43A047', '#1E88E5', '#5E35B1', '#00897B', '#8D6E63', '#3949AB'];

const fmtDate = (d) => {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
  catch { return ''; }
};

// ---------- Notifications panel ----------
// Same data source as the bell-icon dropdown in the header. We surface it
// inline on the dashboard so a counsellor lands on the page and immediately
// sees missed follow-ups, reassignments, etc. without hunting for the bell.
const NotificationsPanel = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = () => {
    setLoading(true);
    notificationsApi.list({ limit: 8 })
      .then((r) => setItems(r?.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    reload();
    // Cheap auto-refresh every 60s so the panel stays current without
    // wiring up the full SSE stream here. The bell already does that.
    const t = setInterval(reload, 60_000);
    return () => clearInterval(t);
  }, []);

  const colorOf = (n) => {
    if (n.type === 'follow_up_overdue') return '#d32f2f';
    if (n.type === 'follow_up_reminder') return '#ef6c00';
    if (n.type === 'lead.assigned' || n.type === 'lead.reassigned') return '#1976d2';
    return '#555';
  };

  const onClick = async (n) => {
    if (!n.is_read) { try { await notificationsApi.markRead(n.id); } catch { /* ignore */ } }
    if (n.link) navigate(n.link);
    else if (n.metadata_json?.lead_id) navigate(`/leadlist?focus=${n.metadata_json.lead_id}`);
  };

  return (
    <Box sx={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 1.5, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, borderBottom: '1px solid #f0f0f0' }}>
        <Box sx={{ fontSize: 14, fontWeight: 600, color: '#333' }}>Notifications</Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {items.some((i) => !i.is_read) && (
            <Button size="small" onClick={async () => { try { await notificationsApi.markAllRead(); reload(); } catch { /* ignore */ } }}>
              Mark all read
            </Button>
          )}
          <IconButton size="small" onClick={reload}><RefreshIcon fontSize="small" /></IconButton>
        </Box>
      </Box>
      <Box sx={{ maxHeight: 260, overflowY: 'auto' }}>
        {loading && <Box sx={{ p: 2, color: '#888', fontSize: 13 }}>Loading…</Box>}
        {!loading && items.length === 0 && <Box sx={{ p: 2, color: '#888', fontSize: 13 }}>You're all caught up.</Box>}
        {items.map((n) => (
          <Box
            key={n.id}
            onClick={() => onClick(n)}
            sx={{
              display: 'flex', gap: 1, p: 1.5, cursor: 'pointer',
              borderBottom: '1px solid #f6f6f6',
              background: n.is_read ? '#fff' : '#fff8f3',
              '&:hover': { background: '#fdf3ed' },
            }}
          >
            <Box sx={{ width: 6, alignSelf: 'stretch', borderRadius: 1, background: colorOf(n) }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ fontSize: 13, color: '#222', fontWeight: n.is_read ? 400 : 600, whiteSpace: 'normal' }}>
                {n.message}
              </Box>
              <Box sx={{ fontSize: 11, color: '#888', mt: 0.3 }}>
                {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// ---------- Small KPI tile ----------
const Kpi = ({ label, value, hint, accent }) => (
  <Box
    sx={{
      flex: 1,
      minWidth: 180,
      background: '#fff',
      border: '1px solid #e8e8e8',
      borderRadius: 1.5,
      p: 2,
      borderLeft: `4px solid ${accent || colors.primary}`,
    }}
  >
    <Box sx={{ fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</Box>
    <Box sx={{ fontSize: 28, fontWeight: 700, color: '#222', mt: 0.5 }}>{value}</Box>
    {hint && <Box sx={{ fontSize: 12, color: '#888', mt: 0.5 }}>{hint}</Box>}
  </Box>
);

export default function AnalyticsDashboard() {
  const sessionUser = auth.getUser() || {};
  const role = sessionUser.role || ROLES.COUNSELLOR;
  const isAdmin = role === ROLES.SUPER_ADMIN;
  const isManager = role === ROLES.SALES_MANAGER;
  const isCounsellor = role === ROLES.COUNSELLOR;

  // Header filters
  const [dateRange, setDateRange] = useState({ from: null, to: null, rangeType: null });
  const [counselorId, setCounselorId] = useState(''); // admin / manager filter
  const [counsellors, setCounsellors] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);

  // Data buckets
  const [summary, setSummary] = useState(null);
  const [funnel, setFunnel] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [programWise, setProgramWise] = useState([]);
  const [channelSource, setChannelSource] = useState([]);
  const [programStatus, setProgramStatus] = useState([]);
  const [coldEnq, setColdEnq] = useState({ reasons: [], daily: [] });
  const [perfTeam, setPerfTeam] = useState([]);
  const [comms, setComms] = useState([]);
  const [myFollowups, setMyFollowups] = useState([]);
  const [myLeadsToday, setMyLeadsToday] = useState(0);

  const [loading, setLoading] = useState({
    summary: true, funnel: true, timeline: true, programWise: true,
    channelSource: true, programStatus: true, coldEnq: true, perfTeam: true, comms: true,
  });
  const [openSummaryModal, setOpenSummaryModal] = useState(false);
  const [lastSynced, setLastSynced] = useState(new Date());

  // ---- Counsellor list for the picker (admin = all, manager = team) ----
  useEffect(() => {
    if (isCounsellor) return;
    const loader = isManager ? usersApi.myTeam() : usersApi.list({ role: 'counsellor', limit: 200 });
    loader
      .then((r) => setCounsellors((r?.data || []).filter((u) => u.role === 'counsellor' && u.is_active !== false)))
      .catch(() => setCounsellors([]));
  }, [isCounsellor, isManager]);

  // ---- Common range params ----
  const params = useMemo(() => {
    const p = {};
    if (dateRange.from) p.date_from = new Date(dateRange.from).toISOString();
    if (dateRange.to) {
      // Make `to` end-of-day inclusive so a single-day range catches that day's
      // events instead of stopping at 00:00.
      const t = new Date(dateRange.to);
      t.setHours(23, 59, 59, 999);
      p.date_to = t.toISOString();
    }
    if (counselorId) p.user_id = counselorId;
    return p;
  }, [dateRange, counselorId]);

  const fmtDateLabel = (d) => {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return ''; }
  };
  const dateRangeLabel = (() => {
    if (!dateRange.from && !dateRange.to) return null;
    if (dateRange.from && dateRange.to) {
      const same = new Date(dateRange.from).toDateString() === new Date(dateRange.to).toDateString();
      if (same) return fmtDateLabel(dateRange.from);
      return `${fmtDateLabel(dateRange.from)} → ${fmtDateLabel(dateRange.to)}`;
    }
    return fmtDateLabel(dateRange.from || dateRange.to);
  })();

  // ---- Loaders ----
  const reloadAll = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    setLastSynced(new Date());

    const flag = (key, val) => setLoading((prev) => ({ ...prev, [key]: val }));

    flag('summary', true);
    analyticsApi.summary(params)
      .then((r) => setSummary(r?.data))
      .catch(() => setSummary(null))
      .finally(() => flag('summary', false));

    flag('funnel', true);
    analyticsApi.funnel(params)
      .then((r) => setFunnel(r?.data || []))
      .catch(() => setFunnel([]))
      .finally(() => flag('funnel', false));

    flag('timeline', true);
    analyticsApi.leadsTimeline(params)
      .then((r) => setTimeline((r?.data || []).map((d) => ({ ...d, day: fmtDate(d.day) }))))
      .catch(() => setTimeline([]))
      .finally(() => flag('timeline', false));

    flag('programWise', true);
    analyticsApi.programWise(params)
      .then((r) => setProgramWise(r?.data || []))
      .catch(() => setProgramWise([]))
      .finally(() => flag('programWise', false));

    flag('channelSource', true);
    analyticsApi.channelSource(params)
      .then((r) => setChannelSource(r?.data || []))
      .catch(() => setChannelSource([]))
      .finally(() => flag('channelSource', false));

    flag('programStatus', true);
    analyticsApi.programStatus(params)
      .then((r) => setProgramStatus(r?.data || []))
      .catch(() => setProgramStatus([]))
      .finally(() => flag('programStatus', false));

    flag('coldEnq', true);
    analyticsApi.coldEnquiries(params)
      .then((r) => setColdEnq(r?.data || { reasons: [], daily: [] }))
      .catch(() => setColdEnq({ reasons: [], daily: [] }))
      .finally(() => flag('coldEnq', false));

    if (!isCounsellor) {
      flag('perfTeam', true);
      analyticsApi.counselorPerformance(params)
        .then((r) => setPerfTeam(r?.data || []))
        .catch(() => setPerfTeam([]))
        .finally(() => flag('perfTeam', false));

      flag('comms', true);
      analyticsApi.communications(params)
        .then((r) => setComms(r?.data || []))
        .catch(() => setComms([]))
        .finally(() => flag('comms', false));
    }

    if (isCounsellor) {
      followUpsApi.myUpcoming()
        .then((r) => setMyFollowups((r?.data || []).slice(0, 5)))
        .catch(() => setMyFollowups([]));
      const today = new Date(); today.setHours(0, 0, 0, 0);
      leadsApi.list({ date_from: today.toISOString(), limit: 1, page: 1 })
        .then((r) => setMyLeadsToday(r?.meta?.total ?? 0))
        .catch(() => setMyLeadsToday(0));
    }
  }, [params, reloadKey, isCounsellor]);

  // ---- Build the program × stage matrix (each program has variable stages) ----
  const programStageMatrix = useMemo(() => {
    const programs = new Map();
    const stageSet = new Set();
    for (const r of programStatus) {
      if (!programs.has(r.id)) programs.set(r.id, { id: r.id, name: r.name, stages: {} });
      programs.get(r.id).stages[r.stage] = (programs.get(r.id).stages[r.stage] || 0) + r.leads;
      stageSet.add(r.stage);
    }
    return { programs: Array.from(programs.values()), stages: Array.from(stageSet) };
  }, [programStatus]);

  // ---- Comms breakdown table ----
  const commsByChannel = useMemo(() => {
    const out = { email: 0, sms: 0, whatsapp: 0 };
    for (const r of comms) {
      if (out[r.channel] !== undefined) out[r.channel] += r.n;
    }
    return out;
  }, [comms]);

  return (
    <Box sx={{ pb: 4 }}>
      {/* ============ HEADER ============ */}
      <Box className='first-container' sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {isCounsellor ? 'My Dashboard' : isManager ? 'Team Dashboard' : 'Analytics Dashboard'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#666' }}>
            Welcome {sessionUser.name || sessionUser.email} · {role.replace('_', ' ')}
          </Typography>
        </Box>
        <Box className='first-container-rightside-contain' sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={reloadAll} title="Refresh dashboard">
            <RefreshIcon sx={{ color: colors.primary }} />
          </IconButton>
          <IconButton onClick={() => setOpenSummaryModal(true)} title="Summary">
            <SummarizeIcon sx={{ color: colors.primary }} />
          </IconButton>
        </Box>
      </Box>
      <Divider />

      {/* ============ FILTER BAR (admins/managers only see counselor picker) ============ */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mt: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {dateRangeLabel && (
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 1,
              background: '#fff7e6', border: '1px solid #ffd591',
              borderRadius: 999, px: 1.5, py: 0.5, fontSize: 13, color: '#d46b08',
            }}>
              <span>📅 {dateRangeLabel}</span>
              <Button
                size="small"
                onClick={() => setDateRange({ from: null, to: null, rangeType: null })}
                sx={{ minWidth: 0, padding: '0 4px', textTransform: 'none', color: '#d46b08' }}
              >
                ×
              </Button>
            </Box>
          )}
          {counselorId && (
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 1,
              background: '#e3f2fd', border: '1px solid #90caf9',
              borderRadius: 999, px: 1.5, py: 0.5, fontSize: 13, color: '#1565c0',
            }}>
              <span>👤 {counsellors.find((u) => u.id === counselorId)?.name}</span>
              <Button
                size="small"
                onClick={() => setCounselorId('')}
                sx={{ minWidth: 0, padding: '0 4px', textTransform: 'none', color: '#1565c0' }}
              >
                ×
              </Button>
            </Box>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {!isCounsellor && (
            <Autocomplete
              size="small"
              options={[{ id: '', name: isManager ? 'My team (all)' : 'All counsellors' }, ...counsellors]}
              getOptionLabel={(o) => o.name || ''}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              value={counsellors.find((u) => u.id === counselorId) || { id: '', name: isManager ? 'My team (all)' : 'All counsellors' }}
              onChange={(_e, opt) => setCounselorId(opt?.id || '')}
              sx={{ width: 280 }}
              renderInput={(p) => <TextField {...p} label="Filter by counsellor" />}
            />
          )}
          <DateRangePicker
            onApply={(r) => setDateRange({
              from: r?.startDate || null,
              to: r?.endDate || null,
              rangeType: r?.rangeType || null,
            })}
          />
        </Box>
      </Box>

      {/* ============ NOTIFICATIONS ============ */}
      <NotificationsPanel />

      {/* ============ KPI ROW ============ */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <Kpi
          label={isCounsellor ? 'My leads' : isManager ? 'Team leads' : 'Total leads'}
          value={summary?.total_leads ?? '—'}
          hint={summary ? `${summary.converted} enrolled · ${summary.conversion_rate_pct}% conversion` : ''}
          accent="#E53935"
        />
        <Kpi
          label="Cold leads"
          value={summary?.cold_leads ?? '—'}
          hint={summary ? `${summary.programs_active} active programs` : ''}
          accent="#FB8C00"
        />
        {!isCounsellor && (
          <>
            <Kpi
              label="Email · 30d"
              value={summary?.comms_30d?.email ?? '—'}
              accent="#1E88E5"
            />
            <Kpi
              label="WhatsApp · 30d"
              value={summary?.comms_30d?.whatsapp ?? '—'}
              accent="#43A047"
            />
            <Kpi
              label="SMS · 30d"
              value={summary?.comms_30d?.sms ?? '—'}
              accent="#5E35B1"
            />
          </>
        )}
        {isCounsellor && (
          <>
            <Kpi
              label="My follow-ups today"
              value={myFollowups.length}
              hint={myFollowups[0]?.lead_name ? `Next: ${myFollowups[0].lead_name}` : 'Nothing scheduled'}
              accent="#1E88E5"
            />
            <Kpi
              label="New leads today"
              value={myLeadsToday}
              accent="#43A047"
            />
          </>
        )}
      </Box>

      {/* ============ COUNSELLOR-ONLY: my upcoming follow-ups list ============ */}
      {isCounsellor && (
        <ChartCard
          title="My next follow-ups"
          loading={false}
          lastSynced={lastSynced}
          onRefresh={reloadAll}
          fullHeight={220}
        >
          {myFollowups.length === 0 && (
            <Box sx={{ p: 2, color: '#888', fontSize: 13 }}>No follow-ups scheduled yet.</Box>
          )}
          {myFollowups.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {myFollowups.map((f) => (
                <Box key={f.id} sx={{ display: 'flex', justifyContent: 'space-between', p: 1, borderBottom: '1px solid #f0f0f0' }}>
                  <Box>
                    <Box sx={{ fontWeight: 600, fontSize: 14 }}>{f.lead_name || 'Lead'}</Box>
                    <Box sx={{ fontSize: 12, color: '#888' }}>{f.lead_phone || ''}</Box>
                  </Box>
                  <Box sx={{ fontSize: 13, color: '#444' }}>
                    {f.next_action_datetime ? new Date(f.next_action_datetime).toLocaleString() : '—'}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </ChartCard>
      )}

      {/* ============ TIMELINE CHART (everyone) ============ */}
      <Box sx={{ mt: 2 }}>
        <ChartCard
          title="Leads Timeline Report"
          loading={loading.timeline}
          lastSynced={lastSynced}
          onRefresh={reloadAll}
          csvRows={timeline}
          fullHeight={300}
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <RTooltip />
              <Line type="monotone" dataKey="leads" stroke="#E53935" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </Box>

      {/* ============ FUNNEL (everyone) ============ */}
      <Box sx={{ mt: 2 }}>
        <ChartCard
          title="Lead Funnel by Stage"
          loading={loading.funnel}
          lastSynced={lastSynced}
          onRefresh={reloadAll}
          csvRows={funnel}
          fullHeight={300}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnel.filter((f) => f.count > 0)} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
              <YAxis dataKey="stage" type="category" tick={{ fontSize: 12 }} width={130} />
              <RTooltip />
              <Bar dataKey="count" name="Leads">
                {funnel.map((entry, idx) => (
                  <Cell key={entry.stage_id} fill={STAGE_PALETTE[idx % STAGE_PALETTE.length]} />
                ))}
                <LabelList dataKey="count" position="right" fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </Box>

      {/* ============ PROGRAM-WISE TABLE (everyone) ============ */}
      <Box sx={{ mt: 2 }}>
        <ChartCard
          title="Program-wise Conversion Analysis"
          loading={loading.programWise}
          lastSynced={lastSynced}
          onRefresh={reloadAll}
          csvRows={programWise}
          fullHeight={Math.max(220, programWise.length * 40 + 80)}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600 }}>Program</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600 }}>Total Leads</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600 }}>Enrolled</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600 }}>Conversion %</th>
              </tr>
            </thead>
            <tbody>
              {programWise.length === 0 && (
                <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#888' }}>No program data</td></tr>
              )}
              {programWise.map((p) => {
                const pct = p.leads ? Math.round((p.converted / p.leads) * 100) : 0;
                return (
                  <tr key={p.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 12px' }}>{p.name}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{p.leads}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{p.converted}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{pct}%</td>
                  </tr>
                );
              })}
              {programWise.length > 0 && (
                <tr style={{ borderTop: '2px solid #ddd', fontWeight: 600 }}>
                  <td style={{ padding: '10px 12px' }}>Total</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{programWise.reduce((a, p) => a + p.leads, 0)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{programWise.reduce((a, p) => a + p.converted, 0)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>—</td>
                </tr>
              )}
            </tbody>
          </table>
        </ChartCard>
      </Box>

      {/* ============ CHANNEL × SOURCE (manager + admin) ============ */}
      {!isCounsellor && (
        <Box sx={{ mt: 2 }}>
          <ChartCard
            title="Channel-Source wise Conversion"
            loading={loading.channelSource}
            lastSynced={lastSynced}
            onRefresh={reloadAll}
            csvRows={channelSource}
            fullHeight={Math.max(220, channelSource.length * 36 + 80)}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600 }}>Channel</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600 }}>Source</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600 }}>Leads</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600 }}>Enrolled</th>
                </tr>
              </thead>
              <tbody>
                {channelSource.length === 0 && (
                  <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#888' }}>No channel data</td></tr>
                )}
                {channelSource.map((r, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 12px' }}>{r.channel}</td>
                    <td style={{ padding: '10px 12px' }}>{r.source}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{r.leads}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{r.converted ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ChartCard>
        </Box>
      )}

      {/* ============ PROGRAM × STAGE (everyone) ============ */}
      <Box sx={{ mt: 2 }}>
        <ChartCard
          title="Program vs Lead Status"
          loading={loading.programStatus}
          lastSynced={lastSynced}
          onRefresh={reloadAll}
          csvRows={programStatus}
          fullHeight={Math.max(220, programStageMatrix.programs.length * 40 + 80)}
        >
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 600 }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600 }}>Program</th>
                  {programStageMatrix.stages.map((s) => (
                    <th key={s} style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600 }}>{s}</th>
                  ))}
                  <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {programStageMatrix.programs.length === 0 && (
                  <tr><td colSpan={programStageMatrix.stages.length + 2} style={{ padding: 24, textAlign: 'center', color: '#888' }}>No data</td></tr>
                )}
                {programStageMatrix.programs.map((p) => {
                  const total = Object.values(p.stages).reduce((a, b) => a + b, 0);
                  return (
                    <tr key={p.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '10px 12px' }}>{p.name}</td>
                      {programStageMatrix.stages.map((s) => (
                        <td key={s} style={{ padding: '10px 12px', textAlign: 'right' }}>{p.stages[s] || 0}</td>
                      ))}
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Box>
        </ChartCard>
      </Box>

      {/* ============ COLD ENQUIRIES — top reasons (everyone) ============ */}
      <Box sx={{ mt: 2 }}>
        <ChartCard
          title="Top Reasons for Cold Enquiries (last 90d)"
          loading={loading.coldEnq}
          lastSynced={lastSynced}
          onRefresh={reloadAll}
          csvRows={coldEnq?.reasons}
          fullHeight={300}
        >
          {(!coldEnq?.reasons || coldEnq.reasons.length === 0) ? (
            <Box sx={{ p: 2, color: '#888', fontSize: 13 }}>No cold leads in the last 90 days.</Box>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={coldEnq.reasons}
                  dataKey="leads"
                  nameKey="reason"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(e) => `${e.reason}: ${e.leads}`}
                >
                  {coldEnq.reasons.map((_, i) => <Cell key={i} fill={STAGE_PALETTE[i % STAGE_PALETTE.length]} />)}
                </Pie>
                <RTooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </Box>

      {/* ============ COUNSELLOR LEADERBOARD (manager + admin) ============ */}
      {!isCounsellor && (
        <Box sx={{ mt: 2 }}>
          <ChartCard
            title={isManager ? 'My team — counsellor performance' : 'Counsellor leaderboard'}
            loading={loading.perfTeam}
            lastSynced={lastSynced}
            onRefresh={reloadAll}
            csvRows={perfTeam}
            fullHeight={Math.max(220, perfTeam.length * 40 + 80)}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600 }}>Counsellor</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600 }}>Assigned</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600 }}>Converted</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600 }}>Calls (30d)</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600 }}>Messages (30d)</th>
                </tr>
              </thead>
              <tbody>
                {perfTeam.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#888' }}>No counsellors found</td></tr>
                )}
                {perfTeam.map((u) => (
                  <tr key={u.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 12px' }}>{u.name}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{u.assigned_leads}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{u.converted}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{u.calls_30d}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{u.messages_30d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ChartCard>
        </Box>
      )}

      {/* ============ COMMUNICATIONS BREAKDOWN (admin only) ============ */}
      {/* Backend returns {channel, status, n}. We pivot it so each X-axis bucket
          is a channel (email/sms/whatsapp/call) and bars are stacked by status. */}
      {isAdmin && (() => {
        const STATUS_COLORS = {
          delivered: '#43A047', sent: '#66BB6A', seen: '#1E88E5', clicked: '#0288D1',
          queued: '#FDD835', failed: '#E53935', bounced: '#D32F2F', suppressed: '#8D6E63',
          unsubscribed: '#5E35B1',
          // call status buckets
          inbound_completed: '#43A047', inbound_answered: '#66BB6A',
          outbound_completed: '#1E88E5', outbound_answered: '#1976D2',
          inbound_missed: '#FB8C00', outbound_missed: '#FB8C00',
          inbound_no_answer: '#FFB300', outbound_no_answer: '#FFB300',
          inbound_failed: '#E53935', outbound_failed: '#E53935',
        };
        const channelOrder = ['email', 'sms', 'whatsapp', 'call'];
        // Pivot: { channel: 'email', delivered: 12, failed: 2, ... }
        const pivot = new Map();
        const statusKeys = new Set();
        for (const r of comms) {
          if (!pivot.has(r.channel)) pivot.set(r.channel, { channel: r.channel });
          pivot.get(r.channel)[r.status] = r.n;
          statusKeys.add(r.status);
        }
        const data = channelOrder
          .filter((c) => pivot.has(c))
          .map((c) => pivot.get(c));
        const statuses = Array.from(statusKeys).sort();

        return (
          <Box sx={{ mt: 2 }}>
            <ChartCard
              title="Communications breakdown (30d)"
              loading={loading.comms}
              lastSynced={lastSynced}
              onRefresh={reloadAll}
              csvRows={comms}
              fullHeight={320}
            >
              {data.length === 0 ? (
                <Box sx={{ p: 3, color: '#888', fontSize: 13, textAlign: 'center' }}>
                  No communications in the last 30 days.
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="channel" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <RTooltip />
                    <Legend />
                    {statuses.map((status) => (
                      <Bar
                        key={status}
                        dataKey={status}
                        stackId="comms"
                        name={status.replace(/_/g, ' ')}
                        fill={STATUS_COLORS[status] || '#9E9E9E'}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </Box>
        );
      })()}

      {/* ============ SUMMARY MODAL ============ */}
      <Modal open={openSummaryModal} onClose={() => setOpenSummaryModal(false)}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 460, bgcolor: '#fff', borderRadius: 2, boxShadow: 24, p: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 3, py: 2, borderBottom: '1px solid #eee' }}>
            <Typography variant="h6">Summary</Typography>
            <IconButton onClick={() => setOpenSummaryModal(false)}><CloseIcon /></IconButton>
          </Box>
          <Box sx={{ p: 3 }}>
            <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
              {isCounsellor ? 'Your stats' : isManager ? 'Team stats' : 'Organisation stats'}
              {dateRange.from || dateRange.to ? ` · ${dateRange.from || ''} — ${dateRange.to || ''}` : ' · all time'}
            </Typography>
            {summary && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total leads</span><b>{summary.total_leads}</b>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Converted</span><b>{summary.converted}</b>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Conversion rate</span><b>{summary.conversion_rate_pct}%</b>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Cold leads</span><b>{summary.cold_leads}</b>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Active programs</span><b>{summary.programs_active}</b>
                </Box>
                {!isCounsellor && (
                  <>
                    <Divider />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Email · 30d</span><b>{summary.comms_30d?.email}</b>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>SMS · 30d</span><b>{summary.comms_30d?.sms}</b>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>WhatsApp · 30d</span><b>{summary.comms_30d?.whatsapp}</b>
                    </Box>
                  </>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Modal>
    </Box>
  );
}
