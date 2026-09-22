// "These batches have no dates" — backfill prompt for the trainer lead.
//
// Batch dates existed as columns long before anything used them, so every
// pre-existing batch has NULL start/end. Without them the schedule column reads
// "no dates" and the progress bar has no calendar to measure against, so the
// batch looks broken rather than simply unscheduled.
//
// Shown to the head trainer (trainer lead) and admins — the people who own the
// course calendar. A plain trainer is not prompted: they can see the gap on the
// course page, but chasing them for a scheduling decision they may not own
// would be noise.
//
// Dismissible per session. This is a data-quality nudge, not an emergency: a
// batch with no dates still teaches fine.
import { useEffect, useState, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, TextField, Alert, Chip,
} from '@mui/material';
import EventNoteIcon from '@mui/icons-material/EventNoteOutlined';
import { coursesApi, batchesApi } from '../../lib/endpoints';

const DISMISS_KEY = 'ee.batchDatesPrompt.dismissedAt';
const DISMISS_HOURS = 24;

const spanLabel = (start, end) => {
  if (!start || !end || end < start) return '';
  const days = Math.round((new Date(end) - new Date(start)) / 86400000) + 1;
  const w = Math.floor(days / 7);
  const d = days % 7;
  if (!w) return `${d} day${d === 1 ? '' : 's'}`;
  return d ? `${w} wk ${d}d` : `${w} week${w === 1 ? '' : 's'}`;
};

// localStorage can throw in private mode, so every access is guarded and a
// failure just means the prompt shows again — the safe direction.
const recentlyDismissed = () => {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return at && (Date.now() - at) < DISMISS_HOURS * 3600 * 1000;
  } catch { return false; }
};

export default function BatchDatesPrompt() {
  const [rows, setRows] = useState([]);       // [{ programId, programName, batch }]
  const [draft, setDraft] = useState({});     // batchId -> { start_date, end_date }
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState('');
  const [hidden, setHidden] = useState(recentlyDismissed);

  const load = useCallback(async () => {
    try {
      const courses = (await coursesApi.list())?.data || [];
      const found = [];
      // Sequential on purpose: this runs once on login and a burst of parallel
      // requests across every course is a worse neighbour than a slow check.
      for (const c of courses) {
        // eslint-disable-next-line no-await-in-loop
        const bs = (await coursesApi.listBatches(c.id))?.data || [];
        for (const b of bs) {
          if (b.status === 'merged' || b.status === 'completed') continue;
          if (!b.start_date || !b.end_date) found.push({ programId: c.id, programName: c.name, batch: b });
        }
      }
      setRows(found);
    } catch { /* a failed check must not pop an error at the user */ }
  }, []);

  useEffect(() => { if (!hidden) load(); }, [hidden, load]);

  if (hidden || !rows.length) return null;

  const set = (id, k) => (e) => setDraft((d) => ({ ...d, [id]: { ...d[id], [k]: e.target.value } }));

  const save = async (r) => {
    const d = draft[r.batch.id] || {};
    const start_date = d.start_date || r.batch.start_date || '';
    const end_date = d.end_date || r.batch.end_date || '';
    if (!start_date || !end_date) { setMsg('Set both a start and an end date'); return; }
    if (end_date < start_date) { setMsg('End date cannot be before the start date'); return; }
    setBusy(r.batch.id);
    try {
      await batchesApi.update(r.programId, r.batch.id, { start_date, end_date });
      setRows((s) => s.filter((x) => x.batch.id !== r.batch.id));
      setMsg('');
    } catch (e) { setMsg(e.message); }
    finally { setBusy(null); }
  };

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* private mode */ }
    setHidden(true);
  };

  return (
    <Dialog open maxWidth="sm" fullWidth onClose={dismiss}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <EventNoteIcon sx={{ color: '#6366f1' }} />
        <span style={{ fontSize: 17 }}>
          {rows.length === 1 ? '1 batch has no dates' : `${rows.length} batches have no dates`}
        </span>
      </DialogTitle>
      <DialogContent>
        {msg && <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setMsg('')}>{msg}</Alert>}
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>
          Add a start and end date so the batch shows its duration and progress.
        </div>
        <Box sx={{ display: 'grid', gap: 1.25, maxHeight: 360, overflowY: 'auto' }}>
          {rows.map((r) => {
            const d = draft[r.batch.id] || {};
            const sd = d.start_date || r.batch.start_date || '';
            const ed = d.end_date || r.batch.end_date || '';
            return (
              <Box key={r.batch.id} sx={{ border: '1px solid #e2e8f0', borderRadius: 1.5, p: 1.5 }}>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{r.batch.name}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>{r.programName}</div>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  <TextField size="small" type="date" label="Start" value={sd}
                    onChange={set(r.batch.id, 'start_date')} InputLabelProps={{ shrink: true }} sx={{ width: 155 }} />
                  <TextField size="small" type="date" label="End" value={ed}
                    onChange={set(r.batch.id, 'end_date')} InputLabelProps={{ shrink: true }}
                    sx={{ width: 155 }} inputProps={{ min: sd || undefined }} />
                  {spanLabel(sd, ed) && <Chip size="small" label={spanLabel(sd, ed)} sx={{ height: 22 }} />}
                  <Button size="small" variant="contained" disabled={busy === r.batch.id}
                    onClick={() => save(r)} sx={{ textTransform: 'none', ml: 'auto' }}>
                    {busy === r.batch.id ? 'Saving…' : 'Save'}
                  </Button>
                </Box>
              </Box>
            );
          })}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={dismiss} sx={{ textTransform: 'none', color: '#64748b' }}>Remind me tomorrow</Button>
      </DialogActions>
    </Dialog>
  );
}
