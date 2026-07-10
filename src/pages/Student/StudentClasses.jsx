// Student Classes — the student's schedule (join link, mode, pre-notify
// absence) plus the LIVE attendance MCQ: when a trainer fires a question it
// appears here with a countdown; the student must answer every fired question
// (within its window) to be marked present. We poll for open questions every
// few seconds while a class is live (robust across the separate student socket).
import { useEffect, useState, useCallback, useRef } from 'react';
import { studentApi } from '../../lib/studentApi';

const fmt = (v) => { try { return new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return '—'; } };

export default function StudentClasses() {
  const [classes, setClasses] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null); // class we're answering questions for
  const [questions, setQuestions] = useState([]);
  const [toast, setToast] = useState('');
  const pollRef = useRef(null);

  const load = useCallback(() => {
    studentApi.myClasses().then((r) => setClasses(r?.data || [])).catch((e) => setErr(e.message)).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  // Poll open questions for the "active" class.
  const pollQuestions = useCallback((classId) => {
    studentApi.openQuestions(classId).then((r) => setQuestions(r?.data || [])).catch(() => {});
  }, []);
  useEffect(() => {
    if (!active) { if (pollRef.current) clearInterval(pollRef.current); return; }
    pollQuestions(active.id);
    pollRef.current = setInterval(() => pollQuestions(active.id), 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [active, pollQuestions]);

  const answer = async (classId, questionId, optionIndex) => {
    try { await studentApi.answer(classId, { question_id: questionId, option_index: optionIndex }); setToast('Answer submitted'); pollQuestions(classId); }
    catch (e) { setToast(e.message); }
  };
  const preNotify = async (classId) => {
    try { await studentApi.preNotifyAbsence(classId); setToast('Marked as absent for this class'); load(); }
    catch (e) { setToast(e.message); }
  };
  const setJoin = async (classId, mode) => {
    try { await studentApi.setJoinMode(classId, mode); setToast(`Joining ${mode}`); }
    catch (e) { setToast(e.message); }
  };

  if (loading) return <p style={{ color: '#94a3b8' }}>Loading classes…</p>;
  if (err) return <div style={alertErr}>{err}</div>;

  return (
    <div>
      <h2 style={{ fontSize: 20, margin: '0 0 12px', color: '#0f172a' }}>My Classes</h2>
      {classes.length === 0 && <div style={{ color: '#94a3b8' }}>No classes scheduled yet.</div>}
      <div style={{ display: 'grid', gap: 12 }}>
        {classes.map((c) => {
          const live = c.started_at && !c.ended_at;
          return (
            <div key={c.id} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{c.title}{c.kind === 'mock_test' ? ' · Mock test' : ''}</div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>{c.module_name ? `${c.module_name} · ` : ''}{fmt(c.starts_at)} · {c.mode}</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    Status: <b style={{ color: c.my_status === 'present' ? '#15803d' : '#b45309' }}>{c.my_status}</b>
                    {c.pre_notified_absent ? ' (you notified absence)' : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {live && <span style={badgeLive}>LIVE</span>}
                  {c.meeting_url && <a href={c.meeting_url} target="_blank" rel="noreferrer" style={btnPrimary}>Join {c.mode}</a>}
                  {c.mode === 'online' && <button onClick={() => setJoin(c.id, 'online')} style={btn}>I'm online</button>}
                  {c.mode === 'offline' && <button onClick={() => setJoin(c.id, 'offline')} style={btn}>I'm in class</button>}
                  {live && <button onClick={() => setActive(active?.id === c.id ? null : c)} style={btn}>{active?.id === c.id ? 'Hide questions' : 'Attendance questions'}</button>}
                  {!c.ended_at && !c.pre_notified_absent && <button onClick={() => preNotify(c.id)} style={btnGhost}>Can't attend</button>}
                </div>
              </div>

              {active?.id === c.id && (
                <div style={{ marginTop: 12, borderTop: '1px solid #eef2f7', paddingTop: 12 }}>
                  {questions.length === 0
                    ? <div style={{ fontSize: 13, color: '#94a3b8' }}>No open questions right now. Keep this open — new questions appear automatically.</div>
                    : questions.map((q) => (
                      <div key={q.id} style={{ marginBottom: 12 }}>
                        <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>
                          {q.question} {q.answered && <span style={{ color: '#15803d', fontSize: 12 }}>✓ answered</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {(q.options || []).map((opt, i) => (
                            <button key={i} disabled={q.answered} onClick={() => answer(c.id, q.id, i)}
                              style={{ ...optBtn, opacity: q.answered ? 0.5 : 1, cursor: q.answered ? 'default' : 'pointer' }}>{opt}</button>
                          ))}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Closes {fmt(q.closes_at)}</div>
                      </div>
                    ))}
                  <div style={{ fontSize: 11, color: '#b45309' }}>Answer every question fired in this class to be marked present.</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {toast && <div style={toastBox} onClick={() => setToast('')}>{toast}</div>}
    </div>
  );
}

const card = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 };
const btn = { border: '1px solid #cbd5e1', background: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 13, cursor: 'pointer', color: '#475569' };
const btnGhost = { ...btn, color: '#b45309', borderColor: '#fcd34d' };
const btnPrimary = { background: '#E53935', color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600 };
const optBtn = { border: '1px solid #cbd5e1', background: '#f8fafc', borderRadius: 8, padding: '8px 14px', fontSize: 13 };
const badgeLive = { background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: 11, padding: '4px 8px', borderRadius: 6, alignSelf: 'center' };
const alertErr = { background: '#fef2f2', color: '#b91c1c', padding: '8px 12px', borderRadius: 8, fontSize: 13 };
const toastBox = { position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: '#0f172a', color: '#fff', padding: '10px 18px', borderRadius: 8, fontSize: 13, cursor: 'pointer', zIndex: 50 };
