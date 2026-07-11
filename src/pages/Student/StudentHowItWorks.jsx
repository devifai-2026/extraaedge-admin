// How it works — a friendly guide to the whole student portal, plus a button to
// (re)launch the interactive guided tour (handled by StudentLayout's listener).
import { PageHeader, Card, Btn, ACCENT } from '../../lib/lmsUi';
import HelpIcon from '@mui/icons-material/HelpOutlineOutlined';

const SECTIONS = [
  {
    heading: 'Learn',
    items: [
      { icon: '🎓', title: 'My Course', text: 'See your modules and syllabus. Mark each module complete as you finish it — this drives your progress bar and unlocks your certificate.' },
      { icon: '📅', title: 'Classes', text: 'Join your live or online classes. During a class your trainer fires quick questions — answer them all within the timer to be marked present.' },
      { icon: '🟢', title: 'Attendance', text: 'A calendar view of every class: present (green), absent (red) and upcoming. Your attendance % also feeds your certificate.' },
      { icon: '🎬', title: 'Recordings', text: 'Missed a class or want a recap? Watch the recordings your trainers upload.' },
      { icon: '📚', title: 'Materials', text: 'Download slides, notes and resources, organised by module.' },
    ],
  },
  {
    heading: 'Engage',
    items: [
      { icon: '📣', title: 'Announcements', text: 'Important updates from your trainers. Like and comment to stay in the loop.' },
      { icon: '💬', title: 'Forum', text: 'Stuck on a concept? Post a doubt — your trainers get notified and reply.' },
    ],
  },
  {
    heading: 'Assess & grow',
    items: [
      { icon: '📝', title: 'Tests', text: 'Attempt mock tests (one attempt each) and see your score instantly.' },
      { icon: '🗂️', title: 'Projects', text: 'Submit your work with a live link and GitHub URL; get marks and feedback.' },
      { icon: '🎤', title: 'Mock Interviews', text: 'Attend your assigned interview slots and review the feedback you receive.' },
      { icon: '🏆', title: 'Leaderboard', text: 'See your rank — a blend of tests, projects, attendance and interviews.' },
      { icon: '📜', title: 'Certificate', text: 'Once you complete all modules and meet the attendance bar, claim your course-completion certificate and download it as a PDF.' },
    ],
  },
  {
    heading: 'You',
    items: [
      { icon: '🪪', title: 'My Profile', text: 'Add your photo, CV, links and skills. A complete profile earns you the “Profile Pro” badge.' },
      { icon: '🔥', title: 'Streaks & badges', text: 'Log in and stay active to build a streak, and earn badges as you hit milestones — shown on your dashboard.' },
      { icon: '🛍️', title: 'Explore Courses', text: 'Interested in more? Browse other courses and send an enquiry — our team will reach out.' },
    ],
  },
];

export default function StudentHowItWorks() {
  const startTour = () => window.dispatchEvent(new CustomEvent('ee:start-student-tour'));

  return (
    <div>
      <PageHeader
        title="How it works"
        subtitle="A quick guide to everything in your learning portal."
        icon={HelpIcon}
        right={<Btn onClick={startTour}>✨ Take the guided tour</Btn>}
      />

      {/* Intro band */}
      <div style={{ background: `linear-gradient(120deg, ${ACCENT} 0%, #0e1729 130%)`, color: '#fff', borderRadius: 16, padding: '22px 24px', marginBottom: 20, boxShadow: `0 16px 36px -22px ${ACCENT}` }}>
        <div style={{ fontSize: 19, fontWeight: 800 }}>Welcome to your learning portal 👋</div>
        <div style={{ fontSize: 13.5, opacity: 0.92, marginTop: 6, maxWidth: 640 }}>
          Everything you need — classes, materials, tests, projects and your certificate — lives in the left sidebar.
          Here’s what each section does. Prefer a walkthrough? Take the guided tour any time.
        </div>
        <div style={{ marginTop: 14 }}>
          <button onClick={startTour} style={{ background: '#fff', color: ACCENT, border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Start the tour →</button>
        </div>
      </div>

      {SECTIONS.map((sec) => (
        <div key={sec.heading} style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: 0.5, margin: '4px 0 12px' }}>{sec.heading}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {sec.items.map((it) => (
              <Card key={it.title} pad={16} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ width: 40, height: 40, borderRadius: 12, background: `color-mix(in srgb, ${ACCENT} 12%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{it.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 3 }}>{it.title}</div>
                  <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>{it.text}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
