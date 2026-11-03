// Trainer Leaderboard — ranked students for a course (tests + projects +
// attendance% + interview marks).
import { useEffect, useState, useCallback } from 'react';
import { Box, MenuItem, TextField } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEventsOutlined';
import { assessmentsApi } from '../../lib/endpoints';
import { useCourseScope, CoursePicker } from './CourseScope';
import { PageHeader, Card, EmptyState } from '../../lib/lmsUi';
import LeaderboardTable from './LeaderboardTable';

export default function TrainerLeaderboard() {
  // Course comes from the shared trainer scope: picked once, kept in the URL
  // and localStorage, so it survives navigation instead of being re-chosen on
  // every page. Falls back to the first course so the page renders content
  // immediately rather than gating behind a dropdown.
  const { programId: scopedId, courses } = useCourseScope();
  const programId = scopedId || courses[0]?.id || '';
  const [rows, setRows] = useState([]);
  const load = useCallback(() => { if (programId) assessmentsApi.leaderboard(programId).then((r) => setRows(r?.data || [])).catch(() => {}); }, [programId]);
  useEffect(() => { load(); }, [load]);

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <PageHeader
        title="Leaderboard"
        subtitle="Ranked by tests + projects + attendance + interviews."
        icon={EmojiEventsIcon}
        right={(
          <CoursePicker allowAll={false} width={240} />
        )}
      />
      {!programId
        ? <Card><EmptyState icon="🏆" title="Pick a course" text="Choose a course to see its ranked leaderboard." /></Card>
        : <Card pad={0} style={{ overflow: 'hidden' }}><LeaderboardTable rows={rows} /></Card>}
    </Box>
  );
}
