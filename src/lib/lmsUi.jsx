// Shared premium UI primitives for the whole LMS (trainer + student screens).
// Lightweight styled components — no new deps. The tenant accent is read from
// the CSS var --lms-accent (set by the layout), falling back to the brand red.
// Import what you need: PageHeader, Card, StatTile, Section, EmptyState,
// Btn, Badge, Skeleton, Field.
import { useState } from 'react';

export const ACCENT = 'var(--lms-accent, #E53935)';
const INK = '#0f172a';
const MUTE = '#64748b';
const FAINT = '#94a3b8';
const LINE = '#eef0f5';

export const lmsTokens = { ACCENT, INK, MUTE, FAINT, LINE };

// Page title + optional subtitle + right-slot (actions). Consistent top of every screen.
export const PageHeader = ({ title, subtitle, right, icon: Icon }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', margin: '24px 0 18px' }}>
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      {Icon && <span style={{ width: 40, height: 40, borderRadius: 12, background: `color-mix(in srgb, ${ACCENT} 12%, transparent)`, color: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon /></span>}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: INK, margin: 0, letterSpacing: -0.3 }}>{title}</h1>
        {subtitle && <div style={{ fontSize: 13.5, color: MUTE, marginTop: 2 }}>{subtitle}</div>}
      </div>
    </div>
    {right && <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{right}</div>}
  </div>
);

