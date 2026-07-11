// Student Job Openings — openings the placement team fired to you (with apply +
// status), plus a poster feed of open positions (marketing).
import { useEffect, useState } from 'react';
import { studentApi } from '../../lib/studentApi';
import { PageHeader, Card, EmptyState, Badge, Btn, Skeleton, Toast } from '../../lib/lmsUi';
import WorkIcon from '@mui/icons-material/WorkOutlineOutlined';

const tone = (s) => (s === 'selected' ? 'success' : s === 'rejected' ? 'danger' : s === 'shortlisted' ? 'info' : s === 'applied' ? 'accent' : 'warning');

export default function StudentJobs() {
  const [data, setData] = useState({ openings: [], posters: [] });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState('');

  const load = () => studentApi.jobsFeed().then((r) => setData(r?.data ?? r ?? { openings: [], posters: [] })).catch((e) => setToast(e.message)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const apply = async (o) => {
    setBusy(o.id);
    try { await studentApi.applyToJob(o.id); setToast('Applied ✓'); load(); } catch (e) { setToast(e.message); } finally { setBusy(''); }
  };

  const { openings, posters } = data;
  return (
    <div>
      <PageHeader title="Job Openings" subtitle="Opportunities shared with you by the placement team." icon={WorkIcon} />
      {loading && <Card><Skeleton h={16} w="50%" /><div style={{ height: 8 }} /><Skeleton h={12} w="70%" /></Card>}

      {!loading && openings.length === 0 && posters.length === 0 && (
        <Card><EmptyState icon="💼" title="No openings yet" text="When the placement team shares a role you're eligible for, it'll appear here." /></Card>
      )}

      {!loading && openings.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: 0.5, margin: '4px 0 12px' }}>Shared with you</div>
          <div style={{ display: 'grid', gap: 12 }}>
            {openings.map((o) => {
              const applied = o.application_status && o.application_status !== 'fired';
              return (
                <Card key={o.id} style={{ display: 'flex', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>{o.title}</div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>{o.company_name}{o.location ? ` · ${o.location}` : ''}{o.ctc ? ` · ${o.ctc}` : ''}</div>
                    {o.description && <div style={{ fontSize: 13, color: '#475569', marginTop: 6, whiteSpace: 'pre-wrap' }}>{o.description}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    {applied ? <Badge tone={tone(o.application_status)}>{o.application_status}</Badge>
                      : o.status === 'open' ? <Btn size="sm" onClick={() => apply(o)} disabled={busy === o.id}>Apply</Btn>
                        : <Badge tone="neutral">Closed</Badge>}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {!loading && posters.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: 0.5, margin: '4px 0 12px' }}>Now hiring</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {posters.map((p) => (
              <Card key={p.id} pad={0} style={{ overflow: 'hidden' }}>
                {p.poster_url && <img src={p.poster_url} alt={p.title} style={{ width: '100%', display: 'block' }} />}
                <div style={{ padding: 12 }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{p.title}</div>
                  <div style={{ fontSize: 12.5, color: '#64748b' }}>{p.company_name}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
      <Toast msg={toast} onClose={() => setToast('')} />
    </div>
  );
}
