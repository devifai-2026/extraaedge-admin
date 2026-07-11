// Trainer Dashboard — the teaching home base. KPI tiles, a "my courses" grid
// with quick actions (manage / schedule / materials), upcoming classes across
// all courses, and a getting-started checklist when a course isn't set up yet.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import SchoolIcon from '@mui/icons-material/SchoolOutlined';
import ViewModuleIcon from '@mui/icons-material/ViewModuleOutlined';
import GroupsIcon from '@mui/icons-material/GroupsOutlined';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonthOutlined';
import { coursesApi, classesApi } from '../../lib/endpoints';
import { auth } from '../../lib/api';
import { PageHeader, Card, StatTile, StatGrid, EmptyState, Badge, Btn, Skeleton, ACCENT } from '../../lib/lmsUi';

const fmt = (v) => { try { return new Date(v).toLocaleString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

export default function TrainerDashboard() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const me = auth.getUser();

  useEffect(() => {
    (async () => {
      try {
        const r = await coursesApi.list();
        const cs = r?.data || [];
        setCourses(cs);
        // Pull classes across all courses for the "upcoming" list (bounded by course count).
        const lists = await Promise.all(cs.map((c) => classesApi.list({ programId: c.id }).then((x) => x?.data || []).catch(() => [])));
        setClasses(lists.flat());
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, []);

  const totalModules = courses.reduce((s, c) => s + (Number(c.module_count) || 0), 0);
  const totalBatches = courses.reduce((s, c) => s + (Number(c.batch_count) || 0), 0);
  const now = Date.now();
  const upcoming = classes
    .filter((c) => !c.ended_at && new Date(c.starts_at).getTime() > now - 30 * 60000)
    .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
    .slice(0, 6);
  const liveNow = classes.filter((c) => c.started_at && !c.ended_at);

  if (loading) return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
      <PageHeader title="Trainer Dashboard" icon={SchoolIcon} />
      <StatGrid>{[0, 1, 2, 3].map((i) => <Card key={i}><Skeleton h={16} w="50%" /><div style={{ height: 8 }} /><Skeleton h={24} w="30%" /></Card>)}</StatGrid>
    </Box>
  );

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
      {/* Hero */}
      <div style={{ background: `linear-gradient(120deg, ${ACCENT} 0%, #0e1729 130%)`, color: '#fff', borderRadius: 18, padding: '24px 28px', margin: '18px 0 20px', boxShadow: `0 18px 40px -22px ${ACCENT}` }}>
        <div style={{ fontSize: 13, opacity: 0.85, fontWeight: 600 }}>Teaching workspace</div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.4, margin: '4px 0 6px' }}>Hi {me?.name?.split(' ')[0] || 'Trainer'} 👋</div>
        <div style={{ fontSize: 13.5, opacity: 0.92 }}>
          {courses.length ? `You're teaching ${courses.length} course${courses.length > 1 ? 's' : ''}.` : 'Get started by setting up your first course below.'}
          {liveNow.length > 0 && <> · <b>{liveNow.length} class live now</b></>}
        </div>
      </div>

      {/* KPI tiles */}
      <StatGrid>
        <StatTile icon={SchoolIcon} label="Courses" value={courses.length} />
        <StatTile icon={ViewModuleIcon} tint="#2563eb" label="Modules" value={totalModules} />
        <StatTile icon={GroupsIcon} tint="#7c3aed" label="Batches" value={totalBatches} />
        <StatTile icon={CalendarMonthIcon} tint="#059669" label="Upcoming classes" value={upcoming.length} sub={liveNow.length ? `${liveNow.length} live now` : undefined} />
      </StatGrid>

      {courses.length === 0 ? (
        <Card><EmptyState icon="🎓" title="No courses assigned yet" text="Once an admin assigns you as a head trainer of a course, it appears here and you can set up modules, batches and classes." /></Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {/* My courses */}
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
                    <div style={{ fontSize: 12.5, color: '#64748b', margin: '4px 0 10px' }}>
                      {c.module_count || 0} module{c.module_count === 1 ? '' : 's'} · {c.batch_count || 0} batch{c.batch_count === 1 ? '' : 'es'}
                      {c.head_trainer_name ? ` · Head: ${c.head_trainer_name}` : ''}
                    </div>
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

          {/* Upcoming classes */}
          <Card title="Upcoming classes" icon={CalendarMonthIcon} right={<Btn size="sm" variant="ghost" onClick={() => navigate('/trainer/classes')}>All</Btn>}>
            {upcoming.length === 0 ? (
              <EmptyState icon="📅" title="Nothing scheduled" text="Schedule a class from the Classes tab (you'll need a batch first)." />
            ) : (
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
      )}
    </Box>
  );
}
