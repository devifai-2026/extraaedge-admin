// Student portal shell — premium sidebar carrying the tenant logo + name.
// Branding is fetched once on mount (via /student-auth/me) so the logo is
// present on first paint of every page, and the tenant accent drives the whole
// portal via a CSS variable (--lms-accent).
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { studentApi, studentAuth } from '../../lib/studentApi';
import { resolveAssetUrl } from '../../lib/config';
import { LmsStyles } from '../../lib/lmsUi';
import StudentTour from './StudentTour';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import VideoLibraryOutlinedIcon from '@mui/icons-material/VideoLibraryOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import RocketLaunchOutlinedIcon from '@mui/icons-material/RocketLaunchOutlined';
import RecordVoiceOverOutlinedIcon from '@mui/icons-material/RecordVoiceOverOutlined';
import LeaderboardOutlinedIcon from '@mui/icons-material/LeaderboardOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import PersonOutlineIcon from '@mui/icons-material/AccountCircleOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import WorkOutlineIcon from '@mui/icons-material/WorkOutlineOutlined';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import AttendanceQuestionHost from './AttendanceQuestionHost';
import { disconnectStudentSocket } from '../../lib/studentSocket';

const GROUPS = [
  { heading: null, items: [
    { to: '/student/home', label: 'Dashboard', icon: DashboardOutlinedIcon, end: true },
    { to: '/student/how-it-works', label: 'How it works', icon: HelpOutlineOutlinedIcon },
  ] },
  { heading: 'Learn', items: [
    { to: '/student/course', label: 'My Course', icon: SchoolOutlinedIcon },
    { to: '/student/classes', label: 'Classes', icon: CalendarMonthOutlinedIcon },
    { to: '/student/attendance', label: 'Attendance', icon: EventAvailableOutlinedIcon },
    { to: '/student/recordings', label: 'Recordings', icon: VideoLibraryOutlinedIcon },
    { to: '/student/materials', label: 'Materials', icon: MenuBookOutlinedIcon },
  ] },
  { heading: 'Engage', items: [
    { to: '/student/announcements', label: 'Announcements', icon: CampaignOutlinedIcon },
    { to: '/student/forum', label: 'Forum', icon: ForumOutlinedIcon },
  ] },
  { heading: 'Assess', items: [
    { to: '/student/tests', label: 'Tests', icon: QuizOutlinedIcon },
    { to: '/student/projects', label: 'Projects', icon: AssignmentOutlinedIcon },
    { to: '/student/capstone', label: 'Capstone', icon: RocketLaunchOutlinedIcon },
    { to: '/student/interviews', label: 'Interviews', icon: RecordVoiceOverOutlinedIcon },
    { to: '/student/leaderboard', label: 'Leaderboard', icon: LeaderboardOutlinedIcon },
  ] },
  { heading: 'Career', items: [
    { to: '/student/jobs', label: 'Job Openings', icon: WorkOutlineIcon },
  ] },
  { heading: 'You', items: [
    { to: '/student/payments', label: 'Fees & Payments', icon: PaymentsOutlinedIcon },
    { to: '/student/certificate', label: 'Certificate', icon: WorkspacePremiumOutlinedIcon },
    { to: '/student/catalog', label: 'Explore Courses', icon: StorefrontOutlinedIcon },
    { to: '/student/profile', label: 'My Profile', icon: PersonOutlineIcon },
  ] },
];

// First-login guided tour — one friendly step per sidebar tab. Targets are the
// nav links (always visible), matched by their data-tour = route path.
const TOUR_STEPS = [
  { selector: '[data-tour="/student/home"]', icon: '📊', title: 'Your dashboard', body: 'Home base — next class, course progress, your streak, badges and alerts, all in one view.' },
  { selector: '[data-tour="/student/course"]', icon: '🎓', title: 'My Course', body: 'Your modules and syllabus. Tick off each module as you complete it — it drives your progress and certificate.' },
  { selector: '[data-tour="/student/classes"]', icon: '📅', title: 'Classes', body: 'Join your live/online classes and answer attendance questions in real time to be marked present.' },
  { selector: '[data-tour="/student/attendance"]', icon: '🟢', title: 'Attendance', body: 'Track your attendance class-by-class on a calendar — present, absent and upcoming.' },
  { selector: '[data-tour="/student/recordings"]', icon: '🎬', title: 'Recordings', body: 'Catch up any time — watch recordings of past classes your trainers share.' },
  { selector: '[data-tour="/student/materials"]', icon: '📚', title: 'Materials', body: 'Slides, notes and resources for your course, neatly grouped by module.' },
  { selector: '[data-tour="/student/announcements"]', icon: '📣', title: 'Announcements', body: 'Updates from your trainers. You can like and comment right here.' },
  { selector: '[data-tour="/student/forum"]', icon: '💬', title: 'Forum', body: 'Stuck on something? Post a doubt and your trainers will answer.' },
  { selector: '[data-tour="/student/tests"]', icon: '📝', title: 'Tests', body: 'Attempt mock tests and instantly see your score.' },
  { selector: '[data-tour="/student/projects"]', icon: '🗂️', title: 'Projects', body: 'Submit your projects (live + GitHub links) and get graded with feedback.' },
  { selector: '[data-tour="/student/capstone"]', icon: '🚀', title: 'Capstone', body: 'Your big end-of-course project — submit your deployed link + repo and get graded.' },
  { selector: '[data-tour="/student/interviews"]', icon: '🎤', title: 'Mock Interviews', body: 'See your interview slots, join links and the feedback you receive.' },
  { selector: '[data-tour="/student/leaderboard"]', icon: '🏆', title: 'Leaderboard', body: 'See where you rank — combining tests, projects, attendance and interviews.' },
  { selector: '[data-tour="/student/jobs"]', icon: '💼', title: 'Job Openings', body: 'Roles the placement team shares with you — apply and track your status.' },
  { selector: '[data-tour="/student/certificate"]', icon: '📜', title: 'Certificate', body: 'Your certificate is issued automatically once you complete the course — download it here.' },
  { selector: '[data-tour="/student/catalog"]', icon: '🛍️', title: 'Explore Courses', body: 'Interested in more? Browse other courses and send an enquiry.' },
  { selector: '[data-tour="/student/profile"]', icon: '🪪', title: 'My Profile', body: 'Add your photo, CV, links and skills — a complete profile earns you a badge!' },
];
const tourKey = (id) => `ee_student_tour_v1_${id || 'anon'}`;

