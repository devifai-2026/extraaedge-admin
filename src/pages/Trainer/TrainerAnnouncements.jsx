// Trainer Announcements — post to a course + read the thread (comments, likes).
// Recording uploads auto-post here too (auto_source='recording').
import { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, MenuItem, TextField, Button, Alert, Snackbar, Collapse, Divider,
} from '@mui/material';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbUpOffAltIcon from '@mui/icons-material/ThumbUpOffAlt';
import ChatBubbleOutlineIcon from '@mui/icons-material/CommentOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import { PageHeader, Card, EmptyState, Badge } from '../../lib/lmsUi';
import { coursesApi, communityApi } from '../../lib/endpoints';

const fmt = (v) => { try { return new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

export default function TrainerAnnouncements() {
  const [courses, setCourses] = useState([]);
  const [programId, setProgramId] = useState('');
  const [feed, setFeed] = useState([]);
  const [body, setBody] = useState('');
  const [title, setTitle] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => { coursesApi.list().then((r) => setCourses(r?.data || [])).catch(() => {}); }, []);
  const load = useCallback(() => { if (programId) communityApi.listAnnouncements(programId).then((r) => setFeed(r?.data || [])).catch((e) => setToast({ severity: 'error', text: e.message })); }, [programId]);
  useEffect(() => { load(); }, [load]);

  const post = async () => {
    if (!body.trim() || !programId) return;
    try { await communityApi.postAnnouncement({ program_id: programId, title: title.trim() || null, body: body.trim() }); setBody(''); setTitle(''); load(); setToast({ severity: 'success', text: 'Posted' }); }
    catch (e) { setToast({ severity: 'error', text: e.message }); }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <PageHeader
        title="Announcements"
        subtitle="Post updates to your course. Students can comment and like."
        icon={CampaignOutlinedIcon}
        right={(
          <TextField select size="small" label="Course" value={programId} onChange={(e) => setProgramId(e.target.value)} sx={{ minWidth: 240, background: '#fff' }}>
            {courses.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>
        )}
      />

      {!programId && <Card><EmptyState icon="📣" title="Pick a course" text="Choose a course above to post an announcement and read the thread." /></Card>}
      {programId && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <TextField size="small" fullWidth label="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} sx={{ mb: 1 }} />
            <TextField size="small" fullWidth multiline minRows={2} label="Write an announcement…" value={body} onChange={(e) => setBody(e.target.value)} />
            <Box sx={{ mt: 1.5, textAlign: 'right' }}>
              <Button variant="contained" onClick={post} disabled={!body.trim()} sx={{ textTransform: 'none', bgcolor: '#E53935' }}>Post</Button>
            </Box>
          </Card>

          <AnnouncementFeed feed={feed} api={communityApi} onChange={load} isTrainer />
        </>
      )}

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)}>{toast.text}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}

// Shared feed renderer. `api` must expose like(id), comment(id,{body}),
// listComments(id) — the trainer (communityApi) and student (studentApi) both
// provide these with matching shapes.
export function AnnouncementFeed({ feed, api, onChange }) {
  if (!feed || feed.length === 0) {
    return <Card><EmptyState icon="📣" title="No announcements yet" text="Post an update above — students see it instantly and can comment or like." /></Card>;
  }
  return (
    <Box sx={{ display: 'grid', gap: 12 }}>
      {feed.map((a) => <AnnouncementCard key={a.id} a={a} api={api} onChange={onChange} />)}
    </Box>
  );
}

function AnnouncementCard({ a, api, onChange }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState(null);
  const [text, setText] = useState('');
  const [likeState, setLikeState] = useState({ liked: a.liked_by_me, count: a.like_count });

  const toggleComments = async () => {
    const next = !open; setOpen(next);
    if (next && comments === null) {
      try { const r = (api.listComments ? await api.listComments(a.id) : await api.announcementComments(a.id)); setComments(r?.data || []); } catch { setComments([]); }
    }
  };
  const like = async () => {
    try {
      const r = (api.like ? await api.like(a.id) : await api.announcementLike(a.id));
      const liked = (r?.data ?? r)?.liked;
      setLikeState((s) => ({ liked, count: s.count + (liked ? 1 : -1) }));
    } catch { /* ignore */ }
  };
  const addComment = async () => {
    if (!text.trim()) return;
    try {
      (api.comment ? await api.comment(a.id, { body: text.trim() }) : await api.announcementComment(a.id, { body: text.trim() }));
      setText('');
      const r = (api.listComments ? await api.listComments(a.id) : await api.announcementComments(a.id)); setComments(r?.data || []);
      onChange?.();
    } catch { /* ignore */ }
  };

  return (
    <Card>
      {a.auto_source === 'recording' && <div style={{ marginBottom: 6 }}><Badge tone="info">📹 Recording</Badge></div>}
      {a.title && <Typography sx={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>{a.title}</Typography>}
      <Typography sx={{ fontSize: 14, color: '#334155', whiteSpace: 'pre-wrap' }}>{a.body}</Typography>
      <Typography sx={{ fontSize: 11.5, color: '#94a3b8', mt: 0.5 }}>{a.author_name || 'System'} · {fmt(a.created_at)}</Typography>
      <Box sx={{ display: 'flex', gap: 2, mt: 1, alignItems: 'center' }}>
        <Button size="small" startIcon={likeState.liked ? <ThumbUpIcon fontSize="small" /> : <ThumbUpOffAltIcon fontSize="small" />} onClick={like} sx={{ textTransform: 'none', color: likeState.liked ? '#E53935' : '#64748b' }}>{likeState.count}</Button>
        <Button size="small" startIcon={<ChatBubbleOutlineIcon fontSize="small" />} onClick={toggleComments} sx={{ textTransform: 'none', color: '#64748b' }}>{a.comment_count} comments</Button>
      </Box>
      <Collapse in={open}>
        <Divider sx={{ my: 1 }} />
        {(comments || []).map((c) => (
          <Box key={c.id} sx={{ mb: 1 }}>
            <Typography sx={{ fontSize: 13 }}><b>{c.author_name || 'User'}:</b> {c.body}</Typography>
          </Box>
        ))}
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <TextField size="small" fullWidth placeholder="Write a comment…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addComment(); }} />
          <Button size="small" onClick={addComment} sx={{ textTransform: 'none' }}>Send</Button>
        </Box>
      </Collapse>
    </Card>
  );
}
