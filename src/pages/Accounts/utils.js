// Pure helper functions for the Accounts module. JSX components live in
// their own files (StatusPill.jsx, etc.). Keeping this file as plain .js
// sidesteps React Refresh's "components only" rule entirely.

// "Vishal Khude" from { first_name, middle_name, last_name }.
export const fullName = (r) =>
  [r?.first_name, r?.middle_name, r?.last_name].filter(Boolean).join(' ').trim() || '—';

// DD-Mmm-YYYY ("31-Mar-2026"). Pure-display, no timezone surprises.
export const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
};

// Indian-format currency (no symbol; reports inherit the locale).
export const fmtMoney = (v) => {
  const n = Number(v || 0);
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

// CSV exporter for any 2D matrix [{ key, label }] columns + rows[].
// Triggers a browser download via a transient <a>. Used by the report
// pages so the "Export CSV" button doesn't need a backend roundtrip.
export const downloadCsv = (filename, columns, rows) => {
  const escape = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map((c) => escape(c.label)).join(',');
  const body = rows.map((r) => columns.map((c) => escape(typeof c.value === 'function' ? c.value(r) : r[c.key])).join(',')).join('\n');
  const csv = `${header}\n${body}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
