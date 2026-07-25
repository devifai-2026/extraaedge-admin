import { useEffect, useRef, useState } from 'react';
import { feedbackApi } from '../../lib/endpoints';

// Forceful, NON-DISMISSIBLE feedback popup.
//
// - On mount (and every RECHECK_MS) asks the server whether to show.
// - Server decides: not-yet-submitted → show; submitted → never again.
// - There is NO close / "maybe later" / overlay-click / Esc escape hatch: the
//   ONLY way out is to submit (star + comment, both required). This is a hard
//   gate, like the branch/phone setup dialogs.
//
// Mounted once inside the authenticated Layout so it can appear on any page.
const RECHECK_MS = 60 * 1000; // poll status every minute until it says "show"

function FeedbackPopup() {
  const [show, setShow] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const doneRef = useRef(false); // once submitted, stop polling entirely

  const check = async () => {
    if (doneRef.current) return;
    try {
      const res = await feedbackApi.status();
      const d = res?.data ?? res;
      if (d?.submitted) { doneRef.current = true; setShow(false); return; }
      if (d?.show) setShow(true);
    } catch { /* ignore transient errors; try again next tick */ }
  };

  useEffect(() => {
    check();
    const id = setInterval(check, RECHECK_MS);
    return () => clearInterval(id);
  }, []);

  const submit = async () => {
    if (rating < 1) { setError('Please select a star rating.'); return; }
    if (!comment.trim()) { setError('Please add a comment.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await feedbackApi.submit({ rating, comment: comment.trim() });
      doneRef.current = true;
      setShow(false);
    } catch (e) {
      setError(e?.message || 'Could not submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!show) return null;

  return (
    <div style={S.overlay} role="dialog" aria-modal="true" aria-label="Feedback">
      <div style={S.card}>
        <p style={S.interrupt}>Sorry to interrupt your work — your rating matters to us.</p>
        <h2 style={S.title}>How are we doing?</h2>
        <p style={S.subtitle}>Please share a quick rating and comment to continue.</p>

        <div style={S.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              role="button"
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => { setRating(n); setError(''); }}
              style={{ ...S.star, color: (hover || rating) >= n ? '#F5B301' : '#D0D5DD' }}
            >★</span>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => { setComment(e.target.value); setError(''); }}
          placeholder="Tell us what's working and what we can do better…"
          rows={4}
          style={S.textarea}
        />

        {error ? <div style={S.error}>{error}</div> : null}

        <div style={S.actions}>
          <button type="button" onClick={submit} style={S.submitBtn} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit & continue'}
          </button>
        </div>
        <p style={S.footnote}>This helps us build a better experience for you. It takes just a few seconds.</p>
      </div>
    </div>
  );
}

const S = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(16,24,40,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 12000, padding: 16,
  },
  card: {
    background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440,
    padding: '28px 26px', boxShadow: '0 20px 48px rgba(16,24,40,0.24)', position: 'relative',
    fontFamily: 'inherit',
  },
  interrupt: {
    margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: '#7F56D9',
    background: '#F4EBFF', borderRadius: 8, padding: '8px 12px', textAlign: 'center',
  },
  title: { margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#101828', textAlign: 'center' },
  subtitle: { margin: '0 0 18px', fontSize: 14, color: '#667085', textAlign: 'center' },
  stars: { display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 18 },
  star: { fontSize: 38, cursor: 'pointer', transition: 'color .12s', userSelect: 'none' },
  textarea: {
    width: '100%', boxSizing: 'border-box', borderRadius: 10, border: '1px solid #D0D5DD',
    padding: '10px 12px', fontSize: 14, resize: 'vertical', outline: 'none', fontFamily: 'inherit',
  },
  error: { color: '#D92D20', fontSize: 13, marginTop: 10, textAlign: 'center' },
  actions: { display: 'flex', marginTop: 20 },
  submitBtn: {
    flex: 1, padding: '12px 18px', borderRadius: 10, border: 'none', background: '#7F56D9',
    color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
  },
  footnote: { margin: '14px 0 0', fontSize: 12, color: '#98A2B3', textAlign: 'center' },
};

export default FeedbackPopup;
