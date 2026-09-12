// Leave Approvals — the approver's inbox.
//
// The decision here is two decisions in one: allow the absence, and decide
// whether it is paid. Loss of pay is the approver's call — an employee may
// apply as Casual Leave and still be approved as unpaid — so the LOP control
// sits in the approve dialog rather than anywhere the applicant can reach.
import { useEffect, useState, useCallback } from 'react';
import { Box, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControlLabel, Checkbox } from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheckOutlined';
import { leaveApi } from '../../lib/endpoints';
import { PageHeader, Card, EmptyState, Badge, Skeleton, Btn, Field, input } from '../../lib/lmsUi';

const d = (v) => (v ? String(v).slice(0, 10).split('-').reverse().join('/') : '—');

export default function LeaveApprovals() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [target, setTarget] = useState(null);     // row being decided
  const [approve, setApprove] = useState(true);
  const [note, setNote] = useState('');
  const [markLop, setMarkLop] = useState(false);
  const [lopDays, setLopDays] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    leaveApi.pendingQueue()
      .then((r) => setQueue(r?.data || []))
      .catch((e) => setToast({ severity: 'error', text: e.message }))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const openDecide = (row, isApprove) => {
    setTarget(row); setApprove(isApprove); setNote('');
    setMarkLop(false); setLopDays(String(Number(row.day_count)));
  };

  const submit = async () => {
    setSaving(true);
    try {
      await leaveApi.decide(target.leave_id, {
        approve,
        ...(note ? { note } : {}),
        ...(approve && markLop ? { mark_lop: true, lop_days: Number(lopDays) } : {}),
        ...(approve && !markLop ? { mark_lop: false } : {}),
      });
      setTarget(null);
      setToast({ severity: 'success', text: approve ? 'Leave approved' : 'Leave declined' });
      load();
    } catch (e) { setToast({ severity: 'error', text: e.message }); }
    finally { setSaving(false); }
  };

  const full = target ? Number(target.day_count) : 0;
  const lopNum = Number(lopDays);
  const lopInvalid = markLop && (!Number.isFinite(lopNum) || lopNum < 0 || lopNum > full || Math.round(lopNum * 2) !== lopNum * 2);

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
      <PageHeader title="Leave Approvals" subtitle="Requests waiting on your decision." icon={FactCheckIcon} />

      {loading ? <Card><Skeleton h={16} w="40%" /><div style={{ height: 8 }} /><Skeleton h={12} w="70%" /></Card>
        : queue.length === 0 ? <Card><EmptyState icon="✅" title="Nothing waiting on you" text="Leave requests that need your approval will appear here." /></Card>
          : (
            <Card pad={0}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead><tr style={{ background: '#fafbfc', textAlign: 'left' }}>
                    <th style={{ padding: 10 }}>Employee</th><th style={{ padding: 10 }}>Type</th>
                    <th style={{ padding: 10 }}>From</th><th style={{ padding: 10 }}>To</th>
                    <th style={{ padding: 10 }}>Days</th><th style={{ padding: 10 }}>Reason</th>
                    <th style={{ padding: 10 }} />
                  </tr></thead>
                  <tbody>
                    {queue.map((r) => (
                      <tr key={r.approval_id} style={{ borderTop: '1px solid #eef2f7' }}>
                        <td style={{ padding: 10 }}>{r.user_name} <span style={{ color: '#94a3b8', fontSize: 12 }}>· {r.user_role}</span></td>
                        <td style={{ padding: 10 }}>{r.type_name || '—'}</td>
                        <td style={{ padding: 10 }}>{d(r.from_date)}</td>
                        <td style={{ padding: 10 }}>{d(r.to_date)}</td>
                        <td style={{ padding: 10 }}>{Number(r.day_count)}</td>
                        <td style={{ padding: 10, color: '#64748b', maxWidth: 260 }}>{r.reason || '—'}</td>
                        <td style={{ padding: 10, textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <Btn size="sm" onClick={() => openDecide(r, true)}>Approve</Btn>{' '}
                          <Btn size="sm" variant="ghost" onClick={() => openDecide(r, false)}>Decline</Btn>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

      <Dialog open={!!target} onClose={() => setTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>{approve ? 'Approve' : 'Decline'} leave — {target?.user_name}</DialogTitle>
        <DialogContent>
          {target && (
            <div style={{ fontSize: 14, color: '#475569', marginBottom: 12 }}>
              {target.type_name} · {d(target.from_date)} to {d(target.to_date)} · <strong>{Number(target.day_count)}</strong> day(s)
            </div>
          )}

          {approve && (
            <>
              <FormControlLabel
                control={<Checkbox checked={markLop} onChange={(e) => setMarkLop(e.target.checked)} />}
                label="Mark as loss of pay (deduct from this month's salary)"
              />
              {markLop && (
                <Field label={`Unpaid days (max ${full}, in steps of 0.5)`} full
                  error={lopInvalid ? `Enter a value between 0 and ${full} in 0.5 steps` : undefined}>
                  <input type="number" step="0.5" min="0" max={full} style={input}
                    value={lopDays} onChange={(e) => setLopDays(e.target.value)} />
                </Field>
              )}
              {markLop && !lopInvalid && (
                <div style={{ fontSize: 13, color: '#92400e', marginTop: 6 }}>
                  {lopNum} of {full} day(s) will be deducted in payroll.
                  {lopNum < full ? ` The remaining ${full - lopNum} day(s) come off their paid quota.` : ' No paid quota will be used.'}
                </div>
              )}
            </>
          )}

          <Field label={approve ? 'Note (optional)' : 'Reason for declining (required)'} full>
            <TextField size="small" fullWidth multiline minRows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </DialogContent>
        <DialogActions>
          <Btn variant="ghost" onClick={() => setTarget(null)}>Cancel</Btn>
          <Btn disabled={saving || lopInvalid || (!approve && !note)} onClick={submit}>
            {saving ? 'Saving…' : approve ? 'Approve' : 'Decline'}
          </Btn>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity || 'info'} onClose={() => setToast(null)}>{toast?.text}</Alert>
      </Snackbar>
    </Box>
  );
}
