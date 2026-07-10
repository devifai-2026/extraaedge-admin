// Trainer "My Courses" — courses this trainer/head is assigned to (admins see
// all). Click a course to manage its modules, trainer roster, and batches.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, CircularProgress, Alert, Chip } from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
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

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
      <Typography variant="h6" sx={{ mb: 0.5 }}>My Courses</Typography>
      <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
        Courses you teach. Open a course to manage its modules, trainers and batches.
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
      ) : rows.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', borderRadius: 2, color: '#94a3b8' }}>
          <Typography sx={{ fontWeight: 600, color: '#475569' }}>No courses assigned yet</Typography>
          <Typography sx={{ fontSize: 13 }}>An admin assigns you to a course as head or trainer.</Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {rows.map((c) => (
            <Paper key={c.id} variant="outlined" sx={{ p: 2.5, borderRadius: 2, cursor: 'pointer', '&:hover': { borderColor: '#E53935' } }}
                   onClick={() => navigate(`/trainer/courses/${c.id}`)}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <SchoolIcon sx={{ color: '#E53935' }} />
                <Typography sx={{ fontWeight: 700, color: '#0f172a' }}>{c.name}</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                <Chip size="small" label={`${c.module_count} modules`} />
                <Chip size="small" label={`${c.batch_count} batches`} />
                {c.type && <Chip size="small" variant="outlined" label={c.type} />}
              </Box>
              <Typography sx={{ fontSize: 12, color: '#64748b' }}>
                Head: {c.head_trainer_name || '—'}
              </Typography>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
}
