// Trainer Mock Interviews — create an interview with a scoring rubric (categories
// scored by trainer or HR), assign students to slots, assign an HR evaluator, and
// score the trainer categories. HR scores its own categories from the HR portal.
import { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, MenuItem, TextField, Button, Alert, Snackbar, IconButton, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOverOutlined';
import { coursesApi, interviewsApi } from '../../lib/endpoints';
import { fmtDate } from '../Accounts/utils';
import { PageHeader, Card, EmptyState } from '../../lib/lmsUi';

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
    <Box sx={{ p: 3, maxWidth: 960, mx: 'auto' }}>
      <PageHeader
        title="Mock Interviews"
        subtitle="Build a scoring rubric, assign students + an HR evaluator, and score the technical categories."
        icon={RecordVoiceOverIcon}
        right={(
          <>
            <TextField select size="small" label="Course" value={programId} onChange={(e) => setProgramId(e.target.value)} sx={{ minWidth: 240, background: '#fff' }}>
              {courses.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </TextField>
            {programId && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)} sx={{ textTransform: 'none', bgcolor: '#E53935' }}>New interview</Button>}
          </>
        )}
      />

      {!programId && <Card><EmptyState icon="🎤" title="Pick a course" text="Choose a course above to create and schedule mock interviews." /></Card>}
      {programId && (items.length === 0 ? <Card><EmptyState icon="🎤" title="No interviews yet" text="Create a mock interview with a scoring rubric, then assign students + an HR evaluator." /></Card> : (
        <Card pad={0} style={{ overflow: 'hidden' }}>
          <Table size="small">
            <TableHead><TableRow sx={{ background: '#fafbfc', '& th': { color: '#64748b', fontWeight: 700, fontSize: 12 } }}><TableCell>Interview</TableCell><TableCell align="center">Max</TableCell><TableCell align="center">Assigned</TableCell><TableCell align="center">Graded</TableCell><TableCell align="right" /></TableRow></TableHead>
            <TableBody>{items.map((iv) => (
              <TableRow key={iv.id} hover>
                <TableCell>{iv.title}</TableCell><TableCell align="center">{iv.max_marks}</TableCell><TableCell align="center">{iv.slot_count}</TableCell><TableCell align="center">{iv.graded_count}</TableCell>
                <TableCell align="right"><Button size="small" onClick={() => setSlotsFor(iv)} sx={{ textTransform: 'none' }}>Manage</Button></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </Card>
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
  const [f, setF] = useState({ title: '', meeting_url: '' });
  const [cats, setCats] = useState([
    { name: 'Coding', max_marks: 30, scored_by: 'trainer' },
    { name: 'Technical knowledge', max_marks: 20, scored_by: 'trainer' },
    { name: 'Communication', max_marks: 20, scored_by: 'hr' },
  ]);
  const [busy, setBusy] = useState(false);
  const setCat = (i, k, v) => setCats((cs) => cs.map((c, j) => (j === i ? { ...c, [k]: v } : c)));
  const total = cats.reduce((a, c) => a + (Number(c.max_marks) || 0), 0);
  const submit = async () => {
    if (!f.title.trim()) { onError('Title required'); return; }
    const clean = cats.filter((c) => c.name.trim()).map((c) => ({ name: c.name.trim(), max_marks: Number(c.max_marks) || 10, scored_by: c.scored_by }));
    if (!clean.length) { onError('Add at least one scoring category'); return; }
    setBusy(true);
    try { await interviewsApi.create({ program_id: programId, title: f.title.trim(), meeting_url: f.meeting_url || null, categories: clean }); onDone(); }
    catch (e) { onError(e.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>New mock interview</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
        <TextField size="small" label="Title" value={f.title} onChange={(e) => setF((s) => ({ ...s, title: e.target.value }))} />
        <TextField size="small" label="Meeting URL (GMeet/Teams)" value={f.meeting_url} onChange={(e) => setF((s) => ({ ...s, meeting_url: e.target.value }))} placeholder="https://…" />
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Scoring rubric</div>
            <div style={{ fontSize: 12.5, color: '#64748b' }}>Total: <b>{total}</b></div>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {cats.map((c, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField size="small" label="Category" value={c.name} onChange={(e) => setCat(i, 'name', e.target.value)} sx={{ flex: 1 }} />
                <TextField size="small" type="number" label="Max" value={c.max_marks} onChange={(e) => setCat(i, 'max_marks', e.target.value)} sx={{ width: 84 }} inputProps={{ min: 1 }} />
                <TextField select size="small" label="Scored by" value={c.scored_by} onChange={(e) => setCat(i, 'scored_by', e.target.value)} sx={{ width: 130 }}>
                  <MenuItem value="trainer">Trainer</MenuItem>
                  <MenuItem value="hr">HR</MenuItem>
                </TextField>
                {cats.length > 1 && <IconButton size="small" onClick={() => setCats((cs) => cs.filter((_, j) => j !== i))}><DeleteOutlineIcon fontSize="small" /></IconButton>}
              </Box>
            ))}
          </div>
          <Button size="small" startIcon={<AddIcon />} onClick={() => setCats((cs) => [...cs, { name: '', max_marks: 10, scored_by: 'trainer' }])} sx={{ textTransform: 'none', mt: 1 }}>Add category</Button>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={busy} sx={{ textTransform: 'none', bgcolor: '#E53935' }}>Create</Button>
      </DialogActions>
    </Dialog>
  );
}

function SlotsDialog({ programId, interview, onClose, onChange, onError }) {
  const [view, setView] = useState({ categories: [], slots: [], interview: {} });
  const [students, setStudents] = useState([]);
  const [hrList, setHrList] = useState([]);
  const [assign, setAssign] = useState({ student_id: '', slot_at: '' });
  const load = useCallback(() => {
    Promise.all([interviewsApi.listSlots(interview.id), interviewsApi.students(programId), interviewsApi.assignableHr()])
      .then(([v, st, hr]) => { setView(v?.data || { categories: [], slots: [] }); setStudents(st?.data || []); setHrList(hr?.data || []); }).catch(() => {});
  }, [interview.id, programId]);
  useEffect(() => { load(); }, [load]);

  const trainerCats = (view.categories || []).filter((c) => c.scored_by === 'trainer');
  const hrCats = (view.categories || []).filter((c) => c.scored_by === 'hr');

  const doAssign = async () => {
    if (!assign.student_id) return;
    try { await interviewsApi.assign(interview.id, { student_id: assign.student_id, slot_at: assign.slot_at ? new Date(assign.slot_at).toISOString() : null }); setAssign({ student_id: '', slot_at: '' }); load(); onChange(); }
    catch (e) { onError(e.message); }
  };
  const setHr = async (hrId) => { try { await interviewsApi.assignHr(interview.id, { hr_user_id: hrId || null }); load(); } catch (e) { onError(e.message); } };
  const saveScores = async (slotId, scores) => {
    try { await interviewsApi.score(slotId, { scores }); load(); onChange(); } catch (e) { onError(e.message); }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{interview.title} — rubric & scoring</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField select size="small" label="Assign student" value={assign.student_id} onChange={(e) => setAssign((s) => ({ ...s, student_id: e.target.value }))} sx={{ minWidth: 200 }}>
            {students.map((st) => <MenuItem key={st.id} value={st.id}>{st.name}</MenuItem>)}
          </TextField>
          <TextField size="small" type="datetime-local" label="Slot time" InputLabelProps={{ shrink: true }} value={assign.slot_at} onChange={(e) => setAssign((s) => ({ ...s, slot_at: e.target.value }))} />
          <Button variant="contained" onClick={doAssign} sx={{ textTransform: 'none', bgcolor: '#E53935' }}>Assign</Button>
          <Box sx={{ ml: 'auto' }}>
            <TextField select size="small" label="HR evaluator" value={view.interview?.hr_user_id || ''} onChange={(e) => setHr(e.target.value)} sx={{ minWidth: 200 }}
              helperText={hrList.length === 0 ? 'No HR users yet' : 'Scores the HR categories'}>
              <MenuItem value="">— none</MenuItem>
              {hrList.map((h) => <MenuItem key={h.id} value={h.id}>{h.name}</MenuItem>)}
            </TextField>
          </Box>
        </Box>

        <div style={{ marginBottom: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(view.categories || []).map((c) => <Chip key={c.id} size="small" label={`${c.name} /${c.max_marks} · ${c.scored_by}`} color={c.scored_by === 'hr' ? 'primary' : 'default'} variant="outlined" />)}
        </div>

        {(view.slots || []).length === 0 ? <Typography sx={{ color: '#94a3b8', fontSize: 13 }}>No students assigned yet.</Typography> : (
          <Table size="small">
            <TableHead><TableRow sx={{ background: '#fafbfc' }}>
              <TableCell>Student</TableCell><TableCell>Slot</TableCell>
              {trainerCats.map((c) => <TableCell key={c.id} align="center">{c.name}</TableCell>)}
              {hrCats.map((c) => <TableCell key={c.id} align="center" sx={{ color: '#2563eb' }}>{c.name} (HR)</TableCell>)}
              <TableCell align="right">Total</TableCell><TableCell align="right" />
            </TableRow></TableHead>
            <TableBody>{view.slots.map((sl) => <ScoreRow key={sl.id} sl={sl} trainerCats={trainerCats} hrCats={hrCats} onSave={saveScores} />)}</TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose} sx={{ textTransform: 'none' }}>Close</Button></DialogActions>
    </Dialog>
  );
}

function ScoreRow({ sl, trainerCats, hrCats, onSave }) {
  const scoreFor = (catId) => (sl.scores || []).find((x) => x.category_id === catId)?.marks;
  const [vals, setVals] = useState(() => Object.fromEntries(trainerCats.map((c) => [c.id, scoreFor(c.id) ?? ''])));
  const save = () => {
    const scores = trainerCats.filter((c) => vals[c.id] !== '' && vals[c.id] != null).map((c) => ({ category_id: c.id, marks: Number(vals[c.id]) }));
    if (scores.length) onSave(sl.id, scores);
  };
  return (
    <TableRow>
      <TableCell>{sl.name}</TableCell>
      <TableCell sx={{ color: '#64748b' }}>{sl.slot_at ? fmtDate(sl.slot_at) : '—'}</TableCell>
      {trainerCats.map((c) => (
        <TableCell key={c.id} align="center">
          <TextField size="small" type="number" value={vals[c.id]} onChange={(e) => setVals((v) => ({ ...v, [c.id]: e.target.value }))} sx={{ width: 64 }} inputProps={{ min: 0, max: c.max_marks }} />
        </TableCell>
      ))}
      {hrCats.map((c) => <TableCell key={c.id} align="center" sx={{ color: '#94a3b8', fontSize: 12 }}>{scoreFor(c.id) ?? '—'}</TableCell>)}
      <TableCell align="right">
        <b>{sl.marks ?? '—'}</b>
        {sl.complete ? <Chip size="small" label="Final" color="success" variant="outlined" sx={{ ml: 0.5, height: 18, fontSize: 10 }} />
          : sl.pending_hr ? <Chip size="small" label="Awaiting HR" color="warning" variant="outlined" sx={{ ml: 0.5, height: 18, fontSize: 10 }} /> : null}
      </TableCell>
      <TableCell align="right"><Button size="small" onClick={save} sx={{ textTransform: 'none' }}>Save</Button></TableCell>
    </TableRow>
  );
}
