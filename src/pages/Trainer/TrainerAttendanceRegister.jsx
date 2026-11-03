// The attendance register — the old-school attendance book.
//
// Students down the left, class dates across the top, a mark in every cell.
// It is the one view a trainer coming off paper recognises instantly, and
// the portal had nothing like it: /trainer/attendance rendered the SAME
// component as /trainer/classes, so "Attendance" was a duplicate nav entry
// pointing at a scheduling screen.
//
// Three cell states, not two. "Absent" and "never marked" are different
// facts: one is a student who missed a class, the other is a hole in the book
// the trainer can still fill. Collapsing them — which the live console does
// when a class ends — would silently manufacture absences across historical
// classes, so this view deliberately keeps them apart.
import { useCallback, useEffect, useMemo, useState } from 'react';
import HowToRegIcon from '@mui/icons-material/HowToRegOutlined';
import {
  PageHeader, Card, EmptyState, Btn, Skeleton, lmsTokens, useToast,
} from '../../lib/lmsUi';
import { coursesApi, classesApi } from '../../lib/endpoints';
import { useCourseScope, CoursePicker } from './CourseScope';

const { INK, MUTE, FAINT, LINE } = lmsTokens;

const iso = (d) => new Date(d).toISOString().slice(0, 10);
const monthStart = () => { const d = new Date(); d.setDate(1); return iso(d); };
const today = () => iso(new Date());

