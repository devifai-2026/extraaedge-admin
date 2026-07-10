// Student Leaderboard — the class ranking, with the student's own row
// highlighted. Reuses the shared LeaderboardTable.
import { useEffect, useState } from 'react';
import { Paper } from '@mui/material';
import { studentApi, studentAuth } from '../../lib/studentApi';
import LeaderboardTable from '../Trainer/LeaderboardTable';

export default function StudentLeaderboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const me = studentAuth.getStudent();

  useEffect(() => { studentApi.leaderboard().then((r) => setRows(r?.data || [])).catch(() => {}).finally(() => setLoading(false)); }, []);

  return (
    <div>
      <h2 style={{ fontSize: 20, color: '#0f172a', margin: '0 0 12px' }}>Leaderboard</h2>
      {loading ? <p style={{ color: '#94a3b8' }}>Loading…</p> : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <LeaderboardTable rows={rows} highlightStudentId={me?.id} />
        </Paper>
      )}
    </div>
  );
}
