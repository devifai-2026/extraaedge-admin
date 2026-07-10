// Public receipt page — anyone with the share URL can view + print this.
//
// Loaded via /r/:token. Hits /api/v1/public/receipts/:token, which returns the
// receipt + admission summary + tenant branding + fee schedule. The visual
// layout is produced by the SHARED builder (lib/receiptTemplate) so the printed
// page and the admin "Download PDF" are byte-identical. Printing uses the
// browser's native dialog (window.print → "Save as PDF"), no extra deps.
//
// Trust model: the URL token IS the credential (32-byte random, stored on the
// receipt row). We only render what the BE chose to expose.
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { publicReceiptsApi } from '../../lib/endpoints';
import { buildReceiptHtml } from '../../lib/receiptTemplate';

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

  const accent = data.tenant?.brand_primary_color || '#E53935';
  const html = buildReceiptHtml(data);

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '28px 16px' }}>
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .receipt-card { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        {/* Top toolbar — hidden on print */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button
            onClick={() => window.print()}
            style={{
              border: 'none', background: accent, color: '#fff',
              padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Print / Save as PDF
          </button>
        </div>

        <div
          className="receipt-card"
          style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 20px 40px -20px rgba(15,23,42,0.18)', overflow: 'hidden' }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
