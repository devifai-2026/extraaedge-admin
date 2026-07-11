// Trainer Mock Tests — create an MCQ test (title + questions with a correct
// answer + marks), list tests, and view auto-scored results.
import { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, MenuItem, TextField, Button, Alert, Snackbar, IconButton,
  Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogActions, Radio,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditIcon from '@mui/icons-material/EditOutlined';
import QuizIcon from '@mui/icons-material/QuizOutlined';
import { coursesApi, assessmentsApi } from '../../lib/endpoints';
import { PageHeader, Card, EmptyState, Badge } from '../../lib/lmsUi';

export default function TrainerTests() {
  const [courses, setCourses] = useState([]);
  const [programId, setProgramId] = useState('');
  const [tests, setTests] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTest, setEditTest] = useState(null);
  const [resultsFor, setResultsFor] = useState(null);
  const [busyId, setBusyId] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => { coursesApi.list().then((r) => setCourses(r?.data || [])).catch(() => {}); }, []);
  const load = useCallback(() => { if (programId) assessmentsApi.listTests(programId).then((r) => setTests(r?.data || [])).catch(() => {}); }, [programId]);
  useEffect(() => { load(); }, [load]);

  const togglePublish = async (t) => {
    setBusyId(t.id);
    try { await assessmentsApi.setTestPublished(t.id, !t.is_published); load(); setToast({ severity: 'success', text: t.is_published ? 'Unpublished' : 'Published — students can take it now' }); }
    catch (e) { setToast({ severity: 'error', text: e.message }); } finally { setBusyId(''); }
  };
  const removeTest = async (t) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete "${t.title}"? This can't be undone.`)) return;
    setBusyId(t.id);
    try { await assessmentsApi.deleteTest(t.id); load(); setToast({ severity: 'success', text: 'Test deleted' }); }
    catch (e) { setToast({ severity: 'error', text: e.message }); } finally { setBusyId(''); }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <PageHeader
        title="Mock Tests"
        subtitle="Create MCQ tests; students’ attempts are auto-scored."
        icon={QuizIcon}
        right={(
          <>
            <TextField select size="small" label="Course" value={programId} onChange={(e) => setProgramId(e.target.value)} sx={{ minWidth: 240, background: '#fff' }}>
              {courses.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </TextField>
            {programId && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)} sx={{ textTransform: 'none', bgcolor: '#E53935' }}>New test</Button>}
          </>
        )}
      />

      {!programId && <Card><EmptyState icon="📝" title="Pick a course" text="Choose a course above to see and create its mock tests." /></Card>}
      {programId && (tests.length === 0 ? <Card><EmptyState icon="📝" title="No tests yet" text="Create your first MCQ test — student attempts are auto-scored the moment they submit." /></Card> : (
        <Card pad={0} style={{ overflow: 'hidden' }}>
          <Table size="small">
            <TableHead><TableRow sx={{ background: '#fafbfc' }}><TableCell>Test</TableCell><TableCell align="center">Status</TableCell><TableCell align="center">Marks</TableCell><TableCell align="center">Attempts</TableCell><TableCell align="right" /></TableRow></TableHead>
            <TableBody>{tests.map((t) => (
              <TableRow key={t.id} hover>
                <TableCell>{t.title}</TableCell>
                <TableCell align="center"><Badge tone={t.is_published ? 'success' : 'neutral'}>{t.is_published ? 'Published' : 'Draft'}</Badge></TableCell>
                <TableCell align="center">{t.total_marks}</TableCell><TableCell align="center">{t.attempt_count}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  <Button size="small" onClick={() => togglePublish(t)} disabled={busyId === t.id} sx={{ textTransform: 'none' }}>{t.is_published ? 'Unpublish' : 'Publish'}</Button>
                  <Button size="small" onClick={() => setResultsFor(t)} sx={{ textTransform: 'none' }}>Results</Button>
                  <IconButton size="small" title={t.attempt_count > 0 ? 'Edit title only (students have attempted)' : 'Edit test'} onClick={() => setEditTest(t)}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" title="Delete" onClick={() => removeTest(t)} disabled={busyId === t.id}><DeleteOutlineIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </Card>
      ))}

      {createOpen && <CreateTestDialog programId={programId} onClose={() => setCreateOpen(false)} onDone={() => { setCreateOpen(false); load(); setToast({ severity: 'success', text: 'Test created' }); }} onError={(m) => setToast({ severity: 'error', text: m })} />}
      {editTest && <CreateTestDialog programId={programId} test={editTest} onClose={() => setEditTest(null)} onDone={() => { setEditTest(null); load(); setToast({ severity: 'success', text: 'Test updated' }); }} onError={(m) => setToast({ severity: 'error', text: m })} />}
      {resultsFor && <ResultsDialog test={resultsFor} onClose={() => setResultsFor(null)} />}

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)}>{toast.text}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}

