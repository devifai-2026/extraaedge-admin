// Student Dashboard — the LMS landing screen. Next class, my stats, pending
// actions, recent announcements, leaderboard rank, and an explore-courses card.
// Stashes tenant branding (from the dashboard response) into the session so the
// sidebar can render the tenant logo.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentApi, studentAuth } from '../../lib/studentApi';

const fmt = (v) => { try { return new Date(v).toLocaleString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [notifs, setNotifs] = useState({ items: [], unread: 0 });

  const loadNotifs = () => studentApi.notifications().then((r) => setNotifs(r?.data ?? r ?? { items: [], unread: 0 })).catch(() => {});

  useEffect(() => {
    studentApi.dashboard()
      .then((r) => {
        const data = r?.data ?? r;
        setD(data);
        if (data?.tenant) studentAuth.setTenant(data.tenant); // feed the sidebar logo
      })
      .catch((e) => setErr(e?.message || 'Could not load your dashboard'));
    loadNotifs();
  }, []);

  const markAll = async () => { try { await studentApi.markAllNotifRead(); loadNotifs(); } catch { /* ignore */ } };

  if (err) return <div style={alertErr}>{err}</div>;
  if (!d) return <p style={{ color: '#94a3b8' }}>Loading your dashboard…</p>;

  const s = d.stats || {};
  const nc = d.next_class;
  const lb = d.leaderboard || {};

  return (
    <div>
      <h1 style={{ fontSize: 24, margin: '0 0 2px', color: '#0f172a' }}>Hi {d.student?.name?.split(' ')[0] || 'there'} 👋</h1>
      <p style={{ color: '#64748b', margin: '0 0 20px', fontSize: 14 }}>{d.student?.program_name || 'Your course'}</p>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
        <Stat label="Attendance" value={s.attendance_pct != null ? `${s.attendance_pct}%` : '—'} sub={`${s.classes_present}/${s.classes_total} classes`} accent="#16a34a" />
        <Stat label="Leaderboard" value={lb.rank ? `#${lb.rank}` : '—'} sub={lb.total_students ? `of ${lb.total_students}` : ''} accent="#E53935" />
        <Stat label="Tests" value={`${s.tests_attempted}/${s.tests_total}`} sub="attempted" accent="#2563eb" />
        <Stat label="Projects" value={`${s.projects_submitted}/${s.projects_total}`} sub="submitted" accent="#9333ea" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        {/* Next class */}
        <Card title="Next class">
          {nc ? (
            <>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>{nc.title}</div>
              <div style={{ fontSize: 13, color: '#64748b', margin: '4px 0 10px' }}>{nc.module_name ? `${nc.module_name} · ` : ''}{fmt(nc.starts_at)} · {nc.mode}</div>
              {nc.meeting_url
                ? <a href={nc.meeting_url} target="_blank" rel="noreferrer" style={btnPrimary}>Join class</a>
                : <button onClick={() => navigate('/student/classes')} style={btnGhost}>View</button>}
            </>
          ) : <Empty text="No upcoming class scheduled." />}
        </Card>

        {/* Pending actions */}
        <Card title="To do">
          {(d.pending?.tests_pending || d.pending?.projects_pending) ? (
            <div style={{ display: 'grid', gap: 8 }}>
              {d.pending.tests_pending > 0 && (
                <Row onClick={() => navigate('/student/tests')} label={`${d.pending.tests_pending} test${d.pending.tests_pending > 1 ? 's' : ''} to attempt`} />
              )}
              {d.pending.projects_pending > 0 && (
                <Row onClick={() => navigate('/student/projects')} label={`${d.pending.projects_pending} project${d.pending.projects_pending > 1 ? 's' : ''} to submit`} />
              )}
            </div>
          ) : <Empty text="You're all caught up! 🎉" />}
        </Card>

        {/* Recent announcements */}
        <Card title="Announcements" onMore={() => navigate('/student/announcements')}>
          {d.announcements?.length ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {d.announcements.slice(0, 3).map((a) => (
                <div key={a.id} style={{ borderLeft: '3px solid #e2e8f0', paddingLeft: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{a.title || (a.auto_source === 'recording' ? '📹 New recording' : 'Announcement')}</div>
                  <div style={{ fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.body}</div>
                </div>
              ))}
            </div>
          ) : <Empty text="No announcements yet." />}
        </Card>

        {/* Notifications */}
        <Card title={`Notifications${notifs.unread ? ` (${notifs.unread})` : ''}`} onMore={notifs.unread ? markAll : undefined} moreLabel="Mark all read">
          {notifs.items?.length ? (
            <div style={{ display: 'grid', gap: 8 }}>
              {notifs.items.slice(0, 5).map((n) => (
                <div key={n.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', opacity: n.is_read ? 0.6 : 1, cursor: n.link ? 'pointer' : 'default' }}
                  onClick={() => { if (n.link) { studentApi.markNotifRead(n.id).catch(() => {}); navigate(n.link); } }}>
                  {!n.is_read && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#E53935', marginTop: 6, flexShrink: 0 }} />}
                  <span style={{ fontSize: 13, color: '#334155' }}>{n.message}</span>
                </div>
              ))}
            </div>
          ) : <Empty text="No notifications yet." />}
        </Card>

        {/* Explore other courses */}
        <Card title="Explore more" onMore={() => navigate('/student/catalog')}>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>Discover other courses you can enrol in.</div>
          <button onClick={() => navigate('/student/catalog')} style={btnGhost}>Browse courses</button>
        </Card>
      </div>
    </div>
  );
}

const Stat = ({ label, value, sub, accent }) => (
  <div style={{ background: '#fff', border: '1px solid #eef0f4', borderRadius: 14, padding: 16, boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
    <div style={{ fontSize: 26, fontWeight: 800, color: accent, marginTop: 4 }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: '#94a3b8' }}>{sub}</div>}
  </div>
);

const Card = ({ title, children, onMore, moreLabel = 'View all' }) => (
  <div style={{ background: '#fff', border: '1px solid #eef0f4', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{title}</div>
      {onMore && <button onClick={onMore} style={{ border: 'none', background: 'none', color: '#2563eb', fontSize: 12, cursor: 'pointer' }}>{moreLabel}</button>}
    </div>
    {children}
  </div>
);

const Row = ({ label, onClick }) => (
  <button onClick={onClick} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', border: '1px solid #fde68a', background: '#fffbeb', color: '#92400e', borderRadius: 8, padding: '9px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
    {label} <span>→</span>
  </button>
);

const Empty = ({ text }) => <div style={{ fontSize: 13, color: '#94a3b8' }}>{text}</div>;

const btnPrimary = { display: 'inline-block', background: '#E53935', color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600 };
const btnGhost = { border: '1px solid #cbd5e1', background: '#fff', color: '#475569', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const alertErr = { background: '#fef2f2', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, fontSize: 13 };
