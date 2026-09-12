// Leave Administration — HR/admin surface.
//
// Three jobs: see every request in the org, set who approves whom, and declare
// holidays. Holidays take a date RANGE and expand to one row per date, because
// Ganesh Puja is three consecutive days but the attendance engine asks about
// one day at a time.
import { useEffect, useState, useCallback } from 'react';
import { Box, Snackbar, Alert, Select, MenuItem, TextField, Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel, Checkbox } from '@mui/material';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggestOutlined';
import { leaveApi } from '../../lib/endpoints';
import { PageHeader, Card, EmptyState, Badge, Skeleton, Btn, Field, input, Section } from '../../lib/lmsUi';

const d = (v) => (v ? String(v).slice(0, 10).split('-').reverse().join('/') : '—');
const toneFor = (s) => (s === 'approved' ? 'success' : s === 'declined' ? 'danger' : s === 'cancelled' ? 'neutral' : 'info');

const MODES = [
  { v: 'two_level', l: 'Lead, then HR' },
  { v: 'hr_only', l: 'HR only' },
  { v: 'lead_only', l: 'Lead only' },
  { v: 'none', l: 'Auto-approve' },
];

// The dropdown says WHO decides; this line says what that means in practice,
// which is the part people actually get wrong.
const chainHint = (mode) => ({
  two_level: 'Direct lead and HR must both approve',
  hr_only: 'HR decides alone',
  lead_only: 'Direct lead decides · HR still sees it on the calendar',
  none: 'Approved automatically on submit — no review',
}[mode] || '');

