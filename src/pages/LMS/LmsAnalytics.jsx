// LMS Analytics — admin + branch-manager dashboard: headline totals, the
// enrolment→confirm→activation funnel, per-course rollup, trainer hours, and a
// student sudo-login (opens the student panel as that student in a new tab).
import { useEffect, useState } from 'react';
import {
  Box, Table, TableHead, TableRow, TableCell, TableBody,
  CircularProgress, Alert, TextField, MenuItem, Button, Snackbar,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/AssessmentOutlined';
import GroupsIcon from '@mui/icons-material/GroupsOutlined';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonthOutlined';
import VideoLibraryIcon from '@mui/icons-material/VideoLibraryOutlined';
import SchoolIcon from '@mui/icons-material/SchoolOutlined';
import { lmsAnalyticsApi } from '../../lib/endpoints';
import { studentAuth } from '../../lib/studentApi';
import { PageHeader, Card, StatTile, StatGrid, EmptyState } from '../../lib/lmsUi';

export default function LmsAnalytics() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [students, setStudents] = useState([]);
  const [sudoId, setSudoId] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    lmsAnalyticsApi.dashboard().then((r) => setData(r?.data || null)).catch((e) => setErr(e.message));
    lmsAnalyticsApi.students().then((r) => setStudents(r?.data || [])).catch(() => {});
  }, []);

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

  if (err) return <Box sx={{ p: 3 }}><Alert severity="error">{err}</Alert></Box>;
  if (!data) return <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>;

  const { totals, funnel, courses, trainers } = data;
  const maxFunnel = Math.max(funnel.approved || 0, 1);

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
      <PageHeader title="LMS Analytics" subtitle="Training operations across every course." icon={AssessmentIcon} />

      {/* Headline cards */}
      <StatGrid>
        <StatTile icon={GroupsIcon} label="Students" value={totals.students} sub={`${totals.active_students} active`} />
        <StatTile icon={CalendarMonthIcon} tint="#2563eb" label="Classes" value={totals.classes} />
        <StatTile icon={VideoLibraryIcon} tint="#7c3aed" label="Recordings" value={totals.recordings} />
        <StatTile icon={SchoolIcon} tint="#059669" label="Trainer assignments" value={totals.trainer_assignments} />
      </StatGrid>

      {/* Funnel */}
      <Card title="Enrolment → portal funnel" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          {[
            { label: 'Approved admissions', value: funnel.approved, tint: '#94a3b8' },
            { label: 'Course confirmed', value: funnel.course_confirmed, tint: '#2563eb' },
            { label: 'Portal activated', value: funnel.activated, tint: '#E53935' },
          ].map((f) => (
            <div key={f.label}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: f.tint }}>{f.value}</span>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>{maxFunnel ? Math.round((f.value / maxFunnel) * 100) : 0}%</span>
              </div>
              <div style={{ fontSize: 12.5, color: '#64748b', marginBottom: 6 }}>{f.label}</div>
              <div style={{ height: 6, background: '#eef2f7', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${maxFunnel ? Math.round((f.value / maxFunnel) * 100) : 0}%`, height: '100%', background: f.tint }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Per-course rollup */}
      <Card title="By course" pad={0} style={{ overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '14px 18px 0', fontSize: 14, fontWeight: 700, color: '#0f172a' }} />
        <Table size="small">
          <TableHead><TableRow sx={{ background: '#fafbfc', '& th': { color: '#64748b', fontWeight: 700, fontSize: 12 } }}>
            <TableCell>Course</TableCell><TableCell align="center">Students</TableCell><TableCell align="center">Batches</TableCell>
            <TableCell align="center">Classes</TableCell><TableCell align="center">Attend %</TableCell>
            <TableCell align="center">Avg test</TableCell><TableCell align="center">Avg project</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {courses.length === 0 ? <TableRow><TableCell colSpan={7} sx={{ p: 0, border: 0 }}><EmptyState icon="🎓" title="No courses with trainers yet" text="Assign a head trainer to a course to start seeing rollups here." /></TableCell></TableRow>
              : courses.map((c) => (
                <TableRow key={c.program_id} hover>
                  <TableCell>{c.name}</TableCell><TableCell align="center">{c.students}</TableCell><TableCell align="center">{c.batches}</TableCell>
                  <TableCell align="center">{c.classes}</TableCell><TableCell align="center">{c.attendance_pct ?? '—'}{c.attendance_pct != null ? '%' : ''}</TableCell>
                  <TableCell align="center">{c.avg_test_score ?? '—'}</TableCell><TableCell align="center">{c.avg_project_marks ?? '—'}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>

      {/* Trainer hours */}
      <Card title="Trainer hours" pad={0} style={{ overflow: 'hidden', marginBottom: 20 }}>
        <Table size="small">
          <TableHead><TableRow sx={{ background: '#fafbfc', '& th': { color: '#64748b', fontWeight: 700, fontSize: 12 } }}><TableCell>Trainer</TableCell><TableCell align="center">Classes run</TableCell><TableCell align="right">Hours</TableCell></TableRow></TableHead>
          <TableBody>
            {trainers.length === 0 ? <TableRow><TableCell colSpan={3} sx={{ p: 0, border: 0 }}><EmptyState icon="⏱️" title="No completed classes yet" text="Hours accrue as trainers start and end their classes." /></TableCell></TableRow>
              : trainers.map((t) => <TableRow key={t.user_id} hover><TableCell>{t.name}</TableCell><TableCell align="center">{t.classes_run}</TableCell><TableCell align="right">{t.hours}</TableCell></TableRow>)}
          </TableBody>
        </Table>
      </Card>

      {/* Sudo-login as a student */}
      <Card title="Sudo-login as a student">
        <div style={{ fontSize: 12.5, color: '#64748b', marginBottom: 12 }}>Open the student portal as any student (troubleshooting). Opens in a new tab; every session is logged.</div>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField select size="small" label="Student" value={sudoId} onChange={(e) => setSudoId(e.target.value)} sx={{ minWidth: 280 }}>
            {students.map((s) => <MenuItem key={s.id} value={s.id}>{s.name} · {s.email}{s.program_name ? ` · ${s.program_name}` : ''}</MenuItem>)}
          </TextField>
          <Button variant="contained" onClick={sudo} disabled={!sudoId} sx={{ textTransform: 'none', bgcolor: '#E53935' }}>Open as student</Button>
        </Box>
      </Card>

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? <Alert severity="info" onClose={() => setToast('')}>{toast}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
