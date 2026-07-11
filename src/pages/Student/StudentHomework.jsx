// Student Homework — short assignments to submit as a file (+ notes), distinct
// from Projects/Capstone. Upload reuses the student presign (note_attachment).
import { useEffect, useRef, useState } from 'react';
import { studentApi } from '../../lib/studentApi';
import { PageHeader, Card, EmptyState, Badge, Btn, Skeleton, Toast } from '../../lib/lmsUi';
import HomeworkIcon from '@mui/icons-material/HistoryEduOutlined';

const fmt = (v) => { if (!v) return null; try { return new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return null; } };

function putFile(url, method, headers, file) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method || 'PUT', url);
    Object.entries(headers || {}).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(file);
  });
}

export default function StudentHomework() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const load = () => studentApi.homework().then((r) => setRows(r?.data || [])).catch((e) => setToast(e.message)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  if (loading) return <div><PageHeader title="Homework" subtitle="Assignments to submit." icon={HomeworkIcon} /><Card><Skeleton h={16} w="50%" /></Card></div>;

  return (
    <div>
      <PageHeader title="Homework" subtitle="Submit your assignments as a file. Your trainer grades them." icon={HomeworkIcon} />
      {rows.length === 0 ? <Card><EmptyState icon="📚" title="No homework yet" text="Assignments from your trainer will show up here." /></Card> : (
        <div style={{ display: 'grid', gap: 12 }}>
          {rows.map((h) => <HwCard key={h.id} h={h} onDone={load} onToast={setToast} />)}
        </div>
      )}
      <Toast msg={toast} onClose={() => setToast('')} />
    </div>
  );
}

function HwCard({ h, onDone, onToast }) {
  const fileRef = useRef(null);
  const [notes, setNotes] = useState(h.notes || '');
  const [busy, setBusy] = useState(false);
  const graded = h.marks != null;
  const overdue = h.deadline && !h.submitted_at && new Date(h.deadline).getTime() < Date.now();

  const submit = async (file) => {
    setBusy(true);
    try {
      let fileKey = h.file_r2_key || null;
      if (file) {
        const pre = await studentApi.profilePresign({ kind: 'cv', content_type: file.type || 'application/octet-stream', size_bytes: file.size, filename: file.name });
        const d = pre?.data ?? pre;
        await putFile(d.upload_url, d.method, d.headers || { 'Content-Type': file.type }, file);
        fileKey = d.r2_key;
      }
      await studentApi.submitHomework(h.id, { file_r2_key: fileKey, notes: notes.trim() || null });
      onToast('Homework submitted ✓'); onDone();
    } catch (e) { onToast(e.message); } finally { setBusy(false); }
  };

  return (
    <Card style={{ borderLeft: graded ? '4px solid #16a34a' : (overdue ? '4px solid #dc2626' : '4px solid #e2e8f0') }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontWeight: 700, color: '#0f172a' }}>{h.title} <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 400 }}>· max {h.max_marks}</span></div>
          <div style={{ fontSize: 12.5, color: '#64748b' }}>{h.module_name ? `${h.module_name} · ` : ''}{h.deadline ? `Due ${fmt(h.deadline)}` : 'No deadline'}</div>
          {h.brief && <div style={{ fontSize: 13, color: '#475569', marginTop: 6, whiteSpace: 'pre-wrap' }}>{h.brief}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          {graded ? <Badge tone="success">Graded {h.marks}/{h.max_marks}</Badge>
            : h.submitted_at ? <Badge tone="info">Submitted</Badge>
              : overdue ? <Badge tone="danger">Overdue</Badge> : <Badge tone="warning">Pending</Badge>}
        </div>
      </div>

      {graded && h.feedback && <div style={{ fontSize: 13, color: '#475569', marginTop: 8, fontStyle: 'italic' }}>“{h.feedback}”</div>}

      {!graded && (
        <div style={{ marginTop: 12, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes for your trainer (optional)…" rows={2}
            style={{ width: '100%', boxSizing: 'border-box', borderRadius: 8, border: '1px solid #cbd5e1', padding: 8, fontSize: 13, fontFamily: 'inherit', marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input ref={fileRef} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) submit(f); }} />
            <Btn size="sm" variant="ghost" onClick={() => fileRef.current?.click()} disabled={busy}>{busy ? 'Uploading…' : (h.file_r2_key ? 'Replace file' : 'Upload file')}</Btn>
            <Btn size="sm" onClick={() => submit(null)} disabled={busy}>{h.submitted_at ? 'Update notes' : 'Submit'}</Btn>
            {h.file_r2_key && h.file_url && <a href={h.file_url} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: '#2563eb', fontWeight: 600 }}>Current file</a>}
          </div>
        </div>
      )}
    </Card>
  );
}
