// Course detail — manage a course's Modules, Trainer roster, and Batches.
// Batch ops (create / place student / merge, with the recordings-share toggle)
// are head-trainer/admin only; the backend enforces it, and errors surface here.
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Tabs, Tab, Button, TextField, Alert, Snackbar,
  CircularProgress, Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, MenuItem, FormControlLabel, Checkbox, Table, TableHead, TableRow, TableCell, TableBody,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import MergeIcon from '@mui/icons-material/CallMerge';
import { coursesApi, usersApi } from '../../lib/endpoints';

export default function TrainerCourseDetail() {
  const { programId } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [course, setCourse] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    coursesApi.get(programId)
      .then((r) => setCourse(r?.data || null))
      .catch((e) => setError(e?.message || 'Failed to load course'));
  }, [programId]);

  const notify = (severity, text) => setToast({ severity, text });

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <IconButton size="small" onClick={() => navigate('/trainer/courses')}><ArrowBackIcon /></IconButton>
        <Typography variant="h6">{course?.name || 'Course'}</Typography>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Modules" />
        <Tab label="Trainers" />
        <Tab label="Batches" />
      </Tabs>

      {tab === 0 && <ModulesTab programId={programId} notify={notify} />}
      {tab === 1 && <TrainersTab programId={programId} notify={notify} />}
      {tab === 2 && <BatchesTab programId={programId} notify={notify} />}

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)}>{toast.text}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}

