// "You forgot to end a class" — a modal that nags the trainer about classes
// they started and never ended, with how overdue each one is.
//
// This matters more than it looks. Ending a class is what closes attendance,
// stops further questions being fired or answered, and feeds module completion
// (which the performance report measures on-time delivery against). A forgotten
// "End class" silently holds all three open, and the trainer has no reason to
// notice — from their side the console just looks idle.
//
// Deliberately dismissible: a trainer mid-lesson with a class that overran
// should not be blocked by a modal. It re-checks every 5 minutes and comes
// back, and dismissal is per-class so ending one does not silence the rest.
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Alert,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmberOutlined';
import { classesApi } from '../../lib/endpoints';

const POLL_MS = 5 * 60 * 1000;

// "2 hr 15 min overdue" — the number is the point of the prompt, so it is
// spelled out rather than shown as a timestamp the trainer has to subtract.
const overdueLabel = (seconds) => {
  const s = Math.max(0, Number(seconds) || 0);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d) return `${d} day${d === 1 ? '' : 's'} ${h} hr overdue`;
  if (h) return m ? `${h} hr ${m} min overdue` : `${h} hr overdue`;
  return `${m} min overdue`;
};

export default function UnendedClassPrompt() {
  const [rows, setRows] = useState([]);
  const [dismissed, setDismissed] = useState(() => new Set());
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState('');
  const timer = useRef(null);

  const load = useCallback(() => {
    classesApi.unended()
      .then((r) => setRows(r?.data || []))
      .catch(() => {}); // a failed poll must not pop an error at the trainer
  }, []);

  useEffect(() => {
    load();
    timer.current = setInterval(load, POLL_MS);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [load]);

  const endClass = async (id) => {
    setBusy(id);
    try {
      await classesApi.lifecycle(id, 'class_ended');
      // Drop it locally so the modal closes immediately rather than waiting
      // for the next poll.
      setRows((s) => s.filter((r) => r.id !== id));
      setMsg('');
    } catch (e) { setMsg(e.message); }
    finally { setBusy(null); }
  };

  const visible = rows.filter((r) => !dismissed.has(r.id));
  if (!visible.length) return null;

  return (
    <Dialog open maxWidth="sm" fullWidth onClose={() => {}}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <WarningAmberIcon sx={{ color: '#f59e0b' }} />
        <span style={{ fontSize: 17 }}>
          {visible.length === 1 ? 'A class is still open' : `${visible.length} classes are still open`}
        </span>
      </DialogTitle>
      <DialogContent>
        {msg && <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setMsg('')}>{msg}</Alert>}
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>
          Attendance stays open and the module can’t complete until the class is ended.
        </div>
        <Box sx={{ display: 'grid', gap: 1 }}>
          {visible.map((r) => (
            <Box
              key={r.id}
              sx={{
                border: '1px solid #fde68a', background: '#fffbeb', borderRadius: 1.5,
                p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
              }}
            >
              <Box sx={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{r.title}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {[r.batch_name, r.module_name].filter(Boolean).join(' · ')}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#b45309', marginTop: 3 }}>
                  {overdueLabel(r.overdue_seconds)}
                </div>
              </Box>
              <Button
                size="small"
                variant="contained"
                color="warning"
                disabled={busy === r.id}
                onClick={() => endClass(r.id)}
                sx={{ textTransform: 'none' }}
              >
                {busy === r.id ? 'Ending…' : 'End class'}
              </Button>
              <Button
                size="small"
                onClick={() => setDismissed((s) => new Set(s).add(r.id))}
                sx={{ textTransform: 'none', color: '#94a3b8' }}
              >
                Later
              </Button>
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => setDismissed((s) => { const n = new Set(s); visible.forEach((r) => n.add(r.id)); return n; })}
          sx={{ textTransform: 'none', color: '#64748b' }}
        >
          Remind me later
        </Button>
      </DialogActions>
    </Dialog>
  );
}
