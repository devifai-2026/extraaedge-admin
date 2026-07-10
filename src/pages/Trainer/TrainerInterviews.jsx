// Trainer Mock Interviews — create an interview (manual meeting link), assign
// students to date/time slots, and grade each after the session.
import { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, MenuItem, TextField, Button, Alert, Snackbar,
  Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { coursesApi, interviewsApi } from '../../lib/endpoints';
import { fmtDate } from '../Accounts/utils';

export default function TrainerInterviews() {
  const [courses, setCourses] = useState([]);
  const [programId, setProgramId] = useState('');
  const [items, setItems] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [slotsFor, setSlotsFor] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => { coursesApi.list().then((r) => setCourses(r?.data || [])).catch(() => {}); }, []);
  const load = useCallback(() => { if (programId) interviewsApi.list(programId).then((r) => setItems(r?.data || [])).catch(() => {}); }, [programId]);
  useEffect(() => { load(); }, [load]);

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h6" sx={{ mb: 0.5 }}>Mock Interviews</Typography>
      <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>Create an interview with a meeting link, assign students to time slots, then grade each.</Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
        <TextField select size="small" label="Course" value={programId} onChange={(e) => setProgramId(e.target.value)} sx={{ minWidth: 240 }}>
          {courses.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
        </TextField>
        {programId && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)} sx={{ textTransform: 'none', bgcolor: '#E53935' }}>New interview</Button>}
      </Box>

      {programId && (items.length === 0 ? <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', color: '#94a3b8', borderRadius: 2 }}>No interviews yet.</Paper> : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead><TableRow sx={{ background: '#fafafa' }}><TableCell>Interview</TableCell><TableCell align="center">Assigned</TableCell><TableCell align="center">Graded</TableCell><TableCell align="right" /></TableRow></TableHead>
            <TableBody>{items.map((iv) => (
              <TableRow key={iv.id} hover>
                <TableCell>{iv.title}</TableCell><TableCell align="center">{iv.slot_count}</TableCell><TableCell align="center">{iv.graded_count}</TableCell>
                <TableCell align="right"><Button size="small" onClick={() => setSlotsFor(iv)} sx={{ textTransform: 'none' }}>Slots</Button></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </Paper>
      ))}

      {createOpen && <CreateDialog programId={programId} onClose={() => setCreateOpen(false)} onDone={() => { setCreateOpen(false); load(); setToast({ severity: 'success', text: 'Interview created' }); }} onError={(m) => setToast({ severity: 'error', text: m })} />}
      {slotsFor && <SlotsDialog programId={programId} interview={slotsFor} onClose={() => setSlotsFor(null)} onChange={load} onError={(m) => setToast({ severity: 'error', text: m })} />}

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)}>{toast.text}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}

function CreateDialog({ programId, onClose, onDone, onError }) {
  const [f, setF] = useState({ title: '', meeting_url: '', max_marks: 100 });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!f.title.trim()) { onError('Title required'); return; }
    setBusy(true);
    try { await interviewsApi.create({ program_id: programId, title: f.title.trim(), meeting_url: f.meeting_url || null, max_marks: Number(f.max_marks) || 100 }); onDone(); }
    catch (e) { onError(e.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>New mock interview</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
        <TextField size="small" label="Title" value={f.title} onChange={(e) => setF((s) => ({ ...s, title: e.target.value }))} />
        <TextField size="small" label="Meeting URL (GMeet/Teams)" value={f.meeting_url} onChange={(e) => setF((s) => ({ ...s, meeting_url: e.target.value }))} placeholder="https://…" />
        <TextField size="small" type="number" label="Max marks" value={f.max_marks} onChange={(e) => setF((s) => ({ ...s, max_marks: e.target.value }))} sx={{ width: 130 }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={busy} sx={{ textTransform: 'none', bgcolor: '#E53935' }}>Create</Button>
      </DialogActions>
    </Dialog>
  );
}

function SlotsDialog({ programId, interview, onClose, onChange, onError }) {
  const [slots, setSlots] = useState([]);
  const [students, setStudents] = useState([]);
  const [assign, setAssign] = useState({ student_id: '', slot_at: '' });
  const load = useCallback(() => {
    Promise.all([interviewsApi.listSlots(interview.id), interviewsApi.students(programId)])
      .then(([s, st]) => { setSlots(s?.data || []); setStudents(st?.data || []); }).catch(() => {});
  }, [interview.id, programId]);
  useEffect(() => { load(); }, [load]);

  const doAssign = async () => {
    if (!assign.student_id) return;
    try { await interviewsApi.assign(interview.id, { student_id: assign.student_id, slot_at: assign.slot_at ? new Date(assign.slot_at).toISOString() : null }); setAssign({ student_id: '', slot_at: '' }); load(); onChange(); }
    catch (e) { onError(e.message); }
  };
  const grade = async (slotId, marks, feedback) => {
    try { await interviewsApi.grade(slotId, { marks: Number(marks), feedback }); load(); onChange(); }
    catch (e) { onError(e.message); }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{interview.title} — slots</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField select size="small" label="Assign student" value={assign.student_id} onChange={(e) => setAssign((s) => ({ ...s, student_id: e.target.value }))} sx={{ minWidth: 200 }}>
            {students.map((st) => <MenuItem key={st.id} value={st.id}>{st.name}</MenuItem>)}
          </TextField>
          <TextField size="small" type="datetime-local" label="Slot time" InputLabelProps={{ shrink: true }} value={assign.slot_at} onChange={(e) => setAssign((s) => ({ ...s, slot_at: e.target.value }))} />
          <Button variant="contained" onClick={doAssign} sx={{ textTransform: 'none', bgcolor: '#E53935' }}>Assign</Button>
        </Box>
        {slots.length === 0 ? <Typography sx={{ color: '#94a3b8', fontSize: 13 }}>No students assigned yet.</Typography> : (
          <Table size="small">
            <TableHead><TableRow><TableCell>Student</TableCell><TableCell>Slot</TableCell><TableCell align="right">Marks</TableCell><TableCell align="right" /></TableRow></TableHead>
            <TableBody>{slots.map((sl) => <GradeRow key={sl.id} sl={sl} max={interview.max_marks} onGrade={grade} />)}</TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose} sx={{ textTransform: 'none' }}>Close</Button></DialogActions>
    </Dialog>
  );
}

function GradeRow({ sl, max, onGrade }) {
  const [marks, setMarks] = useState(sl.marks ?? '');
  const [fb, setFb] = useState(sl.feedback ?? '');
  return (
    <TableRow>
      <TableCell>{sl.name}</TableCell>
      <TableCell sx={{ color: '#64748b' }}>{sl.slot_at ? fmtDate(sl.slot_at) : '—'}</TableCell>
      <TableCell align="right"><TextField size="small" type="number" value={marks} onChange={(e) => setMarks(e.target.value)} sx={{ width: 80 }} inputProps={{ min: 0, max }} /></TableCell>
      <TableCell align="right">
        <TextField size="small" placeholder="Feedback" value={fb} onChange={(e) => setFb(e.target.value)} sx={{ width: 160, mr: 1 }} />
        <Button size="small" onClick={() => onGrade(sl.id, marks, fb)} disabled={marks === ''} sx={{ textTransform: 'none' }}>Save</Button>
      </TableCell>
    </TableRow>
  );
}
