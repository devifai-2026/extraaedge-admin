// Student panel shell — its own header + top nav, distinct from the staff
// sidebar app. Wraps every /student/* page (except login/set-password) and
// guards access to the student session. Kept intentionally simple: students
// are not staff, so no CRM chrome.
import { NavLink, Outlet, useNavigate, Navigate } from 'react-router-dom';
import { studentAuth } from '../../lib/studentApi';

const NAV = [
  { to: '/student/home', label: 'My Course' },
  { to: '/student/classes', label: 'Classes' },
  { to: '/student/recordings', label: 'Recordings' },
  { to: '/student/announcements', label: 'Announcements' },
  { to: '/student/forum', label: 'Forum' },
  { to: '/student/tests', label: 'Tests' },
  { to: '/student/projects', label: 'Projects' },
  { to: '/student/leaderboard', label: 'Leaderboard' },
  { to: '/student/catalog', label: 'Explore Courses' },
];

export default function StudentLayout() {
  const navigate = useNavigate();
  if (!studentAuth.isAuthed()) return <Navigate to="/student/login" replace />;
  const student = studentAuth.getStudent();

  const logout = () => { studentAuth.clear(); navigate('/student/login', { replace: true }); };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <header style={hdr}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: '#0f172a' }}>Student Portal</div>
          <nav style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} style={({ isActive }) => ({
                textDecoration: 'none', fontSize: 13, fontWeight: 600, padding: '7px 12px', borderRadius: 8,
                color: isActive ? '#fff' : '#475569', background: isActive ? '#E53935' : 'transparent',
              })}>{n.label}</NavLink>
            ))}
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>{student?.name || student?.email}</span>
          <button onClick={logout} style={{ border: '1px solid #e2e8f0', background: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 13, cursor: 'pointer', color: '#475569' }}>Sign out</button>
        </div>
      </header>
      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>
        <Outlet />
      </main>
    </div>
  );
}

const hdr = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
  padding: '12px 24px', background: '#fff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10,
};
