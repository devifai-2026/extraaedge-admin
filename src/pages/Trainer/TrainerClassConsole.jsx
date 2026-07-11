// Live class console — start/end the class (= trainer self-attendance), fire
// attendance MCQs (ad-hoc or from the bank), and watch the present/absent
// table update live over the socket. Manual edits are flagged server-side.
import { useEffect, useState, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box,
  TextField, IconButton, Table, TableHead, TableRow, TableCell, TableBody,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { Section, Badge } from '../../lib/lmsUi';
import { classesApi } from '../../lib/endpoints';
import { joinBatch, leaveBatch, onSocketEvent } from '../../lib/socket';

export default function TrainerClassConsole({ cls, onClose }) {
  const [table, setTable] = useState([]);
  const [msg, setMsg] = useState('');
  const [started, setStarted] = useState(!!cls.started_at);
  const [ended, setEnded] = useState(!!cls.ended_at);
  const [q, setQ] = useState({ question: '', options: ['', ''], visible_minutes: 5 });
  const batchId = cls.batch_id;

  const loadTable = useCallback(() => {
    classesApi.attendance(cls.id).then((r) => setTable(r?.data || [])).catch((e) => setMsg(e.message));
  }, [cls.id]);

  useEffect(() => {
    loadTable();
    joinBatch(batchId);
    const off1 = onSocketEvent('lms:attendance-updated', (e) => { if (e?.class_id === cls.id) loadTable(); });
    return () => { off1(); leaveBatch(batchId); };
  }, [cls.id, batchId, loadTable]);

  const lifecycle = async (action) => {
    try {
      await classesApi.lifecycle(cls.id, action);
      if (action === 'class_started') setStarted(true);
      if (action === 'class_ended') setEnded(true);
      setMsg('');
    } catch (e) { setMsg(e.message); }
  };

  const setOpt = (i, v) => setQ((s) => { const o = [...s.options]; o[i] = v; return { ...s, options: o }; });
  const fire = async () => {
    const options = q.options.map((o) => o.trim()).filter(Boolean);
    if (!q.question.trim() || options.length < 2) { setMsg('Enter a question and at least 2 options'); return; }
    try {
      await classesApi.fireQuestion(cls.id, { question: q.question.trim(), options, visible_minutes: Number(q.visible_minutes) || 5, source: 'adhoc' });
      setQ({ question: '', options: ['', ''], visible_minutes: 5 });
      setMsg('Question fired — students have ' + (q.visible_minutes || 5) + ' min to answer.');
    } catch (e) { setMsg(e.message); }
  };

  const edit = async (studentId, status) => {
    try { await classesApi.editAttendance(cls.id, { student_id: studentId, status }); loadTable(); }
    catch (e) { setMsg(e.message); }
  };

  const present = table.filter((r) => r.status === 'present').length;

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {cls.title}
        <Badge tone="neutral">{cls.batch_name}</Badge>
        {ended ? <Badge tone="neutral">Ended</Badge> : started ? <Badge tone="danger">● LIVE</Badge> : <Badge tone="warning">Scheduled</Badge>}
      </DialogTitle>
      <DialogContent>
        {msg && <Alert severity="info" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          {cls.meeting_url && <Button size="small" variant="outlined" component="a" href={cls.meeting_url} target="_blank" rel="noreferrer" sx={{ textTransform: 'none' }}>Open meeting</Button>}
          {!started && <Button size="small" variant="contained" color="success" onClick={() => lifecycle('class_started')} sx={{ textTransform: 'none' }}>Start class</Button>}
          {started && !ended && <Button size="small" variant="contained" color="warning" onClick={() => lifecycle('class_ended')} sx={{ textTransform: 'none' }}>End class</Button>}
        </Box>

        {/* Fire an attendance question */}
        <Section title="Fire attendance question">
          <Box sx={{ display: 'grid', gap: 1 }}>
            <TextField size="small" label="Question" value={q.question} onChange={(e) => setQ((s) => ({ ...s, question: e.target.value }))} />
            {q.options.map((o, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField size="small" fullWidth label={`Option ${i + 1}`} value={o} onChange={(e) => setOpt(i, e.target.value)} />
                {q.options.length > 2 && <IconButton size="small" onClick={() => setQ((s) => ({ ...s, options: s.options.filter((_, j) => j !== i) }))}><DeleteOutlineIcon fontSize="small" /></IconButton>}
              </Box>
            ))}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button size="small" startIcon={<AddIcon />} onClick={() => setQ((s) => ({ ...s, options: [...s.options, ''] }))} sx={{ textTransform: 'none' }}>Add option</Button>
              <TextField size="small" type="number" label="Visible (min)" value={q.visible_minutes} onChange={(e) => setQ((s) => ({ ...s, visible_minutes: e.target.value }))} sx={{ width: 130 }} inputProps={{ min: 1, max: 120 }} />
              <Button size="small" variant="contained" onClick={fire} sx={{ textTransform: 'none', bgcolor: '#E53935', ml: 'auto' }}>Fire question</Button>
            </Box>
          </Box>
        </Section>

        <div style={{ borderTop: '1px solid #eef0f5', margin: '4px 0 18px' }} />

        <Section title="Attendance" right={<Badge tone={table.length > 0 && present === table.length ? 'success' : 'neutral'}>{present}/{table.length} present</Badge>}>
        <Table size="small">
          <TableHead><TableRow sx={{ background: '#fafbfc', '& th': { color: '#64748b', fontWeight: 700, fontSize: 12 } }}>
            <TableCell>Student</TableCell><TableCell align="center">Answered</TableCell>
            <TableCell align="center">Join</TableCell><TableCell align="center">Status</TableCell><TableCell align="right" />
          </TableRow></TableHead>
          <TableBody>
            {table.map((r) => (
              <TableRow key={r.student_id}>
                <TableCell>{r.name}{r.pre_notified_absent ? ' · pre-notified' : ''}{r.reason ? <div style={{ fontSize: 11, color: '#b45309', marginTop: 2, fontStyle: 'italic' }}>“{r.reason}”</div> : null}</TableCell>
                <TableCell align="center">{r.answered}</TableCell>
                <TableCell align="center" sx={{ color: '#64748b' }}>{r.join_mode || '—'}</TableCell>
                <TableCell align="center">
                  <Badge tone={r.status === 'present' ? 'success' : r.status === 'absent' ? 'danger' : 'neutral'}>{r.status}</Badge>
                  {r.edited_at && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>edited{r.edited_by_name ? ` by ${r.edited_by_name}` : ''}</div>}
                </TableCell>
                <TableCell align="right">
                  {r.status === 'present'
                    ? <Button size="small" onClick={() => edit(r.student_id, 'absent')} sx={{ textTransform: 'none' }}>Mark absent</Button>
                    : <Button size="small" onClick={() => edit(r.student_id, 'present')} sx={{ textTransform: 'none' }}>Mark present</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </Section>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
