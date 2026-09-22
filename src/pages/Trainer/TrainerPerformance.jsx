// Trainer performance — module delivery against its planned end date, plus the
// student feedback that came out of it.
//
// A trainer opening this sees ONLY their own rows; the head trainer (trainer
// lead), branch manager and super admin see everyone and get the filters. That
// scoping is enforced server-side — the filters here are a convenience, not the
// security boundary.
//
// "Unscheduled" modules (no end_date, i.e. created before module scheduling
// existed) are shown but excluded from the on-time percentage. Counting them as
// failures would make every trainer look bad on day one for a deadline they
// were never given.
import { useEffect, useState, useCallback } from 'react';
import {
  Box, TextField, MenuItem, Table, TableHead, TableRow, TableCell, TableBody,
  Alert, Tabs, Tab, LinearProgress, Chip,
} from '@mui/material';
import InsightsIcon from '@mui/icons-material/InsightsOutlined';
import { PageHeader } from '../../lib/lmsUi';
import { Section, Badge } from '../../lib/lmsUi';
import { trainerPerformanceApi, lmsFeedbackApi, coursesApi, usersApi } from '../../lib/endpoints';

const STATUS_TONE = {
  on_time: 'success', late: 'warning', overdue: 'danger',
  running: 'info', unscheduled: 'neutral',
};
const STATUS_LABEL = {
  on_time: 'On time', late: 'Late', overdue: 'Overdue',
  running: 'Running', unscheduled: 'No dates',
};