// ---------- Modules ----------
function ModulesTab({ programId, notify }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const load = useCallback(() => {
    coursesApi.listModules(programId).then((r) => setRows(r?.data || [])).catch((e) => notify('error', e.message)).finally(() => setLoading(false));
  }, [programId, notify]);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!name.trim()) return;
    try { await coursesApi.createModule(programId, { name: name.trim(), order_index: rows.length }); setName(''); load(); notify('success', 'Module added'); }
    catch (e) { notify('error', e.message); }
  };
  const remove = async (id) => {
    if (!window.confirm('Delete this module?')) return;
    try { await coursesApi.deleteModule(programId, id); load(); } catch (e) { notify('error', e.message); }
  };

  if (loading) return <CircularProgress />;
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField size="small" label="New module (e.g. HTML)" value={name} onChange={(e) => setName(e.target.value)} sx={{ flex: 1 }} />
        <Button variant="contained" startIcon={<AddIcon />} onClick={add} sx={{ textTransform: 'none', bgcolor: '#E53935', '&:hover': { bgcolor: '#c62828' } }}>Add</Button>
      </Box>
      {rows.length === 0 ? <Typography sx={{ color: '#94a3b8', fontSize: 13 }}>No modules yet.</Typography> : (
        <Table size="small">
          <TableHead><TableRow><TableCell>Module</TableCell><TableCell>Trainer</TableCell><TableCell align="right" /></TableRow></TableHead>
          <TableBody>
            {rows.map((m) => (
              <TableRow key={m.id}>
                <TableCell>{m.name}</TableCell>
                <TableCell sx={{ color: '#64748b' }}>{m.trainer_name || '—'}</TableCell>
                <TableCell align="right"><IconButton size="small" onClick={() => remove(m.id)}><DeleteOutlineIcon fontSize="small" /></IconButton></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
}

// ---------- Trainers ----------
function TrainersTab({ programId, notify }) {
  const [rows, setRows] = useState([]);
  const [modules, setModules] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ user_id: '', role: 'trainer', module_id: '' });
  const load = useCallback(() => {
    Promise.all([coursesApi.listTrainers(programId), coursesApi.listModules(programId)])
      .then(([t, m]) => { setRows(t?.data || []); setModules(m?.data || []); })
      .catch((e) => notify('error', e.message)).finally(() => setLoading(false));
  }, [programId, notify]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    // Staff users to pick from (trainers/head_trainer roles ideally).
    usersApi.list?.({ }).then((r) => setStaff(r?.data || [])).catch(() => {});
  }, []);

  const add = async () => {
    if (!form.user_id) return;
    try {
      await coursesApi.addTrainer(programId, { user_id: form.user_id, role: form.role, module_id: form.module_id || null });
      setForm({ user_id: '', role: 'trainer', module_id: '' }); load(); notify('success', 'Trainer added');
    } catch (e) { notify('error', e.message); }
  };
  const remove = async (id) => { try { await coursesApi.removeTrainer(programId, id); load(); } catch (e) { notify('error', e.message); } };

  if (loading) return <CircularProgress />;
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size="small" select label="User" value={form.user_id} onChange={(e) => setForm((s) => ({ ...s, user_id: e.target.value }))} sx={{ minWidth: 200 }}>
          {staff.map((u) => <MenuItem key={u.id} value={u.id}>{u.name} ({u.role})</MenuItem>)}
        </TextField>
        <TextField size="small" select label="Role" value={form.role} onChange={(e) => setForm((s) => ({ ...s, role: e.target.value }))} sx={{ width: 130 }}>
          <MenuItem value="trainer">Trainer</MenuItem>
          <MenuItem value="head">Head</MenuItem>
        </TextField>
        <TextField size="small" select label="Module (optional)" value={form.module_id} onChange={(e) => setForm((s) => ({ ...s, module_id: e.target.value }))} sx={{ minWidth: 160 }}>
          <MenuItem value="">—</MenuItem>
          {modules.map((m) => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
        </TextField>
        <Button variant="contained" startIcon={<AddIcon />} onClick={add} sx={{ textTransform: 'none', bgcolor: '#E53935', '&:hover': { bgcolor: '#c62828' } }}>Add</Button>
      </Box>
      {rows.length === 0 ? <Typography sx={{ color: '#94a3b8', fontSize: 13 }}>No trainers yet.</Typography> : (
        <Table size="small">
          <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Role</TableCell><TableCell>Module</TableCell><TableCell align="right" /></TableRow></TableHead>
          <TableBody>
            {rows.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.user_name}</TableCell>
                <TableCell>{t.role === 'head' ? <Chip size="small" color="primary" label="Head" /> : 'Trainer'}</TableCell>
                <TableCell sx={{ color: '#64748b' }}>{t.module_name || '—'}</TableCell>
                <TableCell align="right"><IconButton size="small" onClick={() => remove(t.id)}><DeleteOutlineIcon fontSize="small" /></IconButton></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
}

// ---------- Batches ----------
function BatchesTab({ programId, notify }) {
  const [batches, setBatches] = useState([]);
  const [unassigned, setUnassigned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newBatch, setNewBatch] = useState('');
  const [placeDlg, setPlaceDlg] = useState(null); // { student }
  const [mergeDlg, setMergeDlg] = useState(false);

  const load = useCallback(() => {
    Promise.all([coursesApi.listBatches(programId), coursesApi.listUnassignedStudents(programId)])
      .then(([b, u]) => { setBatches(b?.data || []); setUnassigned(u?.data || []); })
      .catch((e) => notify('error', e.message)).finally(() => setLoading(false));
  }, [programId, notify]);
  useEffect(() => { load(); }, [load]);

  const createBatch = async () => {
    if (!newBatch.trim()) return;
    try { await coursesApi.createBatch(programId, { name: newBatch.trim() }); setNewBatch(''); load(); notify('success', 'Batch created'); }
    catch (e) { notify('error', e.message); }
  };

  if (loading) return <CircularProgress />;
  const activeBatches = batches.filter((b) => b.status !== 'merged');

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, gap: 1, flexWrap: 'wrap' }}>
          <Typography sx={{ fontWeight: 700 }}>Batches</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" startIcon={<MergeIcon />} variant="outlined" disabled={activeBatches.length < 2} onClick={() => setMergeDlg(true)} sx={{ textTransform: 'none' }}>Merge</Button>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField size="small" label="New batch (e.g. MERN-Aug)" value={newBatch} onChange={(e) => setNewBatch(e.target.value)} sx={{ flex: 1 }} />
          <Button variant="contained" startIcon={<AddIcon />} onClick={createBatch} sx={{ textTransform: 'none', bgcolor: '#E53935', '&:hover': { bgcolor: '#c62828' } }}>Create</Button>
        </Box>
        {activeBatches.length === 0 ? <Typography sx={{ color: '#94a3b8', fontSize: 13 }}>No batches yet.</Typography> : (
          <Table size="small">
            <TableHead><TableRow><TableCell>Batch</TableCell><TableCell align="center">Students</TableCell></TableRow></TableHead>
            <TableBody>{activeBatches.map((b) => (
              <TableRow key={b.id}><TableCell>{b.name}</TableCell><TableCell align="center">{b.student_count}</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Unassigned students ({unassigned.length})</Typography>
        {unassigned.length === 0 ? <Typography sx={{ color: '#94a3b8', fontSize: 13 }}>Everyone is placed in a batch.</Typography> : (
          <Table size="small">
            <TableHead><TableRow><TableCell>Student</TableCell><TableCell>Email</TableCell><TableCell align="right" /></TableRow></TableHead>
            <TableBody>{unassigned.map((s) => (
              <TableRow key={s.student_id}>
                <TableCell>{s.name}</TableCell>
                <TableCell sx={{ color: '#64748b' }}>{s.email}</TableCell>
                <TableCell align="right">
                  <Button size="small" disabled={activeBatches.length === 0} onClick={() => setPlaceDlg({ student: s })} sx={{ textTransform: 'none' }}>Place in batch</Button>
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        )}
      </Paper>

      {placeDlg && <PlaceDialog programId={programId} student={placeDlg.student} batches={activeBatches} onClose={() => setPlaceDlg(null)} onDone={() => { setPlaceDlg(null); load(); notify('success', 'Student placed'); }} onError={(m) => notify('error', m)} />}
      {mergeDlg && <MergeDialog programId={programId} batches={activeBatches} onClose={() => setMergeDlg(false)} onDone={(r) => { setMergeDlg(false); load(); notify('success', `Merged — ${r.moved} student(s) moved`); }} onError={(m) => notify('error', m)} />}
    </Box>
  );
}

function PlaceDialog({ programId, student, batches, onClose, onDone, onError }) {
  const [batchId, setBatchId] = useState('');
  const [share, setShare] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!batchId) return;
    setBusy(true);
    try { await coursesApi.placeStudent(programId, { batch_id: batchId, student_id: student.student_id, share_recordings: share }); onDone(); }
    catch (e) { onError(e.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Place {student.name} in a batch</DialogTitle>
      <DialogContent>
        <TextField select fullWidth size="small" label="Batch" value={batchId} onChange={(e) => setBatchId(e.target.value)} sx={{ mt: 1 }}>
          {batches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
        </TextField>
        <FormControlLabel sx={{ mt: 1 }} control={<Checkbox checked={share} onChange={(e) => setShare(e.target.checked)} />}
          label="Share this batch's previous class recordings" />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={busy || !batchId} sx={{ textTransform: 'none', bgcolor: '#E53935' }}>Place</Button>
      </DialogActions>
    </Dialog>
  );
}

function MergeDialog({ programId, batches, onClose, onDone, onError }) {
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [share, setShare] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!source || !target || source === target) { onError('Pick two different batches'); return; }
    setBusy(true);
    try { const r = await coursesApi.mergeBatches(programId, { source_batch_id: source, target_batch_id: target, share_recordings: share }); onDone(r?.data || r); }
    catch (e) { onError(e.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Merge batches</DialogTitle>
      <DialogContent>
        <TextField select fullWidth size="small" label="Merge this batch…" value={source} onChange={(e) => setSource(e.target.value)} sx={{ mt: 1 }}>
          {batches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name} ({b.student_count})</MenuItem>)}
        </TextField>
        <TextField select fullWidth size="small" label="…into this batch" value={target} onChange={(e) => setTarget(e.target.value)} sx={{ mt: 2 }}>
          {batches.filter((b) => b.id !== source).map((b) => <MenuItem key={b.id} value={b.id}>{b.name} ({b.student_count})</MenuItem>)}
        </TextField>
        <FormControlLabel sx={{ mt: 1 }} control={<Checkbox checked={share} onChange={(e) => setShare(e.target.checked)} />}
          label="Share target batch's previous recordings with moved students" />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={busy} sx={{ textTransform: 'none', bgcolor: '#E53935' }}>Merge</Button>
      </DialogActions>
    </Dialog>
  );
}
