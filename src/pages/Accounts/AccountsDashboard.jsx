import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CircularProgress, Select, MenuItem, FormControl, Chip, Button,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  ResponsiveContainer,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { admissionsApi } from '../../lib/endpoints';
import { fmtMoney } from './utils';
import './Accounts.css';

// Brand-coherent palette: indigo (admissions), emerald (collection),
// amber (warning), red (destructive), slate (neutral).
const COLORS = {
  primary: '#4f46e5',
  emerald: '#10b981',
  amber:   '#f59e0b',
  red:     '#dc2626',
  slate:   '#64748b',
  blue:    '#0ea5e9',
};
const STATUS_COLORS = {
  pending_approval: COLORS.amber,
  attending:        COLORS.emerald,
  on_break:         '#fb923c',
  completed:        COLORS.blue,
  rejected:         COLORS.red,
};
const STATUS_LABEL = {
  pending_approval: 'Pending',
  attending:        'Attending',
  on_break:         'On Break',
  completed:        'Completed',
  rejected:         'Rejected',
};

const AccountsDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trendDays, setTrendDays] = useState(30);
  const [emi, setEmi] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      try {
        const r = await admissionsApi.dashboard({ trend_days: trendDays });
        if (alive) setData(r?.data || {});
      } catch {
        if (alive) setData({});
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [trendDays]);

  // EMI digest loads once on mount + auto-refreshes every 60s. Decoupled
  // from the trend-window dropdown because the upcoming/overdue windows
  // are calendar-relative, not slider-relative.
  useEffect(() => {
    let alive = true;
    const fetchEmi = () =>
      admissionsApi.emiDigest(7)
        .then((r) => { if (alive) setEmi(r?.data || []); })
        .catch(() => { /* leave previous data in place on transient errors */ });
    fetchEmi();
    const t = setInterval(fetchEmi, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  // Split EMI rows into overdue (>=24h late) vs upcoming. days_until_due
  // is the BE-computed signed integer; -1 or lower means past the date.
  const emiOverdue = useMemo(() => (emi || []).filter((r) => r.days_until_due <= -1), [emi]);
  const emiUpcoming = useMemo(() => (emi || []).filter((r) => r.days_until_due >= 0), [emi]);

  if (loading && !data) {
    return <div className="accounts-page"><div className="accounts-empty"><CircularProgress size={20} /></div></div>;
  }

  const d = data || {};
  const charts = d.charts || {};

  return (
    <div className="accounts-page">
      <div className="accounts-page-head">
        <div>
          <div className="accounts-page-title">Accounts Dashboard</div>
          <div className="accounts-page-subtitle">
            Live KPIs + trends. Filter the trend window from the dropdown.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="accounts-filter-label">Trend window</span>
          <FormControl size="small">
            <Select value={trendDays} onChange={(e) => setTrendDays(Number(e.target.value))}>
              <MenuItem value={7}>Last 7 days</MenuItem>
              <MenuItem value={30}>Last 30 days</MenuItem>
              <MenuItem value={60}>Last 60 days</MenuItem>
              <MenuItem value={90}>Last 90 days</MenuItem>
            </Select>
          </FormControl>
        </div>
      </div>

      {/* ---------------- KPI row ---------------- */}
      <div className="accounts-kpi-row">
        <Kpi label="This month admissions" value={d.this_month_admissions ?? 0} accent={COLORS.primary} sub="Joined since the 1st" />
        <Kpi label="Pending approval"      value={d.pending_approval ?? 0}      accent={COLORS.amber}   sub="Awaiting verification" />
        <Kpi label="Attending"             value={d.attending ?? 0}             accent={COLORS.emerald} sub="Active students" />
        <Kpi label="On break"              value={d.on_break ?? 0}              accent={COLORS.red}     sub="Temporarily paused" />
        <Kpi label="Collection this month" value={`₹ ${fmtMoney(d.this_month_collection)}`} accent={COLORS.blue} sub="Receipts dated this month" wide />
      </div>

      {/* ---------------- EMI digest ---------------- */}
      {/* Two side-by-side cards: overdue + upcoming. Auto-refreshes
          every minute so accounts always sees the live picture without
          a manual reload. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 12, marginBottom: 14 }}>
        <EmiCard
          title="Overdue installments"
          subtitle={`${emiOverdue.length} unpaid, due date past`}
          accent={COLORS.red}
          rows={emiOverdue}
          emptyText="🎉 Nothing overdue."
          navigate={navigate}
          mode="overdue"
        />
        <EmiCard
          title="Upcoming · next 7 days"
          subtitle={`${emiUpcoming.length} due in the coming week`}
          accent={COLORS.amber}
          rows={emiUpcoming}
          emptyText="No installments due in the next 7 days."
          navigate={navigate}
          mode="upcoming"
        />
      </div>

      {/* ---------------- Trend row: admissions + collection ---------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: 12, marginBottom: 14 }}>
        <ChartCard title="Admissions trend" subtitle={`Daily admissions · last ${trendDays} days`}>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={charts.admissions_trend || []} margin={{ top: 10, right: 14, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="g-adm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" vertical={false} />
              <XAxis dataKey="day" tickFormatter={shortDay} tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Tooltip content={<TrendTooltip suffix=" admissions" />} />
              <Area type="monotone" dataKey="count" stroke={COLORS.primary} strokeWidth={2} fill="url(#g-adm)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Collection trend" subtitle={`Daily receipts (₹) · last ${trendDays} days`}>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={charts.collection_trend || []} margin={{ top: 10, right: 14, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" vertical={false} />
              <XAxis dataKey="day" tickFormatter={shortDay} tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickFormatter={(v) => `${Math.round(v / 1000)}k`}
              />
              <Tooltip content={<TrendTooltip prefix="₹ " moneyKey="amount" />} />
              <Line type="monotone" dataKey="amount" stroke={COLORS.emerald} strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ---------------- Breakdown row: status donut + course bar ---------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 12 }}>
        <ChartCard title="Status breakdown" subtitle="Every admission, grouped by current state">
          <StatusDonut rows={charts.status_breakdown || []} />
        </ChartCard>

        <ChartCard title="Top courses this month" subtitle="Admission count per course (top 10)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={charts.course_breakdown || []}
              layout="vertical"
              margin={{ top: 10, right: 14, bottom: 0, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis type="category" dataKey="course" width={140} tick={{ fontSize: 11, fill: '#374151' }} />
              <Tooltip content={<TrendTooltip suffix=" admissions" labelKey="course" />} />
              <Bar dataKey="n" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
};

const Kpi = ({ label, value, accent, sub, wide }) => (
  <div className="accounts-kpi-card" style={{ '--kpi-accent': accent, gridColumn: wide ? 'span 2' : undefined }}>
    <div className="accounts-kpi-label">{label}</div>
    <div className="accounts-kpi-value">{value}</div>
    {sub && <div className="accounts-kpi-sub">{sub}</div>}
  </div>
);

const ChartCard = ({ title, subtitle, children }) => (
  <div className="accounts-table-card" style={{ padding: 16 }}>
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{subtitle}</div>}
    </div>
    {children}
  </div>
);

const StatusDonut = ({ rows }) => {
  // Always render every status slice (even empty ones) so the legend
  // doesn't shuffle as data changes. We just zero them when no row.
  const data = useMemo(() => {
    const byStatus = Object.fromEntries((rows || []).map((r) => [r.status, r.n]));
    return Object.keys(STATUS_LABEL).map((k) => ({
      key: k,
      name: STATUS_LABEL[k],
      value: byStatus[k] || 0,
      fill: STATUS_COLORS[k],
    }));
  }, [rows]);
  const total = data.reduce((s, r) => s + r.value, 0);
  if (total === 0) {
    return <div className="accounts-empty" style={{ padding: 36 }}>No admissions yet.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
          strokeWidth={2}
        >
          {data.map((entry) => <Cell key={entry.key} fill={entry.fill} />)}
        </Pie>
        <Legend
          verticalAlign="middle"
          align="right"
          layout="vertical"
          iconType="circle"
          wrapperStyle={{ fontSize: 12 }}
        />
        <Tooltip
          formatter={(value, name) => [`${value} admission${value === 1 ? '' : 's'}`, name]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

// Day formatter — "May 21" (locale).
const shortDay = (iso) => {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Tooltip body customised so money values render with a ₹ prefix and dates
// look like "21 May 2026" instead of the raw "2026-05-21".
const TrendTooltip = ({ active, payload, label, prefix = '', suffix = '', moneyKey, labelKey }) => {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value;
  const display = moneyKey ? `${prefix}${fmtMoney(v)}` : `${prefix}${v}${suffix}`;
  // Pretty label depending on whether the X axis is a day string or a category.
  const niceLabel = labelKey ? label : (() => {
    if (!label) return '';
    const d = new Date(`${label}T00:00:00`);
    if (Number.isNaN(d.getTime())) return label;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  })();
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6,
      padding: '6px 10px', boxShadow: '0 2px 8px rgba(20,24,40,0.08)',
      fontSize: 12,
    }}>
      <div style={{ color: '#6b7280', marginBottom: 2 }}>{niceLabel}</div>
      <div style={{ fontWeight: 700, color: '#111827' }}>{display}</div>
    </div>
  );
};

// ---------------- EMI digest card ----------------
// Renders a list of overdue OR upcoming installments. We keep the row
// shape simple (student • slot • amount • due date • action) because
// accounts typically scans top-to-bottom looking for who to call. The
// "Open" button deep-links to the AdmissionDetail page where they can
// capture the receipt against the right slot.
const EmiCard = ({ title, subtitle, accent, rows, emptyText, navigate, mode }) => {
  const totalDue = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  return (
    <div className="accounts-table-card" style={{ padding: 16, borderTop: `3px solid ${accent}` }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{title}</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{subtitle}</div>
        </div>
        {rows.length > 0 && (
          <div style={{ fontSize: 12, color: '#475569', fontWeight: 600, whiteSpace: 'nowrap' }}>
            ₹ {fmtMoney(totalDue)} total
          </div>
        )}
      </div>
      {rows.length === 0 ? (
        <div style={{ padding: '24px 8px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
          {emptyText}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
          {rows.slice(0, 30).map((r) => (
            <EmiRow key={`${r.admission_id}-${r.installment_no}`} r={r} mode={mode} navigate={navigate} />
          ))}
          {rows.length > 30 && (
            <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', paddingTop: 4 }}>
              + {rows.length - 30} more · scroll above to see all
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const EmiRow = ({ r, mode, navigate }) => {
  const due = r.due_date ? new Date(r.due_date) : null;
  const dueLabel = due
    ? due.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    : '—';
  const daysLabel = (() => {
    if (mode === 'overdue') {
      const n = Math.abs(r.days_until_due);
      return `${n} day${n === 1 ? '' : 's'} overdue`;
    }
    if (r.days_until_due === 0) return 'Due today';
    return `In ${r.days_until_due} day${r.days_until_due === 1 ? '' : 's'}`;
  })();
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px', borderRadius: 6,
        background: mode === 'overdue' ? '#fef2f2' : '#fffbeb',
        border: `1px solid ${mode === 'overdue' ? '#fecaca' : '#fde68a'}`,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {r.student_name || r.email || '—'}
        </div>
        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
          {r.program_name || '—'} · Installment {r.installment_no}
        </div>
      </div>
      <div style={{ textAlign: 'right', minWidth: 100 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>₹ {fmtMoney(r.amount)}</div>
        <Chip
          size="small"
          label={`${daysLabel} · ${dueLabel}`}
          sx={{
            mt: 0.4, height: 18, fontSize: 10, fontWeight: 600,
            bgcolor: mode === 'overdue' ? '#fee2e2' : '#fef3c7',
            color:   mode === 'overdue' ? '#991b1b' : '#92400e',
          }}
        />
      </div>
      <Button
        size="small"
        endIcon={<OpenInNewIcon fontSize="inherit" />}
        onClick={() => navigate(`/accounts/admission/${r.admission_id}`)}
        sx={{ textTransform: 'none', minWidth: 0, fontSize: 11, color: '#475569' }}
      >
        Capture
      </Button>
    </div>
  );
};

export default AccountsDashboard;
