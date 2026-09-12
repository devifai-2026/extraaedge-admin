// Trainer Materials — upload study files (presign → PUT to GCS → confirm →
// record) or add external links, optionally scoped to a module. Students see
// them in their Materials library.
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box, MenuItem, TextField, Button, Alert, Snackbar, LinearProgress, IconButton,
  ToggleButton, ToggleButtonGroup, CircularProgress,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import FolderIcon from '@mui/icons-material/FolderOutlined';
import { coursesApi, learningApi, uploadsApi } from '../../lib/endpoints';
import { PageHeader, Card, EmptyState, Badge } from '../../lib/lmsUi';

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

export default function TrainerMaterials() {
  const [courses, setCourses] = useState([]);
  const [programId, setProgramId] = useState('');
  const [modules, setModules] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [kind, setKind] = useState('file');
  const [form, setForm] = useState({ title: '', description: '', module_id: '', url: '' });
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);

  // Auto-select the first course so the page opens WITH data rather than a
  // blank "pick a course" panel — a trainer almost always wants the course
  // they teach, and an empty screen reads as "nothing here".
  useEffect(() => {
    coursesApi.list()
      .then((r) => {
        const list = r?.data || [];
        setCourses(list);
        setProgramId((cur) => cur || list[0]?.id || '');
      })
      .catch(() => {});
  }, []);
  const load = useCallback(() => {
    if (!programId) return;
    coursesApi.listModules(programId).then((r) => setModules(r?.data || [])).catch(() => {});
    learningApi.listMaterials(programId).then((r) => setMaterials(r?.data || [])).catch((e) => setToast({ severity: 'error', text: e.message }));
  }, [programId]);
  useEffect(() => { load(); }, [load]);

  const reset = () => setForm({ title: '', description: '', module_id: '', url: '' });

  const addLink = async () => {
    if (!form.title.trim() || !form.url.trim()) { setToast({ severity: 'error', text: 'Title and link URL are required.' }); return; }
    setBusy(true);
    try {
      await learningApi.createMaterial({ program_id: programId, module_id: form.module_id || null, title: form.title.trim(), description: form.description || null, kind: 'link', url: form.url.trim() });
      setToast({ severity: 'success', text: 'Link added' }); reset(); load();
    } catch (e) { setToast({ severity: 'error', text: e.message }); } finally { setBusy(false); }
  };

  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!form.title.trim()) { setToast({ severity: 'error', text: 'Enter a title first, then pick the file.' }); return; }
    setBusy(true); setPct(0);
    try {
      const pre = await uploadsApi.presign({ purpose: 'material', content_type: file.type || 'application/octet-stream', size_bytes: file.size, filename: file.name });
      const { upload_url, method, headers, r2_key } = pre?.data ?? pre;
      await putWithProgress(upload_url, method || 'PUT', headers || { 'Content-Type': file.type }, file, setPct);
      await uploadsApi.confirm({ purpose: 'material', r2_key, visibility: 'private' });
      await learningApi.createMaterial({ program_id: programId, module_id: form.module_id || null, title: form.title.trim(), description: form.description || null, kind: 'file', r2_key, file_name: file.name, content_type: file.type || null, size_bytes: file.size });
      setToast({ severity: 'success', text: 'Material uploaded' }); reset(); load();
    } catch (err) { setToast({ severity: 'error', text: err.message || 'Upload failed' }); } finally { setBusy(false); setPct(0); }
  };

  const remove = async (id) => {
    try { await learningApi.deleteMaterial(id); load(); }
    catch (e) { setToast({ severity: 'error', text: e.message }); }
  };
  const open = async (id) => {
    try { const r = await learningApi.materialUrl(id); const u = (r?.data ?? r)?.url; if (u) window.open(u, '_blank', 'noreferrer'); }
    catch (e) { setToast({ severity: 'error', text: e.message }); }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <PageHeader
        title="Study Materials"
        subtitle="Share slides, notes and resources with your students — by module or course-wide."
        icon={FolderIcon}
        right={(
          <TextField select size="small" label="Course" value={programId} onChange={(e) => setProgramId(e.target.value)} sx={{ minWidth: 240, background: '#fff' }}>
            {courses.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>
        )}
      />

      {!programId && <Card><EmptyState icon="📚" title="Pick a course" text="Choose a course above to manage its study materials." /></Card>}

      {programId && (
        <>
          <Card title="Add material" style={{ marginBottom: 16 }}>
            <ToggleButtonGroup size="small" exclusive value={kind} onChange={(_, v) => v && setKind(v)} sx={{ mb: 2 }}>
              <ToggleButton value="file" sx={{ textTransform: 'none' }}>Upload file</ToggleButton>
              <ToggleButton value="link" sx={{ textTransform: 'none' }}>Add link</ToggleButton>
            </ToggleButtonGroup>
            <Box sx={{ display: 'grid', gap: 1.5 }}>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <TextField size="small" label="Title" value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} sx={{ flex: 1, minWidth: 220 }} />
                <TextField select size="small" label="Module (optional)" value={form.module_id} onChange={(e) => setForm((s) => ({ ...s, module_id: e.target.value }))} sx={{ minWidth: 220 }}>
                  <MenuItem value="">Course-wide</MenuItem>
                  {modules.map((m) => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
                </TextField>
              </Box>
              <TextField size="small" label="Description (optional)" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
              {kind === 'link' ? (
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  <TextField size="small" label="Link URL" placeholder="https://…" value={form.url} onChange={(e) => setForm((s) => ({ ...s, url: e.target.value }))} sx={{ flex: 1, minWidth: 240 }} />
                  <Button variant="contained" onClick={addLink} disabled={busy} sx={{ textTransform: 'none', bgcolor: '#E53935' }}>Add link</Button>
                </Box>
              ) : (
                <Box>
                  <input ref={fileRef} type="file" hidden onChange={onPickFile} />
                  <Button variant="contained" startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />} disabled={busy}
                    onClick={() => fileRef.current?.click()} sx={{ textTransform: 'none', bgcolor: '#E53935', '&:hover': { bgcolor: '#c62828' } }}>
                    {busy ? `Uploading… ${pct}%` : 'Choose file & upload'}
                  </Button>
                  {busy && <LinearProgress variant="determinate" value={pct} sx={{ mt: 1.5, borderRadius: 1 }} />}
                </Box>
              )}
            </Box>
          </Card>

          {materials.length === 0 ? (
            <Card><EmptyState icon="📚" title="No materials yet" text="Upload a file or add a link above — it appears instantly in students' Materials library." /></Card>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {materials.map((m) => (
                <Card key={m.id} pad={14} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{m.title}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{m.module_name || 'Course-wide'}{m.uploaded_by_name ? ` · ${m.uploaded_by_name}` : ''}</div>
                  </div>
                  <Badge tone={m.kind === 'link' ? 'info' : 'warning'}>{m.kind === 'link' ? 'Link' : 'File'}</Badge>
                  <Button size="small" onClick={() => open(m.id)} sx={{ textTransform: 'none' }}>Open</Button>
                  <IconButton size="small" onClick={() => remove(m.id)}><DeleteOutlineIcon fontSize="small" /></IconButton>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)}>{toast.text}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
