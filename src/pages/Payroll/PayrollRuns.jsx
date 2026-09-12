// Payroll Runs — create, compute, review, approve, disburse.
//
// The flow is deliberately staged: draft → review → approved → paid. Review
// exists so a wrong number can be found and recomputed BEFORE approval; after
// approval the payslip snapshot is history and recompute is refused.
//
// Segregation of duties is enforced server-side: whoever computes a run cannot
// also mark it paid. The UI reflects that but does not rely on it.
import { useEffect, useState, useCallback } from 'react';
import {
  Box, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  Select, MenuItem, TextField,
} from '@mui/material';
import PaymentsIcon from '@mui/icons-material/PaymentsOutlined';
import { payrollApi } from '../../lib/endpoints';
import { PageHeader, Card, EmptyState, Badge, Skeleton, Btn, Field, input, StatGrid, StatTile } from '../../lib/lmsUi';

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const inr2 = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const d = (v) => (v ? String(v).slice(0, 10).split('-').reverse().join('/') : '—');

const STATUS_TONE = { draft: 'neutral', processing: 'info', review: 'warn', approved: 'info', paid: 'success', cancelled: 'neutral' };

export default function PayrollRuns() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [form, setForm] = useState({ period_month: now.getMonth() + 1, period_year: now.getFullYear(), pay_date: '' });

  // The run being inspected, plus its payslips.
  const [detail, setDetail] = useState(null);
  const [slips, setSlips] = useState([]);
  const [payTarget, setPayTarget] = useState(null);
  const [payRef, setPayRef] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    payrollApi.runs()
      .then((r) => setRuns(r?.data || []))
      .catch((e) => setToast({ severity: 'error', text: e.message }))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const openDetail = async (run) => {
    setDetail(run);
    try { setSlips((await payrollApi.runPayslips(run.id))?.data || []); }
    catch (e) { setToast({ severity: 'error', text: e.message }); setSlips([]); }
  };

  const act = async (fn, okMsg) => {
    setBusy(true);
    try {
      const out = await fn();
      setToast({ severity: 'success', text: okMsg });
      load();
      if (detail) {
        const fresh = (await payrollApi.runs())?.data?.find((r) => r.id === detail.id);
        if (fresh) setDetail(fresh);
        setSlips((await payrollApi.runPayslips(detail.id))?.data || []);
      }
      return out;
    } catch (e) { setToast({ severity: 'error', text: e.message }); return null; }
    finally { setBusy(false); }
  };

  const create = async () => {
    const out = await act(() => payrollApi.createRun({
      period_month: Number(form.period_month),
      period_year: Number(form.period_year),
      ...(form.pay_date ? { pay_date: form.pay_date } : {}),
    }), 'Payroll run created');
    if (out) { setOpen(false); openDetail(out.data ?? out); }
  };

  const markPaid = async () => {
    const out = await act(() => payrollApi.markPaid(payTarget.disbursement_id, { reference_no: payRef || undefined }),
      'Payment recorded');
    setPayTarget(null); setPayRef('');
    // The server flags the payment that COMPLETES the run, so this fires once.
    if (out?.data?.completed) {
      setToast({ severity: 'success', text: 'All salaries disbursed — the admin and branch manager have been notified.' });
    }
  };

  const paidCount = slips.filter((s) => s.disbursement_status === 'paid').length;

  return (
    <Box sx={{ p: 3, maxWidth: 1300, mx: 'auto' }}>
      <PageHeader
        title="Payroll Runs"
        subtitle="One run per month. Compute, review, approve, then disburse."
        icon={PaymentsIcon}
        right={<Btn onClick={() => setOpen(true)}>New run</Btn>}
      />

      {loading ? <Card><Skeleton h={16} w="40%" /><div style={{ height: 8 }} /><Skeleton h={12} w="70%" /></Card>
        : runs.length === 0 ? (
          <Card><EmptyState icon="💸" title="No payroll runs yet"
            text="Create a run for a month, compute it, and review the payslips before approving."
            action={<Btn onClick={() => setOpen(true)}>Create the first run</Btn>} /></Card>
        ) : (
          <Card pad={0}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead><tr style={{ background: '#fafbfc', textAlign: 'left' }}>
                  <th style={{ padding: 10 }}>Period</th><th style={{ padding: 10 }}>Employees</th>
                  <th style={{ padding: 10 }}>Gross</th><th style={{ padding: 10 }}>Net</th>
                  <th style={{ padding: 10 }}>Pay date</th><th style={{ padding: 10 }}>Status</th>
                  <th style={{ padding: 10 }} />
                </tr></thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id} style={{ borderTop: '1px solid #eef2f7' }}>
                      <td style={{ padding: 10, fontWeight: 500 }}>{MONTHS[r.period_month]} {r.period_year}</td>
                      <td style={{ padding: 10 }}>{r.employee_count || '—'}</td>
                      <td style={{ padding: 10 }}>{inr(r.total_gross)}</td>
                      <td style={{ padding: 10, fontWeight: 600 }}>{inr(r.total_net)}</td>
                      <td style={{ padding: 10 }}>{d(r.pay_date)}</td>
                      <td style={{ padding: 10 }}>
                        <Badge tone={STATUS_TONE[r.status] || 'neutral'}>{r.status}</Badge>
                        {r.status === 'approved' && r.employee_count > 0 && (
                          <span style={{ color: '#64748b', fontSize: 12 }}> · {r.paid_count || 0}/{r.employee_count} paid</span>
                        )}
                      </td>
                      <td style={{ padding: 10, textAlign: 'right' }}>
                        <Btn size="sm" variant="ghost" onClick={() => openDetail(r)}>Open</Btn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

      {/* ---- run detail ---- */}
      <Dialog open={!!detail} onClose={() => setDetail(null)} fullWidth maxWidth="lg">
        <DialogTitle>
          {detail ? `${MONTHS[detail.period_month]} ${detail.period_year}` : ''}
          {detail && <> <Badge tone={STATUS_TONE[detail.status]}>{detail.status}</Badge></>}
        </DialogTitle>
        <DialogContent>
          {detail && (
            <>
              <StatGrid min={170}>
                <StatTile label="Employees" value={detail.employee_count || 0} />
                <StatTile label="Gross" value={inr(detail.total_gross)} />
                <StatTile label="Deductions" value={inr(detail.total_deductions)} />
                <StatTile label="Net payable" value={inr(detail.total_net)} sub={`pay date ${d(detail.pay_date)}`} />
              </StatGrid>

              <div style={{ display: 'flex', gap: 8, margin: '14px 0', flexWrap: 'wrap' }}>
                {['draft', 'processing', 'review'].includes(detail.status) && (
                  <Btn disabled={busy} onClick={() => act(() => payrollApi.compute(detail.id), 'Payroll computed')}>
                    {detail.employee_count ? 'Recompute' : 'Compute'}
                  </Btn>
                )}
                {detail.status === 'review' && (
                  <Btn disabled={busy} onClick={() => act(() => payrollApi.approve(detail.id), 'Run approved — disbursements opened')}>
                    Approve
                  </Btn>
                )}
                {detail.status === 'review' && (
                  <span style={{ fontSize: 13, color: '#64748b', alignSelf: 'center' }}>
                    Check the numbers first — after approval they are frozen.
                  </span>
                )}
                {['approved', 'paid'].includes(detail.status) && (
                  <span style={{ fontSize: 13, color: '#64748b', alignSelf: 'center' }}>
                    {paidCount}/{slips.length} disbursed. Only a super admin can record a payment.
                  </span>
                )}
              </div>

              {slips.length === 0 ? (
                <EmptyState icon="🧮" title="Not computed yet"
                  text="Compute the run to generate a payslip for everyone with an active salary structure." />
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr style={{ background: '#fafbfc', textAlign: 'left' }}>
                      <th style={{ padding: 9 }}>Employee</th><th style={{ padding: 9 }}>Role</th>
                      <th style={{ padding: 9 }}>LOP</th><th style={{ padding: 9 }}>Gross</th>
                      <th style={{ padding: 9 }}>Deductions</th><th style={{ padding: 9 }}>Net</th>
                      <th style={{ padding: 9 }}>Payment</th><th style={{ padding: 9 }} />
                    </tr></thead>
                    <tbody>
                      {slips.map((s) => (
                        <tr key={s.id} style={{ borderTop: '1px solid #eef2f7' }}>
                          <td style={{ padding: 9 }}>{s.user_name}</td>
                          <td style={{ padding: 9, color: '#64748b' }}>{s.user_role}</td>
                          <td style={{ padding: 9 }}>{Number(s.lop_days) > 0 ? <Badge tone="warn">{Number(s.lop_days)}d</Badge> : '—'}</td>
                          <td style={{ padding: 9 }}>{inr2(s.gross_earnings)}</td>
                          <td style={{ padding: 9, color: '#b91c1c' }}>−{inr2(s.total_deductions)}</td>
                          <td style={{ padding: 9, fontWeight: 600 }}>{inr2(s.net_pay)}</td>
                          <td style={{ padding: 9 }}>
                            {s.disbursement_status === 'paid'
                              ? <Badge tone="success">paid{s.reference_no ? ` · ${s.reference_no}` : ''}</Badge>
                              : s.disbursement_id ? <Badge tone="info">pending</Badge> : '—'}
                          </td>
                          <td style={{ padding: 9, textAlign: 'right' }}>
                            {s.disbursement_id && s.disbursement_status !== 'paid' && (
                              <Btn size="sm" variant="ghost" onClick={() => { setPayTarget(s); setPayRef(''); }}>
                                Mark paid
                              </Btn>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions><Btn variant="ghost" onClick={() => setDetail(null)}>Close</Btn></DialogActions>
      </Dialog>

      {/* ---- new run ---- */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>New payroll run</DialogTitle>
        <DialogContent>
          <Field label="Month" full>
            <Select size="small" fullWidth value={form.period_month}
              onChange={(e) => setForm((f) => ({ ...f, period_month: e.target.value }))}>
              {MONTHS.slice(1).map((m, i) => <MenuItem key={m} value={i + 1}>{m}</MenuItem>)}
            </Select>
          </Field>
          <Field label="Year" full>
            <TextField size="small" fullWidth type="number" value={form.period_year}
              onChange={(e) => setForm((f) => ({ ...f, period_year: e.target.value }))} />
          </Field>
          <Field label="Pay date" hint="Leave blank to use the tenant's configured pay day" full>
            <input type="date" style={input} value={form.pay_date}
              onChange={(e) => setForm((f) => ({ ...f, pay_date: e.target.value }))} />
          </Field>
        </DialogContent>
        <DialogActions>
          <Btn variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn>
          <Btn disabled={busy} onClick={create}>Create</Btn>
        </DialogActions>
      </Dialog>

      {/* ---- mark paid ---- */}
      <Dialog open={!!payTarget} onClose={() => setPayTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Record payment — {payTarget?.user_name}</DialogTitle>
        <DialogContent>
          <div style={{ fontSize: 14, marginBottom: 10 }}>
            Net payable: <strong>{inr2(payTarget?.net_pay)}</strong>
          </div>
          <Field label="Reference number" hint="UTR, cheque number, or however you paid" full>
            <TextField size="small" fullWidth value={payRef} onChange={(e) => setPayRef(e.target.value)} />
          </Field>
          <div style={{ fontSize: 13, color: '#64748b' }}>
            This records that the money was sent. It does not move any money itself.
          </div>
        </DialogContent>
        <DialogActions>
          <Btn variant="ghost" onClick={() => setPayTarget(null)}>Cancel</Btn>
          <Btn disabled={busy} onClick={markPaid}>Mark paid</Btn>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={5000} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity || 'info'} onClose={() => setToast(null)}>{toast?.text}</Alert>
      </Snackbar>
    </Box>
  );
}
