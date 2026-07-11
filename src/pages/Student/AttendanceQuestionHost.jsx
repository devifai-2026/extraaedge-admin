// Global live-attendance host — mounted once in StudentLayout. Connects the
// student socket, joins the student's batch room(s), and when a trainer fires an
// attendance question it pops a blocking modal with a live countdown (from the
// question's closes_at). Answering marks the student present; the modal hides on
// answer or when the timer expires. A persistent header CTA shows while a
// question is still open and unanswered.
import { useEffect, useRef, useState, useCallback } from 'react';
import { studentApi } from '../../lib/studentApi';
import { connectStudentSocket, joinStudentBatch, onStudentSocketEvent } from '../../lib/studentSocket';
import { ACCENT } from '../../lib/lmsUi';

const remainingMs = (closesAt) => {
  if (!closesAt) return 0;
  try { return Math.max(0, new Date(closesAt).getTime() - Date.now()); } catch { return 0; }
};

export default function AttendanceQuestionHost() {
  // The currently-live question (with class_id) or null.
  const [q, setQ] = useState(null);
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [answered, setAnswered] = useState(false);
  const tick = useRef(null);

  // Connect + join batch rooms from the student's classes.
  useEffect(() => {
    connectStudentSocket();
    let alive = true;
    studentApi.myClasses().then((r) => {
      if (!alive) return;
      const batches = [...new Set((r?.data || []).map((c) => c.batch_id).filter(Boolean))];
      batches.forEach(joinStudentBatch);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const openQuestion = useCallback((payload) => {
    const question = payload?.question;
    if (!question?.id) return;
    setQ({ ...question, class_id: payload.class_id });
    setAnswered(false);
    setLeft(remainingMs(question.closes_at));
  }, []);

  // Listen for fired questions.
  useEffect(() => onStudentSocketEvent('lms:attendance-question', openQuestion), [openQuestion]);

  // Countdown; auto-close at expiry.
  useEffect(() => {
    if (!q) { if (tick.current) clearInterval(tick.current); return undefined; }
    setLeft(remainingMs(q.closes_at));
    tick.current = setInterval(() => {
      const ms = remainingMs(q.closes_at);
      setLeft(ms);
      if (ms <= 0) { clearInterval(tick.current); setQ(null); }
    }, 500);
    return () => { if (tick.current) clearInterval(tick.current); };
  }, [q]);

  const submit = async (optionIndex) => {
    if (!q || busy) return;
    setBusy(true);
    try {
      await studentApi.answer(q.class_id, { question_id: q.id, option_index: optionIndex });
      setAnswered(true);
      setTimeout(() => setQ(null), 900);
    } catch (e) {
      // Keep the modal open so the student can retry within the window.
      // eslint-disable-next-line no-alert
      window.alert(e?.message || 'Could not submit — try again.');
    } finally { setBusy(false); }
  };

  if (!q) return null;

  const secs = Math.ceil(left / 1000);
  const pct = q.visible_minutes ? Math.max(0, Math.min(100, (left / (q.visible_minutes * 60000)) * 100)) : 100;
  const options = Array.isArray(q.options) ? q.options : [];

  return (
    <div style={overlay} role="dialog" aria-modal="true">
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: ACCENT }}>● Live attendance</span>
          <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: secs <= 10 ? '#dc2626' : '#0f172a', fontSize: 15 }}>
            {String(Math.floor(secs / 60)).padStart(2, '0')}:{String(secs % 60).padStart(2, '0')}
          </span>
        </div>
        <div style={{ height: 4, background: '#eef2f7', borderRadius: 999, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ width: `${pct}%`, height: '100%', background: secs <= 10 ? '#dc2626' : ACCENT, transition: 'width .5s linear' }} />
        </div>

        {answered ? (
          <div style={{ textAlign: 'center', padding: '24px 8px' }}>
            <div style={{ fontSize: 40 }}>✓</div>
            <div style={{ fontWeight: 700, color: '#15803d', marginTop: 6 }}>Answer submitted — you're marked present.</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 14, lineHeight: 1.4 }}>{q.question}</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {options.map((opt, i) => (
                <button key={i} onClick={() => submit(i)} disabled={busy} style={optBtn}>
                  <span style={optIndex}>{String.fromCharCode(65 + i)}</span>
                  <span>{typeof opt === 'string' ? opt : opt?.text ?? String(opt)}</span>
                </button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 14, textAlign: 'center' }}>Answer before the timer runs out to be marked present.</div>
          </>
        )}
      </div>
    </div>
  );
}

const overlay = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(2px)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 };
const card = { background: '#fff', borderRadius: 18, padding: 24, width: '100%', maxWidth: 440, boxShadow: '0 40px 90px -40px rgba(0,0,0,.5)' };
const optBtn = { display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', padding: '13px 14px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 14.5, color: '#0f172a', width: '100%', transition: 'border-color .12s, background .12s' };
const optIndex = { width: 26, height: 26, borderRadius: '50%', background: '#f1f5f9', color: '#475569', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 };
