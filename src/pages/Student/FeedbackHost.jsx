// Mandatory end-of-class / end-of-module feedback — mounted once in
// StudentLayout alongside AttendanceQuestionHost.
//
// Asked ONLY of students marked present (the server decides that; this
// component just renders whatever /lms-feedback/pending returns). Someone who
// missed the class has nothing useful to say about it, and asking would both
// annoy them and pollute the trainer's score.
//
// "Mandatory" here means persistent, not a lockout: the student can say "Not
// now" and keep using the portal, but the prompt returns on the next load until
// it is submitted. Locking a student out of their materials and tests over a
// survey is a worse outcome than a slightly lower response rate.
import { useEffect, useState, useCallback } from 'react';
import { studentApi } from '../../lib/studentApi';
import { ACCENT } from '../../lib/lmsUi';

const Stars = ({ value, onChange, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
    <span style={{ fontSize: 13, color: '#475569', width: 92 }}>{label}</span>
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${label} ${n} of 5`}
          style={{
            border: 'none', background: 'none', cursor: 'pointer', padding: 0,
            fontSize: 24, lineHeight: 1, color: n <= value ? '#f59e0b' : '#e2e8f0',
          }}
        >★</button>
      ))}
    </div>
  </div>
);

export default function FeedbackHost() {
  const [item, setItem] = useState(null);   // { scope, class_id|module_id, title, sub }
  const [rating, setRating] = useState(0);
  const [clarity, setClarity] = useState(0);
  const [pace, setPace] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    studentApi.pendingFeedback().then((r) => {
      const d = r?.data || {};
      // Classes first: they are fresher and more specific than a module
      // retrospective, so they get answered more honestly.
      const c = (d.classes || [])[0];
      const m = (d.modules || [])[0];
      if (c) {
        setItem({
          scope: 'class', class_id: c.class_id, title: c.title,
          sub: [c.module_name, c.trainer_name].filter(Boolean).join(' · '),
        });
      } else if (m) {
        setItem({
          scope: 'module', module_id: m.module_id, title: m.module_name,
          sub: 'Module complete — how did it go?',
        });
      } else setItem(null);
      setRating(0); setClarity(0); setPace(0); setComment('');
    }).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!item) return null;

  const key = item.scope === 'class' ? { class_id: item.class_id } : { module_id: item.module_id };

  const submit = async () => {
    if (!rating || busy) return;
    setBusy(true);
    try {
      await studentApi.submitFeedback({
        scope: item.scope, ...key,
        rating,
        clarity_rating: clarity || undefined,
        pace_rating: item.scope === 'module' && pace ? pace : undefined,
        comment: comment.trim() || undefined,
      });
      load(); // there may be another one queued behind this
    } catch (e) {
      window.alert(e?.message || 'Could not submit — try again.'); // eslint-disable-line no-alert
    } finally { setBusy(false); }
  };

  const dismiss = async () => {
    if (busy) return;
    setBusy(true);
    try { await studentApi.dismissFeedback({ scope: item.scope, ...key }); }
    catch { /* a failed dismissal just means it asks again — no need to shout */ }
    finally { setBusy(false); setItem(null); }
  };

  return (
    <div style={overlay} role="dialog" aria-modal="true">
      <div style={card}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: ACCENT, marginBottom: 6 }}>
          {item.scope === 'class' ? 'Class feedback' : 'Module feedback'}
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>{item.title}</div>
        {item.sub && <div style={{ fontSize: 13, color: '#64748b', marginTop: 2, marginBottom: 14 }}>{item.sub}</div>}

        <Stars label="Overall" value={rating} onChange={setRating} />
        <Stars label="Clarity" value={clarity} onChange={setClarity} />
        {item.scope === 'module' && <Stars label="Pace" value={pace} onChange={setPace} />}

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Anything you'd like your trainer to know? (optional)"
          rows={3}
          maxLength={2000}
          style={textArea}
        />

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button type="button" onClick={dismiss} disabled={busy} style={ghostBtn}>Not now</button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !rating}
            style={{ ...submitBtn, opacity: busy || !rating ? 0.5 : 1 }}
          >
            Submit feedback
          </button>
        </div>
        {!rating && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8, textAlign: 'center' }}>Pick an overall rating to submit.</div>}
      </div>
    </div>
  );
}

const overlay = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(2px)', zIndex: 3900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 };
const card = { background: '#fff', borderRadius: 18, padding: 24, width: '100%', maxWidth: 440, boxShadow: '0 40px 90px -40px rgba(0,0,0,.5)' };
const textArea = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit', color: '#0f172a', resize: 'vertical', outline: 'none', marginTop: 4 };
const submitBtn = { flex: 1, padding: '11px 14px', borderRadius: 12, border: 'none', background: ACCENT, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' };
const ghostBtn = { padding: '11px 16px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: 14, cursor: 'pointer' };
