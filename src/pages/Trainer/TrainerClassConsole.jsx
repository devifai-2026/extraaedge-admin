// Live class console — start/end the class (= trainer self-attendance), fire
// attendance questions (MCQ / true-false / long text, ad-hoc or from the bank),
// and watch the present/absent table update live over the socket. Manual edits
// are flagged server-side.
//
// The trainer nominates the CORRECT answer while composing: `correct_index`
// has always existed on the questions table, but this console never sent it, so
// every question stored NULL and no report could say who was right. MCQ and
// true/false are auto-graded from it; long-text answers are read and marked by
// hand in the Results panel.
//
// Attendance still means "answered", not "answered correctly" — a wrong answer
// marks a student present. Correctness lives in Results.
import { useEffect, useState, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box,
  TextField, IconButton, Table, TableHead, TableRow, TableCell, TableBody,
  Alert, ToggleButton, ToggleButtonGroup, Radio, Tooltip, Collapse, Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Section, Badge } from '../../lib/lmsUi';
import { classesApi } from '../../lib/endpoints';
import { joinBatch, leaveBatch, onSocketEvent } from '../../lib/socket';

const TYPES = [
  { key: 'mcq', label: 'MCQ' },
  { key: 'true_false', label: 'True / False' },
  { key: 'long_text', label: 'Long text' },
];
const blankQ = { question: '', question_type: 'mcq', options: ['', ''], correct_index: null, visible_minutes: 5 };
const verdictTone = { correct: 'success', wrong: 'danger', ungraded: 'neutral' };

