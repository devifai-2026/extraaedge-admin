// Trainer Mock Tests — create an MCQ test (title + questions with a correct
// answer + marks), list tests, and view auto-scored results.
import { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, MenuItem, TextField, Button, Alert, Snackbar, IconButton,
  Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogActions, Radio,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { coursesApi, assessmentsApi } from '../../lib/endpoints';

export default function TrainerTests() {
  const [courses, setCourses] = useState([]);
  const [programId, setProgramId] = useState('');
  const [tests, setTests] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [resultsFor, setResultsFor] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => { coursesApi.list().then((r) => setCourses(r?.data || [])).catch(() => {}); }, []);
  const load = useCallback(() => { if (programId) assessmentsApi.listTests(programId).then((r) => setTests(r?.data || [])).catch(() => {}); }, [programId]);
  useEffect(() => { load(); }, [load]);

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h6" sx={{ mb: 0.5 }}>Mock Tests</Typography>
      <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>Create MCQ tests; students’ attempts are auto-scored.</Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
        <TextField select size="small" label="Course" value={programId} onChange={(e) => setProgramId(e.target.value)} sx={{ minWidth: 240 }}>
          {courses.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
        </TextField>
        {programId && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)} sx={{ textTransform: 'none', bgcolor: '#E53935' }}>New test</Button>}
      </Box>

      {programId && (tests.length === 0 ? <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', color: '#94a3b8', borderRadius: 2 }}>No tests yet.</Paper> : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead><TableRow sx={{ background: '#fafafa' }}><TableCell>Test</TableCell><TableCell align="center">Marks</TableCell><TableCell align="center">Attempts</TableCell><TableCell align="right" /></TableRow></TableHead>
            <TableBody>{tests.map((t) => (
              <TableRow key={t.id} hover>
                <TableCell>{t.title}</TableCell><TableCell align="center">{t.total_marks}</TableCell><TableCell align="center">{t.attempt_count}</TableCell>
                <TableCell align="right"><Button size="small" onClick={() => setResultsFor(t)} sx={{ textTransform: 'none' }}>Results</Button></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </Paper>
      ))}

      {createOpen && <CreateTestDialog programId={programId} onClose={() => setCreateOpen(false)} onDone={() => { setCreateOpen(false); load(); setToast({ severity: 'success', text: 'Test created' }); }} onError={(m) => setToast({ severity: 'error', text: m })} />}
      {resultsFor && <ResultsDialog test={resultsFor} onClose={() => setResultsFor(null)} />}

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)}>{toast.text}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}

function CreateTestDialog({ programId, onClose, onDone, onError }) {
  const [title, setTitle] = useState('');
  const [qs, setQs] = useState([{ q: '', options: ['', ''], correct_index: 0, marks: 1 }]);
  const [busy, setBusy] = useState(false);
  const setQ = (i, patch) => setQs((s) => s.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const setOpt = (i, oi, v) => setQs((s) => s.map((q, j) => (j === i ? { ...q, options: q.options.map((o, k) => (k === oi ? v : o)) } : q)));
  const submit = async () => {
    const questions = qs.filter((q) => q.q.trim() && q.options.filter((o) => o.trim()).length >= 2)
      .map((q) => ({ q: q.q.trim(), options: q.options.filter((o) => o.trim()), correct_index: q.correct_index, marks: Number(q.marks) || 1 }));
    if (!title.trim() || questions.length === 0) { onError('Add a title and at least one complete question'); return; }
    setBusy(true);
    try { await assessmentsApi.createTest({ program_id: programId, title: title.trim(), questions }); onDone(); }
    catch (e) { onError(e.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>New mock test</DialogTitle>
      <DialogContent>
        <TextField fullWidth size="small" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} sx={{ mt: 1, mb: 2 }} />
        {qs.map((q, i) => (
          <Paper key={i} variant="outlined" sx={{ p: 1.5, mb: 1.5, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
              <TextField size="small" fullWidth label={`Question ${i + 1}`} value={q.q} onChange={(e) => setQ(i, { q: e.target.value })} />
              <TextField size="small" type="number" label="Marks" value={q.marks} onChange={(e) => setQ(i, { marks: e.target.value })} sx={{ width: 90 }} />
              {qs.length > 1 && <IconButton size="small" onClick={() => setQs((s) => s.filter((_, j) => j !== i))}><DeleteOutlineIcon fontSize="small" /></IconButton>}
            </Box>
            {q.options.map((o, oi) => (
              <Box key={oi} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Radio size="small" checked={q.correct_index === oi} onChange={() => setQ(i, { correct_index: oi })} title="Correct answer" />
                <TextField size="small" fullWidth label={`Option ${oi + 1}`} value={o} onChange={(e) => setOpt(i, oi, e.target.value)} sx={{ mb: 0.5 }} />
                {q.options.length > 2 && <IconButton size="small" onClick={() => setQ(i, { options: q.options.filter((_, k) => k !== oi) })}><DeleteOutlineIcon fontSize="small" /></IconButton>}
              </Box>
            ))}
            <Button size="small" onClick={() => setQ(i, { options: [...q.options, ''] })} sx={{ textTransform: 'none' }}>Add option</Button>
          </Paper>
        ))}
        <Button startIcon={<AddIcon />} onClick={() => setQs((s) => [...s, { q: '', options: ['', ''], correct_index: 0, marks: 1 }])} sx={{ textTransform: 'none' }}>Add question</Button>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={busy} sx={{ textTransform: 'none', bgcolor: '#E53935' }}>Create</Button>
      </DialogActions>
    </Dialog>
  );
}

function ResultsDialog({ test, onClose }) {
  const [rows, setRows] = useState([]);
  useEffect(() => { assessmentsApi.testResults(test.id).then((r) => setRows(r?.data || [])).catch(() => {}); }, [test.id]);
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{test.title} — results</DialogTitle>
      <DialogContent>
        {rows.length === 0 ? <Typography sx={{ color: '#94a3b8', fontSize: 13 }}>No attempts yet.</Typography> : (
          <Table size="small"><TableHead><TableRow><TableCell>Student</TableCell><TableCell align="right">Score</TableCell></TableRow></TableHead>
            <TableBody>{rows.map((r) => <TableRow key={r.student_id}><TableCell>{r.name}</TableCell><TableCell align="right">{r.score}/{test.total_marks}</TableCell></TableRow>)}</TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose} sx={{ textTransform: 'none' }}>Close</Button></DialogActions>
    </Dialog>
  );
}
