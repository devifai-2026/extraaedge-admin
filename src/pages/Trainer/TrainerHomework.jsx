// Trainer Homework — lightweight assignments (distinct from Projects). Create a
// brief + deadline; students submit a file + notes; grade against max marks.
import { useEffect, useState, useCallback } from 'react';
import {
  Box, MenuItem, TextField, Button, Snackbar, Alert, Typography,
  Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import HomeworkIcon from '@mui/icons-material/HistoryEduOutlined';
import { coursesApi, homeworkApi } from '../../lib/endpoints';
import { PageHeader, Card, EmptyState } from '../../lib/lmsUi';
import { fmtDate } from '../Accounts/utils';

export default function TrainerHomework() {
  const [courses, setCourses] = useState([]);
  const [programId, setProgramId] = useState('');
  const [items, setItems] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [subsFor, setSubsFor] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => { coursesApi.list().then((r) => setCourses(r?.data || [])).catch(() => {}); }, []);
  const load = useCallback(() => { if (programId) homeworkApi.list(programId).then((r) => setItems(r?.data || [])).catch(() => {}); }, [programId]);
  useEffect(() => { load(); }, [load]);

  return (
    <Box sx={{ p: 3, maxWidth: 960, mx: 'auto' }}>
      <PageHeader title="Homework" subtitle="Short assignments students submit as a file — graded against your max marks." icon={HomeworkIcon}
        right={(
          <>
            <TextField select size="small" label="Course" value={programId} onChange={(e) => setProgramId(e.target.value)} sx={{ minWidth: 240, background: '#fff' }}>
              {courses.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </TextField>
            {programId && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)} sx={{ textTransform: 'none', bgcolor: '#E53935' }}>New homework</Button>}
          </>
        )}
      />
      {!programId && <Card><EmptyState icon="📚" title="Pick a course" text="Choose a course to assign homework." /></Card>}
      {programId && (items.length === 0 ? <Card><EmptyState icon="📚" title="No homework yet" text="Create a homework brief — students submit a file for you to grade." /></Card> : (
        <Card pad={0} style={{ overflow: 'hidden' }}>
          <Table size="small">
            <TableHead><TableRow sx={{ background: '#fafbfc', '& th': { color: '#64748b', fontWeight: 700, fontSize: 12 } }}><TableCell>Homework</TableCell><TableCell>Deadline</TableCell><TableCell align="center">Submitted</TableCell><TableCell align="center">To grade</TableCell><TableCell align="right" /></TableRow></TableHead>
            <TableBody>{items.map((h) => {
              const pending = Math.max(0, (h.submission_count || 0) - (h.graded_count || 0));
              return (
                <TableRow key={h.id} hover>
                  <TableCell>{h.title}</TableCell>
                  <TableCell sx={{ color: '#64748b' }}>{h.deadline ? fmtDate(h.deadline) : '—'}</TableCell>
                  <TableCell align="center">{h.submission_count}</TableCell>
                  <TableCell align="center">{pending > 0 ? <span style={{ background: '#fef3c7', color: '#b45309', fontWeight: 700, borderRadius: 999, padding: '2px 9px', fontSize: 12 }}>{pending}</span> : <span style={{ color: '#cbd5e1' }}>0</span>}</TableCell>
                  <TableCell align="right"><Button size="small" variant={pending > 0 ? 'contained' : 'outlined'} onClick={() => setSubsFor(h)} sx={{ textTransform: 'none', ...(pending > 0 ? { bgcolor: '#E53935' } : { color: '#E53935', borderColor: '#E53935' }) }}>{pending > 0 ? `Grade ${pending}` : 'Grade / view'}</Button></TableCell>
                </TableRow>
              );
            })}</TableBody>
          </Table>
        </Card>
      ))}

      {createOpen && <CreateDialog programId={programId} onClose={() => setCreateOpen(false)} onDone={() => { setCreateOpen(false); load(); setToast({ severity: 'success', text: 'Homework created' }); }} onError={(m) => setToast({ severity: 'error', text: m })} />}
      {subsFor && <SubmissionsDialog hw={subsFor} onClose={() => setSubsFor(null)} onGraded={load} onError={(m) => setToast({ severity: 'error', text: m })} />}
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)}>{toast.text}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}

function CreateDialog({ programId, onClose, onDone, onError }) {
  const [f, setF] = useState({ title: '', brief: '', max_marks: 10, deadline: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async () => {
    if (!f.title.trim()) { onError('Title required'); return; }
    setBusy(true);
    try { await homeworkApi.create({ program_id: programId, title: f.title.trim(), brief: f.brief || null, max_marks: Number(f.max_marks) || 10, deadline: f.deadline ? new Date(f.deadline).toISOString() : null }); onDone(); }
    catch (e) { onError(e.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>New homework</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
        <TextField size="small" label="Title" value={f.title} onChange={set('title')} />
        <TextField size="small" label="Brief" value={f.brief} onChange={set('brief')} multiline minRows={2} />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField size="small" type="number" label="Max marks" value={f.max_marks} onChange={set('max_marks')} sx={{ width: 130 }} inputProps={{ min: 1 }} />
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

function SubmissionsDialog({ hw, onClose, onGraded, onError }) {
  const [rows, setRows] = useState([]);
  const load = useCallback(() => { homeworkApi.submissions(hw.id).then((r) => setRows(r?.data || [])).catch(() => {}); }, [hw.id]);
  useEffect(() => { load(); }, [load]);
  const grade = async (sub, marks, feedback) => {
    try { await homeworkApi.grade(hw.id, { submission_id: sub.id, marks: Number(marks), feedback }); load(); onGraded(); }
    catch (e) { onError(e.message); }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Grade submissions · {hw.title} <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 14 }}>(max {hw.max_marks})</span></DialogTitle>
      <DialogContent>
        {rows.length === 0 ? <Typography sx={{ color: '#94a3b8', fontSize: 13 }}>No submissions yet.</Typography> : (
          <Table size="small">
            <TableHead><TableRow><TableCell>Student</TableCell><TableCell>File</TableCell><TableCell>Notes</TableCell><TableCell align="right">Marks</TableCell><TableCell align="right" /></TableRow></TableHead>
            <TableBody>{rows.map((s) => <GradeRow key={s.id} s={s} max={hw.max_marks} onGrade={grade} />)}</TableBody>
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
      <TableCell sx={{ fontSize: 12 }}>{s.file_url ? <a href={s.file_url} target="_blank" rel="noreferrer">Download</a> : '—'}</TableCell>
      <TableCell sx={{ fontSize: 12, maxWidth: 220, whiteSpace: 'pre-wrap' }}>{s.notes || '—'}</TableCell>
      <TableCell align="right"><TextField size="small" type="number" value={marks} onChange={(e) => setMarks(e.target.value)} sx={{ width: 80 }} inputProps={{ min: 0, max }} /></TableCell>
      <TableCell align="right">
        <TextField size="small" placeholder="Feedback" value={fb} onChange={(e) => setFb(e.target.value)} sx={{ width: 150, mr: 1 }} />
        <Button size="small" onClick={() => onGrade(s, marks, fb)} disabled={marks === ''} sx={{ textTransform: 'none' }}>Save</Button>
      </TableCell>
    </TableRow>
  );
}
