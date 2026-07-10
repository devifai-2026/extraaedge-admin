// Student portal shell — a premium SIDEBAR layout (distinct from the staff app)
// carrying the tenant logo + name, so it reads as the institute's own LMS.
// Guards the student session; students authenticate via studentApi.
import { NavLink, Outlet, useNavigate, Navigate } from 'react-router-dom';
import { studentAuth } from '../../lib/studentApi';
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

const NAV = [
  { to: '/student/home', label: 'Dashboard', icon: DashboardOutlinedIcon },
  { to: '/student/course', label: 'My Course', icon: SchoolOutlinedIcon },
  { to: '/student/classes', label: 'Classes', icon: CalendarMonthOutlinedIcon },
  { to: '/student/attendance', label: 'Attendance', icon: EventAvailableOutlinedIcon },
  { to: '/student/recordings', label: 'Recordings', icon: VideoLibraryOutlinedIcon },
  { to: '/student/announcements', label: 'Announcements', icon: CampaignOutlinedIcon },
  { to: '/student/forum', label: 'Forum', icon: ForumOutlinedIcon },
  { to: '/student/tests', label: 'Tests', icon: QuizOutlinedIcon },
  { to: '/student/projects', label: 'Projects', icon: AssignmentOutlinedIcon },
  { to: '/student/interviews', label: 'Interviews', icon: RecordVoiceOverOutlinedIcon },
  { to: '/student/leaderboard', label: 'Leaderboard', icon: LeaderboardOutlinedIcon },
  { to: '/student/catalog', label: 'Explore Courses', icon: StorefrontOutlinedIcon },
  { to: '/student/profile', label: 'My Profile', icon: PersonOutlineIcon },
];

export default function StudentLayout() {
  const navigate = useNavigate();
  if (!studentAuth.isAuthed()) return <Navigate to="/student/login" replace />;
  const student = studentAuth.getStudent();
  const tenant = studentAuth.getTenant();
  const accent = tenant?.brand_primary_color || '#E53935';
  const logo = tenant?.logo_url ? resolveAssetUrl(tenant.logo_url) : null;

  const logout = () => { studentAuth.clear(); navigate('/student/login', { replace: true }); };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f6f7fb', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Sidebar */}
      <aside style={{ width: 248, background: '#0f172a', color: '#e2e8f0', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ padding: '20px 18px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
          {logo
            ? <img src={logo} alt={tenant?.name} style={{ height: 34, maxWidth: 150, objectFit: 'contain' }} />
            : <div style={{ fontWeight: 800, fontSize: 17 }}>{tenant?.name || 'Learning'}</div>}
        </div>
        <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map((n) => {
            const Icon = n.icon;
            return (
              <NavLink key={n.to} to={n.to} end={n.to === '/student/home'}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none',
                  fontSize: 13.5, fontWeight: 600, padding: '10px 12px', borderRadius: 9,
                  color: isActive ? '#fff' : '#94a3b8',
                  background: isActive ? accent : 'transparent',
                })}>
                <Icon sx={{ fontSize: 19 }} /> {n.label}
              </NavLink>
            );
          })}
        </nav>
        <div style={{ padding: 12, borderTop: '1px solid #1e293b' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student?.name}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student?.email}</div>
          <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center', border: '1px solid #334155', background: 'transparent', color: '#cbd5e1', borderRadius: 8, padding: '7px 0', fontSize: 12.5, cursor: 'pointer' }}>
            <LogoutIcon sx={{ fontSize: 16 }} /> Sign out
          </button>
        </div>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, minWidth: 0, padding: '28px 32px', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        <Outlet />
      </main>
    </div>
  );
}
