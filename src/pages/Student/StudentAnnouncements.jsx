// Student Announcements — the course feed (incl. auto-posted recording
// notices); the student can comment + like. Reuses the shared AnnouncementFeed.
import { useEffect, useState, useCallback } from 'react';
import { Box } from '@mui/material';
import { studentApi } from '../../lib/studentApi';
import { AnnouncementFeed } from '../Trainer/TrainerAnnouncements';

export default function StudentAnnouncements() {
  const [feed, setFeed] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    studentApi.announcements().then((r) => setFeed(r?.data || [])).catch((e) => setErr(e.message)).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  // Adapter with the shape AnnouncementFeed expects (student endpoints).
  const api = {
    listComments: (id) => studentApi.announcementComments(id),
    comment: (id, body) => studentApi.announcementComment(id, body),
    like: (id) => studentApi.announcementLike(id),
  };

  return (
    <Box>
      <h2 style={{ fontSize: 20, margin: '0 0 12px', color: '#0f172a' }}>Announcements</h2>
      {err && <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{err}</div>}
      {loading ? <p style={{ color: '#94a3b8' }}>Loading…</p> : <AnnouncementFeed feed={feed} api={api} onChange={load} />}
    </Box>
  );
}
