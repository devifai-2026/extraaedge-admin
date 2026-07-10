// Student home — confirms the session (loads /student-auth/me) and shows a
// welcome + course summary shell. Real course modules/timeline land in the
// Courses phase; this is the Phase-1 foundation view.
import { useEffect, useState } from 'react';
import { studentApi, studentAuth } from '../../lib/studentApi';

export default function StudentHome() {
  const [me, setMe] = useState(studentAuth.getStudent());
  const [err, setErr] = useState('');

  useEffect(() => {
    studentApi.me()
      .then((r) => setMe(r?.data ?? r))
      .catch((e) => setErr(e?.message || 'Could not load your profile'));
  }, []);

  return (
    <div>
      <h2 style={{ fontSize: 20, margin: '0 0 6px', color: '#0f172a' }}>
        Welcome{me?.name ? `, ${me.name}` : ''} 👋
      </h2>
      <p style={{ color: '#64748b', fontSize: 14, marginTop: 0 }}>
        This is your student portal. Your classes, recordings, tests and more will appear here.
      </p>
      {err && <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '8px 12px', borderRadius: 8, fontSize: 13 }}>{err}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 20 }}>
        <Card title="My Course" body="Your enrolled course, modules and syllabus." />
        <Card title="Upcoming Classes" body="Join links and your schedule will show here." />
        <Card title="Recordings" body="Watch back past classes you have access to." />
      </div>
    </div>
  );
}

const Card = ({ title, body }) => (
  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
    <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>{title}</div>
    <div style={{ fontSize: 13, color: '#64748b' }}>{body}</div>
  </div>
);
