// Communications → Template Settings
import { useEffect, useState } from 'react';
import { Tab, Tabs, Button, Chip, CircularProgress } from '@mui/material';
import { emailApi, smsApi, whatsappApi } from '../../lib/endpoints';
import Breadcrumb from './Breadcrumb';
import { isRole, ROLES } from '../../lib/rbac';

const KINDS = [
  { key: 'email', label: 'Email Templates', api: () => emailApi.templates },
  { key: 'sms', label: 'SMS Templates', api: () => smsApi.templates },
  { key: 'whatsapp', label: 'WhatsApp Templates', api: () => whatsappApi.templates },
];

export default function TemplatesHub() {
  const [tab, setTab] = useState(0);
  return (
    <div style={{ background: '#fafafa', minHeight: '100vh' }}>
      <Breadcrumb trail={[
        { label: 'Settings', path: '/advancedsettings' },
        { label: 'Template Settings' },
      ]} />

      <div style={{ padding: '0 24px' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: '1px solid #eee' }}>
          {KINDS.map((k) => <Tab key={k.key} label={k.label} />)}
        </Tabs>

        <div style={{ paddingTop: 16 }}>
          <TemplatesList apiObj={KINDS[tab].api()} kind={KINDS[tab].key} />
        </div>
      </div>
    </div>
  );
}

function TemplatesList({ apiObj, kind }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const canDelete = isRole(ROLES.SUPER_ADMIN);

  useEffect(() => {
    setLoading(true); setError('');
    apiObj.list()
      .then((r) => setItems(r?.data || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, reloadKey]);

  const onDelete = async (id) => {
    if (!confirm('Delete template?')) return;
    try { await apiObj.delete(id); setReloadKey((v) => v + 1); } catch (e) { alert(e.message); }
  };
  const onToggle = async (id) => {
    if (!apiObj.toggle) return;
    try { await apiObj.toggle(id); setReloadKey((v) => v + 1); } catch (e) { alert(e.message); }
  };

  if (loading) return <CircularProgress />;
  if (error) return <div style={{ color: '#d32f2f' }}>{error}</div>;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', border: '1px solid #e8e8e8', borderRadius: 4 }}>
      <thead>
        <tr style={{ background: '#fdf3ed' }}>
          {['Name', 'Subject / Preview', 'Active', 'Created', ''].map((h) => (
            <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6b4a3a', textTransform: 'uppercase' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.length === 0 && <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: '#888' }}>No templates yet</td></tr>}
        {items.map((t, idx) => (
          <tr key={t.id} style={{ background: idx % 2 ? '#fafafa' : '#fff', borderTop: '1px solid #f0f0f0' }}>
            <td style={{ padding: '14px 16px' }}>{t.name}</td>
            <td style={{ padding: '14px 16px', color: '#555' }}>{(t.subject || t.body || t.preview || '').slice(0, 80)}</td>
            <td style={{ padding: '14px 16px' }}><Chip size="small" color={t.is_active ? 'success' : 'default'} label={t.is_active ? 'On' : 'Off'} /></td>
            <td style={{ padding: '14px 16px', fontSize: 12, color: '#666' }}>{t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}</td>
            <td style={{ padding: '14px 16px', textAlign: 'right' }}>
              {apiObj.toggle && <Button size="small" onClick={() => onToggle(t.id)}>{t.is_active ? 'Disable' : 'Enable'}</Button>}
              {canDelete && <Button size="small" color="error" onClick={() => onDelete(t.id)}>Delete</Button>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
