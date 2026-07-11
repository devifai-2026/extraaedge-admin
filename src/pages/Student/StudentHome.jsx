// My Course — the enrolled course, its modules + syllabus, and batch. Premium
// treatment: course banner, module cards with syllabus, progress framing.
import { useEffect, useState } from 'react';
import { studentApi, studentAuth } from '../../lib/studentApi';
import { PageHeader, Card, EmptyState, Badge, Skeleton, ACCENT } from '../../lib/lmsUi';
import SchoolIcon from '@mui/icons-material/SchoolOutlined';

export default function StudentHome() {
  const [view, setView] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentApi.myCourse().then((r) => setView(r?.data ?? r)).catch((e) => setErr(e?.message || 'Could not load your course')).finally(() => setLoading(false));
  }, []);

  const course = view?.course;
  const modules = view?.modules || [];
  const batch = view?.batch;

  return (
    <div>
      <PageHeader title="My Course" subtitle={course?.program_name || undefined} icon={SchoolIcon} />

      {loading && <Card><Skeleton h={20} w="40%" /><div style={{ height: 10 }} /><Skeleton h={12} /><div style={{ height: 6 }} /><Skeleton h={12} w="80%" /></Card>}
      {err && <Card><div style={{ color: '#b91c1c', fontSize: 13 }}>{err}</div></Card>}

      {course && (
        <>
          {/* Course banner */}
          <div style={{ background: `linear-gradient(120deg, ${ACCENT} 0%, #0e1729 130%)`, color: '#fff', borderRadius: 16, padding: '22px 24px', marginBottom: 18, boxShadow: `0 16px 36px -22px ${ACCENT}` }}>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.3 }}>{course.program_name}</div>
            {course.program_description && <div style={{ fontSize: 13.5, opacity: 0.9, marginTop: 6, maxWidth: 640 }}>{course.program_description}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
              <span style={pill}>{batch?.name ? `Batch: ${batch.name}` : 'Batch: to be assigned'}</span>
              {course.program_type && <span style={pill}>{course.program_type}</span>}
              <span style={pill}>{modules.length} module{modules.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Modules */}
          <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: 0.5, margin: '4px 0 12px' }}>Modules & syllabus</div>
          {modules.length === 0 ? (
            <Card><EmptyState icon="🧩" title="Syllabus coming soon" text="Your trainer will set up the modules and syllabus shortly." /></Card>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {modules.map((m, i) => (
                <Card key={m.id} pad={16}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: m.syllabus?.length ? 8 : 0 }}>
                    <span style={{ width: 28, height: 28, borderRadius: 8, background: `color-mix(in srgb, ${ACCENT} 12%, transparent)`, color: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>{i + 1}</span>
                    <div style={{ fontWeight: 700, color: '#0f172a', flex: 1 }}>{m.name}</div>
                    {m.trainer_name && <Badge tone="neutral">{m.trainer_name}</Badge>}
                  </div>
                  {m.description && <div style={{ fontSize: 13, color: '#64748b', margin: '0 0 8px 38px' }}>{m.description}</div>}
                  {Array.isArray(m.syllabus) && m.syllabus.length > 0 && (
                    <ul style={{ margin: '0 0 0 38px', paddingLeft: 16, color: '#475569', fontSize: 13, display: 'grid', gap: 3 }}>
                      {m.syllabus.map((t, j) => <li key={j}>{typeof t === 'string' ? t : (t?.title || JSON.stringify(t))}</li>)}
                    </ul>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const pill = { background: 'rgba(255,255,255,0.16)', borderRadius: 999, padding: '5px 12px', fontSize: 12, fontWeight: 600 };
