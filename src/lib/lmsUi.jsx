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

// The header row uses flexWrap + a non-shrinking title: a long `right` (a
// summary line plus a button, say) would otherwise squeeze the heading into an
// ellipsis or overlap it at narrow widths.
export const Section = ({ title, right, children }) => (
  <div style={{ marginBottom: 20 }}>
    {(title || right) && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: 0.5, flex: '0 0 auto' }}>{title}</div>
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
  // Top-right, not bottom-centre: a bottom-centred toast sits exactly on top
  // of a dialog's Cancel/Save row, which is where the user is looking right
  // after the action that raised the toast.
  <div onClick={onClose} style={{ position: 'fixed', top: 22, right: 22, background: '#0f172a', color: '#fff', padding: '11px 20px', borderRadius: 10, fontSize: 13, cursor: 'pointer', zIndex: 1400, boxShadow: '0 12px 30px -12px rgba(0,0,0,0.5)', maxWidth: 'min(90vw, 420px)' }}>{msg}</div>
) : null;

// One-time keyframes injector (shimmer). Rendered once by the layout.
export const LmsStyles = () => (
  <style>{`@keyframes lms-shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}`}</style>
);

export function useToast() {
  const [msg, setMsg] = useState('');
  return { msg, show: setMsg, node: <Toast msg={msg} onClose={() => setMsg('')} /> };
}

// ---------------------------------------------------------------------------
// Table primitives
//
// TH/TD were copy-pasted verbatim into at least five pages (HiringCandidates,
// HiringImports, HiringInterviews, MyInterviews, LmsAnalytics) and hand-rolled
// again in most trainer pages. One definition instead, with the sticky header
// the Accounts table already proved out.
//
// Plain <table>, not MUI's: MUI emits per-cell styles, and an attendance
// register is thousands of cells. Sticky positioning is also far easier to
// reason about on bare elements.
// ---------------------------------------------------------------------------

// Scroll container. `maxHeight` turns on the sticky header — without a capped
// height there is nothing for the header to stick against.
export const TableWrap = ({ children, minWidth = 720, maxHeight, style }) => (
  <div style={{ overflowX: 'auto', overflowY: maxHeight ? 'auto' : 'visible', maxHeight, ...style }}>
    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth }}>{children}</table>
  </div>
);

export const TH = ({ children, align = 'left', width, sticky = true, style }) => (
  <th
    style={{
      textAlign: align, width, padding: '10px 12px', fontSize: 11, fontWeight: 700,
      color: FAINT, textTransform: 'uppercase', letterSpacing: 0.6,
      borderBottom: `1px solid ${LINE}`, whiteSpace: 'nowrap', background: '#f9fafb',
      ...(sticky ? { position: 'sticky', top: 0, zIndex: 3 } : null),
      ...style,
    }}
  >
    {children}
  </th>
);

export const TD = ({ children, align = 'left', muted, colSpan, style }) => (
  <td
    colSpan={colSpan}
    style={{
      textAlign: align, padding: '11px 12px', fontSize: 13.5,
      color: muted ? MUTE : INK, borderBottom: `1px solid ${LINE}`, ...style,
    }}
  >
    {children}
  </td>
);

// Whole-row click, the pattern the Accounts list established. Anything
// interactive inside a row must stop propagation — wrap it in <RowActions>.
export const TR = ({ onClick, selected, children, style }) => (
  <tr
    onClick={onClick}
    style={{
      cursor: onClick ? 'pointer' : 'default',
      background: selected ? 'color-mix(in srgb, var(--lms-accent, #E53935) 6%, #fff)' : 'transparent',
      ...style,
    }}
    onMouseEnter={(e) => { if (onClick && !selected) e.currentTarget.style.background = '#fcfcfd'; }}
    onMouseLeave={(e) => { if (onClick && !selected) e.currentTarget.style.background = 'transparent'; }}
  >
    {children}
  </tr>
);

// Cell for row-level buttons. Stops the click reaching TR's onClick, which
// would otherwise navigate away the instant you press Delete.
export const RowActions = ({ children, align = 'right' }) => (
  <TD align={align} style={{ whiteSpace: 'nowrap' }}>
    <span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
      {children}
    </span>
  </TD>
);

