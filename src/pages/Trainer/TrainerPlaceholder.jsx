// Placeholder for trainer surfaces whose feature phase hasn't shipped yet
// (Classes, Attendance, Recordings, Announcements, Forum, Tests, Projects,
// Interviews, Leaderboard). Replaced by the real page in the relevant phase.
import { Box, Typography, Paper } from '@mui/material';

export default function TrainerPlaceholder({ title = 'Coming soon' }) {
  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
      <Typography variant="h6" sx={{ mb: 2 }}>{title}</Typography>
      <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', borderRadius: 2, color: '#94a3b8' }}>
        <Typography sx={{ fontWeight: 600, color: '#475569' }}>{title}</Typography>
        <Typography sx={{ fontSize: 13 }}>This section will be available shortly.</Typography>
      </Paper>
    </Box>
  );
}
