// Speedup Hiring — the recruiter's landing page.
import { useEffect, useState } from 'react';
import { Box, CircularProgress, Alert, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import WorkIcon from '@mui/icons-material/WorkOutlineOutlined';
import PeopleIcon from '@mui/icons-material/PeopleAltOutlined';
import EventIcon from '@mui/icons-material/EventAvailableOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUpOutlined';
import { hiringApi } from '../../lib/endpoints';
import {
  PageHeader, Card, StatTile, StatGrid, EmptyState, lmsTokens,
} from '../../lib/lmsUi';

const { INK, MUTE, FAINT } = lmsTokens;
const KIND_TINT = { open: '#2563eb', hired: '#059669', rejected: '#dc2626' };

export default function HiringDashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    hiringApi.dashboard()
      .then((r) => setData(r?.data || null))
      .catch((e) => setErr(e?.message || 'Could not load'));
  }, []);

  if (err) return <Box sx={{ p: 3 }}><Alert severity="error">{err}</Alert></Box>;
  if (!data) return <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>;

  const total = (data.by_status || []).reduce((s, r) => s + r.n, 0);
  const max = Math.max(...(data.by_status || []).map((r) => r.n), 1);

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
      <PageHeader
        title="Hiring"
        subtitle="Recruitment for our own team."
        icon={WorkIcon}
        right={(
          <>
            <Button size="small" variant="outlined" onClick={() => navigate('/hiring/candidates')} sx={{ textTransform: 'none' }}>
              Candidates
            </Button>
            <Button size="small" variant="contained" onClick={() => navigate('/hiring/positions')} sx={{ textTransform: 'none', bgcolor: '#E87B2F' }}>
              Positions
            </Button>
          </>
        )}
      />

      <StatGrid>
        <StatTile icon={WorkIcon} label="Open positions" value={data.open_positions} sub={`${data.open_seats} seat${data.open_seats === 1 ? '' : 's'} to fill`} />
        <StatTile icon={PeopleIcon} tint="#2563eb" label="Candidates" value={total} sub="in the pool" />
        <StatTile icon={TrendingUpIcon} tint="#7c3aed" label="Added" value={data.candidates_30d} sub="last 30 days" />
        <StatTile icon={EventIcon} tint="#059669" label="Interviews" value={data.interviews_next_7d} sub="next 7 days" />
      </StatGrid>

      <Card title="Pipeline">
        {(!data.by_status || data.by_status.length === 0) ? (
          <EmptyState
            icon="🧑‍💼"
            title="No candidates yet"
            text="Add someone by hand, or bulk upload the recruitment sheet."
          />
        ) : (
          <Box sx={{ display: 'grid', gap: 1.4 }}>
            {data.by_status.map((s) => (
              <Box key={s.name}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <span style={{ fontSize: 13.5, color: INK }}>{s.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: MUTE }}>
                    {s.n}
                    <span style={{ color: FAINT, fontWeight: 400 }}>
                      {' '}· {Math.round((s.n / total) * 100)}%
                    </span>
                  </span>
                </Box>
                <div style={{ height: 7, background: '#eef2f7', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{
                    width: `${(s.n / max) * 100}%`,
                    height: '100%',
                    background: KIND_TINT[s.kind] || '#94a3b8',
                    borderRadius: 999,
                  }}
                  />
                </div>
              </Box>
            ))}
          </Box>
        )}
      </Card>
    </Box>
  );
}