// ---------------------------------------------------------------------------
// Tabs with counts
//
// The count beside each tab must be computed against the SAME filters as the
// list, minus the tab's own key — otherwise selecting "Unassigned" makes every
// other tab report 0 and the tab bar stops being a map of the data. The Lead
// Manager calls that stripped filter `countsFilter`; build yours the same way
// and pass the numbers in.
// ---------------------------------------------------------------------------
export const Tabs = ({ items = [], value, onChange }) => (
  <div style={{ display: 'flex', gap: 2, alignItems: 'center', borderBottom: `1px solid ${LINE}`, overflowX: 'auto', scrollbarWidth: 'none' }}>
    {items.map((t) => {
      const on = t.key === value;
      return (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange?.(t.key)}
          style={{
            appearance: 'none', background: 'none', border: 0,
            borderBottom: `2px solid ${on ? ACCENT : 'transparent'}`,
            padding: '9px 12px', fontSize: 12.5, fontWeight: on ? 700 : 550,
            color: on ? ACCENT : MUTE, cursor: 'pointer', whiteSpace: 'nowrap',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          {t.label}
          {t.count != null && (
            <span style={{ fontSize: 11, fontWeight: 700, color: on ? ACCENT : FAINT }}>{t.count}</span>
          )}
        </button>
      );
    })}
  </div>
);

// Two rows, each holding ONE kind of control: row 1 search + actions, row 2
// filters. They scroll rather than wrap, so the toolbar keeps a fixed height
// at every width — a wrapping toolbar changes height as the window resizes,
// which is what made the Lead Manager toolbar unreadable.
export const Toolbar = ({ left, actions, filters, style }) => (
  <div style={{ background: '#fff', borderBottom: `1px solid ${LINE}`, ...style }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', flexWrap: 'nowrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>{left}</div>
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {actions}
        </div>
      )}
    </div>
    {filters && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderTop: `1px solid ${LINE}`, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {filters}
      </div>
    )}
  </div>
);

// Search input matching the Lead Manager toolbar's box.
export const SearchBox = ({ value, onChange, placeholder = 'Search…', width = 260 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, flex: `0 1 ${width}px`, border: '1px solid #cbd5e1', borderRadius: 8, padding: '7px 10px', background: '#fff' }}>
    <span style={{ color: FAINT, fontSize: 13, lineHeight: 1 }}>⌕</span>
    <input
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      style={{ border: 0, outline: 'none', fontSize: 12.5, fontFamily: 'inherit', width: '100%', background: 'transparent', color: INK }}
    />
    {value ? (
      <button type="button" onClick={() => onChange?.('')} style={{ border: 0, background: 'none', color: FAINT, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0, fontFamily: 'inherit' }}>×</button>
    ) : null}
  </div>
);

// A filter pill. `brand` colours it; active inverts. Mirrors pillFilterSx in
// the Lead Manager toolbar so the two read as one product.
export const FilterPill = ({ active, brand = ACCENT, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, height: 29, padding: '0 11px',
      borderRadius: 999, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer',
      fontFamily: 'inherit', flexShrink: 0,
      ...(active
        ? { background: brand, color: '#fff', border: `1px solid ${brand}` }
        : { color: brand, border: `1px solid color-mix(in srgb, ${brand} 35%, transparent)`, background: `color-mix(in srgb, ${brand} 6%, transparent)` }),
    }}
  >
    {children}
  </button>
);

// Breadcrumb for drilled-into pages, so "where am I" survives a deep link.
export const Breadcrumb = ({ items = [] }) => (
  <nav style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 12.5, color: MUTE, margin: '18px 0 -6px' }}>
    {items.map((it, i) => (
      <span key={`${it.label}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {i > 0 && <span style={{ color: FAINT }}>/</span>}
        {it.to && i < items.length - 1
          ? <a href={it.to} onClick={(e) => { if (it.onClick) { e.preventDefault(); it.onClick(); } }} style={{ color: MUTE, textDecoration: 'none' }}>{it.label}</a>
          : <span style={{ color: i === items.length - 1 ? INK : MUTE, fontWeight: i === items.length - 1 ? 650 : 400 }}>{it.label}</span>}
      </span>
    ))}
  </nav>
);

// ---------------------------------------------------------------------------
// Modal
//
// Codifies the house dialog idiom (fullWidth, divider under the title,
// Cancel + a busy-aware primary) so every page stops re-deriving it. Named
// Modal, not Dialog, to avoid colliding with MUI's Dialog in files that use
// both during migration.
// ---------------------------------------------------------------------------
export const Modal = ({ open, onClose, title, subtitle, maxWidth = 520, busy, children, actions }) => {
  if (!open) return null;
  return (
    <div
      onClick={() => !busy && onClose?.()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px -20px rgba(15,23,42,0.4)' }}
      >
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${LINE}` }}>
          <div style={{ fontSize: 16.5, fontWeight: 700, color: INK }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12.5, color: MUTE, marginTop: 3 }}>{subtitle}</div>}
        </div>
        <div style={{ padding: 20, overflowY: 'auto' }}>{children}</div>
        {actions && (
          <div style={{ padding: '12px 20px', borderTop: `1px solid ${LINE}`, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
