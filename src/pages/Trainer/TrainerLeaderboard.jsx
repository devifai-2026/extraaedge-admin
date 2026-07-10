// Trainer Leaderboard — ranked students for a course (tests + projects +
// attendance% + interview marks).
import { useEffect, useState, useCallback } from 'react';
import { Box, Typography, Paper, MenuItem, TextField } from '@mui/material';
import { coursesApi, assessmentsApi } from '../../lib/endpoints';
import LeaderboardTable from './LeaderboardTable';

export default function TrainerLeaderboard() {
  const [courses, setCourses] = useState([]);
  const [programId, setProgramId] = useState('');
  const [rows, setRows] = useState([]);

  useEffect(() => { coursesApi.list().then((r) => setCourses(r?.data || [])).catch(() => {}); }, []);
  const load = useCallback(() => { if (programId) assessmentsApi.leaderboard(programId).then((r) => setRows(r?.data || [])).catch(() => {}); }, [programId]);
  useEffect(() => { load(); }, [load]);

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h6" sx={{ mb: 0.5 }}>Leaderboard</Typography>
      <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>Ranked by tests + projects + attendance + interviews.</Typography>
      <TextField select size="small" label="Course" value={programId} onChange={(e) => setProgramId(e.target.value)} sx={{ minWidth: 240, mb: 2 }}>
        {courses.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
      </TextField>
      {programId && <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}><LeaderboardTable rows={rows} /></Paper>}
    </Box>
  );
}