// "3 weeks" / "4 weeks 2 days" — the duration the module was planned for.
const weeksBetween = (a, b) => {
  if (!a || !b) return '—';
  const days = Math.round((new Date(b) - new Date(a)) / 86400000) + 1;
  if (days <= 0) return '—';
  const w = Math.floor(days / 7);
  const d = days % 7;
  if (!w) return `${d} day${d === 1 ? '' : 's'}`;
  return d ? `${w} wk ${d}d` : `${w} week${w === 1 ? '' : 's'}`;
};
const fmtDate = (v) => { try { return v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'; } catch { return '—'; } };

export default function TrainerPerformance() {
  const [tab, setTab] = useState(0);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [wide, setWide] = useState(false);
  const [msg, setMsg] = useState('');
  const [courses, setCourses] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [f, setF] = useState({ trainer_id: '', program_id: '', module: '' });

  const load = useCallback(() => {
    const q = {};
    if (f.trainer_id) q.trainer_id = f.trainer_id;
    if (f.program_id) q.program_id = f.program_id;
    if (f.module) q.module = f.module;
    trainerPerformanceApi.report(q)
      .then((r) => { setRows(r?.data?.rows || []); setWide(!!r?.data?.can_see_everyone); })
      .catch((e) => setMsg(e.message));
    trainerPerformanceApi.summary(q).then((r) => setSummary(r?.data || [])).catch(() => {});
    lmsFeedbackApi.staffList(f.trainer_id ? { trainer_id: f.trainer_id } : {})
      .then((r) => setFeedback(r?.data?.rows || [])).catch(() => {});
  }, [f]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    coursesApi.list?.().then((r) => setCourses(r?.data || [])).catch(() => {});
    usersApi.list?.({ limit: 200 }).then((r) => setTrainers((r?.data || []).filter((u) => ['trainer', 'head_trainer'].includes(u.role)))).catch(() => {});
  }, []);

  return (
    <div>
      <PageHeader title="Trainer Performance" subtitle="Module delivery against plan, and what students said." icon={InsightsIcon} />
      {msg && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      {wide && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <TextField select size="small" label="Trainer" value={f.trainer_id} sx={{ minWidth: 190 }}
            onChange={(e) => setF((s) => ({ ...s, trainer_id: e.target.value }))}>
            <MenuItem value="">All trainers</MenuItem>
            {trainers.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Course" value={f.program_id} sx={{ minWidth: 190 }}
            onChange={(e) => setF((s) => ({ ...s, program_id: e.target.value }))}>
            <MenuItem value="">All courses</MenuItem>
            {courses.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>
          <TextField size="small" label="Module name" value={f.module} sx={{ minWidth: 190 }}
            onChange={(e) => setF((s) => ({ ...s, module: e.target.value }))} />
        </Box>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, minHeight: 36 }}>
        <Tab label="By trainer" sx={{ textTransform: 'none', minHeight: 36 }} />
        <Tab label="Modules" sx={{ textTransform: 'none', minHeight: 36 }} />
        <Tab label={`Student feedback (${feedback.length})`} sx={{ textTransform: 'none', minHeight: 36 }} />
      </Tabs>

      {tab === 0 && (
        <Section title="On-time delivery by trainer">
          <Table size="small">
            <TableHead><TableRow sx={{ '& th': { color: '#64748b', fontWeight: 700, fontSize: 12 } }}>
              <TableCell>Trainer</TableCell><TableCell align="center">Modules</TableCell>
              <TableCell align="center">On time</TableCell><TableCell align="center">Late</TableCell>
              <TableCell align="center">Overdue</TableCell><TableCell align="center">Classes</TableCell>
              <TableCell align="center">Attendance</TableCell><TableCell align="center">Rating</TableCell>
              <TableCell sx={{ minWidth: 140 }}>On-time %</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {summary.map((t) => (
                <TableRow key={t.trainer_id || 'unassigned'}>
                  <TableCell sx={{ fontWeight: 600 }}>{t.trainer_name}</TableCell>
                  <TableCell align="center">{t.modules}</TableCell>
                  <TableCell align="center"><Badge tone="success">{t.on_time}</Badge></TableCell>
                  <TableCell align="center">{t.late ? <Badge tone="warning">{t.late}</Badge> : '—'}</TableCell>
                  <TableCell align="center">{t.overdue ? <Badge tone="danger">{t.overdue}</Badge> : '—'}</TableCell>
                  <TableCell align="center" sx={{ fontSize: 12, color: '#64748b' }}>{t.classes_completed}/{t.classes_planned}</TableCell>
                  <TableCell align="center">{t.attendance_pct === null ? '—' : `${t.attendance_pct}%`}</TableCell>
                  <TableCell align="center">{t.avg_rating === null ? '—' : `★ ${t.avg_rating}`}</TableCell>
                  <TableCell>
                    {t.on_time_pct === null ? <span style={{ fontSize: 12, color: '#94a3b8' }}>not scheduled</span> : (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress variant="determinate" value={t.on_time_pct}
                          sx={{ flex: 1, height: 6, borderRadius: 3,
                            '& .MuiLinearProgress-bar': { backgroundColor: t.on_time_pct >= 80 ? '#16a34a' : t.on_time_pct >= 50 ? '#f59e0b' : '#dc2626' } }} />
                        <span style={{ fontSize: 12, fontWeight: 700, minWidth: 34 }}>{t.on_time_pct}%</span>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!summary.length && <TableRow><TableCell colSpan={9} sx={{ color: '#94a3b8', textAlign: 'center', py: 3 }}>No modules yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Section>
      )}

      {tab === 1 && (
        <Section title="Modules">
          <Table size="small">
            <TableHead><TableRow sx={{ '& th': { color: '#64748b', fontWeight: 700, fontSize: 12 } }}>
              <TableCell>Module</TableCell><TableCell>Course</TableCell><TableCell>Trainer</TableCell>
              <TableCell>Start</TableCell><TableCell>End</TableCell><TableCell>Planned</TableCell>
              <TableCell align="center">Classes</TableCell><TableCell align="center">Status</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {rows.map((r) => {
                const pct = r.classes_planned ? Math.round((r.classes_completed / r.classes_planned) * 100) : 0;
                return (
                  <TableRow key={r.module_id}>
                    <TableCell sx={{ fontWeight: 600 }}>{r.module_name}</TableCell>
                    <TableCell sx={{ fontSize: 12, color: '#64748b' }}>{r.course_name}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{r.trainer_name || <span style={{ color: '#94a3b8' }}>Unassigned</span>}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{fmtDate(r.start_date)}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{fmtDate(r.end_date)}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{weeksBetween(r.start_date, r.end_date)}</TableCell>
                    <TableCell align="center" sx={{ minWidth: 120 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress variant="determinate" value={pct} sx={{ flex: 1, height: 5, borderRadius: 3 }} />
                        <span style={{ fontSize: 11, color: '#64748b', minWidth: 32 }}>{r.classes_completed}/{r.classes_planned}</span>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                      {r.days_late > 0 && <div style={{ fontSize: 10, color: '#dc2626', marginTop: 2 }}>{r.days_late}d late</div>}
                    </TableCell>
                  </TableRow>
                );
              })}
              {!rows.length && <TableRow><TableCell colSpan={8} sx={{ color: '#94a3b8', textAlign: 'center', py: 3 }}>No modules match.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Section>
      )}

      {tab === 2 && (
        <Section title="Student feedback">
          <Table size="small">
            <TableHead><TableRow sx={{ '& th': { color: '#64748b', fontWeight: 700, fontSize: 12 } }}>
              <TableCell>Student</TableCell><TableCell>About</TableCell><TableCell>Trainer</TableCell>
              <TableCell align="center">Rating</TableCell><TableCell>Comment</TableCell><TableCell>When</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {feedback.map((r) => (
                <TableRow key={r.id}>
                  <TableCell sx={{ fontWeight: 600 }}>{r.student_name}</TableCell>
                  <TableCell sx={{ fontSize: 12, color: '#64748b' }}>
                    <Chip size="small" label={r.scope} sx={{ height: 18, fontSize: 10, mr: 0.5 }} />
                    {r.scope === 'class' ? r.class_title : r.module_name}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{r.trainer_name || '—'}</TableCell>
                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                    <span style={{ color: '#f59e0b', fontWeight: 700 }}>★ {r.rating}</span>
                    {r.clarity_rating ? <div style={{ fontSize: 10, color: '#94a3b8' }}>clarity {r.clarity_rating}</div> : null}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, color: '#475569', maxWidth: 320, whiteSpace: 'pre-wrap' }}>{r.comment || '—'}</TableCell>
                  <TableCell sx={{ fontSize: 12, color: '#94a3b8' }}>{fmtDate(r.submitted_at)}</TableCell>
                </TableRow>
              ))}
              {!feedback.length && <TableRow><TableCell colSpan={6} sx={{ color: '#94a3b8', textAlign: 'center', py: 3 }}>No feedback submitted yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Section>
      )}
    </div>
  );
}
