// Lightweight guided tour (no external dep). Spotlights each target element via
// a box-shadow "hole", shows a positioned tooltip with Back/Next/Skip, and
// recomputes on step change + resize. Targets are matched by [data-tour="key"].
import { useEffect, useLayoutEffect, useState, useCallback } from 'react';

const ACCENT = 'var(--lms-accent, #E53935)';
const PAD = 6;

export default function StudentTour({ steps, open, onClose }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);

  const measure = useCallback(() => {
    if (!open || !steps[i]) return;
    const el = document.querySelector(steps[i].selector);
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [open, steps, i]);

  useLayoutEffect(() => { measure(); }, [measure]);
  useEffect(() => {
    if (!open) return undefined;
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => { window.removeEventListener('resize', onResize); window.removeEventListener('scroll', onResize, true); };
  }, [open, measure]);

  useEffect(() => { if (open) setI(0); }, [open]);

  if (!open || !steps.length) return null;
  const step = steps[i];
  const last = i === steps.length - 1;
  const finish = () => { onClose?.(); };
  const next = () => (last ? finish() : setI((n) => n + 1));
  const back = () => setI((n) => Math.max(0, n - 1));

  // Tooltip placement: to the right of the target (sidebar items sit on the
  // left); fall back to below/left if it would overflow the viewport.
  const vw = window.innerWidth; const vh = window.innerHeight;
  const TIP_W = 300;
  let tipLeft; let tipTop; let arrow = 'left';
  if (rect) {
    const rightRoom = vw - (rect.left + rect.width);
    if (rightRoom > TIP_W + 28) { tipLeft = rect.left + rect.width + 16; tipTop = rect.top; arrow = 'left'; }
    else { tipLeft = Math.min(rect.left, vw - TIP_W - 16); tipTop = rect.top + rect.height + 14; arrow = 'top'; }
    tipTop = Math.max(16, Math.min(tipTop, vh - 210));
  } else {
    tipLeft = vw / 2 - TIP_W / 2; tipTop = vh / 2 - 90; arrow = 'none';
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 4000 }}>
      {/* Spotlight — a transparent box over the target with a huge shadow that
          darkens everything else. Full dim when no target (intro/outro). */}
      {rect ? (
        <div style={{
          position: 'fixed', top: rect.top - PAD, left: rect.left - PAD,
          width: rect.width + PAD * 2, height: rect.height + PAD * 2,
          borderRadius: 12, boxShadow: '0 0 0 9999px rgba(15,23,42,0.66)',
          border: `2px solid ${ACCENT}`, pointerEvents: 'none', transition: 'all .2s ease',
        }} />
      ) : (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.66)' }} onClick={finish} />
      )}

      {/* Tooltip card */}
      <div style={{
        position: 'fixed', top: tipTop, left: tipLeft, width: TIP_W, maxWidth: '90vw',
        background: '#fff', borderRadius: 14, padding: 18, boxShadow: '0 24px 60px -20px rgba(0,0,0,0.5)',
      }}>
        {arrow === 'left' && rect && <span style={{ position: 'absolute', left: -8, top: 20, width: 16, height: 16, background: '#fff', transform: 'rotate(45deg)' }} />}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          {step.icon && <span style={{ fontSize: 20 }}>{step.icon}</span>}
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{step.title}</div>
        </div>
        <div style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.55 }}>{step.body}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
          <div style={{ fontSize: 11.5, color: '#94a3b8', fontWeight: 600 }}>{i + 1} / {steps.length}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={finish} style={btnGhost}>Skip</button>
            {i > 0 && <button onClick={back} style={btnGhost}>Back</button>}
            <button onClick={next} style={btnPrimary}>{last ? 'Done 🎉' : 'Next'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const btnBase = { borderRadius: 9, padding: '7px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', border: '1px solid transparent' };
const btnPrimary = { ...btnBase, background: ACCENT, color: '#fff' };
const btnGhost = { ...btnBase, background: '#fff', color: '#64748b', border: '1px solid #cbd5e1' };
