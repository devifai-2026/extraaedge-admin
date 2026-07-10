// Trainer Projects — create a project (brief, deadline, marking scheme, max
// marks) and grade student submissions (live URL + GitHub URL).
import { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, MenuItem, TextField, Button, Alert, Snackbar,
  Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { coursesApi, assessmentsApi } from '../../lib/endpoints';
import { fmtDate } from '../Accounts/utils';

export default function TrainerProjects() {
  const [courses, setCourses] = useState([]);
  const [programId, setProgramId] = useState('');
  const [projects, setProjects] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [subsFor, setSubsFor] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => { coursesApi.list().then((r) => setCourses(r?.data || [])).catch(() => {}); }, []);
  const load = useCallback(() => { if (programId) assessmentsApi.listProjects(programId).then((r) => setProjects(r?.data || [])).catch(() => {}); }, [programId]);
  useEffect(() => { load(); }, [load]);

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h6" sx={{ mb: 0.5 }}>Projects</Typography>
      <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>Assign projects; students submit a live link + GitHub URL. Grade against your scheme.</Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
        <TextField select size="small" label="Course" value={programId} onChange={(e) => setProgramId(e.target.value)} sx={{ minWidth: 240 }}>
          {courses.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
        </TextField>
        {programId && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)} sx={{ textTransform: 'none', bgcolor: '#E53935' }}>New project</Button>}
      </Box>

      {programId && (projects.length === 0 ? <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', color: '#94a3b8', borderRadius: 2 }}>No projects yet.</Paper> : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead><TableRow sx={{ background: '#fafafa' }}><TableCell>Project</TableCell><TableCell>Deadline</TableCell><TableCell align="center">Submitted</TableCell><TableCell align="center">Graded</TableCell><TableCell align="right" /></TableRow></TableHead>
            <TableBody>{projects.map((p) => (
              <TableRow key={p.id} hover>
                <TableCell>{p.title}</TableCell><TableCell sx={{ color: '#64748b' }}>{p.deadline ? fmtDate(p.deadline) : '—'}</TableCell>
                <TableCell align="center">{p.submission_count}</TableCell><TableCell align="center">{p.graded_count}</TableCell>
                <TableCell align="right"><Button size="small" onClick={() => setSubsFor(p)} sx={{ textTransform: 'none' }}>Submissions</Button></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </Paper>
      ))}

      {createOpen && <CreateProjectDialog programId={programId} onClose={() => setCreateOpen(false)} onDone={() => { setCreateOpen(false); load(); setToast({ severity: 'success', text: 'Project created' }); }} onError={(m) => setToast({ severity: 'error', text: m })} />}
      {subsFor && <SubmissionsDialog project={subsFor} onClose={() => setSubsFor(null)} onGraded={() => { load(); }} onError={(m) => setToast({ severity: 'error', text: m })} />}

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)}>{toast.text}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}

function CreateProjectDialog({ programId, onClose, onDone, onError }) {
  const [f, setF] = useState({ title: '', brief: '', marking_scheme: '', max_marks: 100, deadline: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async () => {
    if (!f.title.trim()) { onError('Title required'); return; }
    setBusy(true);
    try {
      await assessmentsApi.createProject({ program_id: programId, title: f.title.trim(), brief: f.brief || null, marking_scheme: f.marking_scheme || null, max_marks: Number(f.max_marks) || 100, deadline: f.deadline ? new Date(f.deadline).toISOString() : null });
      onDone();
    } catch (e) { onError(e.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>New project</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
        <TextField size="small" label="Title" value={f.title} onChange={set('title')} />
        <TextField size="small" label="Brief" multiline minRows={2} value={f.brief} onChange={set('brief')} />
        <TextField size="small" label="Marking scheme" multiline minRows={2} value={f.marking_scheme} onChange={set('marking_scheme')} />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField size="small" type="number" label="Max marks" value={f.max_marks} onChange={set('max_marks')} sx={{ width: 130 }} />
          <TextField size="small" type="datetime-local" label="Deadline" InputLabelProps={{ shrink: true }} value={f.deadline} onChange={set('deadline')} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={busy} sx={{ textTransform: 'none', bgcolor: '#E53935' }}>Create</Button>
      </DialogActions>
    </Dialog>
  );
}

function SubmissionsDialog({ project, onClose, onGraded, onError }) {
  const [rows, setRows] = useState([]);
  const load = useCallback(() => { assessmentsApi.listSubmissions(project.id).then((r) => setRows(r?.data || [])).catch(() => {}); }, [project.id]);
  useEffect(() => { load(); }, [load]);
  const grade = async (sub, marks, feedback) => {
    try { await assessmentsApi.grade(project.id, { submission_id: sub.id, marks: Number(marks), feedback }); load(); onGraded(); }
    catch (e) { onError(e.message); }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{project.title} — submissions (max {project.max_marks})</DialogTitle>
      <DialogContent>
        {rows.length === 0 ? <Typography sx={{ color: '#94a3b8', fontSize: 13 }}>No submissions yet.</Typography> : (
          <Table size="small">
            <TableHead><TableRow><TableCell>Student</TableCell><TableCell>Links</TableCell><TableCell align="right">Marks</TableCell><TableCell align="right" /></TableRow></TableHead>
            <TableBody>{rows.map((s) => <GradeRow key={s.id} s={s} max={project.max_marks} onGrade={grade} />)}</TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose} sx={{ textTransform: 'none' }}>Close</Button></DialogActions>
    </Dialog>
  );
}

function GradeRow({ s, max, onGrade }) {
  const [marks, setMarks] = useState(s.marks ?? '');
  const [fb, setFb] = useState(s.feedback ?? '');
  return (
    <TableRow>
      <TableCell>{s.name}</TableCell>
      <TableCell sx={{ fontSize: 12 }}>
        {s.live_url && <a href={s.live_url} target="_blank" rel="noreferrer">Live</a>}{s.live_url && s.github_url ? ' · ' : ''}
        {s.github_url && <a href={s.github_url} target="_blank" rel="noreferrer">GitHub</a>}
      </TableCell>
      <TableCell align="right"><TextField size="small" type="number" value={marks} onChange={(e) => setMarks(e.target.value)} sx={{ width: 80 }} inputProps={{ min: 0, max }} /></TableCell>
      <TableCell align="right">
        <TextField size="small" placeholder="Feedback" value={fb} onChange={(e) => setFb(e.target.value)} sx={{ width: 160, mr: 1 }} />
        <Button size="small" onClick={() => onGrade(s, marks, fb)} disabled={marks === ''} sx={{ textTransform: 'none' }}>Save</Button>
      </TableCell>
    </TableRow>
  );
}