const roleLabel = (scope) => String(scope || '')
  .split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export default function LeaveAdmin() {
  const [rows, setRows] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [holOpen, setHolOpen] = useState(false);
  const [hol, setHol] = useState({ name: '', from: '', to: '', is_optional: false });
  const [saving, setSaving] = useState(false);
  const [showChains, setShowChains] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      leaveApi.list(status ? { status } : undefined).catch((e) => { setToast({ severity: 'error', text: e.message }); return { data: [] }; }),
      leaveApi.policies().catch(() => ({ data: [] })),
      leaveApi.holidays().catch(() => ({ data: [] })),
    ]).then(([l, p, h]) => { setRows(l?.data || []); setPolicies(p?.data || []); setHolidays(h?.data || []); })
      .finally(() => setLoading(false));
  }, [status]);
  useEffect(() => { load(); }, [load]);

  // "12 roles: Lead only · 3: Lead, then HR" — the exceptions are the signal.
  const chainSummary = (() => {
    if (!policies.length) return 'Not configured';
    const counts = policies.reduce((a, p) => { a[p.approval_mode] = (a[p.approval_mode] || 0) + 1; return a; }, {});
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([m, n]) => `${n} ${MODES.find((x) => x.v === m)?.l || m}`)
      .join(' · ');
  })();

  const setMode = async (scope, mode) => {
    try {
      await leaveApi.setPolicy(scope, mode);
      setPolicies((ps) => ps.map((p) => (p.role_scope === scope ? { ...p, approval_mode: mode } : p)));
      setToast({ severity: 'success', text: `Approval chain updated for ${scope}` });
    } catch (e) { setToast({ severity: 'error', text: e.message }); }
  };

  const addHoliday = async () => {
    setSaving(true);
    try {
      await leaveApi.addHoliday({
        name: hol.name,
        from_date: hol.from,
        to_date: hol.to || hol.from,
        is_optional: hol.is_optional,
      });
      setHolOpen(false); setHol({ name: '', from: '', to: '', is_optional: false });
      setToast({ severity: 'success', text: 'Holiday added' });
      load();
    } catch (e) { setToast({ severity: 'error', text: e.message }); }
    finally { setSaving(false); }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <PageHeader title="Leave Administration" subtitle="Every request in the org, the approval chains, and the holiday calendar." icon={SettingsSuggestIcon} />

      <Section
        title="Approval chains"
        right={(
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>{chainSummary}</span>
            <Btn size="sm" variant="ghost" onClick={() => setShowChains((v) => !v)}>
              {showChains ? 'Hide' : 'Edit'}
            </Btn>
          </div>
        )}
      >
        {/* Collapsed by default. This is set-once configuration — fifteen
            dropdowns open on arrival buried the register underneath them. */}
        {!showChains ? null : (
        <Card pad={0}>
          {policies.length === 0 ? <div style={{ padding: 18 }}><EmptyState icon="⚙️" title="No policies configured" text="Every role defaults to the direct lead alone." /></div>
            : (
              <>
                {/* A two-column table, not a grid of dropdowns. Most roles share
                    the same chain, so the useful signal is the exception — the
                    rows that differ from the default. */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <tbody>
                    {policies.map((p, i) => (
                      <tr key={p.role_scope} style={{ borderTop: i === 0 ? 'none' : '1px solid #eef2f7' }}>
                        <td style={{ padding: '10px 16px', width: '45%' }}>
                          <div style={{ fontWeight: 500 }}>{roleLabel(p.role_scope)}</div>
                          <div style={{ fontSize: 12, color: '#94a3b8' }}>{chainHint(p.approval_mode)}</div>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <Select
                            size="small"
                            value={p.approval_mode}
                            onChange={(e) => setMode(p.role_scope, e.target.value)}
                            sx={{ width: '100%', maxWidth: 320, background: '#fff' }}
                          >
                            {MODES.map((m) => <MenuItem key={m.v} value={m.v}>{m.l}</MenuItem>)}
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
        </Card>
        )}
      </Section>

      <Section title="Holidays" right={<Btn size="sm" onClick={() => setHolOpen(true)}>Add holiday</Btn>}>
        <Card>
          {holidays.length === 0 ? <EmptyState icon="🎉" title="No holidays declared" text="Add one — a single day or a multi-day span like Ganesh Puja." />
            : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {holidays.map((h) => (
                  <Badge key={h.id || `${h.date}${h.name}`} tone={h.is_optional ? 'warn' : 'info'}>
                    {d(h.date || h.holiday_date)} · {h.name}{h.is_optional ? ' (optional)' : ''}
                  </Badge>
                ))}
              </div>
            )}
        </Card>
      </Section>

      <Section title="All requests" right={(
        <Select size="small" value={status} displayEmpty onChange={(e) => setStatus(e.target.value)}>
          <MenuItem value="">All statuses</MenuItem>
          {['pending', 'approved', 'declined', 'cancelled'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </Select>
      )}>
        {loading ? <Card><Skeleton h={16} w="40%" /><div style={{ height: 8 }} /><Skeleton h={12} w="70%" /></Card>
          : rows.length === 0 ? <Card><EmptyState icon="📋" title="No requests" text="Nothing matches this filter." /></Card>
            : (
              <Card pad={0}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead><tr style={{ background: '#fafbfc', textAlign: 'left' }}>
                      <th style={{ padding: 10 }}>Employee</th><th style={{ padding: 10 }}>Role</th>
                      <th style={{ padding: 10 }}>Type</th><th style={{ padding: 10 }}>From</th>
                      <th style={{ padding: 10 }}>To</th><th style={{ padding: 10 }}>Days</th>
                      <th style={{ padding: 10 }}>Status</th><th style={{ padding: 10 }}>Pay</th>
                    </tr></thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} style={{ borderTop: '1px solid #eef2f7' }}>
                          <td style={{ padding: 10 }}>{r.user_name}</td>
                          <td style={{ padding: 10, color: '#64748b' }}>{roleLabel(r.user_role)}</td>
                          <td style={{ padding: 10 }}>{r.type_name || '—'}{r.half_day ? ' · half' : ''}</td>
                          <td style={{ padding: 10 }}>{d(r.from_date)}</td>
                          <td style={{ padding: 10 }}>{d(r.to_date)}</td>
                          <td style={{ padding: 10 }}>{Number(r.day_count)}</td>
                          <td style={{ padding: 10 }}><Badge tone={toneFor(r.status)}>{r.status}</Badge></td>
                          <td style={{ padding: 10 }}>
                            {Number(r.lop_days) > 0 ? <Badge tone="warn">{Number(r.lop_days)}d unpaid</Badge> : <span style={{ color: '#94a3b8' }}>paid</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
      </Section>

      <Dialog open={holOpen} onClose={() => setHolOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Add holiday</DialogTitle>
        <DialogContent>
          <Field label="Name" full>
            <TextField size="small" fullWidth value={hol.name} onChange={(e) => setHol((h) => ({ ...h, name: e.target.value }))} />
          </Field>
          <div style={{ display: 'flex', gap: 12 }}>
            <Field label="From" full>
              <input type="date" style={input} value={hol.from}
                onChange={(e) => setHol((h) => ({ ...h, from: e.target.value, to: h.to || e.target.value }))} />
            </Field>
            <Field label="To" full>
              <input type="date" style={input} value={hol.to} onChange={(e) => setHol((h) => ({ ...h, to: e.target.value }))} />
            </Field>
          </div>
          <FormControlLabel
            control={<Checkbox checked={hol.is_optional} onChange={(e) => setHol((h) => ({ ...h, is_optional: e.target.checked }))} />}
            label="Optional (restricted) holiday"
          />
          <div style={{ fontSize: 13, color: '#64748b' }}>
            A span creates one holiday per date, so a 3-day festival is still queryable day by day.
          </div>
        </DialogContent>
        <DialogActions>
          <Btn variant="ghost" onClick={() => setHolOpen(false)}>Cancel</Btn>
          <Btn disabled={saving || !hol.name || !hol.from} onClick={addHoliday}>{saving ? 'Saving…' : 'Add'}</Btn>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity || 'info'} onClose={() => setToast(null)}>{toast?.text}</Alert>
      </Snackbar>
    </Box>
  );
}
