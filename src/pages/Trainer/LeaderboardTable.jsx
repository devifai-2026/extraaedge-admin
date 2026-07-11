// Shared leaderboard table — tests + projects + attendance% + interview marks.
// Used by the trainer Leaderboard page and the student Leaderboard view.
// Top-3 rows get a faint podium tint on top of the medal emoji.
import { Table, TableHead, TableRow, TableCell, TableBody, Chip } from '@mui/material';
import { EmptyState } from '../../lib/lmsUi';

const PODIUM = ['#fff7e0', '#f4f6f8', '#fdf0e7']; // gold, silver, bronze

export default function LeaderboardTable({ rows, highlightStudentId }) {
  if (!rows || rows.length === 0) {
    return <EmptyState icon="🏆" title="No leaderboard data yet" text="Scores appear once students attempt tests, submit projects, and attend classes." />;
  }
  return (
    <Table size="small">
      <TableHead><TableRow sx={{ background: '#fafbfc', '& th': { color: '#64748b', fontWeight: 700, fontSize: 12 } }}>
        <TableCell>#</TableCell><TableCell>Student</TableCell>
        <TableCell align="right">Tests</TableCell><TableCell align="right">Projects</TableCell>
        <TableCell align="right">Attend %</TableCell><TableCell align="right">Interview</TableCell>
        <TableCell align="right"><b>Total</b></TableCell>
      </TableRow></TableHead>
      <TableBody>
        {rows.map((r, i) => {
          const isMe = r.student_id === highlightStudentId;
          const bg = isMe ? '#fff7ed' : (i < 3 ? PODIUM[i] : undefined);
          return (
            <TableRow key={r.student_id} sx={{ background: bg, '& td': i < 3 ? { fontWeight: 600 } : undefined }}>
              <TableCell sx={{ fontSize: i < 3 ? 16 : 13 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</TableCell>
              <TableCell>{r.name}{isMe ? <Chip size="small" label="You" color="warning" sx={{ ml: 1, height: 20 }} /> : null}</TableCell>
              <TableCell align="right">{Number(r.test_score)}</TableCell>
              <TableCell align="right">{Number(r.project_score)}</TableCell>
              <TableCell align="right">{Number(r.attendance_pct)}%</TableCell>
              <TableCell align="right">{Number(r.interview_score)}</TableCell>
              <TableCell align="right"><b style={{ color: '#0f172a' }}>{Number(r.total)}</b></TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
