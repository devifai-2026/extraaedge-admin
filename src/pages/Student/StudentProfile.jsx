// Student My Profile — editable photo, contact, links, skills/bio, and a CV
// upload (PDF/DOC → GCS). Read-back uses short-lived signed URLs for photo/CV.
import { useEffect, useRef, useState } from 'react';
import { studentApi } from '../../lib/studentApi';
import { PageHeader, Card, Skeleton } from '../../lib/lmsUi';
import { sanitizeDigits } from '../../lib/validators';
import AccountCircleIcon from '@mui/icons-material/AccountCircleOutlined';

// XHR upload with progress (fetch has no upload progress).
function putWithProgress(url, method, headers, file, onPct) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    Object.entries(headers || {}).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    if (onPct) xhr.upload.onprogress = (e) => { if (e.lengthComputable) onPct(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(file);
  });
}

export default function StudentProfile() {
  const [p, setP] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [uploading, setUploading] = useState(''); // 'photo' | 'cv' | ''
  const photoRef = useRef(null);
  const cvRef = useRef(null);

  const load = () => studentApi.getProfile().then((r) => {
    const data = r?.data ?? r; setP(data);
    setForm({
      phone: data.phone || '', dob: (data.dob || '').slice(0, 10), address: data.address || '',
      github_url: data.github_url || '', linkedin_url: data.linkedin_url || '', portfolio_url: data.portfolio_url || '',
      skills: data.skills || '', bio: data.bio || '',
    });
  }).catch((e) => setToast(e.message));
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try { await studentApi.updateProfile(form); setToast('Profile saved'); load(); }
    catch (e) { setToast(e.message); } finally { setSaving(false); }
  };

  const upload = async (kind, file) => {
    if (!file) return;
    setUploading(kind);
    try {
      const pre = (await studentApi.profilePresign({ kind, content_type: file.type || (kind === 'cv' ? 'application/pdf' : 'image/jpeg'), size_bytes: file.size, filename: file.name }));
      const d = pre?.data ?? pre;
      await putWithProgress(d.upload_url, d.method || 'PUT', d.headers || { 'Content-Type': file.type }, file);
      if (kind === 'photo') { await studentApi.updateProfile({ photo_r2_key: d.r2_key }); setToast('Photo updated'); }
      else { await studentApi.setCv({ r2_key: d.r2_key, filename: file.name }); setToast('CV uploaded'); }
      load();
    } catch (e) { setToast(e.message); } finally { setUploading(''); }
  };

  if (!p) return (
    <div style={{ maxWidth: 720 }}>
      <PageHeader title="My Profile" subtitle="Your details, links, skills and CV — keep them up to date." icon={AccountCircleIcon} />
      <Card><Skeleton h={16} w="40%" /><div style={{ height: 8 }} /><Skeleton h={12} w="70%" /></Card>
    </div>
  );

  return (
    <div style={{ maxWidth: 720 }}>
      <PageHeader title="My Profile" subtitle="Your details, links, skills and CV — keep them up to date." icon={AccountCircleIcon} />

      {/* Photo + identity */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: 96, height: 96, borderRadius: '50%', overflow: 'hidden', background: '#f1f5f9', border: '1px solid #e2e8f0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {p.photo_url ? <img src={p.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 28, fontWeight: 800, color: '#cbd5e1' }}>{(p.name || '?').slice(0, 1)}</span>}
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{p.name}</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>{p.email}</div>
            <input ref={photoRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; upload('photo', f); }} />
            <button onClick={() => photoRef.current?.click()} disabled={uploading === 'photo'} style={{ ...btnGhost, marginTop: 8 }}>
              {uploading === 'photo' ? 'Uploading…' : 'Change photo'}
            </button>
          </div>
        </div>
      </Card>

      {/* CV */}
      <Card title="CV / Resume" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {p.cv_url
            ? <a href={p.cv_url} target="_blank" rel="noreferrer" style={btnGhost}>📄 View current CV{p.cv_filename ? ` (${p.cv_filename})` : ''}</a>
            : <span style={{ fontSize: 13, color: '#94a3b8' }}>No CV uploaded yet.</span>}
          <input ref={cvRef} type="file" accept=".pdf,.doc,.docx,application/pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; upload('cv', f); }} />
          <button onClick={() => cvRef.current?.click()} disabled={uploading === 'cv'} style={btnPrimary}>
            {uploading === 'cv' ? 'Uploading…' : (p.cv_url ? 'Replace CV' : 'Upload CV')}
          </button>
        </div>
      </Card>

      {/* Editable details */}
      <Card title="Details" style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Phone" value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: sanitizeDigits(e.target.value) }))} />
          <Field label="Date of birth" type="date" value={form.dob} onChange={set('dob')} />
          <Field label="Address" value={form.address} onChange={set('address')} full />
          <Field label="GitHub" value={form.github_url} onChange={set('github_url')} placeholder="https://github.com/…" />
          <Field label="LinkedIn" value={form.linkedin_url} onChange={set('linkedin_url')} placeholder="https://linkedin.com/in/…" />
          <Field label="Portfolio" value={form.portfolio_url} onChange={set('portfolio_url')} placeholder="https://…" full />
          <Field label="Skills" value={form.skills} onChange={set('skills')} placeholder="React, Node, SQL…" full />
          <Field label="Bio" value={form.bio} onChange={set('bio')} full textarea />
        </div>
        <div style={{ marginTop: 14, textAlign: 'right' }}>
          <button onClick={save} disabled={saving} style={btnPrimary}>{saving ? 'Saving…' : 'Save profile'}</button>
        </div>
      </Card>

      {toast && <div style={toastBox} onClick={() => setToast('')}>{toast}</div>}
    </div>
  );
}

const Field = ({ label, value, onChange, type = 'text', placeholder, full, textarea }) => (
  <div style={full ? { gridColumn: '1 / -1' } : undefined}>
    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>{label}</div>
    {textarea
      ? <textarea value={value} onChange={onChange} placeholder={placeholder} rows={3} style={inp} />
      : <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={inp} />}
  </div>
);

const inp ={ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, fontFamily: 'inherit' };
const btnPrimary = { background: '#E53935', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const btnGhost = { border: '1px solid #cbd5e1', background: '#fff', color: '#475569', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' };
const toastBox = { position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: '#0f172a', color: '#fff', padding: '10px 18px', borderRadius: 8, fontSize: 13, cursor: 'pointer', zIndex: 50 };
