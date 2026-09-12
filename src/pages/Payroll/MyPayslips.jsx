// My Payslips — every employee's own, whatever their role.
//
// Draft payslips are never returned by the API, so what lands here is by
// definition published. The breakdown is the frozen snapshot taken when the run
// was computed, not a re-derivation — a later raise must not rewrite history.
import { useEffect, useState, useCallback } from 'react';
import { Box, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLongOutlined';
import { payrollApi } from '../../lib/endpoints';
import { PageHeader, Card, EmptyState, Badge, Skeleton, Btn } from '../../lib/lmsUi';

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MyPayslips() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    payrollApi.myPayslips()
      .then((r) => setRows(r?.data || []))
      .catch((e) => setToast({ severity: 'error', text: e.message }))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const earnings = (open?.components || []).filter((c) => c.kind === 'earning');
  const deductions = (open?.components || []).filter((c) => c.kind === 'deduction');

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
      <PageHeader title="My Payslips" subtitle="Your published payslips, newest first." icon={ReceiptLongIcon} />

      {loading ? <Card><Skeleton h={16} w="40%" /><div style={{ height: 8 }} /><Skeleton h={12} w="70%" /></Card>
        : rows.length === 0 ? (
          <Card><EmptyState icon="🧾" title="No payslips yet"
            text="Once payroll is run and approved for a month, your payslip appears here." /></Card>
        ) : (
          <Card pad={0}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead><tr style={{ background: '#fafbfc', textAlign: 'left' }}>
                  <th style={{ padding: 10 }}>Month</th><th style={{ padding: 10 }}>Gross</th>
                  <th style={{ padding: 10 }}>Deductions</th><th style={{ padding: 10 }}>Net pay</th>
                  <th style={{ padding: 10 }}>Status</th><th style={{ padding: 10 }} />
                </tr></thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id} style={{ borderTop: '1px solid #eef2f7' }}>
                      <td style={{ padding: 10 }}>{MONTHS[p.period_month]} {p.period_year}</td>
                      <td style={{ padding: 10 }}>{inr(p.gross_earnings)}</td>
                      <td style={{ padding: 10, color: '#b91c1c' }}>−{inr(p.total_deductions)}</td>
                      <td style={{ padding: 10, fontWeight: 600 }}>{inr(p.net_pay)}</td>
                      <td style={{ padding: 10 }}>
                        <Badge tone={p.disbursement_status === 'paid' ? 'success' : 'info'}>
                          {p.disbursement_status === 'paid' ? 'Paid' : 'Published'}
                        </Badge>
                        {Number(p.lop_days) > 0 && <> <Badge tone="warn">{Number(p.lop_days)}d LOP</Badge></>}
                      </td>
                      <td style={{ padding: 10, textAlign: 'right' }}>
                        <Btn size="sm" variant="ghost" onClick={() => setOpen(p)}>View</Btn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

      <Dialog open={!!open} onClose={() => setOpen(null)} fullWidth maxWidth="sm">
        <DialogTitle>Payslip — {open ? `${MONTHS[open.period_month]} ${open.period_year}` : ''}</DialogTitle>
        <DialogContent>
          {open && (
            <>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
                {Number(open.working_days)} working days
                {Number(open.lop_days) > 0 ? ` · ${Number(open.lop_days)} unpaid` : ''}
              </div>

              <div style={{ fontWeight: 700, fontSize: 13, color: '#334155', marginBottom: 6 }}>EARNINGS</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginBottom: 14 }}>
                <tbody>
                  {earnings.map((c) => (
                    <tr key={c.code} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '7px 0' }}>
                        {c.name}
                        {/* Show the arithmetic for variable pay — "3 × ₹500" is
                            the line people actually query. */}
                        {c.units != null && Number(c.units) > 0 && c.rate != null && (
                          <span style={{ color: '#94a3b8', fontSize: 12 }}> · {Number(c.units)} × {inr(c.rate)}</span>
                        )}
                        {c.percent != null && (
                          <span style={{ color: '#94a3b8', fontSize: 12 }}> · {Number(c.percent)}% of {c.of || 'basic'}</span>
                        )}
                        {c.pro_rated && <span style={{ color: '#b45309', fontSize: 12 }}> · pro-rated</span>}
                      </td>
                      <td style={{ padding: '7px 0', textAlign: 'right' }}>{inr(c.amount)}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid #e2e8f0', fontWeight: 600 }}>
                    <td style={{ padding: '7px 0' }}>Gross earnings</td>
                    <td style={{ padding: '7px 0', textAlign: 'right' }}>{inr(open.gross_earnings)}</td>
                  </tr>
                </tbody>
              </table>

              {deductions.length > 0 && (
                <>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#334155', marginBottom: 6 }}>DEDUCTIONS</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginBottom: 14 }}>
                    <tbody>
                      {deductions.map((c) => (
                        <tr key={c.code} style={{ borderTop: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '7px 0' }}>{c.name}</td>
                          <td style={{ padding: '7px 0', textAlign: 'right', color: '#b91c1c' }}>−{inr(c.amount)}</td>
                        </tr>
                      ))}
                      <tr style={{ borderTop: '2px solid #e2e8f0', fontWeight: 600 }}>
                        <td style={{ padding: '7px 0' }}>Total deductions</td>
                        <td style={{ padding: '7px 0', textAlign: 'right', color: '#b91c1c' }}>−{inr(open.total_deductions)}</td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: '#f8fafc', borderRadius: 10, fontWeight: 700 }}>
                <span>Net pay</span><span>{inr(open.net_pay)}</span>
              </div>
            </>
          )}
        </DialogContent>
        <DialogActions><Btn variant="ghost" onClick={() => setOpen(null)}>Close</Btn></DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity || 'info'} onClose={() => setToast(null)}>{toast?.text}</Alert>
      </Snackbar>
    </Box>
  );
}