// A soft-shadow card with an optional header (title + right slot).
export const Card = ({ title, right, icon: Icon, children, pad = 18, style }) => (
  <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${LINE}`, boxShadow: '0 2px 12px -8px rgba(15,23,42,0.18)', padding: pad, ...style }}>
    {title && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {Icon && <Icon sx={{ fontSize: 18, color: FAINT }} />}
          <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>{title}</div>
        </div>
        {right}
      </div>
    )}
    {children}
  </div>
);

// Accent-railed stat tile with icon.
export const StatTile = ({ icon: Icon, tint = ACCENT, label, value, sub }) => (
  <div style={{ background: '#fff', borderRadius: 16, padding: 16, border: `1px solid ${LINE}`, boxShadow: '0 2px 12px -8px rgba(15,23,42,0.18)', position: 'relative', overflow: 'hidden' }}>
    <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: tint }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      {Icon && <span style={{ width: 30, height: 30, borderRadius: 9, background: `color-mix(in srgb, ${tint} 14%, transparent)`, color: tint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon sx={{ fontSize: 18 }} /></span>}
      <span style={{ fontSize: 11, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</span>
    </div>
    <div style={{ fontSize: 26, fontWeight: 800, color: INK, lineHeight: 1.1 }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: FAINT, marginTop: 2 }}>{sub}</div>}
  </div>
);

export const StatGrid = ({ children, min = 190 }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, gap: 14, marginBottom: 20 }}>{children}</div>
);

export const Section = ({ title, right, children }) => (
  <div style={{ marginBottom: 20 }}>
    {(title || right) && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</div>
        {right}
      </div>
    )}
    {children}
  </div>
);

// Illustrative empty-state (icon/emoji + message + optional action).
export const EmptyState = ({ icon = '✨', title, text, action }) => (
  <div style={{ textAlign: 'center', padding: '34px 16px', color: FAINT }}>
    <div style={{ fontSize: 34, marginBottom: 8 }}>{icon}</div>
    {title && <div style={{ fontWeight: 700, color: '#475569', marginBottom: 4 }}>{title}</div>}
    {text && <div style={{ fontSize: 13, maxWidth: 340, margin: '0 auto' }}>{text}</div>}
    {action && <div style={{ marginTop: 14 }}>{action}</div>}
  </div>
);

// Buttons — variant: primary | ghost | subtle. Renders as <a> when href given.
export const Btn = ({ variant = 'primary', href, target, onClick, disabled, children, style, size = 'md', ...rest }) => {
  const pad = size === 'sm' ? '7px 12px' : '9px 18px';
  const base = { display: 'inline-flex', alignItems: 'center', gap: 7, borderRadius: 10, padding: pad, fontSize: 13, fontWeight: 600, cursor: disabled ? 'default' : 'pointer', textDecoration: 'none', opacity: disabled ? 0.55 : 1, transition: 'filter .12s', border: '1px solid transparent', lineHeight: 1.2, ...style };
  const styles = {
    primary: { ...base, background: ACCENT, color: '#fff', border: 'none' },
    ghost: { ...base, background: '#fff', color: '#475569', border: '1px solid #cbd5e1' },
    subtle: { ...base, background: 'color-mix(in srgb, var(--lms-accent, #E53935) 10%, transparent)', color: ACCENT },
  };
  const st = styles[variant] || styles.primary;
  if (href) return <a href={href} target={target} rel={target ? 'noreferrer' : undefined} style={st} {...rest}>{children}</a>;
  return <button onClick={onClick} disabled={disabled} style={st} {...rest}>{children}</button>;
};

// Status badge. tone: neutral | success | warning | danger | info | accent.
export const Badge = ({ tone = 'neutral', children }) => {
  const tones = {
    neutral: ['#eef2f7', '#475569'], success: ['#dcfce7', '#15803d'], warning: ['#fef9c3', '#854d0e'],
    danger: ['#fee2e2', '#b91c1c'], info: ['#dbeafe', '#1d4ed8'], accent: ['color-mix(in srgb, var(--lms-accent,#E53935) 14%, transparent)', ACCENT],
  };
  const [bg, fg] = tones[tone] || tones.neutral;
  return <span style={{ display: 'inline-block', background: bg, color: fg, fontWeight: 700, fontSize: 11, padding: '3px 10px', borderRadius: 999 }}>{children}</span>;
};

// Thin progress bar.
export const Progress = ({ value = 0, tint = ACCENT }) => (
  <div style={{ height: 7, background: '#eef2f7', borderRadius: 999, overflow: 'hidden' }}>
    <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', background: tint, borderRadius: 999, transition: 'width .3s' }} />
  </div>
);

// Skeleton shimmer block for loading states.
export const Skeleton = ({ h = 16, w = '100%', r = 8, style }) => (
  <div style={{ height: h, width: w, borderRadius: r, background: 'linear-gradient(90deg,#eef2f7 25%,#f8fafc 37%,#eef2f7 63%)', backgroundSize: '400% 100%', animation: 'lms-shimmer 1.3s ease-in-out infinite', ...style }} />
);

// A labelled form field (input | textarea | select via children).
export const Field = ({ label, hint, children, full, error }) => (
  <div style={full ? { gridColumn: '1 / -1' } : undefined}>
    {label && <div style={{ fontSize: 11, fontWeight: 700, color: MUTE, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 5 }}>{label}</div>}
    {children}
    {(hint || error) && <div style={{ fontSize: 11, color: error ? '#dc2626' : FAINT, marginTop: 4 }}>{error || hint}</div>}
  </div>
);

export const input = { width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 9, border: '1px solid #cbd5e1', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff' };

// Toast (self-contained). Usage: const [toast,setToast]=useState(''); <Toast msg={toast} onClose={()=>setToast('')} />
export const Toast = ({ msg, onClose }) => msg ? (
  <div onClick={onClose} style={{ position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', background: '#0f172a', color: '#fff', padding: '11px 20px', borderRadius: 10, fontSize: 13, cursor: 'pointer', zIndex: 1400, boxShadow: '0 12px 30px -12px rgba(0,0,0,0.5)', maxWidth: '90vw' }}>{msg}</div>
) : null;

// One-time keyframes injector (shimmer). Rendered once by the layout.
export const LmsStyles = () => (
  <style>{`@keyframes lms-shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}`}</style>
);

export function useToast() {
  const [msg, setMsg] = useState('');
  return { msg, show: setMsg, node: <Toast msg={msg} onClose={() => setMsg('')} /> };
}