// Track a CSS media query in JS (the student shell uses inline styles, not the
// MUI theme, so useMediaQuery from MUI isn't wired here).
function useMedia(query) {
  const [match, setMatch] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false));
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatch(m.matches);
    on(); m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [query]);
  return match;
}

export default function StudentLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tenant, setTenant] = useState(() => studentAuth.getTenant());
  const [tourOpen, setTourOpen] = useState(false);
  const isMobile = useMedia('(max-width: 860px)');
  const [navOpen, setNavOpen] = useState(false);
  // Close the drawer whenever the route changes (mobile nav tap).
  useEffect(() => { setNavOpen(false); }, [location.pathname]);

  // Load branding once (so the logo is present regardless of which page opens
  // first). Cheap; cached in the session for subsequent paints.
  useEffect(() => {
    studentApi.me().then((r) => {
      const t = (r?.data ?? r)?.tenant;
      if (t) { studentAuth.setTenant(t); setTenant(t); }
    }).catch(() => {});
  }, []);

  // Auto-launch the tour on first login, and let any page replay it by
  // dispatching `ee:start-student-tour` (the How it works page does this).
  useEffect(() => {
    const s = studentAuth.getStudent();
    if (s && !localStorage.getItem(tourKey(s.id))) {
      const timer = setTimeout(() => setTourOpen(true), 700); // let the shell paint first
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);
  useEffect(() => {
    const start = () => setTourOpen(true);
    window.addEventListener('ee:start-student-tour', start);
    return () => window.removeEventListener('ee:start-student-tour', start);
  }, []);
  const closeTour = () => {
    setTourOpen(false);
    const s = studentAuth.getStudent();
    if (s) localStorage.setItem(tourKey(s.id), '1');
  };

  if (!studentAuth.isAuthed()) return <Navigate to="/student/login" replace />;
  const student = studentAuth.getStudent();
  const accent = tenant?.brand_primary_color || '#E53935';
  const logo = tenant?.logo_url ? resolveAssetUrl(tenant.logo_url) : null;
  const logout = () => { disconnectStudentSocket(); studentAuth.clear(); navigate('/student/login', { replace: true }); };

  // On mobile the sidebar becomes a fixed slide-in drawer with a scrim; on
  // desktop it's the static 256px rail. Only <main> scrolls.
  const asideStyle = isMobile
    ? { position: 'fixed', top: 0, left: 0, zIndex: 1300, width: 264, height: '100vh', transform: navOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform .25s ease', background: 'linear-gradient(180deg,#0b1220 0%,#0e1729 100%)', color: '#e2e8f0', display: 'flex', flexDirection: 'column', boxShadow: navOpen ? '0 0 40px rgba(0,0,0,.4)' : 'none' }
    : { width: 256, flexShrink: 0, background: 'linear-gradient(180deg,#0b1220 0%,#0e1729 100%)', color: '#e2e8f0', display: 'flex', flexDirection: 'column', height: '100vh' };

  return (
    <div style={{ '--lms-accent': accent, display: 'flex', height: '100vh', overflow: 'hidden', background: '#f5f6fa', fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>
      <LmsStyles />
      {/* Scrim behind the mobile drawer */}
      {isMobile && navOpen && <div onClick={() => setNavOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 1250 }} />}
      {/* Sidebar — static rail on desktop, slide-in drawer on mobile. */}
      <aside style={asideStyle}>
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
                    <NavLink key={n.to} to={n.to} end={n.end} data-tour={n.to}
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

      <main style={{ flex: 1, minWidth: 0, height: '100vh', overflowY: 'auto', padding: '0 0 40px' }}>
        {/* Mobile top bar with the hamburger + institute logo. */}
        {isMobile && (
          <div style={{ position: 'sticky', top: 0, zIndex: 1000, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
            <button onClick={() => setNavOpen(true)} aria-label="Open menu" style={{ border: 'none', background: 'transparent', padding: 4, cursor: 'pointer', display: 'flex' }}>
              <MenuIcon sx={{ fontSize: 26, color: '#0f172a' }} />
            </button>
            {logo ? <img src={logo} alt={tenant?.name} style={{ height: 26, maxWidth: 130, objectFit: 'contain' }} /> : <span style={{ fontWeight: 800, color: '#0f172a' }}>{tenant?.name || 'My Learning'}</span>}
          </div>
        )}
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: isMobile ? '0 16px' : '0 32px', width: '100%', boxSizing: 'border-box' }}>
          <Outlet />
        </div>
      </main>

      {/* Global live-attendance popup — connects the student socket + joins
          batch rooms, pops a timed modal when a trainer fires a question. */}
      <AttendanceQuestionHost />

      <StudentTour steps={TOUR_STEPS} open={tourOpen} onClose={closeTour} />
    </div>
  );
}
