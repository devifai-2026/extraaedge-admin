import React, { useEffect, useMemo, useState } from 'react';
import {
  CircularProgress, Select, MenuItem, FormControl,
} from '@mui/material';
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
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trendDays, setTrendDays] = useState(30);

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

      {/* ---------------- Trend row: admissions + collection ---------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 12, marginBottom: 14 }}>
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

export default AccountsDashboard;
