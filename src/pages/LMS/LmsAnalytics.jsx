// LMS Analytics — admin + branch-manager dashboard: headline totals, the
// enrolment→confirm→activation funnel, per-course rollup, trainer hours, and a
// student sudo-login (opens the student panel as that student in a new tab).
import { useEffect, useMemo, useState } from 'react';
import {
  Box, CircularProgress, Alert, TextField, MenuItem, Button, Snackbar,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/AssessmentOutlined';
import GroupsIcon from '@mui/icons-material/GroupsOutlined';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonthOutlined';
import VideoLibraryIcon from '@mui/icons-material/VideoLibraryOutlined';
import SchoolIcon from '@mui/icons-material/SchoolOutlined';
import MenuBookIcon from '@mui/icons-material/MenuBookOutlined';
import TimerIcon from '@mui/icons-material/TimerOutlined';
import LoginIcon from '@mui/icons-material/LoginOutlined';
import { lmsAnalyticsApi } from '../../lib/endpoints';
import { studentAuth } from '../../lib/studentApi';
import {
  PageHeader, Card, StatTile, StatGrid, EmptyState, lmsTokens,
} from '../../lib/lmsUi';
import { isRole, ROLES } from '../../lib/rbac';

const { INK, MUTE, FAINT, LINE } = lmsTokens;

// Band a 0–100 metric into a colour so a column of numbers can be scanned
// without reading every value. Shared by the attendance meter and Score.
const bandTint = (n) => (n >= 75 ? '#059669' : n >= 50 ? '#d97706' : '#dc2626');

// ---------------------------------------------------------------------------
// Small presentational helpers, local to this screen.
// ---------------------------------------------------------------------------

// A metric rendered as a proportion of some maximum. Used for attendance, the
// funnel and trainer hours — anywhere a bare number hides whether it is big or
// small relative to its peers.
const Meter = ({ pct, tint, height = 6 }) => (
  <div style={{
    height, background: '#eef2f7', borderRadius: 999, overflow: 'hidden',
  }}
  >
    <div style={{
      width: `${Math.max(0, Math.min(100, pct || 0))}%`,
      height: '100%',
      background: tint,
      borderRadius: 999,
      transition: 'width .4s ease',
    }}
    />
  </div>
);

// Score pill. Colour encodes the band; an absent score stays a quiet dash
// rather than a loud zero.
const Score = ({ value }) => {
  if (value == null) return <span style={{ color: FAINT }}>—</span>;
  const n = Number(value);
  const tint = bandTint(n);
  return (
    <span style={{
      display: 'inline-block',
      minWidth: 44,
      padding: '3px 8px',
      borderRadius: 999,
      fontSize: 12.5,
      fontWeight: 700,
      color: tint,
      background: `color-mix(in srgb, ${tint} 12%, transparent)`,
    }}
    >
      {n}
    </span>
  );
};

// Shared table chrome. The LMS kit has no table primitive, so without these
// the two tables on this page drift apart in padding and header styling.
const TH = ({ children, align = 'left', width }) => (
  <th style={{
    textAlign: align,
    width,
    padding: '10px 14px',
    fontSize: 11,
    fontWeight: 700,
    color: FAINT,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    borderBottom: `1px solid ${LINE}`,
    whiteSpace: 'nowrap',
  }}
  >
    {children}
  </th>
);

const TD = ({ children, align = 'left', style }) => (
  <td style={{
    textAlign: align,
    padding: '12px 14px',
    fontSize: 13.5,
    color: INK,
    borderBottom: `1px solid ${LINE}`,
    ...style,
  }}
  >
    {children}
  </td>
);

const DataTable = ({ children }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>{children}</table>
  </div>
);

export default function LmsAnalytics() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [students, setStudents] = useState([]);
  const [sudoId, setSudoId] = useState('');
  const [toast, setToast] = useState('');

  const canSudo = isRole(ROLES.SUPER_ADMIN);

  useEffect(() => {
    lmsAnalyticsApi.dashboard().then((r) => setData(r?.data || null)).catch((e) => setErr(e.message));
    // Only fetched to populate the sudo-login picker, which is super_admin
    // only — no reason to pull a list of student names and emails for a role
    // that cannot use it.
    if (canSudo) {
      lmsAnalyticsApi.students().then((r) => setStudents(r?.data || [])).catch(() => {});
    }
  }, [canSudo]);

  // Sudo-login as a student: mint a student token, stash it in the student
  // session storage, and open the student panel in a new tab.
  const sudo = async () => {
    if (!sudoId) return;
    try {
      const r = await lmsAnalyticsApi.sudoStudent(sudoId);
      const d = r?.data ?? r;
      studentAuth.setSession({ access_token: d.access_token, student: d.student, tenantSlug: d.tenantSlug });
      window.open('/student/home', '_blank');
      setToast(`Opened student panel as ${d.student?.name}`);
    } catch (e) { setToast(e.message); }
  };

  // Funnel stages. Each carries its share of the FIRST stage (so the bars read
  // as a funnel) plus the drop-off from the stage immediately before it —
  // which is the number that says where students are actually being lost.
  const stages = useMemo(() => {
    if (!data?.funnel) return [];
    const f = data.funnel;
    const raw = [
      { label: 'Approved admissions', value: f.approved || 0, tint: '#64748b', hint: 'Accounts approved the admission' },
      { label: 'Course confirmed', value: f.course_confirmed || 0, tint: '#2563eb', hint: 'Student picked their course' },
      { label: 'Portal activated', value: f.activated || 0, tint: '#059669', hint: 'Student logged into the LMS' },
    ];
    const top = raw[0].value || 1;
    return raw.map((s, i) => ({
      ...s,
      pct: Math.round((s.value / top) * 100),
      dropped: i === 0 ? null : Math.max(0, raw[i - 1].value - s.value),
    }));
  }, [data]);

  if (err) return <Box sx={{ p: 3 }}><Alert severity="error">{err}</Alert></Box>;
  if (!data) return <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>;

  const { totals, courses, trainers } = data;
  const totalHours = trainers.reduce((s, t) => s + Number(t.hours || 0), 0);
  const totalClassesRun = trainers.reduce((s, t) => s + Number(t.classes_run || 0), 0);
  // The busiest trainer sets the bar scale, so the column reads as a
  // comparison rather than a list of unanchored numbers.
  const maxHours = Math.max(...trainers.map((t) => Number(t.hours || 0)), 1);

  return (
    <Box sx={{ p: 3, maxWidth: 1180, mx: 'auto' }}>
      <PageHeader
        title="LMS Analytics"
        subtitle="Training operations across every course."
        icon={AssessmentIcon}
      />

      {/* Headline cards */}
      <StatGrid>
        <StatTile
          icon={GroupsIcon}
          label="Students"
          value={totals.students}
          sub={`${totals.active_students} active`}
        />
        <StatTile icon={CalendarMonthIcon} tint="#2563eb" label="Classes" value={totals.classes} />
        <StatTile icon={VideoLibraryIcon} tint="#7c3aed" label="Recordings" value={totals.recordings} />
        <StatTile
          icon={SchoolIcon}
          tint="#059669"
          label="Trainer assignments"
          value={totals.trainer_assignments}
        />
      </StatGrid>

      {/* Funnel. Stacked full-width rows rather than three side-by-side
          columns: a funnel is a sequence, and the drop-off between
          consecutive stages is the whole point of showing it. */}
      <Card title="Enrolment → portal funnel" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gap: 18 }}>
          {stages.map((s) => (
            <div key={s.label}>
              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 7,
              }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 }}>
                  <span style={{ fontSize: 26, fontWeight: 800, color: s.tint, lineHeight: 1 }}>
                    {s.value}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: INK }}>{s.label}</div>
                    <div style={{ fontSize: 12, color: FAINT }}>{s.hint}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: MUTE }}>{s.pct}%</div>
                  {s.dropped > 0 && (
                    <div style={{ fontSize: 11.5, color: '#dc2626' }}>−{s.dropped} dropped off</div>
                  )}
                </div>
              </div>
              <Meter pct={s.pct} tint={s.tint} height={8} />
            </div>
          ))}
        </div>
      </Card>

      {/* Per-course rollup */}
      <Card
        title="By course"
        icon={MenuBookIcon}
        pad={0}
        style={{ overflow: 'hidden', marginBottom: 20 }}
      >
        {courses.length === 0 ? (
          <EmptyState
            icon="🎓"
            title="No courses with trainers yet"
            text="Assign a head trainer to a course to start seeing rollups here."
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <TH>Course</TH>
                <TH align="center">Students</TH>
                <TH align="center">Batches</TH>
                <TH align="center">Classes</TH>
                <TH width={150}>Attendance</TH>
                <TH align="center">Avg test</TH>
                <TH align="center">Avg project</TH>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.program_id}>
                  <TD style={{ fontWeight: 600 }}>
                    {c.name}
                    {c.trainers != null && (
                      <div style={{ fontSize: 11.5, color: FAINT, fontWeight: 400, marginTop: 2 }}>
                        {c.trainers} trainer{c.trainers === 1 ? '' : 's'}
                      </div>
                    )}
                  </TD>
                  <TD align="center">{c.students}</TD>
                  <TD align="center">{c.batches}</TD>
                  <TD align="center">{c.classes}</TD>
                  <TD>
                    {c.attendance_pct == null ? (
                      <span style={{ color: FAINT }}>—</span>
                    ) : (
                      <>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: MUTE, marginBottom: 4 }}>
                          {c.attendance_pct}%
                        </div>
                        <Meter pct={c.attendance_pct} tint={bandTint(c.attendance_pct)} />
                      </>
                    )}
                  </TD>
                  <TD align="center"><Score value={c.avg_test_score} /></TD>
                  <TD align="center"><Score value={c.avg_project_marks} /></TD>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Card>

      {/* Trainer hours */}
      <Card
        title="Trainer hours"
        icon={TimerIcon}
        pad={0}
        style={{ overflow: 'hidden', marginBottom: 20 }}
        right={trainers.length > 0 ? (
          <span style={{ fontSize: 12.5, color: MUTE }}>
            {totalClassesRun} classes · {Math.round(totalHours)} hrs total
          </span>
        ) : null}
      >
        {trainers.length === 0 ? (
          <EmptyState
            icon="⏱️"
            title="No completed classes yet"
            text="Hours accrue as trainers start and end their classes."
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <TH>Trainer</TH>
                <TH align="center">Classes run</TH>
                <TH width={220}>Hours</TH>
              </tr>
            </thead>
            <tbody>
              {trainers.map((t) => (
                <tr key={t.user_id}>
                  <TD style={{ fontWeight: 600 }}>{t.name}</TD>
                  <TD align="center">{t.classes_run}</TD>
                  <TD>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: INK, minWidth: 42 }}>
                        {t.hours}
                      </span>
                      <div style={{ flex: 1 }}>
                        <Meter pct={(Number(t.hours || 0) / maxHours) * 100} tint="#7c3aed" />
                      </div>
                    </div>
                  </TD>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Card>

      {/* Sudo-login as a student — super_admin only. The endpoint already
          rejects everyone else (lms-analytics/routes.js gates it to
          SUPER_ADMIN), so rendering the card for a branch manager only
          offered a button guaranteed to 403. Opening the student portal as
          someone else is an impersonation tool, not branch oversight. */}
      {canSudo && (
        <Card title="Sudo-login as a student" icon={LoginIcon}>
          <div style={{ fontSize: 12.5, color: MUTE, marginBottom: 14 }}>
            Open the student portal as any student (troubleshooting). Opens in a new tab;
            every session is logged.
          </div>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              select
              size="small"
              label="Student"
              value={sudoId}
              onChange={(e) => setSudoId(e.target.value)}
              sx={{ minWidth: 300 }}
            >
              {students.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name} · {s.email}{s.program_name ? ` · ${s.program_name}` : ''}
                </MenuItem>
              ))}
            </TextField>
            <Button
              variant="contained"
              onClick={sudo}
              disabled={!sudoId}
              sx={{ textTransform: 'none', bgcolor: '#E53935', borderRadius: 2.5, px: 2.5 }}
            >
              Open as student
            </Button>
          </Box>
        </Card>
      )}

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? <Alert severity="info" onClose={() => setToast('')}>{toast}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
