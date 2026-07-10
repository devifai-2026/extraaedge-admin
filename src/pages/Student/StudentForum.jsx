// Student Forum — ask a doubt (optionally @mentioning course trainers, who get
// notified) and follow the thread. Reuses the shared ThreadCard.
import { useEffect, useState, useCallback } from 'react';
import { studentApi } from '../../lib/studentApi';
import { ThreadCard } from '../Trainer/TrainerForum';

export default function StudentForum() {
  const [threads, setThreads] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [mentions, setMentions] = useState([]);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    studentApi.forumThreads().then((r) => setThreads(r?.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    load();
    studentApi.forumTrainers().then((r) => setTrainers(r?.data || [])).catch(() => {});
  }, [load]);

  const toggleMention = (uid) => setMentions((m) => (m.includes(uid) ? m.filter((x) => x !== uid) : [...m, uid]));

  const ask = async () => {
    if (!title.trim() || !body.trim()) { setToast('Add a title and your question'); return; }
    try {
      await studentApi.forumCreate({ title: title.trim(), body: body.trim(), mentions });
      setTitle(''); setBody(''); setMentions([]); setToast('Posted — your trainers have been notified'); load();
    } catch (e) { setToast(e.message); }
  };

  // Adapter for ThreadCard (student endpoints).
  const api = { replies: (id) => studentApi.forumReplies(id), reply: (id, b) => studentApi.forumReply(id, b) };

  return (
    <div>
      <h2 style={{ fontSize: 20, margin: '0 0 12px', color: '#0f172a' }}>Ask your trainers</h2>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Question title" style={inp} />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Describe your doubt…" rows={3} style={{ ...inp, resize: 'vertical' }} />
        {trainers.length > 0 && (
          <div style={{ margin: '8px 0' }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Mention trainers (optional):</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {trainers.map((t) => (
                <button key={t.user_id} onClick={() => toggleMention(t.user_id)} style={{ ...chip, ...(mentions.includes(t.user_id) ? chipOn : {}) }}>
                  @{t.name}{t.role === 'head' ? ' (head)' : ''}
                </button>
              ))}
            </div>
          </div>
        )}
        <div style={{ textAlign: 'right', marginTop: 8 }}>
          <button onClick={ask} style={btn}>Post question</button>
        </div>
      </div>

      {loading ? <p style={{ color: '#94a3b8' }}>Loading…</p> : (
        <div style={{ display: 'grid', gap: 12 }}>
          {threads.length === 0 && <div style={{ color: '#94a3b8' }}>No questions yet — ask your first above.</div>}
          {threads.map((t) => <ThreadCard key={t.id} t={t} api={api} canReply onChange={load} />)}
        </div>
      )}

      {toast && <div style={toastBox} onClick={() => setToast('')}>{toast}</div>}
    </div>
  );
}

const inp = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, marginBottom: 8, fontFamily: 'inherit' };
const chip = { border: '1px solid #cbd5e1', background: '#f8fafc', borderRadius: 999, padding: '4px 12px', fontSize: 12, cursor: 'pointer', color: '#475569' };
const chipOn = { background: '#E53935', color: '#fff', borderColor: '#E53935' };
const btn = { background: '#E53935', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const toastBox = { position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: '#0f172a', color: '#fff', padding: '10px 18px', borderRadius: 8, fontSize: 13, cursor: 'pointer', zIndex: 50 };
