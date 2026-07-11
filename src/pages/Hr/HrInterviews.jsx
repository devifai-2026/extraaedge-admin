// HR Interviews — the HR evaluator's queue: interviews they're assigned to, with
// each student slot and inputs for the HR-scored categories (communication etc.).
import { useEffect, useState, useCallback } from 'react';
import { Box, Table, TableHead, TableRow, TableCell, TableBody, TextField, Button, Snackbar, Alert } from '@mui/material';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOverOutlined';
import { interviewsApi } from '../../lib/endpoints';
import { fmtDate } from '../Accounts/utils';
import { PageHeader, Card, EmptyState, Badge, Skeleton } from '../../lib/lmsUi';

export default function HrInterviews() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const load = useCallback(() => { setLoading(true); interviewsApi.hrQueue().then((r) => setQueue(r?.data || [])).catch((e) => setToast({ severity: 'error', text: e.message })).finally(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load]);

  const saveScores = async (slotId, scores) => {
    try { await interviewsApi.score(slotId, { scores }); load(); setToast({ severity: 'success', text: 'Scored' }); }
    catch (e) { setToast({ severity: 'error', text: e.message }); }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 960, mx: 'auto' }}>
      <PageHeader title="Interview Evaluations" subtitle="Score the soft-skill categories for interviews you're assigned to." icon={RecordVoiceOverIcon} />
      {loading ? <Card><Skeleton h={16} w="40%" /><div style={{ height: 8 }} /><Skeleton h={12} w="70%" /></Card>
        : queue.length === 0 ? <Card><EmptyState icon="🎤" title="Nothing to evaluate" text="Interviews a trainer assigns you as the HR evaluator will appear here." /></Card>
          : queue.map((iv) => {
            const hrCats = (iv.categories || []).filter((c) => c.scored_by === 'hr');
            const trainerCats = (iv.categories || []).filter((c) => c.scored_by === 'trainer');
            return (
              <Card key={iv.id} title={`${iv.title}${iv.program_name ? ` · ${iv.program_name}` : ''}`} style={{ marginBottom: 16 }}
                right={<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{hrCats.map((c) => <Badge key={c.id} tone="info">{c.name} /{c.max_marks}</Badge>)}</div>}>
                {(iv.slots || []).length === 0 ? <EmptyState icon="👥" title="No students assigned yet" /> : (
                  <Table size="small">
                    <TableHead><TableRow sx={{ background: '#fafbfc' }}>
                      <TableCell>Student</TableCell><TableCell>Slot</TableCell>
                      {hrCats.map((c) => <TableCell key={c.id} align="center">{c.name}</TableCell>)}
                      {trainerCats.map((c) => <TableCell key={c.id} align="center" sx={{ color: '#94a3b8' }}>{c.name}</TableCell>)}
                      <TableCell align="right">Total</TableCell><TableCell align="right" />
                    </TableRow></TableHead>
                    <TableBody>{iv.slots.map((sl) => <HrScoreRow key={sl.id} sl={sl} hrCats={hrCats} trainerCats={trainerCats} onSave={saveScores} />)}</TableBody>
                  </Table>
                )}
              </Card>
            );
          })}
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)}>{toast.text}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}

function HrScoreRow({ sl, hrCats, trainerCats, onSave }) {
  const scoreFor = (catId) => (sl.scores || []).find((x) => x.category_id === catId)?.marks;
  const [vals, setVals] = useState(() => Object.fromEntries(hrCats.map((c) => [c.id, scoreFor(c.id) ?? ''])));
  const save = () => {
    const scores = hrCats.filter((c) => vals[c.id] !== '' && vals[c.id] != null).map((c) => ({ category_id: c.id, marks: Number(vals[c.id]) }));
    if (scores.length) onSave(sl.id, scores);
  };
  return (
    <TableRow>
      <TableCell>{sl.name}</TableCell>
      <TableCell sx={{ color: '#64748b' }}>{sl.slot_at ? fmtDate(sl.slot_at) : '—'}</TableCell>
      {hrCats.map((c) => (
        <TableCell key={c.id} align="center">
          <TextField size="small" type="number" value={vals[c.id]} onChange={(e) => setVals((v) => ({ ...v, [c.id]: e.target.value }))} sx={{ width: 64 }} inputProps={{ min: 0, max: c.max_marks }} />
        </TableCell>
      ))}
      {trainerCats.map((c) => <TableCell key={c.id} align="center" sx={{ color: '#94a3b8', fontSize: 12 }}>{scoreFor(c.id) ?? '—'}</TableCell>)}
      <TableCell align="right"><b>{sl.marks ?? '—'}</b></TableCell>
      <TableCell align="right"><Button size="small" onClick={save} sx={{ textTransform: 'none' }}>Save</Button></TableCell>
    </TableRow>
  );
}
