// Trainer Classes — schedule classes for a course's batch, and open the live
// console (start/end, fire attendance MCQs, watch present/absent update live).
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, TextField, MenuItem, Alert, Snackbar, CircularProgress,
  Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import { PageHeader, Card, EmptyState, Badge, Btn } from '../../lib/lmsUi';
import { coursesApi, classesApi } from '../../lib/endpoints';
import { fmtDate } from '../Accounts/utils';
import TrainerClassConsole from './TrainerClassConsole';

export default function TrainerClasses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [programId, setProgramId] = useState('');
  const [batches, setBatches] = useState([]);
  const [modules, setModules] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [consoleClass, setConsoleClass] = useState(null);

  useEffect(() => { coursesApi.list().then((r) => setCourses(r?.data || [])).catch(() => {}); }, []);

  const loadCourse = useCallback((pid) => {
    if (!pid) return;
    setLoading(true);
    Promise.all([classesApi.list({ programId: pid }), coursesApi.listBatches(pid), coursesApi.listModules(pid)])
      .then(([c, b, m]) => { setClasses(c?.data || []); setBatches((b?.data || []).filter((x) => x.status !== 'merged')); setModules(m?.data || []); })
      .catch((e) => setToast({ severity: 'error', text: e.message }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (programId) loadCourse(programId); }, [programId, loadCourse]);

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
      <PageHeader title="Classes" subtitle="Schedule classes for your batches and run live attendance." icon={CalendarMonthOutlinedIcon} />

      <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField select size="small" label="Course" value={programId} onChange={(e) => setProgramId(e.target.value)} sx={{ minWidth: 240 }}>
          {courses.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
        </TextField>
        {programId && (
          <Button variant="contained" startIcon={<AddIcon />} disabled={batches.length === 0} onClick={() => setCreateOpen(true)}
                  sx={{ textTransform: 'none', bgcolor: '#E53935', '&:hover': { bgcolor: '#c62828' } }}>Schedule class</Button>
        )}
      </Box>

      {programId && !loading && batches.length === 0 && (
        <Card style={{ marginBottom: 16, borderLeft: '3px solid #d97706' }}>
          <EmptyState icon="👥" title="Create a batch first"
            text="Classes are scheduled into a batch (a cohort of students). Add a batch to this course, then come back to schedule classes."
            action={<Btn onClick={() => navigate(`/trainer/courses/${programId}?tab=batches`)}>Go to Batches →</Btn>} />
        </Card>
      )}

      {loading ? <CircularProgress /> : programId && batches.length > 0 && (
        classes.length === 0 ? (
          <Card><EmptyState icon="📅" title="No classes yet" text="Schedule your first class for this course — students see it instantly with join links." /></Card>
        ) : (
          <Card pad={0} style={{ overflow: 'hidden' }}>
            <Table size="small">
              <TableHead><TableRow sx={{ background: '#fafbfc', '& th': { color: '#64748b', fontWeight: 700, fontSize: 12 } }}>
                <TableCell>Title</TableCell><TableCell>Batch</TableCell><TableCell>When</TableCell>
                <TableCell align="center">Mode</TableCell><TableCell align="center">State</TableCell><TableCell align="right" />
              </TableRow></TableHead>
              <TableBody>
                {classes.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell>{c.title}{c.kind === 'mock_test' ? ' · Mock' : ''}</TableCell>
                    <TableCell sx={{ color: '#64748b' }}>{c.batch_name}</TableCell>
                    <TableCell sx={{ color: '#64748b' }}>{fmtDate(c.starts_at)}</TableCell>
                    <TableCell align="center"><Badge tone="neutral">{c.mode}</Badge></TableCell>
                    <TableCell align="center">
                      {c.ended_at ? <Badge tone="neutral">Ended</Badge> : c.started_at ? <Badge tone="danger">● LIVE</Badge> : <Badge tone="warning">Scheduled</Badge>}
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => setConsoleClass(c)} sx={{ textTransform: 'none' }}>Open console</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )
      )}

      {createOpen && (
        <CreateClassDialog programId={programId} batches={batches} modules={modules}
          onClose={() => setCreateOpen(false)}
          onDone={() => { setCreateOpen(false); loadCourse(programId); setToast({ severity: 'success', text: 'Class scheduled' }); }}
          onError={(m) => setToast({ severity: 'error', text: m })} />
      )}
      {consoleClass && (
        <TrainerClassConsole cls={consoleClass} onClose={() => { setConsoleClass(null); loadCourse(programId); }} />
      )}

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)}>{toast.text}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}

function CreateClassDialog({ programId, batches, modules, onClose, onDone, onError }) {
  const [f, setF] = useState({ title: '', batch_id: '', module_id: '', kind: 'lecture', mode: 'online', meeting_url: '', starts_at: '', ends_at: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async () => {
    if (!f.title || !f.batch_id || !f.starts_at || !f.ends_at) { onError('Title, batch, start and end are required'); return; }
    setBusy(true);
    try {
      await classesApi.create({
        program_id: programId, batch_id: f.batch_id, module_id: f.module_id || null,
        title: f.title, kind: f.kind, mode: f.mode, meeting_url: f.meeting_url || null,
        starts_at: new Date(f.starts_at).toISOString(), ends_at: new Date(f.ends_at).toISOString(),
      });
      onDone();
    } catch (e) { onError(e.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Schedule a class</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr', pt: 1 }}>
        <TextField size="small" label="Title" value={f.title} onChange={set('title')} sx={{ gridColumn: '1 / -1' }} />
        <TextField select size="small" label="Batch" value={f.batch_id} onChange={set('batch_id')}>
          {batches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Module" value={f.module_id} onChange={set('module_id')}>
          <MenuItem value="">—</MenuItem>
          {modules.map((m) => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Kind" value={f.kind} onChange={set('kind')}>
          <MenuItem value="lecture">Lecture</MenuItem><MenuItem value="mock_test">Mock test</MenuItem>
        </TextField>
        <TextField select size="small" label="Mode" value={f.mode} onChange={set('mode')}>
          <MenuItem value="online">Online</MenuItem><MenuItem value="offline">Offline</MenuItem>
        </TextField>
        <TextField size="small" label="Meeting URL (GMeet/Teams)" value={f.meeting_url} onChange={set('meeting_url')} sx={{ gridColumn: '1 / -1' }} placeholder="https://meet.google.com/…" />
        <TextField size="small" type="datetime-local" label="Starts" InputLabelProps={{ shrink: true }} value={f.starts_at} onChange={set('starts_at')} />
        <TextField size="small" type="datetime-local" label="Ends" InputLabelProps={{ shrink: true }} value={f.ends_at} onChange={set('ends_at')} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={busy} sx={{ textTransform: 'none', bgcolor: '#E53935' }}>Schedule</Button>
      </DialogActions>
    </Dialog>
  );
}
