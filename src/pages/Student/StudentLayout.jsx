// Student portal shell — premium sidebar carrying the tenant logo + name.
// Branding is fetched once on mount (via /student-auth/me) so the logo is
// present on first paint of every page, and the tenant accent drives the whole
// portal via a CSS variable (--lms-accent).
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, Navigate } from 'react-router-dom';
import { studentApi, studentAuth } from '../../lib/studentApi';
import { resolveAssetUrl } from '../../lib/config';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import VideoLibraryOutlinedIcon from '@mui/icons-material/VideoLibraryOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import RecordVoiceOverOutlinedIcon from '@mui/icons-material/RecordVoiceOverOutlined';
import LeaderboardOutlinedIcon from '@mui/icons-material/LeaderboardOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import PersonOutlineIcon from '@mui/icons-material/AccountCircleOutlined';
import LogoutIcon from '@mui/icons-material/Logout';

const GROUPS = [
  { heading: null, items: [
    { to: '/student/home', label: 'Dashboard', icon: DashboardOutlinedIcon, end: true },
  ] },
  { heading: 'Learn', items: [
    { to: '/student/course', label: 'My Course', icon: SchoolOutlinedIcon },
    { to: '/student/classes', label: 'Classes', icon: CalendarMonthOutlinedIcon },
    { to: '/student/attendance', label: 'Attendance', icon: EventAvailableOutlinedIcon },
    { to: '/student/recordings', label: 'Recordings', icon: VideoLibraryOutlinedIcon },
  ] },
  { heading: 'Engage', items: [
    { to: '/student/announcements', label: 'Announcements', icon: CampaignOutlinedIcon },
    { to: '/student/forum', label: 'Forum', icon: ForumOutlinedIcon },
  ] },
  { heading: 'Assess', items: [
    { to: '/student/tests', label: 'Tests', icon: QuizOutlinedIcon },
    { to: '/student/projects', label: 'Projects', icon: AssignmentOutlinedIcon },
    { to: '/student/interviews', label: 'Interviews', icon: RecordVoiceOverOutlinedIcon },
    { to: '/student/leaderboard', label: 'Leaderboard', icon: LeaderboardOutlinedIcon },
  ] },
  { heading: 'You', items: [
    { to: '/student/catalog', label: 'Explore Courses', icon: StorefrontOutlinedIcon },
    { to: '/student/profile', label: 'My Profile', icon: PersonOutlineIcon },
  ] },
];

export default function StudentLayout() {
  const navigate = useNavigate();
  const [tenant, setTenant] = useState(() => studentAuth.getTenant());

  // Load branding once (so the logo is present regardless of which page opens
  // first). Cheap; cached in the session for subsequent paints.
  useEffect(() => {
    studentApi.me().then((r) => {
      const t = (r?.data ?? r)?.tenant;
      if (t) { studentAuth.setTenant(t); setTenant(t); }
    }).catch(() => {});
  }, []);

  if (!studentAuth.isAuthed()) return <Navigate to="/student/login" replace />;
  const student = studentAuth.getStudent();
  const accent = tenant?.brand_primary_color || '#E53935';
  const logo = tenant?.logo_url ? resolveAssetUrl(tenant.logo_url) : null;
  const logout = () => { studentAuth.clear(); navigate('/student/login', { replace: true }); };

  return (
    <div style={{ '--lms-accent': accent, display: 'flex', minHeight: '100vh', background: '#f5f6fa', fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>
      {/* Sidebar */}
      <aside style={{ width: 256, background: 'linear-gradient(180deg,#0b1220 0%,#0e1729 100%)', color: '#e2e8f0', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ padding: '22px 20px 18px', display: 'flex', alignItems: 'center', gap: 11, minHeight: 34 }}>
          {logo
            ? <img src={logo} alt={tenant?.name} style={{ height: 36, maxWidth: 170, objectFit: 'contain' }} />
            : <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: -0.2 }}>{tenant?.name || 'My Learning'}</div>}
        </div>
        <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 12px 12px' }}>
          {GROUPS.map((g, gi) => (
            <div key={gi} style={{ marginBottom: 14 }}>
              {g.heading && <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: '#4b5670', textTransform: 'uppercase', padding: '4px 10px 6px' }}>{g.heading}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {g.items.map((n) => {
                  const Icon = n.icon;
                  return (
                    <NavLink key={n.to} to={n.to} end={n.end}
                      style={({ isActive }) => ({
                        display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none',
                        fontSize: 13.5, fontWeight: 600, padding: '9px 11px', borderRadius: 10,
                        color: isActive ? '#fff' : '#9aa4bd',
                        background: isActive ? accent : 'transparent',
                        boxShadow: isActive ? `0 6px 16px -6px ${accent}` : 'none',
                        transition: 'background .12s, color .12s',
                      })}>
                      <Icon sx={{ fontSize: 19 }} /> {n.label}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div style={{ padding: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
              {(student?.name || '?').slice(0, 1).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student?.name}</div>
              <div style={{ fontSize: 11, color: '#5b6683', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student?.email}</div>
            </div>
          </div>
          <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#cbd5e1', borderRadius: 9, padding: '8px 0', fontSize: 12.5, cursor: 'pointer' }}>
            <LogoutIcon sx={{ fontSize: 16 }} /> Sign out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, padding: '0 0 40px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 32px', width: '100%', boxSizing: 'border-box' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
