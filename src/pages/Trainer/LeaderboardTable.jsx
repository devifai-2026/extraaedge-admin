// Shared leaderboard table — each column is a normalized 0–100 subscore
// (tests / projects / capstone / interview / attendance), combined into a
// weighted 0–100 Total. A "—" means that component doesn't exist for the course
// yet (e.g. no capstone defined), so it doesn't count against the student.
// Used by the trainer Leaderboard page and the student Leaderboard view.
// Top-3 rows get a faint podium tint on top of the medal emoji.
import { Table, TableHead, TableRow, TableCell, TableBody, Chip, Tooltip } from '@mui/material';
import { EmptyState } from '../../lib/lmsUi';

const PODIUM = ['#fff7e0', '#f4f6f8', '#fdf0e7']; // gold, silver, bronze
// Show a 0–100 subscore, or "—" when the component is absent for this course.
const sub = (v) => (v == null ? '—' : Math.round(Number(v)));

export default function LeaderboardTable({ rows, highlightStudentId }) {
  if (!rows || rows.length === 0) {
    return <EmptyState icon="🏆" title="No leaderboard data yet" text="Scores appear once students attempt tests, submit projects, and attend classes." />;
  }
  return (
    <Table size="small">
      <TableHead><TableRow sx={{ background: '#fafbfc', '& th': { color: '#64748b', fontWeight: 700, fontSize: 12 } }}>
        <TableCell>#</TableCell><TableCell>Student</TableCell>
        <Tooltip title="Normalized 0–100 per column"><TableCell align="right">Tests</TableCell></Tooltip>
        <TableCell align="right">Projects</TableCell><TableCell align="right">Capstone</TableCell>
        <TableCell align="right">Interview</TableCell><TableCell align="right">Attend</TableCell>
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
              <TableCell align="right">{sub(r.test_score)}</TableCell>
              <TableCell align="right">{sub(r.project_score)}</TableCell>
              <TableCell align="right">{sub(r.capstone_score)}</TableCell>
              <TableCell align="right">{sub(r.interview_score)}</TableCell>
              <TableCell align="right">{sub(r.attendance_pct)}</TableCell>
              <TableCell align="right"><b style={{ color: '#0f172a' }}>{sub(r.total)}</b></TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
