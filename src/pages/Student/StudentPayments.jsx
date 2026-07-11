// Student self-service payments — fee schedule, next EMI due, paid/balance, and
// downloadable receipts. Read-only (no online payment). Receipt download reuses
// the exact builder the Accounts + public /r/:token pages use, so layouts match.
import { useEffect, useState } from 'react';
import { studentApi } from '../../lib/studentApi';
import { publicReceiptsApi } from '../../lib/endpoints';
import { buildReceiptHtml } from '../../lib/receiptTemplate';
import { PageHeader, Card, EmptyState, Badge, Btn, Skeleton, Toast } from '../../lib/lmsUi';
import PaymentsIcon from '@mui/icons-material/PaymentsOutlined';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (v) => { if (!v) return '—'; try { return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return '—'; } };

export default function StudentPayments() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    studentApi.payments()
      .then((r) => setData(r?.data ?? r))
      .catch((e) => setToast(e.message))
      .finally(() => setLoading(false));
  }, []);

  const download = async (rcpt) => {
    if (!rcpt.share_token) { setToast('This receipt is not available for download yet.'); return; }
    setBusy(rcpt.id);
    try {
      const res = await publicReceiptsApi.lookup(rcpt.share_token);
      const payload = res?.data ?? res;
      const html = buildReceiptHtml(payload);
      const { downloadHtmlAsPdf } = await import('../../lib/htmlToPdf');
      await downloadHtmlAsPdf(html, `receipt-${rcpt.receipt_no || rcpt.id}.pdf`);
    } catch (e) { setToast(e.message || 'Could not download the receipt.'); }
    finally { setBusy(''); }
  };

  if (loading) return <Card><Skeleton h={16} w="50%" /><div style={{ height: 10 }} /><Skeleton h={12} w="70%" /></Card>;

  if (!data?.has_admission) {
    return (
      <div>
        <PageHeader title="Fees & Payments" subtitle="Your fee schedule, dues and receipts." icon={PaymentsIcon} />
        <Card><EmptyState icon="🧾" title="No fee record yet" text="Once your admission is confirmed, your fee schedule and receipts will show here." /></Card>
      </div>
    );
  }

  const { totals = {}, next_due: nextDue, fee_schedule: schedule = [], receipts = [] } = data;
  return (
    <div>
      <PageHeader title="Fees & Payments" subtitle="Your fee schedule, dues and receipts." icon={PaymentsIcon} />

      {/* Summary tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 18 }}>
        <Card style={{ padding: 16 }}>
          <div style={tileLbl}>Total fees</div>
          <div style={tileVal}>{inr(totals.total)}</div>
        </Card>
        <Card style={{ padding: 16 }}>
          <div style={tileLbl}>Paid</div>
          <div style={{ ...tileVal, color: '#15803d' }}>{inr(totals.paid)}</div>
        </Card>
        <Card style={{ padding: 16 }}>
          <div style={tileLbl}>Balance</div>
          <div style={{ ...tileVal, color: totals.due > 0 ? '#b45309' : '#15803d' }}>{inr(totals.due)}</div>
        </Card>
        <Card style={{ padding: 16 }}>
          <div style={tileLbl}>Next due</div>
          {nextDue
            ? <div><div style={{ ...tileVal, fontSize: 18 }}>{inr(nextDue.amount)}</div><div style={{ fontSize: 12.5, color: '#64748b' }}>{nextDue.label} · {fmtDate(nextDue.due_date)}</div></div>
            : <div style={{ ...tileVal, fontSize: 16, color: '#15803d' }}>All clear 🎉</div>}
        </Card>
      </div>

      {/* Fee schedule */}
      <Card title="Fee schedule" style={{ marginBottom: 18 }}>
        {schedule.length === 0 ? <EmptyState icon="📅" title="No schedule" text="No installment schedule on record." /> : (
          <div style={{ display: 'grid', gap: 8 }}>
            {schedule.map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < schedule.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>{r.label}</div>
                  <div style={{ fontSize: 12.5, color: '#94a3b8' }}>{r.due_date ? `Due ${fmtDate(r.due_date)}` : 'On confirmation'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{inr(r.amount)}</span>
                  {r.paid ? <Badge tone="success">Paid{r.paid_on ? ` · ${fmtDate(r.paid_on)}` : ''}</Badge> : <Badge tone="warning">Due</Badge>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Receipts */}
      <Card title="Receipts">
        {receipts.length === 0 ? <EmptyState icon="🧾" title="No receipts yet" text="Your payment receipts will appear here as they're issued." /> : (
          <div style={{ display: 'grid', gap: 8 }}>
            {receipts.map((r) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>{r.receipt_no || 'Receipt'} <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 12, textTransform: 'capitalize' }}>· {r.receipt_kind}{r.installment_no ? ` #${r.installment_no}` : ''}</span></div>
                  <div style={{ fontSize: 12.5, color: '#94a3b8' }}>{fmtDate(r.receipt_date)} · {r.mode_of_payment || '—'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{inr(r.amount)}</span>
                  <Btn size="sm" variant="ghost" onClick={() => download(r)} disabled={busy === r.id || !r.share_token}>
                    {busy === r.id ? 'Preparing…' : 'Download'}
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Toast msg={toast} onClose={() => setToast('')} />
    </div>
  );
}

const tileLbl = { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 };
const tileVal = { fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: -0.3 };
