// Student Classes — List and Calendar views of the schedule, with live
// attendance MCQs answered inline within the window.
//
// JOIN STATE is driven entirely by the server's `can_join` flag plus
// started_at/ended_at, so the button can never offer something the API will
// refuse:
//   not started  ->  "Not started yet" (disabled)
//   live, never joined -> "Join Class"
//   live, joined       -> "Rejoin"
//   ended        ->  "Class ended" (disabled), and no "I'm online" either
//
// Before this, a class that had ended still showed Join / I'm online, which
// read as "the class is still open" long after the trainer had closed it.
import { useEffect, useState, useCallback, useRef } from 'react';
import { studentApi } from '../../lib/studentApi';
import { PageHeader, Card, EmptyState, Badge, Btn, Skeleton, useToast, ACCENT } from '../../lib/lmsUi';
import CalendarIcon from '@mui/icons-material/CalendarMonthOutlined';

const fmt = (v) => { try { return new Date(v).toLocaleString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

// "45 min" / "1 hr" / "1 hr 30 min" — so a student can see the commitment
// before joining. Falls back to nothing rather than showing "0 min" when the
// class has no usable end time.
const duration = (startsAt, endsAt) => {
  if (!startsAt || !endsAt) return '';
  const mins = Math.round((new Date(endsAt) - new Date(startsAt)) / 60000);
  if (!Number.isFinite(mins) || mins <= 0) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (!h) return `${m} min`;
  return m ? `${h} hr ${m} min` : `${h} hr`;
};

const sameDay = (a, b) => a.getFullYear() === b.getFullYear()
  && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export default function StudentClasses() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [view, setView] = useState('list');        // list | calendar
  const [cursor, setCursor] = useState(() => new Date()); // month shown
  const toast = useToast();
  const pollRef = useRef(null);

  const load = useCallback(() => studentApi.myClasses().then((r) => setClasses(r?.data || [])).catch((e) => toast.show(e.message)).finally(() => setLoading(false)), []); // eslint-disable-line
  useEffect(() => { load(); }, [load]);

  const pollQuestions = useCallback((id) => studentApi.openQuestions(id).then((r) => setQuestions(r?.data || [])).catch(() => {}), []);
  useEffect(() => {
    if (!active) { if (pollRef.current) clearInterval(pollRef.current); return; }
    pollQuestions(active.id);
    pollRef.current = setInterval(() => pollQuestions(active.id), 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [active, pollQuestions]);

  const answer = async (cid, qid, oi) => { try { await studentApi.answer(cid, { question_id: qid, option_index: oi }); toast.show('Answer submitted'); pollQuestions(cid); } catch (e) { toast.show(e.message); } };
  const preNotify = async (cid) => {
    const reason = window.prompt('Let your trainer know why you can’t attend (optional):', '');
    if (reason === null) return; // cancelled
    try { await studentApi.preNotifyAbsence(cid, reason.trim()); toast.show('Marked absent — your trainer will see the reason'); load(); } catch (e) { toast.show(e.message); }
  };
  const setJoin = async (cid, mode) => {
    let reason = '';
    if (mode === 'online') { const r = window.prompt('Attending online — add a note for your trainer (optional):', ''); if (r === null) return; reason = r.trim(); }
    try { await studentApi.setJoinMode(cid, mode, reason); toast.show(`Joining ${mode}`); } catch (e) { toast.show(e.message); }
  };
  // Records the click server-side, then opens the meeting. The flag is what
  // flips the button to "Rejoin" on the next load.
  const joinClass = async (c) => {
    try {
      const r = await studentApi.joinClass(c.id);
      const url = r?.data?.meeting_url || c.meeting_url;
      if (url) window.open(url, '_blank', 'noopener');
      load();
    } catch (e) { toast.show(e.message); }
  };

  const statusTone = (s) => (s === 'present' ? 'success' : s === 'absent' ? 'danger' : s === 'pending' ? 'warning' : 'neutral');

  const renderCard = (c) => {
    const live = c.started_at && !c.ended_at;
    const ended = !!c.ended_at;
    const notStarted = !c.started_at;
    const dur = duration(c.starts_at, c.ends_at);
    return (
      <Card key={c.id} pad={16} style={live ? { border: `1px solid ${ACCENT}`, boxShadow: `0 6px 20px -12px ${ACCENT}` } : undefined}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>{c.title}</span>
              {c.kind === 'mock_test' && <Badge tone="info">Mock test</Badge>}
              {live && <Badge tone="danger">● LIVE</Badge>}
              {ended && <Badge tone="neutral">Class ended</Badge>}
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>
              {c.module_name ? `${c.module_name} · ` : ''}{fmt(c.starts_at)}
              {dur ? ` · ${dur}` : ''} · {c.mode}
            </div>
            <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Badge tone={statusTone(c.my_status)}>{c.my_status}{c.pre_notified_absent ? ' · you notified' : ''}</Badge>
              {c.join_count > 0 && <Badge tone="neutral">joined {c.join_count}×</Badge>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* Ended classes offer nothing — not Join, not "I'm online". */}
            {ended ? (
              <Btn size="sm" variant="ghost" disabled style={{ opacity: 0.6, cursor: 'not-allowed' }}>Class ended</Btn>
            ) : notStarted ? (
              <Btn size="sm" variant="ghost" disabled style={{ opacity: 0.6, cursor: 'not-allowed' }}>Not started yet</Btn>
            ) : (
              <>
                <Btn size="sm" onClick={() => joinClass(c)}>{c.joined_at ? 'Rejoin' : 'Join Class'}</Btn>
                {c.mode === 'online' && <Btn size="sm" variant="ghost" onClick={() => setJoin(c.id, 'online')}>I&apos;m online</Btn>}
                {c.mode === 'offline' && <Btn size="sm" variant="ghost" onClick={() => setJoin(c.id, 'offline')}>I&apos;m in class</Btn>}
              </>
            )}
            {live && <Btn size="sm" variant="subtle" onClick={() => setActive(active?.id === c.id ? null : c)}>{active?.id === c.id ? 'Hide questions' : 'Attendance'}</Btn>}
            {!ended && !c.pre_notified_absent && <Btn size="sm" variant="ghost" onClick={() => preNotify(c.id)} style={{ color: '#b45309', borderColor: '#fcd34d' }}>Can&apos;t attend</Btn>}
          </div>
        </div>

        {active?.id === c.id && (
          <div style={{ marginTop: 14, borderTop: '1px solid #eef2f7', paddingTop: 14 }}>
            {questions.length === 0
              ? <div style={{ fontSize: 13, color: '#94a3b8' }}>No open questions right now — new ones appear automatically. Answer all fired questions to be marked present.</div>
              : questions.map((q) => (
                <div key={q.id} style={{ marginBottom: 14 }}>
                  <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>{q.question}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(q.options || []).map((o, i) => (
                      <Btn key={i} size="sm" variant={q.answered ? 'ghost' : 'subtle'} disabled={!!q.answered} onClick={() => answer(c.id, q.id, i)}>{o}</Btn>
                    ))}
                  </div>
                  {q.answered ? <div style={{ fontSize: 12, color: '#15803d', marginTop: 4 }}>Answered ✓</div> : null}
                </div>
              ))}
          </div>
        )}
      </Card>
    );
  };

  // ---- Calendar ----
  const monthGrid = () => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const first = new Date(y, m, 1);
    const startPad = first.getDay();               // Sun-first, matching the trainer calendar
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startPad; i += 1) cells.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(y, m, d));
    while (cells.length % 7) cells.push(null);
    return cells;
  };
  const classesOn = (day) => classes.filter((c) => c.starts_at && sameDay(new Date(c.starts_at), day));
  const today = new Date();

  return (
    <div>
      <PageHeader title="Classes" subtitle="Your schedule, join links and live attendance." icon={CalendarIcon} />
      {toast.node}

      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <Btn size="sm" variant={view === 'list' ? 'solid' : 'ghost'} onClick={() => setView('list')}>List</Btn>
        <Btn size="sm" variant={view === 'calendar' ? 'solid' : 'ghost'} onClick={() => setView('calendar')}>Calendar</Btn>
        {view === 'calendar' && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
            <Btn size="sm" variant="ghost" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>‹</Btn>
            <span style={{ fontWeight: 700, color: '#0f172a', minWidth: 140, textAlign: 'center' }}>
              {cursor.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
            </span>
            <Btn size="sm" variant="ghost" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>›</Btn>
          </div>
        )}
      </div>

      {loading ? <Card><Skeleton h={16} w="50%" /><div style={{ height: 8 }} /><Skeleton h={12} w="70%" /></Card>
        : classes.length === 0 ? <Card><EmptyState icon="📅" title="No classes yet" text="Your class schedule will appear here once your trainer sets it up." /></Card>
        : view === 'list' ? (
          <div style={{ display: 'grid', gap: 12 }}>{classes.map(renderCard)}</div>
        ) : (
          <>
            <Card pad={12}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textAlign: 'center', padding: '4px 0' }}>{d}</div>
                ))}
                {monthGrid().map((day, i) => {
                  if (!day) return <div key={`pad-${i}`} />;
                  const list = classesOn(day);
                  const isToday = sameDay(day, today);
                  return (
                    <div
                      key={day.toISOString()}
                      style={{
                        minHeight: 74, borderRadius: 8, padding: 5,
                        border: isToday ? `1px solid ${ACCENT}` : '1px solid #eef2f7',
                        background: list.length ? '#fbfcfe' : '#fff',
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 700, color: isToday ? ACCENT : '#64748b' }}>{day.getDate()}</div>
                      {list.slice(0, 2).map((c) => {
                        const live = c.started_at && !c.ended_at;
                        return (
                          <div
                            key={c.id}
                            onClick={() => { setView('list'); setActive(null); }}
                            title={`${c.title} · ${fmt(c.starts_at)}${duration(c.starts_at, c.ends_at) ? ` · ${duration(c.starts_at, c.ends_at)}` : ''}`}
                            style={{
                              marginTop: 3, fontSize: 10.5, lineHeight: 1.3, cursor: 'pointer',
                              padding: '2px 4px', borderRadius: 4, whiteSpace: 'nowrap',
                              overflow: 'hidden', textOverflow: 'ellipsis',
                              background: live ? ACCENT : c.ended_at ? '#f1f5f9' : '#e0e7ff',
                              color: live ? '#fff' : c.ended_at ? '#94a3b8' : '#3730a3',
                            }}
                          >
                            {c.title}
                          </div>
                        );
                      })}
                      {list.length > 2 && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>+{list.length - 2} more</div>}
                    </div>
                  );
                })}
              </div>
            </Card>
            {/* The month's classes in full, so the calendar is navigable without
                losing the join buttons the cards carry. */}
            <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
              {classes
                .filter((c) => c.starts_at
                  && new Date(c.starts_at).getMonth() === cursor.getMonth()
                  && new Date(c.starts_at).getFullYear() === cursor.getFullYear())
                .map(renderCard)}
            </div>
          </>
        )}
    </div>
  );
}
