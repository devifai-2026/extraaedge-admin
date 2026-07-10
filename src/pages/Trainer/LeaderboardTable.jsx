// Shared leaderboard table — tests + projects + attendance% + interview marks.
// Used by the trainer Leaderboard page and the student Leaderboard view.
import { Table, TableHead, TableRow, TableCell, TableBody, Chip } from '@mui/material';

export default function LeaderboardTable({ rows, highlightStudentId }) {
  if (!rows || rows.length === 0) return <div style={{ color: '#94a3b8', fontSize: 14 }}>No leaderboard data yet.</div>;
  return (
    <Table size="small">
      <TableHead><TableRow sx={{ background: '#fafafa' }}>
        <TableCell>#</TableCell><TableCell>Student</TableCell>
        <TableCell align="right">Tests</TableCell><TableCell align="right">Projects</TableCell>
        <TableCell align="right">Attend %</TableCell><TableCell align="right">Interview</TableCell>
        <TableCell align="right"><b>Total</b></TableCell>
      </TableRow></TableHead>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={r.student_id} sx={{ background: r.student_id === highlightStudentId ? '#fff7ed' : undefined }}>
            <TableCell>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</TableCell>
            <TableCell>{r.name}{r.student_id === highlightStudentId ? <Chip size="small" label="You" sx={{ ml: 1 }} /> : null}</TableCell>
            <TableCell align="right">{Number(r.test_score)}</TableCell>
            <TableCell align="right">{Number(r.project_score)}</TableCell>
            <TableCell align="right">{Number(r.attendance_pct)}%</TableCell>
            <TableCell align="right">{Number(r.interview_score)}</TableCell>
            <TableCell align="right"><b>{Number(r.total)}</b></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
