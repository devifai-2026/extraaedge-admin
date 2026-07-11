// My Course — the enrolled course, its modules + syllabus, batch, and the
// student's own progress: a completion bar plus a per-module "mark complete"
// toggle that drives the certificate + dashboard.
import { useEffect, useState } from 'react';
import { studentApi } from '../../lib/studentApi';
import { PageHeader, Card, EmptyState, Badge, Skeleton, Progress, Toast, ACCENT } from '../../lib/lmsUi';
import SchoolIcon from '@mui/icons-material/SchoolOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

export default function StudentHome() {
  const [view, setView] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState({});      // moduleId → bool
  const [pct, setPct] = useState(0);
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState('');

  const loadProgress = () => studentApi.progress().then((r) => {
    const d = r?.data ?? r;
    setDone(Object.fromEntries((d.modules || []).map((m) => [m.id, m.completed])));
    setPct(d.pct || 0);
  }).catch(() => {});

  useEffect(() => {
    studentApi.myCourse().then((r) => setView(r?.data ?? r)).catch((e) => setErr(e?.message || 'Could not load your course')).finally(() => setLoading(false));
    loadProgress();
  }, []);

  const toggle = async (moduleId) => {
    const next = !done[moduleId];
    setBusy(moduleId);
    try {
      const r = await studentApi.setProgress(moduleId, next);
      const d = r?.data ?? r;
      setDone(Object.fromEntries((d.modules || []).map((m) => [m.id, m.completed])));
      setPct(d.pct || 0);
      setToast(next ? 'Module marked complete 🎉' : 'Module marked incomplete');
    } catch (e) { setToast(e.message); } finally { setBusy(''); }
  };

  const course = view?.course;
  const modules = view?.modules || [];
  const batch = view?.batch;
  const completedCount = Object.values(done).filter(Boolean).length;

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
            {modules.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                  <span>Your progress</span><span>{completedCount}/{modules.length} · {pct}%</span>
                </div>
                <div style={{ height: 8, background: 'rgba(255,255,255,0.22)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: '#fff', borderRadius: 999, transition: 'width .3s' }} />
                </div>
              </div>
            )}
          </div>

          {/* Modules */}
          <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: 0.5, margin: '4px 0 12px' }}>Modules & syllabus</div>
          {modules.length === 0 ? (
            <Card><EmptyState icon="🧩" title="Syllabus coming soon" text="Your trainer will set up the modules and syllabus shortly." /></Card>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {modules.map((m, i) => {
                const isDone = !!done[m.id];
                return (
                  <Card key={m.id} pad={16} style={isDone ? { borderLeft: '3px solid #16a34a' } : undefined}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: m.syllabus?.length ? 8 : 0 }}>
                      <span style={{ width: 28, height: 28, borderRadius: 8, background: `color-mix(in srgb, ${ACCENT} 12%, transparent)`, color: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>{i + 1}</span>
                      <div style={{ fontWeight: 700, color: '#0f172a', flex: 1 }}>{m.name}</div>
                      {m.trainer_name && <Badge tone="neutral">{m.trainer_name}</Badge>}
                      <button onClick={() => toggle(m.id)} disabled={busy === m.id}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid ${isDone ? '#16a34a' : '#cbd5e1'}`, background: isDone ? '#dcfce7' : '#fff', color: isDone ? '#15803d' : '#475569', borderRadius: 999, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        {isDone ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : <RadioButtonUncheckedIcon sx={{ fontSize: 16 }} />}
                        {isDone ? 'Completed' : 'Mark complete'}
                      </button>
                    </div>
                    {m.description && <div style={{ fontSize: 13, color: '#64748b', margin: '0 0 8px 38px' }}>{m.description}</div>}
                    {Array.isArray(m.syllabus) && m.syllabus.length > 0 && (
                      <ul style={{ margin: '0 0 0 38px', paddingLeft: 16, color: '#475569', fontSize: 13, display: 'grid', gap: 3 }}>
                        {m.syllabus.map((t, j) => <li key={j}>{typeof t === 'string' ? t : (t?.title || JSON.stringify(t))}</li>)}
                      </ul>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
      <Toast msg={toast} onClose={() => setToast('')} />
    </div>
  );
}

const pill = { background: 'rgba(255,255,255,0.16)', borderRadius: 999, padding: '5px 12px', fontSize: 12, fontWeight: 600 };
