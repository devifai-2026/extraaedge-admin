// Student Projects — see assigned projects (brief, deadline, marking scheme),
// submit a live URL + GitHub URL, and view marks + feedback once graded.
import { useEffect, useState, useCallback } from 'react';
import { studentApi } from '../../lib/studentApi';
import { PageHeader } from '../../lib/lmsUi';
import AssignmentIcon from '@mui/icons-material/AssignmentOutlined';

const fmt = (v) => { try { return new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

export default function StudentProjects() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const load = useCallback(() => { studentApi.projects().then((r) => setRows(r?.data || [])).catch(() => {}).finally(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <p style={{ color: '#94a3b8' }}>Loading projects…</p>;
  return (
    <div>
      <PageHeader title="Projects" subtitle="Submit your work and track grades." icon={AssignmentIcon} />
      {rows.length === 0 ? <div style={{ color: '#94a3b8' }}>No projects yet.</div> : (
        <div style={{ display: 'grid', gap: 12 }}>
          {rows.map((p) => <ProjectCard key={p.id} p={p} onSubmitted={() => { setToast('Submitted'); load(); }} onError={setToast} />)}
        </div>
      )}
      {toast && <div style={toastBox} onClick={() => setToast('')}>{toast}</div>}
    </div>
  );
}

function ProjectCard({ p, onSubmitted, onError }) {
  const [live, setLive] = useState(p.live_url || '');
  const [gh, setGh] = useState(p.github_url || '');
  const [notes, setNotes] = useState(p.notes || '');
  const [busy, setBusy] = useState(false);
  const overdue = p.deadline && new Date() > new Date(p.deadline);
  const graded = p.marks != null;

  const submit = async () => {
    if (!live && !gh) { onError('Add a live URL or a GitHub URL'); return; }
    setBusy(true);
    try { await studentApi.submitProject(p.id, { live_url: live || null, github_url: gh || null, notes: notes || null }); onSubmitted(); }
    catch (e) { onError(e.message); } finally { setBusy(false); }
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 700, color: '#0f172a' }}>{p.title} <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 400 }}>· max {p.max_marks}</span></div>
        <div style={{ fontSize: 12, color: overdue ? '#b91c1c' : '#64748b' }}>{p.deadline ? `Due ${fmt(p.deadline)}` : 'No deadline'}</div>
      </div>
      {p.brief && <div style={{ fontSize: 14, color: '#334155', marginTop: 6, whiteSpace: 'pre-wrap' }}>{p.brief}</div>}
      {p.marking_scheme && <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}><b>Marking:</b> {p.marking_scheme}</div>}

      {graded ? (
        <div style={{ marginTop: 10, background: '#f0fdf4', borderRadius: 8, padding: 10 }}>
          <div style={{ fontWeight: 700, color: '#15803d' }}>Graded: {p.marks}/{p.max_marks}</div>
          {p.feedback && <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>{p.feedback}</div>}
        </div>
      ) : (
        <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
          <input value={live} onChange={(e) => setLive(e.target.value)} placeholder="Live URL (https://…)" style={inp} disabled={overdue} />
          <input value={gh} onChange={(e) => setGh(e.target.value)} placeholder="GitHub URL" style={inp} disabled={overdue} />
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" style={inp} disabled={overdue} />
          {overdue ? <div style={{ color: '#b91c1c', fontSize: 13 }}>The deadline has passed.</div> : (
            <div style={{ textAlign: 'right' }}><button onClick={submit} disabled={busy} style={btn}>{p.submitted_at ? 'Update submission' : 'Submit'}</button></div>
          )}
        </div>
      )}
    </div>
  );
}

const inp = { width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 };
const btn = { background: '#E53935', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const toastBox = { position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: '#0f172a', color: '#fff', padding: '10px 18px', borderRadius: 8, fontSize: 13, cursor: 'pointer', zIndex: 50 };
