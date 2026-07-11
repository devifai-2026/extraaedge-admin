// Student Attendance — a month calendar marking each class day: green=present,
// red=absent, grey=upcoming/scheduled (future), amber=today's class not yet
// marked. Click a day to see its class(es) + status. Built from the student's
// own class list (studentApi.myClasses).
import { useEffect, useMemo, useState } from 'react';
import { studentApi } from '../../lib/studentApi';
import { PageHeader, Card, Skeleton } from '../../lib/lmsUi';
import EventAvailableIcon from '@mui/icons-material/EventAvailableOutlined';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const startOfDay = (v) => { const d = new Date(v); d.setHours(0, 0, 0, 0); return d; };

// Status for a class from the student's POV.
function classState(c) {
  const now = new Date();
  const start = new Date(c.starts_at);
  if (c.my_status === 'present') return 'present';
  if (c.ended_at || start < now) {
    // Class is over (or its start has passed): present handled above → absent.
    return c.my_status === 'present' ? 'present' : (new Date(c.ends_at || c.starts_at) < now ? 'absent' : 'pending');
  }
  return 'upcoming';
}

const COLORS = {
  present: { bg: '#dcfce7', dot: '#16a34a', label: 'Present' },
  absent: { bg: '#fee2e2', dot: '#dc2626', label: 'Absent' },
  upcoming: { bg: '#eef2f7', dot: '#94a3b8', label: 'Upcoming' },
  pending: { bg: '#fef9c3', dot: '#d97706', label: 'Pending' },
};

export default function StudentAttendance() {
  const [classes, setClasses] = useState([]);
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; });
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { studentApi.myClasses().then((r) => setClasses(r?.data || [])).catch(() => {}).finally(() => setLoading(false)); }, []);

  // Group classes by day (ymd → [classes]).
  const byDay = useMemo(() => {
    const map = {};
    for (const c of classes) { const k = ymd(startOfDay(c.starts_at)); (map[k] ||= []).push(c); }
    return map;
  }, [classes]);

  // Overall stats (ended classes only).
  const stats = useMemo(() => {
    let present = 0, total = 0;
    for (const c of classes) {
      const st = classState(c);
      if (st === 'present' || st === 'absent') { total += 1; if (st === 'present') present += 1; }
    }
    return { present, total, pct: total ? Math.round((present / total) * 100) : null };
  }, [classes]);

  // Build the calendar grid for the current month.
  const cells = useMemo(() => {
    const year = cursor.getFullYear(), month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const lead = first.getDay();
    const arr = [];
    for (let i = 0; i < lead; i += 1) arr.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) arr.push(new Date(year, month, d));
    return arr;
  }, [cursor]);

  const monthLabel = cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const shift = (n) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));
  const todayKey = ymd(startOfDay(new Date()));

  if (loading) return (
    <div style={{ maxWidth: 760 }}>
      <PageHeader title="Attendance" subtitle="Your class-by-class attendance at a glance." icon={EventAvailableIcon} />
      <Card><Skeleton h={16} w="50%" /><div style={{ height: 8 }} /><Skeleton h={12} w="70%" /></Card>
    </div>
  );

  return (
    <div style={{ maxWidth: 760 }}>
      <PageHeader
        title="Attendance"
        subtitle="Your class-by-class attendance at a glance."
        icon={EventAvailableIcon}
        right={stats.pct != null && (
          <div style={{ background: '#0f172a', color: '#fff', borderRadius: 10, padding: '6px 14px', fontSize: 13, fontWeight: 700 }}>
            {stats.pct}% · {stats.present}/{stats.total} classes
          </div>
        )}
      />

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 12 }}>
        {Object.entries(COLORS).map(([k, v]) => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: v.dot }} /> {v.label}
          </span>
        ))}
      </div>

      <Card pad={16}>
        {/* Month nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <button onClick={() => shift(-1)} style={navBtn}>‹</button>
          <div style={{ fontWeight: 700, color: '#0f172a' }}>{monthLabel}</div>
          <button onClick={() => shift(1)} style={navBtn}>›</button>
        </div>
        {/* Weekday header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
          {DOW.map((d) => <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>{d}</div>)}
        </div>
        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const key = ymd(d);
            const dayClasses = byDay[key] || [];
            const st = dayClasses.length ? classState(dayClasses[0]) : null;
            const c = st ? COLORS[st] : null;
            const isToday = key === todayKey;
            return (
              <button key={key} onClick={() => dayClasses.length && setSelected({ key, classes: dayClasses })}
                style={{
                  aspectRatio: '1', border: isToday ? '2px solid #0f172a' : '1px solid #eef0f4',
                  borderRadius: 8, background: c ? c.bg : '#fff', cursor: dayClasses.length ? 'pointer' : 'default',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: 2,
                }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{d.getDate()}</span>
                {c && <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot }} />}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Selected-day detail */}
      {selected && (
        <Card pad={16} style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontWeight: 700 }}>{new Date(selected.key).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long' })}</div>
            <button onClick={() => setSelected(null)} style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
          </div>
          {selected.classes.map((c) => {
            const st = classState(c); const col = COLORS[st];
            return (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{c.title}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{c.module_name ? `${c.module_name} · ` : ''}{new Date(c.starts_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <span style={{ background: col.bg, color: col.dot, fontWeight: 700, fontSize: 11, padding: '4px 10px', borderRadius: 999 }}>{col.label}</span>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

const navBtn = { border: '1px solid #e2e8f0', background: '#fff', borderRadius: 8, width: 30, height: 30, fontSize: 16, cursor: 'pointer', color: '#475569' };
