// Trainer Recordings — upload a class recording (presign → PUT to GCS →
// confirm → attach to the class, which auto-posts an announcement). A banner
// lists ended classes still MISSING a recording (the "don't forget" prompt).
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box, Alert, Snackbar, CircularProgress, Button, MenuItem, TextField, LinearProgress, Chip,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import VideoLibraryOutlinedIcon from '@mui/icons-material/VideoLibraryOutlined';
import { PageHeader, Card, EmptyState } from '../../lib/lmsUi';
import { coursesApi, classesApi, communityApi, uploadsApi } from '../../lib/endpoints';

export default function TrainerRecordings() {
  const [missed, setMissed] = useState([]);
  const [courses, setCourses] = useState([]);
  const [programId, setProgramId] = useState('');
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);

  const loadMissed = useCallback(() => { communityApi.missedRecordings().then((r) => setMissed(r?.data || [])).catch(() => {}); }, []);
  useEffect(() => { loadMissed(); coursesApi.list().then((r) => setCourses(r?.data || [])).catch(() => {}); }, [loadMissed]);
  useEffect(() => { if (programId) classesApi.list({ programId }).then((r) => setClasses(r?.data || [])).catch(() => {}); }, [programId]);

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !classId) { setToast({ severity: 'error', text: 'Pick a class first, then the video file.' }); return; }
    setBusy(true); setPct(0);
    try {
      const pre = await uploadsApi.presign({ purpose: 'recording', content_type: file.type || 'video/mp4', size_bytes: file.size, filename: file.name });
      const { upload_url, method, headers, r2_key } = pre?.data ?? pre;
      await putWithProgress(upload_url, method || 'PUT', headers || { 'Content-Type': file.type }, file, setPct);
      await uploadsApi.confirm({ purpose: 'recording', r2_key, visibility: 'private' });
      await communityApi.addRecording(classId, { r2_key, label: file.name });
      setToast({ severity: 'success', text: 'Recording uploaded — students notified via an announcement.' });
      loadMissed();
    } catch (err) {
      setToast({ severity: 'error', text: err.message || 'Upload failed' });
    } finally { setBusy(false); setPct(0); }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <PageHeader title="Recordings" subtitle="Upload class recordings — students get access based on their batch join settings." icon={VideoLibraryOutlinedIcon} />

      {missed.length > 0 && (
        <Card pad={16} style={{ background: '#fffbeb', border: '1px solid #fde68a', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 26, lineHeight: 1.2 }}>🎬</span>
            <div>
              <div style={{ fontWeight: 700, color: '#854d0e', fontSize: 13.5 }}>{missed.length} ended class{missed.length > 1 ? 'es' : ''} still need{missed.length > 1 ? '' : 's'} a recording</div>
              <div style={{ fontSize: 12.5, color: '#a16207', marginTop: 2 }}>{missed.slice(0, 5).map((m) => `${m.title} (${m.batch_name})`).join(', ')}{missed.length > 5 ? '…' : ''}</div>
            </div>
          </div>
        </Card>
      )}

      <Card title="Upload a recording">
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField select size="small" label="Course" value={programId} onChange={(e) => { setProgramId(e.target.value); setClassId(''); }} sx={{ minWidth: 220 }}>
            {courses.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Class" value={classId} onChange={(e) => setClassId(e.target.value)} sx={{ minWidth: 240 }} disabled={!programId}>
            {classes.map((c) => <MenuItem key={c.id} value={c.id}>{c.title} · {c.batch_name}</MenuItem>)}
          </TextField>
          <input ref={fileRef} type="file" accept="video/*" hidden onChange={onPick} />
          <Button variant="contained" startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />} disabled={busy || !classId}
            onClick={() => fileRef.current?.click()} sx={{ textTransform: 'none', bgcolor: '#E53935', '&:hover': { bgcolor: '#c62828' } }}>
            {busy ? `Uploading… ${pct}%` : 'Upload recording'}
          </Button>
        </Box>
        {busy && <LinearProgress variant="determinate" value={pct} sx={{ mt: 2, borderRadius: 1 }} />}
        {classId && <RecordingList classId={classId} key={classId} />}
      </Card>

      <Snackbar open={!!toast} autoHideDuration={5000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)}>{toast.text}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}

function RecordingList({ classId }) {
  const [rows, setRows] = useState([]);
  useEffect(() => { communityApi.listRecordings(classId).then((r) => setRows(r?.data || [])).catch(() => {}); }, [classId]);
  const open = async (id) => { try { const r = await communityApi.recordingUrl(id); const u = (r?.data ?? r)?.url; if (u) window.open(u, '_blank', 'noreferrer'); } catch { /* ignore */ } };
  if (rows.length === 0) return <div style={{ marginTop: 6 }}><EmptyState icon="🎬" title="No recordings for this class yet" text="Upload a video above — it will appear here and students get notified automatically." /></div>;
  return (
    <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
      {rows.map((r) => <Chip key={r.id} label={r.label || 'Recording'} onClick={() => open(r.id)} variant="outlined" clickable />)}
    </Box>
  );
}

// XHR upload with progress (fetch has no upload progress).
function putWithProgress(url, method, headers, file, onPct) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    Object.entries(headers || {}).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onPct(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(file);
  });
}
