// LMS Analytics — admin + branch-manager dashboard: headline totals, the
// enrolment→confirm→activation funnel, per-course rollup, trainer hours, and a
// student sudo-login (opens the student panel as that student in a new tab).
import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  CircularProgress, Alert, TextField, MenuItem, Button, Snackbar,
} from '@mui/material';
import { lmsAnalyticsApi } from '../../lib/endpoints';
import { studentAuth } from '../../lib/studentApi';

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

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
      <Typography variant="h6" sx={{ mb: 0.5 }}>LMS Analytics</Typography>
      <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>Training operations across every course.</Typography>

      {/* Headline cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2, mb: 3 }}>
        <Stat label="Students" value={totals.students} sub={`${totals.active_students} active`} />
        <Stat label="Classes" value={totals.classes} />
        <Stat label="Recordings" value={totals.recordings} />
        <Stat label="Trainer assignments" value={totals.trainer_assignments} />
      </Box>

      {/* Funnel */}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 3 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1 }}>Enrolment → portal funnel</Typography>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Funnel label="Approved admissions" value={funnel.approved} />
          <Funnel label="Course confirmed" value={funnel.course_confirmed} />
          <Funnel label="Portal activated" value={funnel.activated} />
        </Box>
      </Paper>

      {/* Per-course rollup */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', mb: 3 }}>
        <Box sx={{ p: 1.5, fontWeight: 700, fontSize: 14 }}>By course</Box>
        <Table size="small">
          <TableHead><TableRow sx={{ background: '#fafafa' }}>
            <TableCell>Course</TableCell><TableCell align="center">Students</TableCell><TableCell align="center">Batches</TableCell>
            <TableCell align="center">Classes</TableCell><TableCell align="center">Attend %</TableCell>
            <TableCell align="center">Avg test</TableCell><TableCell align="center">Avg project</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {courses.length === 0 ? <TableRow><TableCell colSpan={7} sx={{ color: '#94a3b8', textAlign: 'center' }}>No courses with trainers yet.</TableCell></TableRow>
              : courses.map((c) => (
                <TableRow key={c.program_id}>
                  <TableCell>{c.name}</TableCell><TableCell align="center">{c.students}</TableCell><TableCell align="center">{c.batches}</TableCell>
                  <TableCell align="center">{c.classes}</TableCell><TableCell align="center">{c.attendance_pct ?? '—'}{c.attendance_pct != null ? '%' : ''}</TableCell>
                  <TableCell align="center">{c.avg_test_score ?? '—'}</TableCell><TableCell align="center">{c.avg_project_marks ?? '—'}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Trainer hours */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', mb: 3 }}>
        <Box sx={{ p: 1.5, fontWeight: 700, fontSize: 14 }}>Trainer hours</Box>
        <Table size="small">
          <TableHead><TableRow sx={{ background: '#fafafa' }}><TableCell>Trainer</TableCell><TableCell align="center">Classes run</TableCell><TableCell align="right">Hours</TableCell></TableRow></TableHead>
          <TableBody>
            {trainers.length === 0 ? <TableRow><TableCell colSpan={3} sx={{ color: '#94a3b8', textAlign: 'center' }}>No completed classes yet.</TableCell></TableRow>
              : trainers.map((t) => <TableRow key={t.user_id}><TableCell>{t.name}</TableCell><TableCell align="center">{t.classes_run}</TableCell><TableCell align="right">{t.hours}</TableCell></TableRow>)}
          </TableBody>
        </Table>
      </Paper>

      {/* Sudo-login as a student */}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1 }}>Sudo-login as a student</Typography>
        <Typography sx={{ fontSize: 12, color: '#64748b', mb: 1.5 }}>Open the student portal as any student (troubleshooting). Opens in a new tab.</Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField select size="small" label="Student" value={sudoId} onChange={(e) => setSudoId(e.target.value)} sx={{ minWidth: 280 }}>
            {students.map((s) => <MenuItem key={s.id} value={s.id}>{s.name} · {s.email}{s.program_name ? ` · ${s.program_name}` : ''}</MenuItem>)}
          </TextField>
          <Button variant="contained" onClick={sudo} disabled={!sudoId} sx={{ textTransform: 'none', bgcolor: '#E53935' }}>Open as student</Button>
        </Box>
      </Paper>

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? <Alert severity="info" onClose={() => setToast('')}>{toast}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}

const Stat = ({ label, value, sub }) => (
  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
    <Typography sx={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>{label}</Typography>
    <Typography sx={{ fontSize: 26, fontWeight: 800, color: '#0f172a' }}>{value}</Typography>
    {sub && <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>{sub}</Typography>}
  </Paper>
);

const Funnel = ({ label, value }) => (
  <Box sx={{ textAlign: 'center' }}>
    <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#E53935' }}>{value}</Typography>
    <Typography sx={{ fontSize: 12, color: '#64748b' }}>{label}</Typography>
  </Box>
);