export default function TrainerAttendanceRegister() {
  const { programId, courses } = useCourseScope();
  const courseId = programId || courses[0]?.id || '';
  const toast = useToast();

  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState('');
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busyCell, setBusyCell] = useState(null);

  useEffect(() => {
    if (!courseId) return;
    coursesApi.listBatches(courseId)
      .then((r) => {
        const list = (r?.data || []).filter((b) => b.status !== 'merged');
        setBatches(list);
        setBatchId((cur) => (list.some((b) => b.id === cur) ? cur : list[0]?.id || ''));
      })
      .catch(() => setBatches([]));
  }, [courseId]);

  const load = useCallback(async () => {
    if (!courseId || !batchId) { setData(null); return; }
    setLoading(true);
    try {
      const r = await coursesApi.attendanceRegister(courseId, { batch_id: batchId, from, to });
      setData(r?.data || null);
    } catch (e) {
      toast.show(e?.message || 'Could not load the register');
      setData(null);
    } finally {
      setLoading(false);
    }
    // toast is stable enough for this; re-running on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, batchId, from, to]);

  useEffect(() => { load(); }, [load]);

  // One Map for every lookup, built once. Keyed student:class.
  const marks = useMemo(() => {
    const m = new Map();
    for (const x of data?.marks || []) m.set(`${x.student_id}:${x.class_id}`, x);
    return m;
  }, [data]);

  const classes = data?.classes || [];
  const students = data?.students || [];

  // A student placed mid-course must not be counted absent for classes that
  // ran before they joined. recordings_from is the join cutoff, so those
  // cells read "–" and leave the denominator alone — otherwise every moved
  // student looks like a chronic absentee and the trainer stops trusting it.
  const cellState = useCallback((s, c) => {
    if (s.recordings_from && new Date(c.starts_at) < new Date(s.recordings_from)) return 'na';
    const m = marks.get(`${s.student_id}:${c.id}`);
    if (m?.status === 'present') return 'present';
    if (m?.status === 'absent') return m.pre_notified_absent ? 'informed' : 'absent';
    return c.ended_at ? 'unmarked' : 'future';
  }, [marks]);

  const totals = useMemo(() => {
    const out = new Map();
    for (const s of students) {
      let p = 0; let n = 0;
      for (const c of classes) {
        const st = cellState(s, c);
        if (st === 'na' || st === 'future') continue;
        n += 1;
        if (st === 'present') p += 1;
      }
      out.set(s.student_id, { present: p, of: n, pct: n ? Math.round((p / n) * 100) : null });
    }
    return out;
  }, [students, classes, cellState]);

  const toggle = async (s, c) => {
    const st = cellState(s, c);
    if (st === 'na' || st === 'future') return;
    const next = st === 'present' ? 'absent' : 'present';
    const key = `${s.student_id}:${c.id}`;
    setBusyCell(key);
    try {
      await classesApi.editAttendance(c.id, { student_id: s.student_id, status: next });
      await load();
    } catch (e) {
      toast.show(e?.message || 'Could not update');
    } finally {
      setBusyCell(null);
    }
  };

  const markColumnPresent = async (c) => {
    const pending = students.filter((s) => {
      const st = cellState(s, c);
      return st !== 'present' && st !== 'na' && st !== 'future';
    });
    if (!pending.length) return;
    setBusyCell(`col:${c.id}`);
    try {
      // Chunked: thirty unthrottled POSTs trip rate limiting and succeed
      // partially, which is worse than slow.
      for (let i = 0; i < pending.length; i += 5) {
         
        await Promise.all(pending.slice(i, i + 5).map((s) => classesApi.editAttendance(
          c.id, { student_id: s.student_id, status: 'present' },
        )));
      }
      toast.show(`Marked ${pending.length} present`);
      await load();
    } catch (e) {
      toast.show(e?.message || 'Some students could not be marked');
      await load();
    } finally {
      setBusyCell(null);
    }
  };

  const exportCsv = () => {
    const head = ['Student', ...classes.map((c) => `${new Date(c.starts_at).toLocaleDateString('en-IN')} ${String(c.title).replace(/"/g, '""')}`), 'Present', 'Of', '%'];
    const lines = [head.map((h) => `"${h}"`).join(',')];
    for (const s of students) {
      const t = totals.get(s.student_id);
      const cells = classes.map((c) => ({ present: 'P', absent: 'A', informed: 'A*', unmarked: '', na: '-', future: '' }[cellState(s, c)]));
      lines.push([`"${s.name}"`, ...cells, t.present, t.of, t.pct ?? ''].join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `attendance-${batchId}-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const preset = (days) => {
    const t = new Date();
    const f = new Date(); f.setDate(f.getDate() - days);
    setFrom(iso(f)); setTo(iso(t));
  };

  return (
    <div style={{ padding: 24, maxWidth: 1320, margin: '0 auto' }} className="reg-page">
      {/* Printing matters more here than anywhere else in the portal: this is
          the screen replacing a paper book, and the first thing someone does
          with a register is take it to class. Sticky cells must un-stick or
          they stack on page one. */}
      <style>{`
        @media print {
          @page { size: landscape; margin: 10mm; }
          .layout-sidebar, .layout-header, .reg-controls, .reg-noprint { display: none !important; }
          .reg-page { padding: 0 !important; max-width: none !important; }
          .reg-page th, .reg-page td { position: static !important; box-shadow: none !important; }
          .reg-page table { font-size: 9px; }
          .reg-page button { border: 0 !important; background: none !important; color: #000 !important; }
        }
      `}</style>
      <PageHeader
        title="Attendance register"
        subtitle="Who was in class, date by date."
        icon={HowToRegIcon}
        right={<CoursePicker allowAll={false} />}
      />

      <Card style={{ marginBottom: 14 }}>
        <div className="reg-controls" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Labeled label="Batch">
            <select value={batchId} onChange={(e) => setBatchId(e.target.value)} style={selectSx}>
              {batches.length === 0 && <option value="">No batches</option>}
              {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Labeled>
          <Labeled label="From"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={selectSx} /></Labeled>
          <Labeled label="To"><input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={selectSx} /></Labeled>
          <Btn size="sm" variant="ghost" onClick={() => preset(7)}>Last 7 days</Btn>
          <Btn size="sm" variant="ghost" onClick={() => { setFrom(monthStart()); setTo(today()); }}>This month</Btn>
          <Btn size="sm" variant="ghost" onClick={() => preset(90)}>Last 90 days</Btn>
          <span style={{ flex: 1 }} />
          <Btn size="sm" variant="ghost" onClick={exportCsv} disabled={!classes.length}>Export CSV</Btn>
          <Btn size="sm" variant="ghost" onClick={() => window.print()} disabled={!classes.length}>Print</Btn>
        </div>
      </Card>

      <Card pad={0} style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 18 }}><Skeleton h={200} /></div>
        ) : !batchId ? (
          <EmptyState icon="👥" title="No batch yet" text="Create a batch on this course and place students in it, then their attendance appears here." />
        ) : classes.length === 0 ? (
          <EmptyState icon="🗓️" title="No classes in this range" text="Widen the dates, or schedule a class for this batch." />
        ) : students.length === 0 ? (
          <EmptyState icon="👥" title="No students in this batch" text="Place students into the batch and their attendance shows up here." />
        ) : (
          <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 330px)' }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: 560 }}>
              <thead>
                <tr>
                  {/* The corner has to out-rank both frozen axes or the
                      header scrolls underneath the name column. */}
                  <th style={{ ...headSx, ...nameColSx, zIndex: 4, textAlign: 'left' }}>Student</th>
                  {classes.map((c) => (
                    <th key={c.id} style={{ ...headSx, minWidth: 74 }}>
                      <div style={{ fontWeight: 800, color: INK }}>
                        {new Date(c.starts_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </div>
                      <div title={c.title} style={{ fontSize: 10, color: FAINT, fontWeight: 500, maxWidth: 74, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.title}
                      </div>
                      {c.ended_at && (
                        <button
                          type="button"
                          onClick={() => markColumnPresent(c)}
                          disabled={busyCell === `col:${c.id}`}
                          title="Mark everyone present for this class"
                          style={{ marginTop: 3, border: 0, background: 'none', color: '#15803d', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          ✓ all
                        </button>
                      )}
                    </th>
                  ))}
                  <th style={{ ...headSx, ...totalColSx, zIndex: 4 }}>Attendance</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const t = totals.get(s.student_id);
                  const low = t.pct != null && t.pct < 75;
                  return (
                    <tr key={s.student_id} style={{ background: low ? '#fef2f2' : '#fff' }}>
                      <td style={{ ...cellSx, ...nameColSx, textAlign: 'left', background: low ? '#fef2f2' : '#fff' }}>
                        <div style={{ fontWeight: 600, color: INK, fontSize: 13 }}>{s.name}</div>
                        {s.email && <div style={{ fontSize: 10.5, color: FAINT }}>{s.email}</div>}
                      </td>
                      {classes.map((c) => {
                        const st = cellState(s, c);
                        const k = `${s.student_id}:${c.id}`;
                        const v = VIEW[st];
                        return (
                          <td key={c.id} style={{ ...cellSx, textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => toggle(s, c)}
                              disabled={busyCell === k || st === 'na' || st === 'future'}
                              title={v.hint}
                              style={{
                                width: 30, height: 30, borderRadius: 8, cursor: st === 'na' || st === 'future' ? 'default' : 'pointer',
                                border: `1px solid ${v.border}`, background: v.bg, color: v.fg,
                                fontWeight: 800, fontSize: 12, fontFamily: 'inherit',
                              }}
                            >
                              {v.label}
                            </button>
                          </td>
                        );
                      })}
                      <td style={{ ...cellSx, ...totalColSx, background: low ? '#fef2f2' : '#fff' }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: low ? '#b91c1c' : INK }}>
                          {t.pct == null ? '—' : `${t.pct}%`}
                        </div>
                        <div style={{ fontSize: 10.5, color: FAINT }}>{t.present}/{t.of}</div>
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td style={{ ...cellSx, ...nameColSx, textAlign: 'left', fontWeight: 700, color: MUTE, fontSize: 12 }}>Per class</td>
                  {classes.map((c) => {
                    const p = students.filter((s) => cellState(s, c) === 'present').length;
                    const a = students.filter((s) => ['absent', 'informed'].includes(cellState(s, c))).length;
                    return (
                      <td key={c.id} style={{ ...cellSx, textAlign: 'center', fontSize: 11, color: MUTE }}>
                        <div style={{ color: '#15803d', fontWeight: 700 }}>P:{p}</div>
                        <div style={{ color: a ? '#b91c1c' : FAINT }}>A:{a}</div>
                      </td>
                    );
                  })}
                  <td style={{ ...cellSx, ...totalColSx }} />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="reg-noprint" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 12, fontSize: 11.5, color: MUTE }}>
        {['present', 'absent', 'informed', 'unmarked', 'na'].map((k) => (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 18, height: 18, borderRadius: 5, border: `1px solid ${VIEW[k].border}`, background: VIEW[k].bg, color: VIEW[k].fg, fontSize: 10, fontWeight: 800, display: 'grid', placeItems: 'center' }}>
              {VIEW[k].label}
            </span>
            {VIEW[k].legend}
          </span>
        ))}
      </div>

      {toast.node}
    </div>
  );
}

// present / absent / informed-absence / never-marked / before-they-joined.
const VIEW = {
  present: { label: 'P', bg: '#dcfce7', fg: '#15803d', border: '#86efac', hint: 'Present — click to mark absent', legend: 'Present' },
  absent: { label: 'A', bg: '#fee2e2', fg: '#b91c1c', border: '#fca5a5', hint: 'Absent — click to mark present', legend: 'Absent' },
  informed: { label: 'A', bg: '#ffedd5', fg: '#9a3412', border: '#fdba74', hint: 'Absent, told you in advance', legend: 'Informed absence' },
  unmarked: { label: '·', bg: '#fff', fg: '#94a3b8', border: '#e2e8f0', hint: 'Never marked — click to mark present', legend: 'Not marked' },
  na: { label: '–', bg: '#f8fafc', fg: '#cbd5e1', border: '#eef0f5', hint: 'Joined the batch after this class', legend: 'Before they joined' },
  future: { label: '', bg: '#fff', fg: '#fff', border: '#f1f5f9', hint: 'Class has not happened yet', legend: '' },
};

const headSx = {
  position: 'sticky', top: 0, zIndex: 3, background: '#f9fafb',
  padding: '8px 6px', fontSize: 11, borderBottom: `1px solid ${LINE}`, textAlign: 'center',
};
const cellSx = { padding: '6px', borderBottom: `1px solid ${LINE}` };
// Frozen first column; the header corner raises its own z-index above this.
const nameColSx = { position: 'sticky', left: 0, zIndex: 2, minWidth: 180, background: '#fff', boxShadow: `1px 0 0 ${LINE}` };
const totalColSx = { position: 'sticky', right: 0, zIndex: 2, minWidth: 86, background: '#fff', boxShadow: `-1px 0 0 ${LINE}`, textAlign: 'center' };
const selectSx = { height: 34, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontFamily: 'inherit', padding: '0 8px', background: '#fff' };

const Labeled = ({ label, children }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.06, textTransform: 'uppercase', color: FAINT }}>{label}</span>
    {children}
  </label>
);
