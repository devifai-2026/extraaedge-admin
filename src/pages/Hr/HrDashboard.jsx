// HR Dashboard — operations home for the HR team: interview-evaluation queue +
// certificate pipeline, with live KPIs (interviews awaiting the HR's score,
// certificates issued, students in the completion pipeline).
import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import GroupsIcon from '@mui/icons-material/GroupsOutlined';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOverOutlined';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import { auth } from '../../lib/api';
import { learningApi } from '../../lib/endpoints';
import { Card, StatGrid, StatTile, Btn, ACCENT } from '../../lib/lmsUi';

export default function HrDashboard() {
  const navigate = useNavigate();
  const me = auth.getUser();
  const [counts, setCounts] = useState(null);
  useEffect(() => { learningApi.hrCounts().then((r) => setCounts(r?.data ?? r)).catch(() => setCounts({})); }, []);
  const val = (k) => (counts == null ? '…' : (counts[k] ?? 0));
  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
      <div style={{ background: `linear-gradient(120deg, ${ACCENT} 0%, #0e1729 130%)`, color: '#fff', borderRadius: 18, padding: '24px 28px', margin: '18px 0 20px', boxShadow: `0 18px 40px -22px ${ACCENT}` }}>
        <div style={{ fontSize: 13, opacity: 0.85, fontWeight: 600 }}>HR workspace</div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.4, margin: '4px 0 6px' }}>Hi {me?.name?.split(' ')[0] || 'there'} 👋</div>
        <div style={{ fontSize: 13.5, opacity: 0.92 }}>Evaluate mock interviews and issue completion certificates.</div>
      </div>
      <StatGrid>
        <StatTile icon={RecordVoiceOverIcon} label="Interviews to score" value={val('interviews_to_score')} sub="soft-skills" />
        <StatTile icon={WorkspacePremiumIcon} tint="#2563eb" label="Certificates issued" value={val('certificates_issued')} />
        <StatTile icon={GroupsIcon} tint="#059669" label="Students in pipeline" value={val('completion_pipeline')} sub="course complete, awaiting cert" />
      </StatGrid>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <Card title="Interview evaluations" icon={RecordVoiceOverIcon}>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>Score the soft-skill categories on interviews you're assigned to.</div>
          <Btn onClick={() => navigate('/hr/interviews')}>Open interview queue →</Btn>
        </Card>
        <Card title="Certificates" icon={WorkspacePremiumIcon}>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>Issue certificates for students who have completed their course.</div>
          <Btn variant="ghost" onClick={() => navigate('/hr/certificates')}>Manage certificates →</Btn>
        </Card>
      </div>
    </Box>
  );
}
