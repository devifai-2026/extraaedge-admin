// Trainer Leaderboard — ranked students for a course (tests + projects +
// attendance% + interview marks).
import { useEffect, useState, useCallback } from 'react';
import { Box, MenuItem, TextField } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEventsOutlined';
import { coursesApi, assessmentsApi } from '../../lib/endpoints';
import { PageHeader, Card, EmptyState } from '../../lib/lmsUi';
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
      <PageHeader
        title="Leaderboard"
        subtitle="Ranked by tests + projects + attendance + interviews."
        icon={EmojiEventsIcon}
        right={(
          <TextField select size="small" label="Course" value={programId} onChange={(e) => setProgramId(e.target.value)} sx={{ minWidth: 240, background: '#fff' }}>
            {courses.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>
        )}
      />
      {!programId
        ? <Card><EmptyState icon="🏆" title="Pick a course" text="Choose a course to see its ranked leaderboard." /></Card>
        : <Card pad={0} style={{ overflow: 'hidden' }}><LeaderboardTable rows={rows} /></Card>}
    </Box>
  );
}
