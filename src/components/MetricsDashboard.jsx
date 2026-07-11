// Real-time, cross-tenant API observability wall (Recharts). Product-wide —
// every tenant aggregated. Fed by GET /platform/request-log/metrics. Auto-
// refreshes; window selectable. Used on the Analytics + Danger Request Log pages.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { requestLogApi } from '../lib/endpoints';

const WINDOWS = [{ key: '1h', label: '1h' }, { key: '6h', label: '6h' }, { key: '24h', label: '24h' }, { key: '7d', label: '7d' }];
const REFRESH_MS = 15000;

const fmtTs = (ts, win) => {
  const d = new Date(ts);
  if (win === '7d' || win === '24h') return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit' });
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};
const fmtClock = (ts) => { try { return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); } catch { return ''; } };

const C = { requests: '#2563eb', errors: '#dc2626', p95: '#7c3aed', p99: '#c026d3', avg: '#0891b2', s2xx: '#16a34a', s3xx: '#64748b', s4xx: '#d97706', s5xx: '#dc2626' };
const DONUT = ['#2563eb', '#7c3aed', '#16a34a', '#d97706', '#0891b2', '#db2777', '#ca8a04', '#4f46e5', '#059669', '#e11d48'];
const num = (v) => (v == null ? '—' : Number(v).toLocaleString('en-IN'));
const ms = (v) => (v == null ? '—' : `${Number(v).toLocaleString('en-IN')} ms`);

