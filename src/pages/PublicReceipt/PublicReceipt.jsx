// Public receipt page — anyone with the share URL can view + print this.
//
// Loaded via /r/:token. The page hits /api/v1/public/receipts/:token,
// which returns the receipt + admission summary + tenant branding. The
// layout is print-friendly (a window.print() button uses the browser's
// native PDF dialog, no extra deps).
//
// Trust model: the URL token IS the credential (32-byte random, stored
// on the receipt row). We only show what the BE chose to expose — no
// internal admission state, no owner / lead data.
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { publicReceiptsApi } from '../../lib/endpoints';

const fmtMoney = (n) => (n != null ? Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—');
const fmtDate = (v) => {
  if (!v) return '—';
  try { return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return '—'; }
};

const kindLabel = (r) => {
  if (r.receipt_kind === 'installment') return `Installment ${r.installment_no}`;
  if (r.receipt_kind === 'registration') return 'Registration';
  return 'Other';
};

export default function PublicReceipt() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!token) return;
    publicReceiptsApi.lookup(token)
      .then((r) => setData(r?.data || null))
      .catch((e) => setErr(e?.message || 'Receipt not found'));
  }, [token]);

  if (err) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ background: '#fff', padding: 32, borderRadius: 12, border: '1px solid #e2e8f0', maxWidth: 480, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>Receipt unavailable</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>{err}</div>
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#94a3b8', fontFamily: 'system-ui, sans-serif' }}>
        Loading…
      </div>
    );
  }

  const { receipt, admission, tenant } = data;
  const accent = tenant?.brand_primary_color || '#4f46e5';

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '32px 16px', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        @media print {
          @page { margin: 16mm; }
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .receipt-card { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Top toolbar — hidden on print */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12, gap: 8 }}>
          <button
            onClick={() => window.print()}
            style={{
              border: 'none', background: accent, color: '#fff',
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Print / Save as PDF
          </button>
        </div>

        <div
          className="receipt-card"
          style={{
            background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
            boxShadow: '0 20px 40px -20px rgba(15, 23, 42, 0.18)', overflow: 'hidden',
          }}
        >
          {/* Branded header */}
          <div style={{ background: accent, color: '#fff', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {tenant.logo_url && (
                <img src={tenant.logo_url} alt={tenant.name} style={{ width: 44, height: 44, objectFit: 'contain', background: '#fff', borderRadius: 8, padding: 4 }} />
              )}
              <div>
                <div style={{ fontSize: 11, opacity: 0.85, letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: 600 }}>{tenant.name}</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>Payment Receipt</div>
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 12, opacity: 0.95 }}>
              <div style={{ fontWeight: 700 }}>{receipt.receipt_no}</div>
              <div>{fmtDate(receipt.receipt_date)}</div>
            </div>
          </div>

          {/* Body — money first, KV grid below */}
          <div style={{ padding: 24 }}>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>Amount Received</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums', marginTop: 4 }}>
                  ₹ {fmtMoney(receipt.amount)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>For</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginTop: 4 }}>{kindLabel(receipt)}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 20 }}>
              <KV label="Student" value={admission.student_name} />
              <KV label="Course" value={admission.program_name} />
              <KV label="Admission Date" value={fmtDate(admission.admission_date)} />
              <KV label="Mode of Payment" value={(receipt.mode_of_payment || '—').toUpperCase()} />
              {receipt.transaction_details && (
                <KV label="Reference" value={receipt.transaction_details} fullSpan />
              )}
            </div>

            {/* Payment screenshot — surfaced when accounts attached one
                at capture time. Lets parents/students verify what was
                credited matches the UPI/bank confirmation they sent. */}
            {receipt.payment_screenshot_url && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, marginBottom: 6 }}>Payment Proof</div>
                <a href={receipt.payment_screenshot_url} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
                  <img
                    src={receipt.payment_screenshot_url}
                    alt="Payment screenshot"
                    style={{
                      maxWidth: '100%', maxHeight: 320, objectFit: 'contain',
                      borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc',
                    }}
                  />
                </a>
              </div>
            )}

            <div style={{ marginTop: 28, paddingTop: 16, borderTop: '1px dashed #e2e8f0', fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
              This is a system-generated receipt. For any queries, please contact the accounts team.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const KV = ({ label, value, fullSpan }) => (
  <div style={fullSpan ? { gridColumn: '1 / -1' } : undefined}>
    <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>{label}</div>
    <div style={{ fontSize: 14, color: '#0f172a', marginTop: 2 }}>{value || '—'}</div>
  </div>
);
