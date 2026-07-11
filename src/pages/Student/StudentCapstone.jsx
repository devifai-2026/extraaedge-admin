// Student Capstone — the course's capstone project(s): read the brief, submit a
// live URL + GitHub repo, and see the grade + feedback once marked.
import { useEffect, useState } from 'react';
import { studentApi } from '../../lib/studentApi';
import { PageHeader, Card, EmptyState, Badge, Btn, Skeleton, Toast, ACCENT } from '../../lib/lmsUi';
import RocketIcon from '@mui/icons-material/RocketLaunchOutlined';

const fmtDate = (v) => { try { return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return ''; } };

export default function StudentCapstone() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [drafts, setDrafts] = useState({}); // capstoneId → { live_url, github_url }
  const [busy, setBusy] = useState('');

  const load = () => studentApi.capstones().then((r) => {
    const d = r?.data ?? r ?? [];
    setRows(d);
    setDrafts(Object.fromEntries(d.map((c) => [c.id, { live_url: c.live_url || '', github_url: c.github_url || '' }])));
  }).catch((e) => setToast(e.message)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const submit = async (c) => {
    const d = drafts[c.id] || {};
    if (!d.live_url?.trim() && !d.github_url?.trim()) { setToast('Add a live URL or GitHub link'); return; }
    setBusy(c.id);
    try { await studentApi.submitCapstone(c.id, { live_url: d.live_url?.trim() || null, github_url: d.github_url?.trim() || null }); setToast('Capstone submitted 🚀'); load(); }
    catch (e) { setToast(e.message); } finally { setBusy(''); }
  };
  const setDraft = (id, k, v) => setDrafts((s) => ({ ...s, [id]: { ...(s[id] || {}), [k]: v } }));

  return (
    <div>
      <PageHeader title="Capstone Project" subtitle="Your course's capstone — submit your work and track your grade." icon={RocketIcon} />
      {loading && <Card><Skeleton h={16} w="50%" /><div style={{ height: 8 }} /><Skeleton h={12} w="70%" /></Card>}
      {!loading && rows.length === 0 && (
        <Card><EmptyState icon="🚀" title="No capstone yet" text="Your trainer will assign a capstone project — it'll appear here to submit." /></Card>
      )}
      {!loading && rows.map((c) => {
        const graded = c.marks != null;
        const submitted = !!c.submission_id;
        return (
          <Card key={c.id} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>{c.title}</div>
              {graded ? <Badge tone="success">Graded {c.marks}/{c.max_marks}</Badge> : submitted ? <Badge tone="info">Submitted</Badge> : <Badge tone="warning">Not submitted</Badge>}
            </div>
            {c.deadline && <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 2 }}>Due {fmtDate(c.deadline)}</div>}
            {c.brief && <div style={{ fontSize: 13.5, color: '#475569', whiteSpace: 'pre-wrap', margin: '10px 0' }}>{c.brief}</div>}
            {c.marking_scheme && <div style={{ fontSize: 12.5, color: '#64748b', background: '#f8fafc', border: '1px solid #eef0f5', borderRadius: 10, padding: '8px 12px', marginBottom: 10 }}><b>Marking:</b> {c.marking_scheme}</div>}

            <div style={{ display: 'grid', gap: 10, maxWidth: 520 }}>
              <input style={inp} placeholder="Live/deployed URL (https://…)" value={drafts[c.id]?.live_url || ''} onChange={(e) => setDraft(c.id, 'live_url', e.target.value)} disabled={graded} />
              <input style={inp} placeholder="GitHub repository URL" value={drafts[c.id]?.github_url || ''} onChange={(e) => setDraft(c.id, 'github_url', e.target.value)} disabled={graded} />
              {!graded && <div><Btn onClick={() => submit(c)} disabled={busy === c.id}>{submitted ? 'Update submission' : 'Submit capstone'}</Btn></div>}
            </div>

            {graded && (
              <div style={{ marginTop: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontWeight: 700, color: '#15803d' }}>Scored {c.marks}/{c.max_marks}</div>
                {c.feedback && <div style={{ fontSize: 13, color: '#475569', marginTop: 4, fontStyle: 'italic' }}>“{c.feedback}”</div>}
              </div>
            )}
          </Card>
        );
      })}
      <Toast msg={toast} onClose={() => setToast('')} />
    </div>
  );
}

const inp = { width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 9, border: '1px solid #cbd5e1', fontSize: 14, fontFamily: 'inherit', outline: 'none' };
