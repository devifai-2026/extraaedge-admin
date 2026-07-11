// Trainer "My Courses" — courses this trainer/head is assigned to (admins see
// all). Click a course to manage its modules, trainer roster, and batches.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Paper, Alert } from '@mui/material';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import ChecklistOutlinedIcon from '@mui/icons-material/ChecklistOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import { PageHeader, Card, StatTile, StatGrid, EmptyState, Badge, Skeleton, ACCENT } from '../../lib/lmsUi';
import { coursesApi } from '../../lib/endpoints';

export default function TrainerCourses() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    coursesApi.list()
      .then((r) => setRows(r?.data || []))
      .catch((e) => setError(e?.message || 'Failed to load courses'))
      .finally(() => setLoading(false));
  }, []);

  const totalModules = rows.reduce((n, c) => n + (Number(c.module_count) || 0), 0);
  const totalBatches = rows.reduce((n, c) => n + (Number(c.batch_count) || 0), 0);

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
      <PageHeader
        title="My Courses"
        subtitle="Courses you teach. Open a course to manage its modules, trainers and batches."
        icon={SchoolOutlinedIcon}
      />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? (
        <Card>
          <Skeleton h={16} w="45%" />
          <div style={{ height: 10 }} />
          <Skeleton h={12} w="70%" />
          <div style={{ height: 10 }} />
          <Skeleton h={12} w="55%" />
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState icon="🎓" title="No courses assigned yet" text="An admin assigns you to a course as head or trainer — it will show up here." />
        </Card>
      ) : (
        <>
          <StatGrid>
            <StatTile icon={SchoolOutlinedIcon} label="Courses" value={rows.length} sub="assigned to you" />
            <StatTile icon={ChecklistOutlinedIcon} tint="#1d4ed8" label="Modules" value={totalModules} sub="across all courses" />
            <StatTile icon={GroupsOutlinedIcon} tint="#15803d" label="Batches" value={totalBatches} sub="across all courses" />
          </StatGrid>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {rows.map((c) => (
              <Paper key={c.id} elevation={0}
                     sx={{
                       p: 2.5, borderRadius: '16px', border: '1px solid #eef0f5',
                       boxShadow: '0 2px 12px -8px rgba(15,23,42,0.18)', position: 'relative', overflow: 'hidden',
                       cursor: 'pointer', transition: 'transform .15s ease, box-shadow .15s ease',
                       '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 26px -14px rgba(15,23,42,0.4)' },
                     }}
                     onClick={() => navigate(`/trainer/courses/${c.id}`)}>
                <Box sx={{ position: 'absolute', left: 0, right: 0, top: 0, height: '3px', background: ACCENT }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Box sx={{ width: 32, height: 32, borderRadius: '10px', background: `color-mix(in srgb, ${ACCENT} 12%, transparent)`, color: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <SchoolOutlinedIcon sx={{ fontSize: 18 }} />
                  </Box>
                  <Box component="span" sx={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>{c.name}</Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.25 }}>
                  <Badge tone="neutral">{c.module_count} modules</Badge>
                  <Badge tone="neutral">{c.batch_count} batches</Badge>
                  {c.type && <Badge tone="info">{c.type}</Badge>}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 12, color: '#64748b' }}>
                  <Badge tone="accent">Head</Badge>
                  <span>{c.head_trainer_name || '—'}</span>
                </Box>
              </Paper>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}
