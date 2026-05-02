// Settings → Subscription Manager
import { useEffect, useState } from 'react';
import { CircularProgress } from '@mui/material';
import { subscriptionApi } from '../../lib/endpoints';
import Breadcrumb from './Breadcrumb';

export default function SubscriptionPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    subscriptionApi.current()
      .then((r) => setData(r?.data || {}))
      .catch((e) => setError(e.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ background: '#fafafa', minHeight: '100vh' }}>
      <Breadcrumb trail={[
        { label: 'Settings', path: '/advancedsettings' },
        { label: 'Subscription' },
      ]} />

      <div style={{ padding: 24 }}>
        {loading && <CircularProgress />}
        {error && <div style={{ color: '#d32f2f' }}>{error}</div>}
        {data && (
          <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, padding: 24, maxWidth: 900 }}>
            <h3 style={{ marginTop: 0 }}>Plan: {data.plan?.plan_name || 'No plan assigned'}</h3>
            <div style={{ color: '#666', marginBottom: 16 }}>
              Trial ends: {data.plan?.trial_ends_at ? new Date(data.plan.trial_ends_at).toLocaleDateString() : '—'}<br />
              Subscription ends: {data.plan?.subscription_ends_at ? new Date(data.plan.subscription_ends_at).toLocaleDateString() : '—'}
            </div>
            <h4>Credits</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', border: '1px solid #e8e8e8', borderRadius: 4 }}>
              <thead>
                <tr style={{ background: '#fdf3ed' }}>
                  {['Type', 'Balance', 'Last Recharged'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6b4a3a', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data.credits || []).length === 0 && (
                  <tr><td colSpan={3} style={{ padding: 20, textAlign: 'center', color: '#888' }}>No credit pools</td></tr>
                )}
                {(data.credits || []).map((c, idx) => (
                  <tr key={c.credit_type} style={{ background: idx % 2 ? '#fafafa' : '#fff', borderTop: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '14px 16px' }}>{c.credit_type}</td>
                    <td style={{ padding: '14px 16px' }}>{c.balance}</td>
                    <td style={{ padding: '14px 16px', color: '#666', fontSize: 12 }}>
                      {c.last_recharged_at ? new Date(c.last_recharged_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
