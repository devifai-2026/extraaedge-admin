// Placement Dashboard — home for the placement team: companies, live openings,
// and applications pipeline. KPIs + firing land in E5; quick links are live.
import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import BusinessIcon from '@mui/icons-material/BusinessOutlined';
import WorkIcon from '@mui/icons-material/WorkOutlineOutlined';
import PeopleIcon from '@mui/icons-material/PeopleAltOutlined';
import { auth } from '../../lib/api';
import { placementApi } from '../../lib/endpoints';
import { PageHeader, Card, StatGrid, StatTile, Btn, ACCENT } from '../../lib/lmsUi';

export default function PlacementDashboard() {
  const navigate = useNavigate();
  const me = auth.getUser();
  const [c, setC] = useState(null);
  useEffect(() => { placementApi.counts().then((r) => setC(r?.data ?? r)).catch(() => {}); }, []);
  const v = (n) => (c ? (c[n] ?? 0) : '—');
  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
      <div style={{ background: `linear-gradient(120deg, ${ACCENT} 0%, #0e1729 130%)`, color: '#fff', borderRadius: 18, padding: '24px 28px', margin: '18px 0 20px', boxShadow: `0 18px 40px -22px ${ACCENT}` }}>
        <div style={{ fontSize: 13, opacity: 0.85, fontWeight: 600 }}>Placement workspace</div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.4, margin: '4px 0 6px' }}>Hi {me?.name?.split(' ')[0] || 'there'} 👋</div>
        <div style={{ fontSize: 13.5, opacity: 0.92 }}>Manage company profiles, publish job openings, and place your students.</div>
      </div>
      <StatGrid>
        <StatTile icon={BusinessIcon} label="Companies" value={v('companies')} />
        <StatTile icon={WorkIcon} tint="#2563eb" label="Open positions" value={v('open_positions')} sub={c ? `${c.closed_positions} closed` : undefined} />
        <StatTile icon={PeopleIcon} tint="#059669" label="Applications" value={v('applications')} sub={c ? `${c.selected} selected` : undefined} />
      </StatGrid>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <Card title="Companies" icon={BusinessIcon}>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>Maintain hiring-partner profiles (single or bulk upload).</div>
          <Btn onClick={() => navigate('/placement/companies')}>Manage companies →</Btn>
        </Card>
        <Card title="Job openings" icon={WorkIcon}>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>Create openings, set eligibility criteria, and fire to matched students.</div>
          <Btn variant="ghost" onClick={() => navigate('/placement/openings')}>Openings →</Btn>
        </Card>
        <Card title="Applications" icon={PeopleIcon}>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>Track each opening's applicants through the hiring pipeline.</div>
          <Btn variant="ghost" onClick={() => navigate('/placement/applications')}>Applications →</Btn>
        </Card>
      </div>
    </Box>
  );
}
