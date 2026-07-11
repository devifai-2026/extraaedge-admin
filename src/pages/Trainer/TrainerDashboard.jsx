// Trainer Dashboard — the teaching home base, styled to match the premium
// student portal. KPI tiles, student roster with avatars, a status-breakdown
// graph (pending-to-join / on-break / dropped), per-course student bars, a
// course-wise leaderboard with a course switcher, my-courses quick actions, and
// upcoming/live classes.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import SchoolIcon from '@mui/icons-material/SchoolOutlined';
import ViewModuleIcon from '@mui/icons-material/ViewModuleOutlined';
import GroupsIcon from '@mui/icons-material/GroupsOutlined';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonthOutlined';
import EmojiEventsIcon from '@mui/icons-material/EmojiEventsOutlined';
import { coursesApi, classesApi, assessmentsApi } from '../../lib/endpoints';
import { auth } from '../../lib/api';
import { PageHeader, Card, StatTile, StatGrid, EmptyState, Badge, Btn, Skeleton, ACCENT } from '../../lib/lmsUi';
import LeaderboardTable from './LeaderboardTable';

const fmt = (v) => { try { return new Date(v).toLocaleString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
const AV_COLORS = ['#E53935', '#2563eb', '#7c3aed', '#059669', '#d97706', '#db2777', '#0891b2', '#4f46e5'];
const colorFor = (s) => AV_COLORS[(String(s || '').charCodeAt(0) || 0) % AV_COLORS.length];

function Avatar({ name, photo, size = 40 }) {
  const initial = (name || '?').trim().slice(0, 1).toUpperCase();
  return (
    <div title={name} style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: photo ? '#eef2f7' : colorFor(name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: size * 0.4, border: '2px solid #fff', boxShadow: '0 0 0 1px #e2e8f0' }}>
      {photo ? <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial}
    </div>
  );
}

export default function TrainerDashboard() {
  const navigate = useNavigate();
  const [ins, setIns] = useState(null);
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [focus, setFocus] = useState(''); // focused course for leaderboard
  const [board, setBoard] = useState([]);
  const me = auth.getUser();

  useEffect(() => {
    (async () => {
      try {
        const [insR, cR] = await Promise.all([coursesApi.insights(), coursesApi.list()]);
        const insights = insR?.data || null;
        const cs = cR?.data || [];
        setIns(insights); setCourses(cs);
        if (cs[0]) setFocus(cs[0].id);
        const lists = await Promise.all(cs.map((c) => classesApi.list({ programId: c.id }).then((x) => x?.data || []).catch(() => [])));
        setClasses(lists.flat());
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (!focus) { setBoard([]); return; }
    assessmentsApi.leaderboard(focus).then((r) => setBoard(r?.data || [])).catch(() => setBoard([]));
  }, [focus]);

  const t = ins?.totals || {};
  const now = Date.now();
  const upcoming = useMemo(() => classes
    .filter((c) => !c.ended_at && new Date(c.starts_at).getTime() > now - 30 * 60000)
    .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at)).slice(0, 6), [classes, now]);
  const liveNow = classes.filter((c) => c.started_at && !c.ended_at);
  const roster = ins?.students || [];
  const perCourse = ins?.per_course || [];
  const maxCourseStudents = Math.max(1, ...perCourse.map((c) => c.students || 0));

  // Status breakdown segments for the bar.
  const seg = [
    { key: 'active', label: 'Active', value: t.active_students || 0, color: '#16a34a' },
    { key: 'unassigned', label: 'Yet to join a batch', value: t.unassigned || 0, color: '#d97706' },
    { key: 'on_break', label: 'On break', value: t.on_break || 0, color: '#2563eb' },
    { key: 'dropped', label: 'Dropped', value: t.dropped || 0, color: '#dc2626' },
  ];
  const segTotal = Math.max(1, seg.reduce((a, s) => a + s.value, 0));

  if (loading) return (
    <Box sx={{ p: 3, maxWidth: 1120, mx: 'auto' }}>
      <PageHeader title="Trainer Dashboard" icon={SchoolIcon} />
      <StatGrid>{[0, 1, 2, 3].map((i) => <Card key={i}><Skeleton h={16} w="50%" /><div style={{ height: 8 }} /><Skeleton h={24} w="30%" /></Card>)}</StatGrid>
      <Card><Skeleton h={14} w="40%" /><div style={{ height: 10 }} /><Skeleton h={40} /></Card>
    </Box>
  );

  return (
    <Box sx={{ p: 3, maxWidth: 1120, mx: 'auto' }}>
      {/* Hero */}
      <div style={{ background: `linear-gradient(120deg, ${ACCENT} 0%, #0e1729 130%)`, color: '#fff', borderRadius: 18, padding: '24px 28px', margin: '18px 0 20px', boxShadow: `0 18px 40px -22px ${ACCENT}` }}>
        <div style={{ fontSize: 13, opacity: 0.85, fontWeight: 600 }}>Teaching workspace</div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.4, margin: '4px 0 6px' }}>Hi {me?.name?.split(' ')[0] || 'Trainer'} 👋</div>
        <div style={{ fontSize: 13.5, opacity: 0.92 }}>
          {courses.length ? `Teaching ${courses.length} course${courses.length > 1 ? 's' : ''} · ${t.students || 0} student${t.students === 1 ? '' : 's'}.` : 'Get started by setting up your first course.'}
          {liveNow.length > 0 && <> · <b>{liveNow.length} class live now</b></>}
        </div>
      </div>

      {/* KPI tiles */}
      <StatGrid>
        <StatTile icon={GroupsIcon} label="Students" value={t.students || 0} sub={`${t.active_students || 0} active`} />
        <StatTile icon={SchoolIcon} tint="#2563eb" label="Courses" value={t.courses || 0} sub={`${t.modules || 0} modules`} />
        <StatTile icon={ViewModuleIcon} tint="#7c3aed" label="Batches" value={t.batches || 0} />
        <StatTile icon={CalendarMonthIcon} tint="#059669" label="Upcoming classes" value={upcoming.length} sub={liveNow.length ? `${liveNow.length} live now` : undefined} />
      </StatGrid>

      {courses.length === 0 ? (
        <Card><EmptyState icon="🎓" title="No courses assigned yet" text="Once you're assigned as head trainer of a course, it appears here to set up modules, batches, classes and materials." /></Card>
      ) : (
        <>
          {/* Students: avatars + status breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
            <Card title={`Students (${t.students || 0})`} icon={GroupsIcon} right={<Btn size="sm" variant="ghost" onClick={() => focus && navigate(`/trainer/courses/${focus}?tab=attendance`)}>View</Btn>}>
              {roster.length === 0 ? <EmptyState icon="👥" title="No students yet" text="Students appear here once Accounts confirms them into your course." /> : (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                    {roster.slice(0, 14).map((s) => <Avatar key={s.id} name={s.name} photo={s.photo_url} />)}
                    {t.students > 14 && (
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#eef2f7', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>+{t.students - 14}</div>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>{roster.slice(0, 3).map((s) => s.name).join(', ')}{t.students > 3 ? ` and ${t.students - 3} more` : ''}</div>
                </>
              )}
            </Card>

            <Card title="Student status" icon={GroupsIcon}>
              {/* stacked bar */}
              <div style={{ display: 'flex', height: 12, borderRadius: 999, overflow: 'hidden', marginBottom: 12, background: '#eef2f7' }}>
                {seg.map((s) => s.value > 0 && <div key={s.key} title={`${s.label}: ${s.value}`} style={{ width: `${(s.value / segTotal) * 100}%`, background: s.color }} />)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {seg.map((s) => (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, color: '#475569', flex: 1 }}>{s.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{s.value}</span>
                  </div>
                ))}
              </div>
              {(t.unassigned > 0) && (
                <div style={{ marginTop: 12 }}>
                  <Btn size="sm" onClick={() => focus && navigate(`/trainer/courses/${focus}?tab=batches`)}>Place {t.unassigned} student{t.unassigned > 1 ? 's' : ''} in a batch →</Btn>
                </div>
              )}
            </Card>
          </div>

          {/* Per-course student bars + course-wise leaderboard */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
            <Card title="Students by course" icon={SchoolIcon}>
              {perCourse.length === 0 ? <EmptyState icon="📊" title="No data yet" /> : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {perCourse.map((c) => (
                    <div key={c.program_id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                        <span style={{ color: '#334155', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>{c.name}</span>
                        <span style={{ color: '#64748b' }}>{c.students} · {c.batches}b · {c.modules}m</span>
                      </div>
                      <div style={{ height: 8, background: '#eef2f7', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ width: `${(c.students / maxCourseStudents) * 100}%`, height: '100%', background: ACCENT, borderRadius: 999 }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Leaderboard" icon={EmojiEventsIcon}
              right={courses.length > 1 && (
                <select value={focus} onChange={(e) => setFocus(e.target.value)} style={{ fontSize: 12.5, border: '1px solid #cbd5e1', borderRadius: 8, padding: '5px 8px', maxWidth: 180 }}>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}>
              {board.length === 0 ? <EmptyState icon="🏆" title="No leaderboard yet" text="Scores appear after tests, projects and attendance." /> : (
                <div style={{ margin: '-6px -4px' }}><LeaderboardTable rows={board.slice(0, 6)} /></div>
              )}
            </Card>
          </div>

          {/* My courses + upcoming classes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            <Card title="My courses" icon={SchoolIcon}>
              <div style={{ display: 'grid', gap: 12 }}>
                {courses.map((c) => {
                  const setUp = (Number(c.module_count) || 0) > 0 && (Number(c.batch_count) || 0) > 0;
                  return (
                    <div key={c.id} style={{ border: '1px solid #eef0f5', borderRadius: 12, padding: 14, borderLeft: `3px solid ${ACCENT}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{c.name}</div>
                        {!setUp && <Badge tone="warning">Setup needed</Badge>}
                      </div>
                      <div style={{ fontSize: 12.5, color: '#64748b', margin: '4px 0 10px' }}>{c.module_count || 0} modules · {c.batch_count || 0} batches{c.head_trainer_name ? ` · Head: ${c.head_trainer_name}` : ''}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <Btn size="sm" onClick={() => navigate(`/trainer/courses/${c.id}`)}>Manage</Btn>
                        <Btn size="sm" variant="ghost" onClick={() => navigate('/trainer/classes')}>Classes</Btn>
                        <Btn size="sm" variant="ghost" onClick={() => navigate('/trainer/materials')}>Materials</Btn>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card title="Upcoming classes" icon={CalendarMonthIcon} right={<Btn size="sm" variant="ghost" onClick={() => navigate('/trainer/classes')}>All</Btn>}>
              {upcoming.length === 0 ? <EmptyState icon="📅" title="Nothing scheduled" text="Schedule a class from the Classes tab (a batch is needed first)." /> : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {upcoming.map((c) => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', borderLeft: `3px solid ${c.started_at && !c.ended_at ? '#dc2626' : ACCENT}`, paddingLeft: 10 }}>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a' }}>{c.title}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{c.batch_name ? `${c.batch_name} · ` : ''}{fmt(c.starts_at)}</div>
                      </div>
                      {c.started_at && !c.ended_at && <Badge tone="danger">● LIVE</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </Box>
  );
}
