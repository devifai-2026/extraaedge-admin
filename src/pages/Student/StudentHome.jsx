// Student home / My Course — the enrolled course, its modules + syllabus, and
// the student's batch. Real data from /courses/my-course.
import { useEffect, useState } from 'react';
import { studentApi, studentAuth } from '../../lib/studentApi';

export default function StudentHome() {
  const [me] = useState(studentAuth.getStudent());
  const [view, setView] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentApi.myCourse()
      .then((r) => setView(r?.data ?? r))
      .catch((e) => setErr(e?.message || 'Could not load your course'))
      .finally(() => setLoading(false));
  }, []);

  const course = view?.course;
  const modules = view?.modules || [];
  const batch = view?.batch;

  return (
    <div>
      <h2 style={{ fontSize: 20, margin: '0 0 6px', color: '#0f172a' }}>
        Welcome{me?.name ? `, ${me.name}` : ''} 👋
      </h2>
      {loading && <p style={{ color: '#94a3b8' }}>Loading your course…</p>}
      {err && <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '8px 12px', borderRadius: 8, fontSize: 13 }}>{err}</div>}

      {course && (
        <>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginTop: 12 }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: '#94a3b8', fontWeight: 700 }}>Your course</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{course.program_name || '—'}</div>
            {course.program_description && <div style={{ fontSize: 14, color: '#64748b', marginTop: 6 }}>{course.program_description}</div>}
            <div style={{ marginTop: 10, fontSize: 13, color: '#475569' }}>
              Batch: <b>{batch?.name || 'To be assigned'}</b>
              {course.program_type ? ` · ${course.program_type}` : ''}
            </div>
          </div>

          <h3 style={{ fontSize: 16, margin: '22px 0 10px', color: '#0f172a' }}>Modules & syllabus</h3>
          {modules.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: 14 }}>Modules will appear here once your trainer sets them up.</div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {modules.map((m, i) => (
                <div key={m.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{i + 1}. {m.name}</div>
                  {m.description && <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{m.description}</div>}
                  {Array.isArray(m.syllabus) && m.syllabus.length > 0 && (
                    <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: '#475569', fontSize: 13 }}>
                      {m.syllabus.map((t, j) => <li key={j}>{typeof t === 'string' ? t : (t?.title || JSON.stringify(t))}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
