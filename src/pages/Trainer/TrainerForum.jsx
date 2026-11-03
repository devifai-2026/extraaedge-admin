// Trainer Forum — student doubts on the trainer's course(s). Open a thread to
// read and reply; a reply marks it answered and notifies the student.
import { useEffect, useState, useCallback } from 'react';
import { Box, MenuItem, TextField, Collapse } from '@mui/material';
import ForumIcon from '@mui/icons-material/ForumOutlined';
import { forumApi } from '../../lib/endpoints';
import { useCourseScope, CoursePicker } from './CourseScope';
import { PageHeader, Card, Badge, Btn, EmptyState } from '../../lib/lmsUi';

const fmt = (v) => { try { return new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

export default function TrainerForum() {
  // Course comes from the shared trainer scope: picked once, kept in the URL
  // and localStorage, so it survives navigation instead of being re-chosen on
  // every page. Falls back to the first course so the page renders content
  // immediately rather than gating behind a dropdown.
  const { programId: scopedId, courses } = useCourseScope();
  const programId = scopedId || courses[0]?.id || '';
  const [threads, setThreads] = useState([]);
  const load = useCallback(() => { if (programId) forumApi.listThreads(programId).then((r) => setThreads(r?.data || [])).catch(() => {}); }, [programId]);
  useEffect(() => { load(); }, [load]);

  const open = threads.filter((t) => t.status !== 'answered').length;

  return (
    <Box sx={{ p: 3, maxWidth: 820, mx: 'auto' }}>
      <PageHeader
        title="Student Forum"
        subtitle="Answer student doubts. Replying marks the thread answered and notifies the student."
        icon={ForumIcon}
        right={(
          <>
            {programId && open > 0 && <Badge tone="warning">{open} awaiting reply</Badge>}
            <CoursePicker allowAll={false} width={240} />
          </>
        )}
      />

      {!programId && <Card><EmptyState icon="💬" title="Pick a course" text="Choose a course above to see the questions your students have raised." /></Card>}
      {programId && (threads.length === 0
        ? <Card><EmptyState icon="💬" title="No questions yet" text="When students post a doubt on this course, it will show up here for you to answer." /></Card>
        : (
          <Box sx={{ display: 'grid', gap: 12 }}>
            {threads.map((t) => <ThreadCard key={t.id} t={t} api={forumApi} canReply onChange={load} />)}
          </Box>
        ))}
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

  const answered = t.status === 'answered';
  return (
    <Card style={answered ? undefined : { borderLeft: '3px solid #d97706' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>{t.title}</div>
        <Badge tone={answered ? 'success' : 'warning'}>{answered ? 'Answered' : 'Open'}</Badge>
      </div>
      <div style={{ fontSize: 14, color: '#334155', whiteSpace: 'pre-wrap', marginTop: 4 }}>{t.body}</div>
      <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 6 }}>{t.student_name} · {fmt(t.created_at)}</div>
      <button onClick={toggle} style={{ marginTop: 8, border: 'none', background: 'none', color: '#E53935', fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0 }}>
        {open ? 'Hide replies' : `${t.reply_count} ${t.reply_count === 1 ? 'reply' : 'replies'}`}
      </button>
      <Collapse in={open}>
        <div style={{ borderTop: '1px solid #eef0f5', margin: '10px 0' }} />
        {(replies || []).map((r) => (
          <div key={r.id} style={{ marginBottom: 8, fontSize: 13.5, color: '#334155' }}>
            <b style={{ color: r.author_kind === 'user' ? '#E53935' : '#0f172a' }}>{r.author_name}{r.author_kind === 'user' ? ' (trainer)' : ''}:</b> {r.body}
          </div>
        ))}
        {(replies && replies.length === 0) && <div style={{ fontSize: 12.5, color: '#94a3b8', marginBottom: 8 }}>No replies yet — be the first to answer.</div>}
        {canReply && (
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <TextField size="small" fullWidth placeholder="Write a reply…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} />
            <Btn variant="primary" size="sm" onClick={send} disabled={!text.trim()}>Reply</Btn>
          </div>
        )}
      </Collapse>
    </Card>
  );
}