export default function TrainerClassConsole({ cls, onClose }) {
  const [table, setTable] = useState([]);
  const [msg, setMsg] = useState('');
  const [started, setStarted] = useState(!!cls.started_at);
  const [ended, setEnded] = useState(!!cls.ended_at);
  const [q, setQ] = useState(blankQ);
  const [results, setResults] = useState([]);
  const [openQ, setOpenQ] = useState(null); // expanded question id in Results
  const batchId = cls.batch_id;

  const loadTable = useCallback(() => {
    classesApi.attendance(cls.id).then((r) => setTable(r?.data || [])).catch((e) => setMsg(e.message));
  }, [cls.id]);
  const loadResults = useCallback(() => {
    classesApi.questionAnalytics(cls.id).then((r) => setResults(r?.data || [])).catch(() => {});
  }, [cls.id]);

  useEffect(() => {
    loadTable();
    loadResults();
    joinBatch(batchId);
    // A new answer changes both the attendance table and the results panel.
    const off1 = onSocketEvent('lms:attendance-updated', (e) => {
      if (e?.class_id === cls.id) { loadTable(); loadResults(); }
    });
    return () => { off1(); leaveBatch(batchId); };
  }, [cls.id, batchId, loadTable, loadResults]);

  const lifecycle = async (action) => {
    try {
      await classesApi.lifecycle(cls.id, action);
      if (action === 'class_started') setStarted(true);
      if (action === 'class_ended') setEnded(true);
      setMsg('');
    } catch (e) { setMsg(e.message); }
  };

  const setOpt = (i, v) => setQ((s) => { const o = [...s.options]; o[i] = v; return { ...s, options: o }; });
  // Removing an option must not leave correct_index pointing at the wrong row
  // (or past the end) — shift it down, or clear it if the correct one went.
  const removeOpt = (i) => setQ((s) => {
    const options = s.options.filter((_, j) => j !== i);
    let ci = s.correct_index;
    if (ci === i) ci = null;
    else if (ci !== null && ci > i) ci -= 1;
    return { ...s, options, correct_index: ci };
  });
  const setType = (t) => {
    if (!t) return;
    setQ((s) => ({
      ...s,
      question_type: t,
      // Each kind owns its option list, so switching resets the answer rather
      // than carrying a stale index across shapes.
      options: t === 'mcq' ? ['', ''] : [],
      correct_index: null,
    }));
  };

  const fire = async () => {
    const type = q.question_type;
    if (!q.question.trim()) { setMsg('Enter a question'); return; }
    const body = {
      question: q.question.trim(),
      question_type: type,
      visible_minutes: Number(q.visible_minutes) || 5,
      source: 'adhoc',
    };
    if (type === 'mcq') {
      const options = q.options.map((o) => o.trim()).filter(Boolean);
      if (options.length < 2) { setMsg('Enter at least 2 options'); return; }
      if (q.correct_index === null) { setMsg('Select the correct option'); return; }
      if (q.correct_index >= options.length) { setMsg('Select the correct option'); return; }
      body.options = options;
      body.correct_index = q.correct_index;
    } else if (type === 'true_false') {
      if (q.correct_index === null) { setMsg('Select True or False as the correct answer'); return; }
      body.correct_index = q.correct_index; // options seeded server-side
    }
    try {
      await classesApi.fireQuestion(cls.id, body);
      setQ(blankQ);
      setMsg(`Question fired — students have ${body.visible_minutes} min to answer.`);
      loadResults();
    } catch (e) { setMsg(e.message); }
  };

  const grade = async (answerId, isCorrect) => {
    try { await classesApi.gradeAnswer(cls.id, { answer_id: answerId, is_correct: isCorrect }); loadResults(); }
    catch (e) { setMsg(e.message); }
  };

  const edit = async (studentId, status) => {
    try { await classesApi.editAttendance(cls.id, { student_id: studentId, status }); loadTable(); }
    catch (e) { setMsg(e.message); }
  };

  const present = table.filter((r) => r.status === 'present').length;
  const type = q.question_type;

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {cls.title}
        <Badge tone="neutral">{cls.batch_name}</Badge>
        {ended ? <Badge tone="neutral">Ended</Badge> : started ? <Badge tone="danger">● LIVE</Badge> : <Badge tone="warning">Scheduled</Badge>}
      </DialogTitle>
      <DialogContent>
        {msg && <Alert severity="info" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          {cls.meeting_url && <Button size="small" variant="outlined" component="a" href={cls.meeting_url} target="_blank" rel="noreferrer" sx={{ textTransform: 'none' }}>Open meeting</Button>}
          {!started && <Button size="small" variant="contained" color="success" onClick={() => lifecycle('class_started')} sx={{ textTransform: 'none' }}>Start class</Button>}
          {started && !ended && <Button size="small" variant="contained" color="warning" onClick={() => lifecycle('class_ended')} sx={{ textTransform: 'none' }}>End class</Button>}
        </Box>

        {/* Fire an attendance question */}
        <Section title="Fire attendance question">
          <Box sx={{ display: 'grid', gap: 1 }}>
            <ToggleButtonGroup size="small" exclusive value={type} onChange={(_, t) => setType(t)} sx={{ alignSelf: 'flex-start' }}>
              {TYPES.map((t) => (
                <ToggleButton key={t.key} value={t.key} sx={{ textTransform: 'none', px: 1.5 }}>{t.label}</ToggleButton>
              ))}
            </ToggleButtonGroup>

            <TextField size="small" label="Question" value={q.question} onChange={(e) => setQ((s) => ({ ...s, question: e.target.value }))} />

            {type === 'mcq' && (
              <>
                {q.options.map((o, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Tooltip title="Mark as the correct answer">
                      <Radio
                        size="small"
                        checked={q.correct_index === i}
                        onChange={() => setQ((s) => ({ ...s, correct_index: i }))}
                        sx={{ color: '#cbd5e1', '&.Mui-checked': { color: '#16a34a' } }}
                      />
                    </Tooltip>
                    <TextField size="small" fullWidth label={`Option ${i + 1}`} value={o} onChange={(e) => setOpt(i, e.target.value)} />
                    {q.options.length > 2 && <IconButton size="small" onClick={() => removeOpt(i)}><DeleteOutlineIcon fontSize="small" /></IconButton>}
                  </Box>
                ))}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Button size="small" startIcon={<AddIcon />} disabled={q.options.length >= 6} onClick={() => setQ((s) => ({ ...s, options: [...s.options, ''] }))} sx={{ textTransform: 'none' }}>Add option</Button>
                </Box>
              </>
            )}

            {type === 'true_false' && (
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', pl: 0.5 }}>
                {['True', 'False'].map((label, i) => (
                  <Box key={label} sx={{ display: 'flex', alignItems: 'center' }}>
                    <Radio
                      size="small"
                      checked={q.correct_index === i}
                      onChange={() => setQ((s) => ({ ...s, correct_index: i }))}
                      sx={{ color: '#cbd5e1', '&.Mui-checked': { color: '#16a34a' } }}
                    />
                    <span style={{ fontSize: 14 }}>{label}</span>
                  </Box>
                ))}
                <span style={{ fontSize: 12, color: '#64748b' }}>— pick the correct answer</span>
              </Box>
            )}

            {type === 'long_text' && (
              <Alert severity="info" sx={{ py: 0.5 }}>
                Students type a free-text answer. It counts for attendance; mark each one right or wrong yourself under Results.
              </Alert>
            )}

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField size="small" type="number" label="Visible (min)" value={q.visible_minutes} onChange={(e) => setQ((s) => ({ ...s, visible_minutes: e.target.value }))} sx={{ width: 130 }} inputProps={{ min: 1, max: 120 }} />
              <Button size="small" variant="contained" onClick={fire} sx={{ textTransform: 'none', bgcolor: '#E53935', ml: 'auto' }}>Fire question</Button>
            </Box>
          </Box>
        </Section>

        <div style={{ borderTop: '1px solid #eef0f5', margin: '4px 0 18px' }} />

        {/* Per-question results */}
        {results.length > 0 && (
          <>
            <Section title="Results" right={<Badge tone="neutral">{results.length} question{results.length === 1 ? '' : 's'}</Badge>}>
              {results.map((r) => {
                const open = openQ === r.id;
                const correctLabel = r.correct_index !== null && Array.isArray(r.options)
                  ? r.options[r.correct_index] : null;
                return (
                  <Box key={r.id} sx={{ border: '1px solid #eef0f5', borderRadius: 1, mb: 1 }}>
                    <Box
                      onClick={() => setOpenQ(open ? null : r.id)}
                      sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, cursor: 'pointer', flexWrap: 'wrap' }}
                    >
                      <ExpandMoreIcon fontSize="small" sx={{ transform: open ? 'rotate(180deg)' : 'none', transition: '.15s', color: '#94a3b8' }} />
                      <span style={{ fontWeight: 600, fontSize: 13, flex: 1, minWidth: 180 }}>{r.question}</span>
                      <Chip size="small" label={TYPES.find((t) => t.key === r.question_type)?.label || r.question_type} sx={{ height: 20, fontSize: 11 }} />
                      <Badge tone="success">{r.summary.correct} correct</Badge>
                      <Badge tone="danger">{r.summary.wrong} wrong</Badge>
                      {r.summary.ungraded > 0 && <Badge tone="warning">{r.summary.ungraded} ungraded</Badge>}
                      <Badge tone="neutral">{r.summary.no_answer} no answer</Badge>
                    </Box>
                    <Collapse in={open}>
                      <Box sx={{ px: 1.5, pb: 1.5 }}>
                        {correctLabel && (
                          <div style={{ fontSize: 12, color: '#16a34a', marginBottom: 6 }}>
                            Correct answer: <strong>{correctLabel}</strong>
                          </div>
                        )}
                        <Table size="small">
                          <TableHead><TableRow sx={{ '& th': { color: '#64748b', fontWeight: 700, fontSize: 11 } }}>
                            <TableCell>Student</TableCell><TableCell>Answer</TableCell>
                            <TableCell align="center">Result</TableCell><TableCell align="right" />
                          </TableRow></TableHead>
                          <TableBody>
                            {r.answers.map((a) => (
                              <TableRow key={a.answer_id}>
                                <TableCell>{a.name}</TableCell>
                                <TableCell sx={{ fontSize: 12, color: '#475569', maxWidth: 320, whiteSpace: 'pre-wrap' }}>
                                  {r.question_type === 'long_text'
                                    ? (a.answer_text || '—')
                                    : (Array.isArray(r.options) ? r.options[a.option_index] : a.option_index)}
                                </TableCell>
                                <TableCell align="center">
                                  <Badge tone={verdictTone[a.verdict]}>{a.verdict}</Badge>
                                </TableCell>
                                <TableCell align="right">
                                  {/* Only long text is hand-graded; the choice kinds are
                                      settled by correct_index and the server rejects
                                      overriding them. */}
                                  {r.question_type === 'long_text' && (
                                    <>
                                      <Tooltip title="Mark correct">
                                        <IconButton size="small" onClick={() => grade(a.answer_id, true)}>
                                          <CheckCircleIcon fontSize="small" sx={{ color: a.is_correct_override === true ? '#16a34a' : '#cbd5e1' }} />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="Mark wrong">
                                        <IconButton size="small" onClick={() => grade(a.answer_id, false)}>
                                          <CancelIcon fontSize="small" sx={{ color: a.is_correct_override === false ? '#dc2626' : '#cbd5e1' }} />
                                        </IconButton>
                                      </Tooltip>
                                    </>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                            {r.no_answer.map((n) => (
                              <TableRow key={`na-${n.student_id}`}>
                                <TableCell sx={{ color: '#94a3b8' }}>{n.name}</TableCell>
                                <TableCell sx={{ color: '#94a3b8', fontSize: 12 }}>did not answer</TableCell>
                                <TableCell align="center"><Badge tone="neutral">—</Badge></TableCell>
                                <TableCell />
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Box>
                    </Collapse>
                  </Box>
                );
              })}
            </Section>
            <div style={{ borderTop: '1px solid #eef0f5', margin: '4px 0 18px' }} />
          </>
        )}

        <Section title="Attendance" right={<Badge tone={table.length > 0 && present === table.length ? 'success' : 'neutral'}>{present}/{table.length} present</Badge>}>
        <Table size="small">
          <TableHead><TableRow sx={{ background: '#fafbfc', '& th': { color: '#64748b', fontWeight: 700, fontSize: 12 } }}>
            <TableCell>Student</TableCell><TableCell align="center">Answered</TableCell>
            <TableCell align="center">Join</TableCell><TableCell align="center">Status</TableCell><TableCell align="right" />
          </TableRow></TableHead>
          <TableBody>
            {table.map((r) => (
              <TableRow key={r.student_id}>
                <TableCell>{r.name}{r.pre_notified_absent ? ' · pre-notified' : ''}{r.reason ? <div style={{ fontSize: 11, color: '#b45309', marginTop: 2, fontStyle: 'italic' }}>“{r.reason}”</div> : null}</TableCell>
                <TableCell align="center">{r.answered}</TableCell>
                <TableCell align="center" sx={{ color: '#64748b' }}>{r.join_mode || '—'}</TableCell>
                <TableCell align="center">
                  <Badge tone={r.status === 'present' ? 'success' : r.status === 'absent' ? 'danger' : 'neutral'}>{r.status}</Badge>
                  {r.edited_at && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>edited{r.edited_by_name ? ` by ${r.edited_by_name}` : ''}</div>}
                </TableCell>
                <TableCell align="right">
                  {r.status === 'present'
                    ? <Button size="small" onClick={() => edit(r.student_id, 'absent')} sx={{ textTransform: 'none' }}>Mark absent</Button>
                    : <Button size="small" onClick={() => edit(r.student_id, 'present')} sx={{ textTransform: 'none' }}>Mark present</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </Section>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
