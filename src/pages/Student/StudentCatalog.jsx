// Student Catalog — browse other courses and raise an "Enrol" enquiry, which
// creates a lead for the sales team (no payment here).
import { useEffect, useState } from 'react';
import { studentApi } from '../../lib/studentApi';
import { PageHeader, Card, EmptyState, Skeleton } from '../../lib/lmsUi';
import StorefrontIcon from '@mui/icons-material/StorefrontOutlined';

const money = (n, cur) => (n == null ? null : `${cur === 'USD' ? '$' : '₹'}${Number(n).toLocaleString('en-IN')}`);

export default function StudentCatalog() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enquiring, setEnquiring] = useState(null);
  const [enquired, setEnquired] = useState({});
  const [toast, setToast] = useState('');

  useEffect(() => { studentApi.catalog().then((r) => setRows(r?.data || [])).catch(() => {}).finally(() => setLoading(false)); }, []);

  const enquire = async (p) => {
    setEnquiring(p.id);
    try { await studentApi.enquire(p.id); setEnquired((e) => ({ ...e, [p.id]: true })); setToast(`Enquiry sent for "${p.name}" — our team will reach out.`); }
    catch (e) { setToast(e.message); } finally { setEnquiring(null); }
  };

  if (loading) return (
    <div>
      <PageHeader title="Explore Courses" subtitle="Interested in another course? Send an enquiry and our team will get in touch." icon={StorefrontIcon} />
      <Card><Skeleton h={16} w="50%" /><div style={{ height: 8 }} /><Skeleton h={12} w="70%" /></Card>
    </div>
  );
  return (
    <div>
      <PageHeader title="Explore Courses" subtitle="Interested in another course? Send an enquiry and our team will get in touch." icon={StorefrontIcon} />
      {rows.length === 0 ? <Card><EmptyState icon="🎓" title="No other courses right now" text="New courses will show up here as soon as they're added to the catalog." /></Card> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {rows.map((p) => (
            <div key={p.id} style={{ background: '#fff', border: '1px solid #eef0f5', borderRadius: 16, boxShadow: '0 2px 12px -8px rgba(15,23,42,0.18)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {p.image_url && <img src={p.image_url} alt={p.name} style={{ width: '100%', height: 120, objectFit: 'cover' }} />}
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{p.name}</div>
                {p.description && <div style={{ fontSize: 13, color: '#64748b', flex: 1 }}>{p.description.slice(0, 120)}{p.description.length > 120 ? '…' : ''}</div>}
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  {p.discount_price != null
                    ? <><b style={{ color: '#0f172a' }}>{money(p.discount_price, p.currency)}</b><s style={{ color: '#94a3b8', fontSize: 12 }}>{money(p.price, p.currency)}</s></>
                    : p.price != null && <b style={{ color: '#0f172a' }}>{money(p.price, p.currency)}</b>}
                  {p.type && <span style={{ fontSize: 11, color: '#64748b', marginLeft: 'auto' }}>{p.type}</span>}
                </div>
                <button
                  onClick={() => enquire(p)} disabled={enquiring === p.id || enquired[p.id]}
                  style={{ marginTop: 6, background: enquired[p.id] ? '#dcfce7' : '#E53935', color: enquired[p.id] ? '#15803d' : '#fff', border: 'none', borderRadius: 8, padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: enquired[p.id] ? 'default' : 'pointer' }}>
                  {enquired[p.id] ? '✓ Enquiry sent' : enquiring === p.id ? 'Sending…' : 'Enrol / Enquire'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {toast && <div style={toastBox} onClick={() => setToast('')}>{toast}</div>}
    </div>
  );
}

const toastBox = { position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: '#0f172a', color: '#fff', padding: '10px 18px', borderRadius: 8, fontSize: 13, cursor: 'pointer', zIndex: 50 };
