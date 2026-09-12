// My Leave — the self-service panel every employee gets, whatever their role.
//
// Three things on one screen, because they are one decision: what have I got
// left, what happens if I apply, and what did I already ask for.
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Box, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select, TextField, FormControlLabel, Checkbox } from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailableOutlined';
import { leaveApi } from '../../lib/endpoints';
import { PageHeader, Card, EmptyState, Badge, Skeleton, Btn, StatGrid, StatTile, Field, input } from '../../lib/lmsUi';

const toneFor = (s) => (s === 'approved' ? 'success' : s === 'declined' ? 'danger' : s === 'cancelled' ? 'neutral' : 'info');
const d = (v) => (v ? String(v).slice(0, 10).split('-').reverse().join('/') : '—');

// Inclusive day span, halved when a half day is picked. Mirrors the server's
// computeDayCount so the form can show the cost before submitting.
const spanDays = (from, to, half) => {
  if (!from || !to) return 0;
  const a = new Date(`${from}T00:00:00Z`); const b = new Date(`${to}T00:00:00Z`);
  const n = Math.floor((b - a) / 86400000) + 1;
  if (n < 1) return 0;
  return half ? (n === 1 ? 0.5 : 0) : n;
};

export default function MyLeave() {
  const [types, setTypes] = useState([]);
  const [balances, setBalances] = useState([]);
  const [rows, setRows] = useState([]);
  const [chain, setChain] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ leave_type_id: '', from_date: '', to_date: '', half_day: '', reason: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      leaveApi.types().catch(() => ({ data: [] })),
      leaveApi.myBalances(new Date().getFullYear()).catch(() => ({ data: [] })),
      leaveApi.mine().catch(() => ({ data: [] })),
      leaveApi.myChain().catch(() => ({ data: null })),
    ]).then(([t, b, m, c]) => {
      setTypes(t?.data || []); setBalances(b?.data || []);
      setRows(m?.data || []); setChain(c?.data || null);
    }).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const selectedType = types.find((t) => t.id === form.leave_type_id);
  const cost = useMemo(() => spanDays(form.from_date, form.to_date, form.half_day), [form]);
  const bal = balances.find((b) => b.leave_type_id === form.leave_type_id);
  const short = bal && cost > Number(bal.available_days);

  const submit = async () => {
    setSaving(true);
    try {
      await leaveApi.apply({
        leave_type_id: form.leave_type_id,
        from_date: form.from_date,
        to_date: form.to_date,
        ...(form.half_day ? { half_day: form.half_day } : {}),
        ...(form.reason ? { reason: form.reason } : {}),
      });
      setOpen(false);
      setForm({ leave_type_id: '', from_date: '', to_date: '', half_day: '', reason: '' });
      setToast({ severity: 'success', text: 'Leave request submitted' });
      load();
    } catch (e) { setToast({ severity: 'error', text: e.message }); }
    finally { setSaving(false); }
  };

  const cancel = async (id) => {
    try { await leaveApi.cancel(id); setToast({ severity: 'success', text: 'Request cancelled' }); load(); }
    catch (e) { setToast({ severity: 'error', text: e.message }); }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
      <PageHeader
        title="My Leave"
        subtitle="Your balances, your requests, and who has to approve them."
        icon={EventAvailableIcon}
        right={<Btn onClick={() => setOpen(true)}>Apply for leave</Btn>}
      />

      {loading ? <Card><Skeleton h={16} w="40%" /><div style={{ height: 8 }} /><Skeleton h={12} w="70%" /></Card> : (
        <>
          <StatGrid>
            {balances.map((b) => (
              <StatTile
                key={b.leave_type_id}
                label={b.name}
                value={Number(b.available_days)}
                sub={`${Number(b.used_days)} used${Number(b.pending_days) > 0 ? ` · ${Number(b.pending_days)} held` : ''} of ${Number(b.annual_quota_days)}`}
              />
            ))}
          </StatGrid>
          {balances.length === 0 && <Card><EmptyState icon="🗓️" title="No leave types configured" text="HR sets these up under Leave Settings." /></Card>}

          {chain?.mode && (
            <Card style={{ marginTop: 16 }} title="How your leave gets approved">
              <div style={{ fontSize: 14, color: '#475569' }}>
                {chain.mode === 'none' ? 'Your requests are approved automatically.'
                  : (chain.steps || []).length === 0 ? 'No approver is configured yet — contact HR.'
                    : <>Needs approval from {chain.steps.map((s, i) => (
                      <span key={i}><strong>{s.approver_name || s.approver_role}</strong>{i < chain.steps.length - 1 ? ' then ' : ''}</span>
                    ))}.</>}
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>
                While you are on approved leave you will not receive new auto-assigned leads. Your existing leads stay with you.
              </div>
            </Card>
          )}

          <Card style={{ marginTop: 16 }} title="My requests">
            {rows.length === 0 ? <EmptyState icon="📭" title="No requests yet" text="Apply for leave and it will show up here with its approval trail." />
              : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead><tr style={{ background: '#fafbfc', textAlign: 'left' }}>
                      <th style={{ padding: 10 }}>Type</th><th style={{ padding: 10 }}>From</th><th style={{ padding: 10 }}>To</th>
                      <th style={{ padding: 10 }}>Days</th><th style={{ padding: 10 }}>Status</th><th style={{ padding: 10 }}>Pay</th>
                      <th style={{ padding: 10 }} />
                    </tr></thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} style={{ borderTop: '1px solid #eef2f7' }}>
                          <td style={{ padding: 10 }}>{r.type_name || '—'}{r.half_day ? ' · half day' : ''}</td>
                          <td style={{ padding: 10 }}>{d(r.from_date)}</td>
                          <td style={{ padding: 10 }}>{d(r.to_date)}</td>
                          <td style={{ padding: 10 }}>{Number(r.day_count)}</td>
                          <td style={{ padding: 10 }}><Badge tone={toneFor(r.status)}>{r.status}</Badge></td>
                          <td style={{ padding: 10 }}>
                            {Number(r.lop_days) > 0
                              ? <Badge tone="warn">{Number(r.lop_days)}d unpaid</Badge>
                              : <span style={{ color: '#94a3b8' }}>paid</span>}
                          </td>
                          <td style={{ padding: 10, textAlign: 'right' }}>
                            {['pending', 'approved'].includes(r.status)
                              && <Btn variant="ghost" size="sm" onClick={() => cancel(r.id)}>Cancel</Btn>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </Card>
        </>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Apply for leave</DialogTitle>
        <DialogContent>
          <Field label="Leave type" full>
            <Select size="small" fullWidth value={form.leave_type_id}
              onChange={(e) => setForm((f) => ({ ...f, leave_type_id: e.target.value, half_day: '' }))}>
              {types.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}{t.is_paid ? '' : ' (unpaid)'}</MenuItem>)}
            </Select>
          </Field>
          <div style={{ display: 'flex', gap: 12 }}>
            <Field label="From" full>
              <input type="date" style={input} value={form.from_date}
                onChange={(e) => setForm((f) => ({ ...f, from_date: e.target.value, to_date: f.to_date || e.target.value }))} />
            </Field>
            <Field label="To" full>
              <input type="date" style={input} value={form.to_date}
                onChange={(e) => setForm((f) => ({ ...f, to_date: e.target.value }))} />
            </Field>
          </div>

          {/* Half day only makes sense on a single date, and only if the type allows it. */}
          {selectedType?.allow_half_day && form.from_date && form.from_date === form.to_date && (
            <FormControlLabel
              control={<Checkbox checked={!!form.half_day}
                onChange={(e) => setForm((f) => ({ ...f, half_day: e.target.checked ? 'first_half' : '' }))} />}
              label="Half day"
            />
          )}
          {form.half_day && (
            <Field label="Which half" full>
              <Select size="small" fullWidth value={form.half_day}
                onChange={(e) => setForm((f) => ({ ...f, half_day: e.target.value }))}>
                <MenuItem value="first_half">First half</MenuItem>
                <MenuItem value="second_half">Second half</MenuItem>
              </Select>
            </Field>
          )}

          <Field label="Reason" full>
            <TextField size="small" fullWidth multiline minRows={2} value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
          </Field>

          {cost > 0 && (
            <div style={{ marginTop: 8, fontSize: 13, color: short ? '#b91c1c' : '#475569' }}>
              This request costs <strong>{cost}</strong> day{cost === 1 ? '' : 's'}
              {bal ? ` · ${Number(bal.available_days)} available` : ''}
              {short ? ' — more than your balance. It may be approved as loss of pay.' : ''}
            </div>
          )}
          {form.from_date && form.to_date && cost === 0 && (
            <div style={{ marginTop: 8, fontSize: 13, color: '#b91c1c' }}>
              Check the dates — a half day must be a single date, and the end date cannot be before the start.
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Btn variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn>
          <Btn disabled={saving || !form.leave_type_id || cost <= 0} onClick={submit}>
            {saving ? 'Submitting…' : 'Submit request'}
          </Btn>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity || 'info'} onClose={() => setToast(null)}>{toast?.text}</Alert>
      </Snackbar>
    </Box>
  );
}
