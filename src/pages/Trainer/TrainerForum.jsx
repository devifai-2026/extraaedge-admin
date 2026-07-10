// Trainer Forum — student doubts on the trainer's course(s). Open a thread to
// read and reply; a reply marks it answered and notifies the student.
import { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, MenuItem, TextField, Button, Chip, Collapse, Divider,
} from '@mui/material';
import { coursesApi, forumApi } from '../../lib/endpoints';

const fmt = (v) => { try { return new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

export default function TrainerForum() {
  const [courses, setCourses] = useState([]);
  const [programId, setProgramId] = useState('');
  const [threads, setThreads] = useState([]);

  useEffect(() => { coursesApi.list().then((r) => setCourses(r?.data || [])).catch(() => {}); }, []);
  const load = useCallback(() => { if (programId) forumApi.listThreads(programId).then((r) => setThreads(r?.data || [])).catch(() => {}); }, [programId]);
  useEffect(() => { load(); }, [load]);

  return (
    <Box sx={{ p: 3, maxWidth: 820, mx: 'auto' }}>
      <Typography variant="h6" sx={{ mb: 0.5 }}>Student Forum</Typography>
      <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>Answer student doubts. Replying marks the thread answered and notifies the student.</Typography>
      <TextField select size="small" label="Course" value={programId} onChange={(e) => setProgramId(e.target.value)} sx={{ minWidth: 240, mb: 2 }}>
        {courses.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
      </TextField>

      <Box sx={{ display: 'grid', gap: 12 }}>
        {programId && threads.length === 0 && <Typography sx={{ color: '#94a3b8', fontSize: 14 }}>No questions yet.</Typography>}
        {threads.map((t) => <ThreadCard key={t.id} t={t} api={forumApi} canReply onChange={load} />)}
      </Box>
    </Box>
  );
}

// Shared thread card. `api` exposes replies(id) + reply(id,{body}) — trainer
// (forumApi) and student (studentApi adapter) both provide these.
export function ThreadCard({ t, api, canReply, onChange }) {
  const [open, setOpen] = useState(false);
  const [replies, setReplies] = useState(null);
  const [text, setText] = useState('');

  const toggle = async () => {
    const next = !open; setOpen(next);
    if (next && replies === null) {
      try { const r = (api.replies ? await api.replies(t.id) : await api.forumReplies(t.id)); setReplies(r?.data || []); } catch { setReplies([]); }
    }
  };
  const send = async () => {
    if (!text.trim()) return;
    try {
      (api.reply ? await api.reply(t.id, { body: text.trim() }) : await api.forumReply(t.id, { body: text.trim() }));
      setText('');
      const r = (api.replies ? await api.replies(t.id) : await api.forumReplies(t.id)); setReplies(r?.data || []);
      onChange?.();
    } catch { /* ignore */ }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'flex-start' }}>
        <Typography sx={{ fontWeight: 700, color: '#0f172a' }}>{t.title}</Typography>
        <Chip size="small" label={t.status} color={t.status === 'answered' ? 'success' : 'default'} variant={t.status === 'answered' ? 'filled' : 'outlined'} />
      </Box>
      <Typography sx={{ fontSize: 14, color: '#334155', whiteSpace: 'pre-wrap', mt: 0.5 }}>{t.body}</Typography>
      <Typography sx={{ fontSize: 11, color: '#94a3b8', mt: 0.5 }}>{t.student_name} · {fmt(t.created_at)}</Typography>
      <Button size="small" onClick={toggle} sx={{ textTransform: 'none', mt: 0.5 }}>{open ? 'Hide' : `${t.reply_count} replies`}</Button>
      <Collapse in={open}>
        <Divider sx={{ my: 1 }} />
        {(replies || []).map((r) => (
          <Box key={r.id} sx={{ mb: 1 }}>
            <Typography sx={{ fontSize: 13 }}><b style={{ color: r.author_kind === 'user' ? '#E53935' : '#0f172a' }}>{r.author_name}{r.author_kind === 'user' ? ' (trainer)' : ''}:</b> {r.body}</Typography>
          </Box>
        ))}
        {canReply && (
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <TextField size="small" fullWidth placeholder="Write a reply…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} />
            <Button size="small" onClick={send} sx={{ textTransform: 'none' }}>Reply</Button>
          </Box>
        )}
      </Collapse>
    </Paper>
  );
}
