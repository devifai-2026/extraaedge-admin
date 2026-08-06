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
import PaymentsIcon from '@mui/icons-material/Payments';
import SummarizeIcon from '@mui/icons-material/Summarize';
import CloseIcon from '@mui/icons-material/Close';
import { colors } from '../../theme/colors';
import { auth, analyticsApi, usersApi, followUpsApi, leadsApi, notificationsApi, admissionsApi } from '../../lib/endpoints';
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
  const navigate = useNavigate();
  const sessionUser = auth.getUser() || {};
  const role = sessionUser.role || ROLES.COUNSELLOR;
  // branch_manager is admin-like for the dashboard (whole-branch view, scoped
  // server-side), so it gets the admin variant rather than the counsellor one.
  const isAdmin = role === ROLES.SUPER_ADMIN || role === ROLES.BRANCH_MANAGER;
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
  // WhatsApp / Facebook origin counts + 30-day new-WhatsApp-lead trend.
  const [leadOrigin, setLeadOrigin] = useState(null);
  const [programStatus, setProgramStatus] = useState([]);
  const [perfTeam, setPerfTeam] = useState([]);
  const [myFollowups, setMyFollowups] = useState([]);
  const [myLeadsToday, setMyLeadsToday] = useState(0);
  // Tenant-wide admission state + dashboard sub-cards for admin/manager.
  // Reuses the Accounts Dashboard's chart endpoints so we don't duplicate
  // SQL — three calls in parallel (snapshot + admissions trend + status
  // donut + top courses).
  const [admStatus, setAdmStatus] = useState(null); // lead-status snapshot
  const [admCharts, setAdmCharts] = useState(null); // dashboardWithCharts
  // Payments summary for the dashboard CTA — count + total collected. We reuse
  // the Payment Details endpoint's aggregate meta (limit:1 keeps the row
  // payload tiny; we only need meta.total + meta.total_amount).
  const [paySummary, setPaySummary] = useState(null);
  // Payment analytics — trend (30d), by mode, by kind — for the dashboard charts.
  const [payAnalytics, setPayAnalytics] = useState(null);

  const [loading, setLoading] = useState({
    summary: true, funnel: true, timeline: true, programWise: true,
    channelSource: true, programStatus: true, perfTeam: true,
    admissions: true,
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

    // Admissions section — admin & manager only. Snapshot + charts run
    // in parallel; counsellors skip the network roundtrip entirely.
    if (!isCounsellor) {
      flag('admissions', true);
      Promise.all([
        admissionsApi.leadStatusSnapshot().then((r) => r?.data || null).catch(() => null),
        admissionsApi.dashboard({ trend_days: 30 }).then((r) => r?.data || null).catch(() => null),
        admissionsApi.paymentDetails({ limit: 1 }).then((r) => r?.meta || null).catch(() => null),
        admissionsApi.paymentAnalytics({ days: 30 }).then((r) => r?.data || null).catch(() => null),
      ])
        .then(([snap, charts, pay, payAna]) => { setAdmStatus(snap); setAdmCharts(charts); setPaySummary(pay); setPayAnalytics(payAna); })
        .finally(() => flag('admissions', false));
    } else {
      flag('admissions', false);
    }

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

    // WhatsApp-lead KPI + trend. Reuses the same date/user range as the rest of
    // the dashboard so the count matches the filtered view.
    analyticsApi.leadOrigin({ ...params, trend_days: 30 })
      .then((r) => setLeadOrigin(r?.data || null))
      .catch(() => setLeadOrigin(null));

    flag('programStatus', true);
    analyticsApi.programStatus(params)
      .then((r) => setProgramStatus(r?.data || []))
      .catch(() => setProgramStatus([]))
      .finally(() => flag('programStatus', false));

    if (!isCounsellor) {
      flag('perfTeam', true);
      analyticsApi.counselorPerformance(params)
        .then((r) => setPerfTeam(r?.data || []))
        .catch(() => setPerfTeam([]))
        .finally(() => flag('perfTeam', false));
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

      {/* First-run guidance: a branch_manager with no branch assigned yet sees
          empty branch-scoped data everywhere. Explain why instead of a silent
          blank dashboard. */}
      {role === ROLES.BRANCH_MANAGER && !sessionUser.branch_id && (
        <Box sx={{ mt: 2, p: 2, borderRadius: 2, border: '1px solid #fde68a', background: '#fffbeb', color: '#92400e' }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14 }}>No branch assigned yet</Typography>
          <Typography sx={{ fontSize: 13, mt: 0.5 }}>
            Your account isn’t linked to a branch, so branch-scoped dashboards, leads and
            reports will appear empty. Ask a super-admin to set your branch (Users &amp; Roles →
            your profile → Branch), then reload.
          </Typography>
        </Box>
      )}

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

      {/* ============ PAYMENTS CTA (admin only) ============
          Prominent, top-of-dashboard so it's never missed. Shows the real
          total collected + payment count and links into the Payment Details
          ledger. Admin-only. */}
      {isAdmin && (
        <Box
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2,
            flexWrap: 'wrap', mb: 2, p: 2,
            borderRadius: 2, border: '1px solid #bbf7d0',
            background: 'linear-gradient(90deg, #ecfdf5 0%, #ffffff 65%)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <PaymentsIcon sx={{ color: '#15803d', fontSize: 32 }} />
              <Box>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', lineHeight: 1.2 }}>Total Collected</Typography>
                <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#15803d', lineHeight: 1.2 }}>
                  {paySummary ? `₹${Number(paySummary.total_amount || 0).toLocaleString('en-IN')}` : '—'}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ borderLeft: '1px solid #d1fae5', pl: 3 }}>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', lineHeight: 1.2 }}>Payments Recorded</Typography>
              <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                {paySummary ? Number(paySummary.total || 0).toLocaleString('en-IN') : '—'}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<PaymentsIcon />}
              onClick={() => navigate('/accounts/payment-details')}
              sx={{ textTransform: 'none', bgcolor: '#15803d', '&:hover': { bgcolor: '#166534' } }}
            >
              View Payment Details
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/accounts/payment-details?receipt_kind=registration')}
              sx={{ textTransform: 'none', color: '#15803d', borderColor: '#86efac' }}
            >
              Registration Payments
            </Button>
          </Box>
        </Box>
      )}

      {/* ============ KPI ROW ============ */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <Kpi
          label={isCounsellor ? 'My leads' : isManager ? 'Team leads' : 'Total leads'}
          value={summary?.total_leads ?? '—'}
          hint={summary ? `${summary.converted} enrolled · ${summary.conversion_rate_pct}% conversion` : ''}
          accent="#E53935"
        />
        <Kpi
          label="New leads · 7d"
          value={summary?.new_leads_7d ?? '—'}
          hint={summary ? `${summary.new_leads_today ?? 0} today` : ''}
          accent="#FB8C00"
        />
        <Kpi
          label="WhatsApp leads"
          value={leadOrigin?.counts?.whatsapp ?? '—'}
          hint={leadOrigin?.counts
            ? `${leadOrigin.counts.whatsapp_converted ?? 0} enrolled`
            : 'Leads that came in via WhatsApp'}
          accent="#25D366"
        />
        <Kpi
          label="Facebook leads"
          value={leadOrigin?.counts?.facebook ?? '—'}
          hint={leadOrigin?.counts
            ? `${leadOrigin.counts.facebook_converted ?? 0} enrolled`
            : 'Leads that came in via Facebook'}
          accent="#1877F2"
        />
        <Kpi
          label="JustDial leads"
          value={leadOrigin?.counts?.justdial ?? '—'}
          hint={leadOrigin?.counts
            ? `${leadOrigin.counts.justdial_converted ?? 0} enrolled`
            : 'Leads that came in via JustDial'}
          accent="#F26722"
        />
        <Kpi
          label="Website leads"
          value={leadOrigin?.counts?.website ?? '—'}
          hint={leadOrigin?.counts
            ? `${leadOrigin.counts.website_converted ?? 0} enrolled`
            : 'Leads that came in via the website'}
          accent="#5C6BC0"
        />
        {!isCounsellor && (
          <>
            <Kpi
              label="Unassigned leads"
              value={summary?.unassigned_leads ?? '—'}
              hint="Awaiting routing to a counsellor"
              accent="#1E88E5"
            />
            <Kpi
              label="Follow-ups due today"
              value={summary?.followups_due_today ?? '—'}
              accent="#43A047"
            />
            <Kpi
              label="Enrolled · this month"
              value={summary?.enrolled_this_month ?? '—'}
              hint={summary ? `${summary.admissions_this_month ?? 0} admissions` : ''}
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

      {/* ============ ADMISSIONS (admin + manager) ============
          Tenant-wide post-conversion view: status counts + daily trend
          + status donut + top courses. Counsellors skip this section. */}
      {!isCounsellor && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>Admissions</Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Post-conversion pipeline across the tenant. Last 30 days for trends.
              </Typography>
            </Box>
            <Button
              size="small"
              variant="outlined"
              onClick={() => navigate('/admission-pipeline')}
              sx={{ textTransform: 'none' }}
            >
              Open full pipeline →
            </Button>
          </Box>

          {/* Status KPI row */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            <Kpi label="Pending Approval" value={admStatus?.counts?.pending_approval ?? '—'} accent="#f59e0b" />
            <Kpi label="Attending"        value={admStatus?.counts?.attending ?? '—'}        accent="#10b981" />
            <Kpi label="On Break"         value={admStatus?.counts?.on_break ?? '—'}         accent="#fb923c" />
            <Kpi label="Completed"        value={admStatus?.counts?.completed ?? '—'}        accent="#3b82f6" />
            <Kpi label="Rejected"         value={admStatus?.counts?.rejected ?? '—'}         accent="#ef4444" />
            <Kpi
              label="No Admission Yet"
              value={admStatus?.unrouted_converted ?? '—'}
              hint="Lead converted but accounts hasn't created an admission yet."
              accent="#64748b"
            />
          </Box>

          {/* Trend chart */}
          <ChartCard
            title="Admissions Trend · 30d"
            loading={loading.admissions}
            lastSynced={lastSynced}
            onRefresh={reloadAll}
            csvRows={admCharts?.charts?.admissions_trend || []}
            fullHeight={260}
          >
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={(admCharts?.charts?.admissions_trend || []).map((d) => ({ ...d, day: fmtDate(d.day) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <RTooltip />
                <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Status donut + Top courses side by side */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 2 }}>
            {(() => {
              // Build the donut from admStatus.counts (the populated source the
              // KPI row uses) rather than the empty charts.status_breakdown.
              const statusData = Object.entries(admStatus?.counts || {})
                .map(([status, count]) => ({ status: status.replace(/_/g, ' '), count: Number(count) || 0 }))
                .filter((d) => d.count > 0);
              return (
                <ChartCard
                  title="Admission Status Breakdown"
                  loading={loading.admissions}
                  lastSynced={lastSynced}
                  onRefresh={reloadAll}
                  csvRows={statusData}
                  fullHeight={260}
                >
                  {statusData.length === 0 ? (
                    <Box sx={{ p: 2, color: '#888', fontSize: 13 }}>No admissions yet.</Box>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={statusData} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={50} outerRadius={90} label>
                          {statusData.map((entry, idx) => (
                            <Cell key={entry.status} fill={STAGE_PALETTE[idx % STAGE_PALETTE.length]} />
                          ))}
                        </Pie>
                        <RTooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>
              );
            })()}

            <ChartCard
              title="Top Programmes · 30d"
              loading={loading.admissions}
              lastSynced={lastSynced}
              onRefresh={reloadAll}
              csvRows={admCharts?.charts?.course_breakdown || []}
              fullHeight={260}
            >
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={admCharts?.charts?.course_breakdown || []} layout="vertical" margin={{ left: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <YAxis dataKey="program_name" type="category" tick={{ fontSize: 12 }} width={140} />
                  <RTooltip />
                  <Bar dataKey="count" name="Admissions">
                    {(admCharts?.charts?.course_breakdown || []).map((entry, idx) => (
                      <Cell key={entry.program_name} fill={STAGE_PALETTE[idx % STAGE_PALETTE.length]} />
                    ))}
                    <LabelList dataKey="count" position="right" fontSize={12} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </Box>
        </Box>
      )}

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

      {/* ============ WHATSAPP LEADS TREND (everyone) ============ */}
      <Box sx={{ mt: 2 }}>
        <ChartCard
          title="WhatsApp leads · last 30 days"
          loading={false}
          lastSynced={lastSynced}
          onRefresh={reloadAll}
          csvRows={leadOrigin?.whatsapp_trend || []}
          fullHeight={300}
        >
          {(!leadOrigin || (leadOrigin.whatsapp_trend || []).every((d) => !d.leads)) ? (
            <Box sx={{ p: 4, textAlign: 'center', color: '#888' }}>
              No WhatsApp leads in this range yet.
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={(leadOrigin.whatsapp_trend || []).map((d) => ({ ...d, day: fmtDate(d.day) }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <RTooltip />
                <Bar dataKey="leads" name="WhatsApp leads" fill="#25D366" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </Box>

      {/* ============ FACEBOOK LEADS TREND (everyone) ============ */}
      <Box sx={{ mt: 2 }}>
        <ChartCard
          title="Facebook leads · last 30 days"
          loading={false}
          lastSynced={lastSynced}
          onRefresh={reloadAll}
          csvRows={leadOrigin?.facebook_trend || []}
          fullHeight={300}
        >
          {(!leadOrigin || (leadOrigin.facebook_trend || []).every((d) => !d.leads)) ? (
            <Box sx={{ p: 4, textAlign: 'center', color: '#888' }}>
              No Facebook leads in this range yet.
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={(leadOrigin.facebook_trend || []).map((d) => ({ ...d, day: fmtDate(d.day) }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <RTooltip />
                <Bar dataKey="leads" name="Facebook leads" fill="#1877F2" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </Box>

      {/* ============ JUSTDIAL LEADS TREND (everyone) ============ */}
      <Box sx={{ mt: 2 }}>
        <ChartCard
          title="JustDial leads · last 30 days"
          loading={false}
          lastSynced={lastSynced}
          onRefresh={reloadAll}
          csvRows={leadOrigin?.justdial_trend || []}
          fullHeight={300}
        >
          {(!leadOrigin || (leadOrigin.justdial_trend || []).every((d) => !d.leads)) ? (
            <Box sx={{ p: 4, textAlign: 'center', color: '#888' }}>
              No JustDial leads in this range yet.
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={(leadOrigin.justdial_trend || []).map((d) => ({ ...d, day: fmtDate(d.day) }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <RTooltip />
                <Bar dataKey="leads" name="JustDial leads" fill="#F26722" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </Box>

      {/* ============ WEBSITE LEADS TREND (everyone) ============ */}
      <Box sx={{ mt: 2 }}>
        <ChartCard
          title="Website leads · last 30 days"
          loading={false}
          lastSynced={lastSynced}
          onRefresh={reloadAll}
          csvRows={leadOrigin?.website_trend || []}
          fullHeight={300}
        >
          {(!leadOrigin || (leadOrigin.website_trend || []).every((d) => !d.leads)) ? (
            <Box sx={{ p: 4, textAlign: 'center', color: '#888' }}>
              No website leads in this range yet.
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={(leadOrigin.website_trend || []).map((d) => ({ ...d, day: fmtDate(d.day) }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <RTooltip />
                <Bar dataKey="leads" name="Website leads" fill="#5C6BC0" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
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

      {/* ============ PAYMENT COLLECTION TREND + BY MODE (admin + manager) ============ */}
      {!isCounsellor && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 2, mt: 2 }}>
          <ChartCard
            title="Payment Collection · 30d"
            loading={loading.admissions}
            lastSynced={lastSynced}
            onRefresh={reloadAll}
            csvRows={payAnalytics?.trend || []}
            fullHeight={300}
          >
            {(!payAnalytics?.trend || payAnalytics.trend.length === 0) ? (
              <Box sx={{ p: 2, color: '#888', fontSize: 13 }}>No payments collected in the last 30 days.</Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={payAnalytics.trend.map((d) => ({ ...d, day: fmtDate(d.day) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RTooltip formatter={(v, n) => (n === 'amount' ? `₹${Number(v).toLocaleString('en-IN')}` : v)} />
                  <Bar dataKey="amount" name="Collected ₹" fill="#15803d" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard
            title="Collection by Account · 30d"
            loading={loading.admissions}
            lastSynced={lastSynced}
            onRefresh={reloadAll}
            csvRows={payAnalytics?.by_account || []}
            fullHeight={300}
          >
            {(!payAnalytics?.by_account || payAnalytics.by_account.length === 0) ? (
              <Box sx={{ p: 2, color: '#888', fontSize: 13 }}>No payments yet.</Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={payAnalytics.by_account}
                    dataKey="amount"
                    nameKey="account"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    label={(e) => `${e.account}: ₹${Number(e.amount).toLocaleString('en-IN')}`}
                  >
                    {payAnalytics.by_account.map((_, i) => <Cell key={i} fill={STAGE_PALETTE[i % STAGE_PALETTE.length]} />)}
                  </Pie>
                  <RTooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </Box>
      )}

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

      {/* ============ COLLECTION BY RECEIPT KIND (admin only) ============ */}
      {/* Registration vs installment vs misc — total ₹ collected per kind. */}
      {isAdmin && (
        <Box sx={{ mt: 2 }}>
          <ChartCard
            title="Collection by Type · 30d"
            loading={loading.admissions}
            lastSynced={lastSynced}
            onRefresh={reloadAll}
            csvRows={payAnalytics?.by_kind || []}
            fullHeight={320}
          >
            {(!payAnalytics?.by_kind || payAnalytics.by_kind.length === 0) ? (
              <Box sx={{ p: 3, color: '#888', fontSize: 13, textAlign: 'center' }}>
                No payments collected in the last 30 days.
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={payAnalytics.by_kind} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="kind" tick={{ fontSize: 12 }} width={90} />
                  <RTooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
                  <Bar dataKey="amount" name="Collected ₹" radius={[0, 4, 4, 0]}>
                    {payAnalytics.by_kind.map((_, i) => <Cell key={i} fill={STAGE_PALETTE[i % STAGE_PALETTE.length]} />)}
                    <LabelList dataKey="count" position="right" formatter={(v) => `${v} txn`} style={{ fontSize: 11, fill: '#6b7280' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </Box>
      )}

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
                      <span>New leads · 7d</span><b>{summary.new_leads_7d ?? 0}</b>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Unassigned leads</span><b>{summary.unassigned_leads ?? 0}</b>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Follow-ups due today</span><b>{summary.followups_due_today ?? 0}</b>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Enrolled · this month</span><b>{summary.enrolled_this_month ?? 0}</b>
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
