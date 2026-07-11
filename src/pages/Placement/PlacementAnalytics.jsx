// Placement Analytics — pipeline funnel (candidates per stage), company-wise
// placed counts, and a best-effort average offered CTC. Branch-scoped.
import { useEffect, useState } from 'react';
import { Box, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import InsightsIcon from '@mui/icons-material/InsightsOutlined';
import { placementApi } from '../../lib/endpoints';
import { PageHeader, Card, EmptyState, Badge, Skeleton } from '../../lib/lmsUi';

const kindTone = (k) => (k === 'success' ? 'success' : k === 'rejected' ? 'danger' : 'info');

export default function PlacementAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { placementApi.analytics().then((r) => setData(r?.data ?? r)).catch(() => {}).finally(() => setLoading(false)); }, []);

  if (loading) return <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}><Card><Skeleton h={18} w="40%" /></Card></Box>;
  const { funnel = [], by_company: byCompany = [], avg_ctc: avgCtc, offers_with_ctc: offersWithCtc } = data || {};
  const maxFunnel = Math.max(1, ...funnel.map((f) => f.count || 0));

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <PageHeader title="Placement Analytics" subtitle="Pipeline funnel, company-wise placements, and offered CTC." icon={InsightsIcon} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 18 }}>
        <Card style={{ padding: 16 }}>
          <div style={lbl}>Avg. offered CTC</div>
          <div style={val}>{avgCtc != null ? avgCtc : '—'}</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{offersWithCtc} offer{offersWithCtc === 1 ? '' : 's'} with a value · approx (parsed from text)</div>
        </Card>
        <Card style={{ padding: 16 }}>
          <div style={lbl}>Companies with candidates</div>
          <div style={val}>{byCompany.length}</div>
        </Card>
        <Card style={{ padding: 16 }}>
          <div style={lbl}>Total placed</div>
          <div style={{ ...val, color: '#15803d' }}>{byCompany.reduce((s, c) => s + (c.placed || 0), 0)}</div>
        </Card>
      </div>

      <Card title="Pipeline funnel" style={{ marginBottom: 18 }}>
        {funnel.length === 0 ? <EmptyState icon="🪜" title="No stages / candidates" text="Define pipeline stages and move candidates to see the funnel." /> : (
          <div style={{ display: 'grid', gap: 10 }}>
            {funnel.map((f) => (
              <div key={f.stage_id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 150, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Badge tone={kindTone(f.kind)}>{f.name}</Badge>
                </div>
                <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 8, overflow: 'hidden', height: 26, position: 'relative' }}>
                  <div style={{ width: `${(f.count / maxFunnel) * 100}%`, height: '100%', background: 'color-mix(in srgb, var(--lms-accent,#E53935) 70%, transparent)', minWidth: f.count ? 4 : 0 }} />
                </div>
                <div style={{ width: 40, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{f.count}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Company-wise placements">
        {byCompany.length === 0 ? <EmptyState icon="🏢" title="No data yet" text="Company placement numbers appear once candidates are in the pipeline." /> : (
          <Table size="small">
            <TableHead><TableRow sx={{ background: '#fafbfc', '& th': { color: '#64748b', fontWeight: 700, fontSize: 12 } }}><TableCell>Company</TableCell><TableCell align="center">Candidates</TableCell><TableCell align="center">Placed</TableCell></TableRow></TableHead>
            <TableBody>{byCompany.map((c) => (
              <TableRow key={c.company_id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{c.name}</TableCell>
                <TableCell align="center">{c.total_candidates}</TableCell>
                <TableCell align="center"><Badge tone="success">{c.placed}</Badge></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        )}
      </Card>
    </Box>
  );
}

const lbl = { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 };
const val = { fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: -0.4 };