export default function MetricsDashboard({ compact = false }) {
  const [win, setWin] = useState('6h');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [pulse, setPulse] = useState(false);
  const timer = useRef(null);

  const load = useCallback(async (w) => {
    try {
      const r = await requestLogApi.metrics(w);
      setData(r?.data ?? r); setErr(''); setLastUpdated(new Date());
      setPulse(true); setTimeout(() => setPulse(false), 700);
    } catch (e) { setErr(e.message || 'Failed to load metrics'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    setLoading(true); load(win);
    timer.current = setInterval(() => load(win), REFRESH_MS);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [win, load]);

  const s = data?.summary || {};
  const live = data?.live60s || {};
  const series = (data?.series || []).map((r) => ({ ...r, label: fmtTs(r.ts, win) }));
  const statusSeries = (data?.statusSeries || []).map((r) => ({ ...r, label: fmtTs(r.ts, win) }));
  const top = data?.topEndpoints || [];
  const byTenant = data?.byTenant || [];
  const byCategory = data?.byCategory || [];
  const methodMix = data?.methodMix || [];
  const slowest = data?.slowest || [];
  const recentErrors = data?.recentErrors || [];

  // Health verdict from error rate.
  const errRate = s.error_rate ?? 0;
  const health = errRate >= 10 ? { label: 'DEGRADED', color: '#dc2626', bg: '#fef2f2' }
    : errRate >= 3 ? { label: 'ELEVATED ERRORS', color: '#d97706', bg: '#fffbeb' }
      : { label: 'OPERATIONAL', color: '#16a34a', bg: '#f0fdf4' };
  const liveUp = (live.requests || 0) > 0;

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {WINDOWS.map((w) => (
            <button key={w.key} onClick={() => setWin(w.key)}
              style={{ border: '1px solid #cbd5e1', background: win === w.key ? '#0f172a' : '#fff', color: win === w.key ? '#fff' : '#334155', borderRadius: 8, padding: '5px 12px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
              {w.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>
          {err ? <span style={{ color: '#dc2626' }}>{err}</span>
            : lastUpdated ? `Live · updated ${fmtClock(lastUpdated)} · refreshes ${REFRESH_MS / 1000}s` : 'Loading…'}
        </div>
      </div>

      {/* Health banner + live pulse */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ flex: '1 1 260px', background: health.bg, border: `1px solid ${health.color}33`, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: health.color, boxShadow: `0 0 0 4px ${health.color}22`, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: health.color, letterSpacing: 0.3 }}>{health.label}</div>
            <div style={{ fontSize: 12.5, color: '#64748b' }}>{errRate}% error rate · p95 {ms(s.p95_ms)} · {num(s.active_tenants)} tenants live</div>
          </div>
        </div>
        <div style={{ flex: '0 0 auto', background: '#0f172a', color: '#fff', borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, minWidth: 220 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: liveUp ? '#22c55e' : '#64748b', boxShadow: pulse && liveUp ? '0 0 0 6px #22c55e33' : 'none', transition: 'box-shadow .5s', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>Live · last 60s</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{num(live.requests)} req <span style={{ fontSize: 13, color: live.errors > 0 ? '#f87171' : '#94a3b8', fontWeight: 600 }}>· {num(live.errors)} err</span></div>
          </div>
        </div>
      </div>

      {/* Summary tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 16 }}>
        <Tile label="Requests" value={num(s.requests)} />
        <Tile label="Error rate" value={s.error_rate != null ? `${s.error_rate}%` : '—'} tone={errRate > 5 ? 'bad' : errRate > 2 ? 'warn' : 'good'} />
        <Tile label="p50" value={ms(s.p50_ms)} />
        <Tile label="p95" value={ms(s.p95_ms)} tone={s.p95_ms > 1500 ? 'warn' : 'good'} />
        <Tile label="p99" value={ms(s.p99_ms)} />
        <Tile label="Max" value={ms(s.max_ms)} tone={s.max_ms > 10000 ? 'warn' : undefined} />
        <Tile label="5xx" value={num(s.errors)} tone={s.errors > 0 ? 'warn' : 'good'} />
        <Tile label="Tenants" value={num(s.active_tenants)} />
        <Tile label="Users" value={num(s.active_users)} />
      </div>

      {loading && !data ? <div style={{ color: '#94a3b8', padding: 20 }}>Loading metrics…</div> : (
        <>
          {/* Latency + throughput */}
          <Row2 compact={compact}>
            <Panel title="API latency (p95 / p99, ms)">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={series} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={30} />
                  <YAxis tick={{ fontSize: 11 }} width={44} />
                  <Tooltip /><Legend />
                  <Line type="monotone" dataKey="p95_ms" name="p95" stroke={C.p95} dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="p99_ms" name="p99" stroke={C.p99} dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="avg_ms" name="avg" stroke={C.avg} dot={false} strokeWidth={1} strokeDasharray="4 3" />
                </LineChart>
              </ResponsiveContainer>
            </Panel>
            <Panel title="Throughput & errors (per bucket)">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={series} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={30} />
                  <YAxis tick={{ fontSize: 11 }} width={40} /><Tooltip /><Legend />
                  <Bar dataKey="requests" name="requests" fill={C.requests} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="errors" name="errors" fill={C.errors} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          </Row2>

          {/* Status classes */}
          <Panel title="Status classes over time" style={{ marginBottom: 16 }}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={statusSeries} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={30} />
                <YAxis tick={{ fontSize: 11 }} width={40} /><Tooltip /><Legend />
                <Area type="monotone" stackId="1" dataKey="s2xx" name="2xx" stroke={C.s2xx} fill={C.s2xx} fillOpacity={0.7} />
                <Area type="monotone" stackId="1" dataKey="s3xx" name="3xx" stroke={C.s3xx} fill={C.s3xx} fillOpacity={0.6} />
                <Area type="monotone" stackId="1" dataKey="s4xx" name="4xx" stroke={C.s4xx} fill={C.s4xx} fillOpacity={0.7} />
                <Area type="monotone" stackId="1" dataKey="s5xx" name="5xx" stroke={C.s5xx} fill={C.s5xx} fillOpacity={0.8} />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>

          {/* Traffic by tenant + donuts */}
          <Row2 compact={compact}>
            <Panel title="Traffic by tenant">
              <ResponsiveContainer width="100%" height={Math.max(180, byTenant.length * 30)}>
                <BarChart data={byTenant} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="tenant" tick={{ fontSize: 11 }} width={110} />
                  <Tooltip /><Legend />
                  <Bar dataKey="requests" name="requests" fill={C.requests} radius={[0, 3, 3, 0]} />
                  <Bar dataKey="errors" name="errors" fill={C.errors} radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
            <Row2 compact>
              <Panel title="By category">
                <Donut data={byCategory} nameKey="category" />
              </Panel>
              <Panel title="Method mix">
                <Donut data={methodMix} nameKey="method" />
              </Panel>
            </Row2>
          </Row2>

          {/* Slowest + busiest endpoints */}
          <Row2 compact={compact}>
            <Panel title="Slowest endpoints (p95)">
              <EndpointTable rows={slowest} cols={[['Requests', 'requests'], ['p95 ms', 'p95_ms', true], ['Max ms', 'max_ms', true]]} />
            </Panel>
            <Panel title="Busiest endpoints (by requests)">
              <EndpointTable rows={top} cols={[['Requests', 'requests'], ['Errors', 'errors', false, true], ['p95 ms', 'p95_ms', true]]} />
            </Panel>
          </Row2>

          {/* Live error feed */}
          <Panel title={`Recent errors (${recentErrors.length})`}>
            {recentErrors.length === 0 ? <div style={{ color: '#16a34a', fontSize: 13, padding: '6px 0' }}>No errors in this window 🎉</div> : (
              <div style={{ overflowX: 'auto', maxHeight: 320, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead><tr style={{ textAlign: 'left', color: '#64748b', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, background: '#fff' }}>
                    <th style={th}>Time</th><th style={th}>Status</th><th style={th}>Method</th><th style={th}>Endpoint</th><th style={th}>Tenant</th><th style={{ ...th, textAlign: 'right' }}>ms</th><th style={th}>Message</th>
                  </tr></thead>
                  <tbody>{recentErrors.map((e, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ ...td, color: '#94a3b8', whiteSpace: 'nowrap' }}>{fmtClock(e.created_at)}</td>
                      <td style={td}><span style={{ fontWeight: 700, color: e.status_code >= 500 ? '#dc2626' : '#d97706' }}>{e.status_code}</span></td>
                      <td style={td}><code style={{ fontSize: 11, color: '#475569' }}>{e.method}</code></td>
                      <td style={td}>{e.endpoint}</td>
                      <td style={{ ...td, color: '#64748b' }}>{e.tenant}</td>
                      <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{num(e.duration_ms)}</td>
                      <td style={{ ...td, color: '#b91c1c', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.error_message || '—'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

const th = { padding: '8px 10px', fontWeight: 600, fontSize: 12 };
const td = { padding: '7px 10px', color: '#0f172a' };

function Tile({ label, value, tone }) {
  const color = tone === 'bad' ? '#dc2626' : tone === 'warn' ? '#d97706' : tone === 'good' ? '#16a34a' : '#0f172a';
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color, letterSpacing: -0.4, marginTop: 3 }}>{value}</div>
    </div>
  );
}

function Panel({ title, children, style }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 16, ...style }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

function Row2({ children, compact }) {
  return <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: 16 }}>{children}</div>;
}

function Donut({ data, nameKey }) {
  const rows = (data || []).filter((d) => d.requests > 0);
  if (!rows.length) return <div style={{ color: '#94a3b8', fontSize: 13, padding: 20 }}>No data.</div>;
  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie data={rows} dataKey="requests" nameKey={nameKey} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
          {rows.map((_, i) => <Cell key={i} fill={DONUT[i % DONUT.length]} />)}
        </Pie>
        <Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function EndpointTable({ rows, cols }) {
  if (!rows || rows.length === 0) return <div style={{ color: '#94a3b8', fontSize: 13, padding: '6px 0' }}>No data in this window.</div>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
        <thead><tr style={{ textAlign: 'left', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
          <th style={th}>Method</th><th style={th}>Endpoint</th>
          {cols.map(([label]) => <th key={label} style={{ ...th, textAlign: 'right' }}>{label}</th>)}
        </tr></thead>
        <tbody>{rows.map((r, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
            <td style={td}><code style={{ fontSize: 11, color: '#475569' }}>{r.method}</code></td>
            <td style={td}>{r.endpoint}</td>
            {cols.map(([label, key, warnHigh, warnErr]) => (
              <td key={label} style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: warnErr && r[key] > 0 ? '#dc2626' : warnHigh && r[key] > 1500 ? '#d97706' : '#334155' }}>{num(r[key])}</td>
            ))}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
