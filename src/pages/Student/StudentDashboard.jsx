// Student Dashboard — premium landing. A gradient hero (tenant accent) with the
// greeting + course + resume CTA, accent-railed stat tiles, and content cards
// with real empty-states. Stashes tenant branding for the sidebar logo.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentApi, studentAuth } from '../../lib/studentApi';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonthOutlined';
import EventAvailableIcon from '@mui/icons-material/EventAvailableOutlined';
import LeaderboardIcon from '@mui/icons-material/EmojiEventsOutlined';
import QuizIcon from '@mui/icons-material/QuizOutlined';
import AssignmentIcon from '@mui/icons-material/AssignmentOutlined';
import CampaignIcon from '@mui/icons-material/CampaignOutlined';
import NotificationsIcon from '@mui/icons-material/NotificationsNoneOutlined';
import ExploreIcon from '@mui/icons-material/StorefrontOutlined';
import ChecklistIcon from '@mui/icons-material/ChecklistOutlined';

const fmt = (v) => { try { return new Date(v).toLocaleString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [notifs, setNotifs] = useState({ items: [], unread: 0 });

  const loadNotifs = () => studentApi.notifications().then((r) => setNotifs(r?.data ?? r ?? { items: [], unread: 0 })).catch(() => {});
  useEffect(() => {
    studentApi.dashboard().then((r) => { const data = r?.data ?? r; setD(data); if (data?.tenant) studentAuth.setTenant(data.tenant); })
      .catch((e) => setErr(e?.message || 'Could not load your dashboard'));
    loadNotifs();
  }, []);
  const markAll = async () => { try { await studentApi.markAllNotifRead(); loadNotifs(); } catch { /* ignore */ } };

  const accent = studentAuth.getTenant()?.brand_primary_color || 'var(--lms-accent, #E53935)';

  if (err) return <div style={{ marginTop: 24, ...alertErr }}>{err}</div>;
  if (!d) return <div style={{ padding: '80px 0', textAlign: 'center', color: '#94a3b8' }}>Loading your dashboard…</div>;

  const s = d.stats || {};
  const nc = d.next_class;
  const lb = d.leaderboard || {};

  return (
    <div style={{ paddingTop: 24 }}>
      {/* Hero */}
      <div style={{
        background: `linear-gradient(120deg, ${accent} 0%, #0e1729 130%)`,
        borderRadius: 18, padding: '26px 28px', color: '#fff', marginBottom: 20,
        boxShadow: `0 18px 40px -22px ${accent}`,
      }}>
        <div style={{ fontSize: 13, opacity: 0.85, fontWeight: 600, letterSpacing: 0.3 }}>{d.student?.program_name || 'Your course'}</div>
        <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: -0.4, margin: '4px 0 14px' }}>Hi {d.student?.name?.split(' ')[0] || 'there'} 👋</div>
        {nc ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13.5, opacity: 0.95 }}>Next: <b>{nc.title}</b> · {fmt(nc.starts_at)}</div>
            {nc.meeting_url
              ? <a href={nc.meeting_url} target="_blank" rel="noreferrer" style={heroCta(accent)}>Join class →</a>
              : <button onClick={() => navigate('/student/classes')} style={heroCta(accent)}>View classes →</button>}
          </div>
        ) : <div style={{ fontSize: 13.5, opacity: 0.9 }}>No upcoming class scheduled — you’re all set for now.</div>}
      </div>

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 20 }}>
        <Stat icon={EventAvailableIcon} tint="#16a34a" label="Attendance" value={s.attendance_pct != null ? `${s.attendance_pct}%` : '—'} sub={`${s.classes_present}/${s.classes_total} classes`} />
        <Stat icon={LeaderboardIcon} tint={accent} label="Leaderboard" value={lb.rank ? `#${lb.rank}` : '—'} sub={lb.total_students ? `of ${lb.total_students}` : 'not ranked yet'} />
        <Stat icon={QuizIcon} tint="#2563eb" label="Tests" value={`${s.tests_attempted}/${s.tests_total}`} sub="attempted" />
        <Stat icon={AssignmentIcon} tint="#7c5cfc" label="Projects" value={`${s.projects_submitted}/${s.projects_total}`} sub="submitted" />
      </div>

      {/* Content cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <Card icon={CalendarMonthIcon} title="Next class">
          {nc ? (
            <>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>{nc.title}</div>
              <div style={{ fontSize: 13, color: '#64748b', margin: '4px 0 12px' }}>{nc.module_name ? `${nc.module_name} · ` : ''}{fmt(nc.starts_at)} · {nc.mode}</div>
              {nc.meeting_url ? <a href={nc.meeting_url} target="_blank" rel="noreferrer" style={btnPrimary(accent)}>Join class</a> : <button onClick={() => navigate('/student/classes')} style={btnGhost}>View</button>}
            </>
          ) : <Empty icon="📅" text="No upcoming class scheduled." />}
        </Card>

        <Card icon={ChecklistIcon} title="To do">
          {(d.pending?.tests_pending || d.pending?.projects_pending) ? (
            <div style={{ display: 'grid', gap: 8 }}>
              {d.pending.tests_pending > 0 && <Todo onClick={() => navigate('/student/tests')} label={`${d.pending.tests_pending} test${d.pending.tests_pending > 1 ? 's' : ''} to attempt`} />}
              {d.pending.projects_pending > 0 && <Todo onClick={() => navigate('/student/projects')} label={`${d.pending.projects_pending} project${d.pending.projects_pending > 1 ? 's' : ''} to submit`} />}
            </div>
          ) : <Empty icon="🎉" text="You’re all caught up!" />}
        </Card>

        <Card icon={CampaignIcon} title="Announcements" onMore={() => navigate('/student/announcements')} moreLabel="View all">
          {d.announcements?.length ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {d.announcements.slice(0, 3).map((a) => (
                <div key={a.id} style={{ borderLeft: `3px solid ${accent}`, paddingLeft: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{a.title || (a.auto_source === 'recording' ? '📹 New recording' : 'Announcement')}</div>
                  <div style={{ fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.body}</div>
                </div>
              ))}
            </div>
          ) : <Empty icon="📣" text="No announcements yet." />}
        </Card>

        <Card icon={NotificationsIcon} title={`Notifications${notifs.unread ? ` · ${notifs.unread}` : ''}`} onMore={notifs.unread ? markAll : undefined} moreLabel="Mark all read">
          {notifs.items?.length ? (
            <div style={{ display: 'grid', gap: 9 }}>
              {notifs.items.slice(0, 5).map((n) => (
                <div key={n.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', opacity: n.is_read ? 0.55 : 1, cursor: n.link ? 'pointer' : 'default' }}
                  onClick={() => { if (n.link) { studentApi.markNotifRead(n.id).catch(() => {}); navigate(n.link); } }}>
                  {!n.is_read && <span style={{ width: 7, height: 7, borderRadius: '50%', background: accent, marginTop: 6, flexShrink: 0 }} />}
                  <span style={{ fontSize: 13, color: '#334155' }}>{n.message}</span>
                </div>
              ))}
            </div>
          ) : <Empty icon="🔔" text="No notifications yet." />}
        </Card>

        <Card icon={ExploreIcon} title="Explore more" onMore={() => navigate('/student/catalog')} moreLabel="Browse">
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>Discover other courses you can enrol in.</div>
          <button onClick={() => navigate('/student/catalog')} style={btnGhost}>Browse courses</button>
        </Card>
      </div>
    </div>
  );
}

const Stat = ({ icon: Icon, tint, label, value, sub }) => (
  <div style={{ background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 2px 10px -6px rgba(15,23,42,0.15)', border: '1px solid #eef0f5', position: 'relative', overflow: 'hidden' }}>
    <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: tint }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{ width: 30, height: 30, borderRadius: 9, background: `${tint}1a`, color: tint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon sx={{ fontSize: 18 }} /></span>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</span>
    </div>
    <div style={{ fontSize: 27, fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
  </div>
);

const Card = ({ icon: Icon, title, children, onMore, moreLabel = 'View all' }) => (
  <div style={{ background: '#fff', borderRadius: 16, padding: 18, boxShadow: '0 2px 10px -6px rgba(15,23,42,0.15)', border: '1px solid #eef0f5' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {Icon && <Icon sx={{ fontSize: 18, color: '#94a3b8' }} />}
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{title}</div>
      </div>
      {onMore && <button onClick={onMore} style={{ border: 'none', background: 'none', color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{moreLabel}</button>}
    </div>
    {children}
  </div>
);

const Todo = ({ label, onClick }) => (
  <button onClick={onClick} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', border: '1px solid #fde68a', background: '#fffbeb', color: '#92400e', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
    {label} <span>→</span>
  </button>
);

const Empty = ({ icon, text }) => (
  <div style={{ textAlign: 'center', padding: '14px 0', color: '#94a3b8' }}>
    <div style={{ fontSize: 26, marginBottom: 4 }}>{icon}</div>
    <div style={{ fontSize: 13 }}>{text}</div>
  </div>
);

const heroCta = (accent) => ({ background: '#fff', color: accent, textDecoration: 'none', borderRadius: 9, padding: '8px 16px', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' });
const btnPrimary = (accent) => ({ display: 'inline-block', background: accent, color: '#fff', textDecoration: 'none', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 600 });
const btnGhost = { border: '1px solid #cbd5e1', background: '#fff', color: '#475569', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const alertErr = { background: '#fef2f2', color: '#b91c1c', padding: '12px 16px', borderRadius: 10, fontSize: 13 };