function CreateTestDialog({ programId, test, onClose, onDone, onError }) {
  const editing = !!test;
  // Questions can't be changed once students have attempted (backend enforces);
  // then only the title is editable. On a fresh edit (0 attempts) the questions
  // are rebuilt from scratch since the list view doesn't carry them.
  const lockQuestions = editing && (test.attempt_count || 0) > 0;
  const [title, setTitle] = useState(editing ? (test.title || '') : '');
  const [qs, setQs] = useState([{ q: '', options: ['', ''], correct_index: 0, marks: 1 }]);
  const [replaceQuestions, setReplaceQuestions] = useState(!editing); // edit: opt-in to rewriting questions
  const [busy, setBusy] = useState(false);
  const setQ = (i, patch) => setQs((s) => s.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const setOpt = (i, oi, v) => setQs((s) => s.map((q, j) => (j === i ? { ...q, options: q.options.map((o, k) => (k === oi ? v : o)) } : q)));
  const submit = async () => {
    if (!title.trim()) { onError('Add a title'); return; }
    const questions = qs.filter((q) => q.q.trim() && q.options.filter((o) => o.trim()).length >= 2)
      .map((q) => ({ q: q.q.trim(), options: q.options.filter((o) => o.trim()), correct_index: q.correct_index, marks: Number(q.marks) || 1 }));
    setBusy(true);
    try {
      if (editing) {
        const body = { title: title.trim() };
        if (replaceQuestions && !lockQuestions) {
          if (questions.length === 0) { onError('Add at least one complete question'); setBusy(false); return; }
          body.questions = questions;
        }
        await assessmentsApi.updateTest(test.id, body);
      } else {
        if (questions.length === 0) { onError('Add a title and at least one complete question'); setBusy(false); return; }
        await assessmentsApi.createTest({ program_id: programId, title: title.trim(), questions });
      }
      onDone();
    } catch (e) { onError(e.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editing ? 'Edit mock test' : 'New mock test'}</DialogTitle>
      <DialogContent>
        <TextField fullWidth size="small" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} sx={{ mt: 1, mb: 2 }} />
        {lockQuestions && <Alert severity="info" sx={{ mb: 2 }}>Students have attempted this test, so the questions are locked. You can rename it, or unpublish and create a new version.</Alert>}
        {editing && !lockQuestions && (
          <Button size="small" onClick={() => setReplaceQuestions((v) => !v)} sx={{ textTransform: 'none', mb: 1 }}>
            {replaceQuestions ? '✕ Keep existing questions' : '✎ Replace all questions'}
          </Button>
        )}
        {(!editing || (replaceQuestions && !lockQuestions)) && qs.map((q, i) => (
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
        {(!editing || (replaceQuestions && !lockQuestions)) && (
          <Button startIcon={<AddIcon />} onClick={() => setQs((s) => [...s, { q: '', options: ['', ''], correct_index: 0, marks: 1 }])} sx={{ textTransform: 'none' }}>Add question</Button>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={busy} sx={{ textTransform: 'none', bgcolor: '#E53935' }}>{editing ? 'Save' : 'Create'}</Button>
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
