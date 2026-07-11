// Student Classes — schedule with join links + live attendance MCQ. Premium
// cards; live class highlighted; answer questions inline within the window.
import { useEffect, useState, useCallback, useRef } from 'react';
import { studentApi } from '../../lib/studentApi';
import { PageHeader, Card, EmptyState, Badge, Btn, Skeleton, useToast, ACCENT } from '../../lib/lmsUi';
import CalendarIcon from '@mui/icons-material/CalendarMonthOutlined';

const fmt = (v) => { try { return new Date(v).toLocaleString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

export default function StudentClasses() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [questions, setQuestions] = useState([]);
  const toast = useToast();
  const pollRef = useRef(null);

  const load = useCallback(() => studentApi.myClasses().then((r) => setClasses(r?.data || [])).catch((e) => toast.show(e.message)).finally(() => setLoading(false)), []); // eslint-disable-line
  useEffect(() => { load(); }, [load]);

  const pollQuestions = useCallback((id) => studentApi.openQuestions(id).then((r) => setQuestions(r?.data || [])).catch(() => {}), []);
  useEffect(() => {
    if (!active) { if (pollRef.current) clearInterval(pollRef.current); return; }
    pollQuestions(active.id);
    pollRef.current = setInterval(() => pollQuestions(active.id), 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [active, pollQuestions]);

  const answer = async (cid, qid, oi) => { try { await studentApi.answer(cid, { question_id: qid, option_index: oi }); toast.show('Answer submitted'); pollQuestions(cid); } catch (e) { toast.show(e.message); } };
  const preNotify = async (cid) => {
    const reason = window.prompt('Let your trainer know why you can’t attend (optional):', '');
    if (reason === null) return; // cancelled
    try { await studentApi.preNotifyAbsence(cid, reason.trim()); toast.show('Marked absent — your trainer will see the reason'); load(); } catch (e) { toast.show(e.message); }
  };
  const setJoin = async (cid, mode) => {
    let reason = '';
    if (mode === 'online') { const r = window.prompt('Attending online — add a note for your trainer (optional):', ''); if (r === null) return; reason = r.trim(); }
    try { await studentApi.setJoinMode(cid, mode, reason); toast.show(`Joining ${mode}`); } catch (e) { toast.show(e.message); }
  };

  const statusTone = (s) => (s === 'present' ? 'success' : s === 'absent' ? 'danger' : s === 'pending' ? 'warning' : 'neutral');

  return (
    <div>
      <PageHeader title="Classes" subtitle="Your schedule, join links and live attendance." icon={CalendarIcon} />
      {toast.node}

      {loading ? <Card><Skeleton h={16} w="50%" /><div style={{ height: 8 }} /><Skeleton h={12} w="70%" /></Card>
        : classes.length === 0 ? <Card><EmptyState icon="📅" title="No classes yet" text="Your class schedule will appear here once your trainer sets it up." /></Card>
        : (
          <div style={{ display: 'grid', gap: 12 }}>
            {classes.map((c) => {
              const live = c.started_at && !c.ended_at;
              return (
                <Card key={c.id} pad={16} style={live ? { border: `1px solid ${ACCENT}`, boxShadow: `0 6px 20px -12px ${ACCENT}` } : undefined}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{c.title}</span>
                        {c.kind === 'mock_test' && <Badge tone="info">Mock test</Badge>}
                        {live && <Badge tone="danger">● LIVE</Badge>}
                      </div>
                      <div style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>{c.module_name ? `${c.module_name} · ` : ''}{fmt(c.starts_at)} · {c.mode}</div>
                      <div style={{ marginTop: 6 }}><Badge tone={statusTone(c.my_status)}>{c.my_status}{c.pre_notified_absent ? ' · you notified' : ''}</Badge></div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                      {c.meeting_url && <Btn size="sm" href={c.meeting_url} target="_blank">Join {c.mode}</Btn>}
                      {c.mode === 'online' && <Btn size="sm" variant="ghost" onClick={() => setJoin(c.id, 'online')}>I'm online</Btn>}
                      {c.mode === 'offline' && <Btn size="sm" variant="ghost" onClick={() => setJoin(c.id, 'offline')}>I'm in class</Btn>}
                      {live && <Btn size="sm" variant="subtle" onClick={() => setActive(active?.id === c.id ? null : c)}>{active?.id === c.id ? 'Hide questions' : 'Attendance'}</Btn>}
                      {!c.ended_at && !c.pre_notified_absent && <Btn size="sm" variant="ghost" onClick={() => preNotify(c.id)} style={{ color: '#b45309', borderColor: '#fcd34d' }}>Can't attend</Btn>}
                    </div>
                  </div>

                  {active?.id === c.id && (
                    <div style={{ marginTop: 14, borderTop: '1px solid #eef2f7', paddingTop: 14 }}>
                      {questions.length === 0
                        ? <div style={{ fontSize: 13, color: '#94a3b8' }}>No open questions right now — new ones appear automatically. Answer all fired questions to be marked present.</div>
                        : questions.map((q) => (
                          <div key={q.id} style={{ marginBottom: 14 }}>
                            <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>{q.question} {q.answered && <span style={{ color: '#15803d', fontSize: 12 }}>✓ answered</span>}</div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {(q.options || []).map((opt, i) => (
                                <button key={i} disabled={q.answered} onClick={() => answer(c.id, q.id, i)}
                                  style={{ border: '1px solid #cbd5e1', background: q.answered ? '#f1f5f9' : '#fff', borderRadius: 10, padding: '9px 16px', fontSize: 13, cursor: q.answered ? 'default' : 'pointer', fontWeight: 500 }}>{opt}</button>
                              ))}
                            </div>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 5 }}>Closes {fmt(q.closes_at)}</div>
                          </div>
                        ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
    </div>
  );
}
