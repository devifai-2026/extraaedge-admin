// "Today" — the trainer's landing page.
//
// WHY THIS REPLACES THE DASHBOARD. Teams opens on "here is your next meeting,
// press Join." The old trainer dashboard opened on charts, and the one screen
// that knew about today's classes rendered them as plain <div>s you could not
// click. Meanwhile the live-class console — the richest thing in the portal —
// sat four clicks deep behind a modal.
//
// So this page answers one question: what am I teaching, and what is the one
// button I need right now. Everything else is secondary.
//
// It also fixes an N+1: the dashboard fetched classes once PER COURSE in a
// Promise.all fan-out. One windowed request covers every course now.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TodayIcon from '@mui/icons-material/TodayOutlined';
import {
  PageHeader, Card, EmptyState, Badge, Btn, Skeleton, lmsTokens, useToast,
} from '../../lib/lmsUi';
import { classesApi, communityApi } from '../../lib/endpoints';

const { INK, MUTE, FAINT, LINE } = lmsTokens;

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

const fmtTime = (v) => new Date(v).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
const fmtDay = (v) => new Date(v).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

// A class is one of: live / next / done / scheduled. Derived from the
// lifecycle columns rather than a status column, because there isn't one —
// state lives in started_at / ended_at (see the classes migration).
const stateOf = (c, now) => {
  if (c.started_at && !c.ended_at) return 'live';
  if (c.ended_at) return 'done';
  if (new Date(c.ends_at) < now) return 'missed';
  return 'scheduled';
};

export default function TrainerMyDay() {
  const navigate = useNavigate();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [queue, setQueue] = useState({ unended: [], pending: [], missingRec: [] });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [now, setNow] = useState(() => new Date());

  // Re-tick each minute so "live" and the countdown stay honest without a
  // reload. One timer, not one per row.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const from = startOfDay(new Date()).toISOString();
    const to = addDays(startOfDay(new Date()), 8).toISOString();
    try {
      const [list, unended, pending, missed] = await Promise.all([
        classesApi.list({ from, to }).then((r) => r?.data || []).catch(() => []),
        classesApi.unended().then((r) => r?.data || []).catch(() => []),
        classesApi.pendingCompletions().then((r) => r?.data || []).catch(() => []),
        communityApi.missedRecordings().then((r) => r?.data || []).catch(() => []),
      ]);
      setRows(list);
      setQueue({ unended, pending, missingRec: missed });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { today, upcoming, liveOne, nextOne } = useMemo(() => {
    const todayEnd = addDays(startOfDay(now), 1);
    const t = rows.filter((c) => new Date(c.starts_at) < todayEnd);
    const u = rows.filter((c) => new Date(c.starts_at) >= todayEnd);
    const live = t.find((c) => stateOf(c, now) === 'live');
    const next = [...t, ...u].find((c) => stateOf(c, now) === 'scheduled');
    return { today: t, upcoming: u, liveOne: live, nextOne: next };
  }, [rows, now]);

  const lifecycle = async (c, action) => {
    setBusyId(c.id);
    try {
      await classesApi.lifecycle(c.id, action);
      toast.show(action === 'class_started' ? 'Class started' : 'Class ended');
      await load();
    } catch (e) {
      toast.show(e?.message || 'Could not update the class');
    } finally {
      setBusyId(null);
    }
  };

  const openConsole = (c) => navigate(`/trainer/classes/${c.id}/console`);
  const join = (c) => { if (c.meeting_url) window.open(c.meeting_url, '_blank', 'noopener'); };

  const actionCount = queue.unended.length + queue.pending.length + queue.missingRec.length;
  const focus = liveOne || nextOne;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <PageHeader
        title="Today"
        subtitle={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        icon={TodayIcon}
        right={<Btn variant="ghost" onClick={load}>Refresh</Btn>}
      />

      {loading ? (
        <Card><Skeleton h={120} /></Card>
      ) : (
        <>
          {/* THE ONE CARD. Live class if there is one, otherwise the next.
              Everything a trainer does in the first five seconds is here. */}
          {focus ? (
            <FocusCard
              cls={focus}
              now={now}
              busy={busyId === focus.id}
              onJoin={() => join(focus)}
              onStart={() => lifecycle(focus, 'class_started')}
              onEnd={() => lifecycle(focus, 'class_ended')}
              onConsole={() => openConsole(focus)}
            />
          ) : (
            <Card>
              <EmptyState
                icon="📅"
                title="No classes scheduled"
                text="Nothing today or in the next week. Schedule a class and it will show up here with a join link and one-click attendance."
                action={<Btn onClick={() => navigate('/trainer/classes')}>Schedule a class</Btn>}
              />
            </Card>
          )}

          {/* Needs you — the action queue. Every row is a button that goes to
              the fix, which is the whole point: the old Recordings banner
              named the classes you owed and then made you find them again in
              two dropdowns. */}
          {actionCount > 0 && (
            <Card title={`Needs you (${actionCount})`} style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {queue.unended.map((c) => (
                  <ActionRow
                    key={`u-${c.id}`} tone="danger" label="Still running"
                    text={`${c.title} — started ${fmtDay(c.started_at || c.starts_at)} and never ended`}
                    cta="End class" onClick={() => lifecycle(c, 'class_ended')}
                  />
                ))}
                {queue.pending.map((c) => (
                  <ActionRow
                    key={`p-${c.id}`} tone={c.overdue ? 'danger' : 'warning'} label="Confirm"
                    text={`${c.title} — ${fmtDay(c.ends_at)} needs a completion status`}
                    cta="Open" onClick={() => openConsole(c)}
                  />
                ))}
                {queue.missingRec.map((c) => (
                  <ActionRow
                    key={`r-${c.id}`} tone="warning" label="Recording"
                    text={`${c.title} — ${fmtDay(c.ends_at || c.starts_at)} has no recording yet`}
                    cta="Upload" onClick={() => navigate(`/trainer/recordings?class=${c.id}`)}
                  />
                ))}
              </div>
            </Card>
          )}

          {today.length > 0 && (
            <Card title={`Today (${today.length})`} style={{ marginTop: 16 }}>
              <ClassList
                rows={today} now={now} busyId={busyId}
                onJoin={join} onConsole={openConsole}
                onStart={(c) => lifecycle(c, 'class_started')}
                onEnd={(c) => lifecycle(c, 'class_ended')}
              />
            </Card>
          )}

          {upcoming.length > 0 && (
            <Card title={`Next 7 days (${upcoming.length})`} style={{ marginTop: 16 }}>
              <ClassList
                rows={upcoming} now={now} busyId={busyId} showDay
                onJoin={join} onConsole={openConsole}
                onStart={(c) => lifecycle(c, 'class_started')}
                onEnd={(c) => lifecycle(c, 'class_ended')}
              />
            </Card>
          )}
        </>
      )}
      {toast.node}
    </div>
  );
}

// ---------------------------------------------------------------------------

const FocusCard = ({ cls, now, busy, onJoin, onStart, onEnd, onConsole }) => {
  const state = stateOf(cls, now);
  const mins = Math.round((new Date(cls.starts_at) - now) / 60000);
  const when = state === 'live' ? 'Live now'
    : mins > 0 && mins < 60 ? `Starts in ${mins} min`
      : `${fmtDay(cls.starts_at)} · ${fmtTime(cls.starts_at)}`;

  return (
    <Card style={{ borderLeft: `4px solid ${state === 'live' ? '#dc2626' : 'var(--lms-accent, #E53935)'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        {state === 'live'
          ? <Badge tone="danger">● LIVE</Badge>
          : <Badge tone="accent">Up next</Badge>}
        <span style={{ fontSize: 12.5, color: MUTE }}>{when}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: INK, letterSpacing: -0.3 }}>{cls.title}</div>
      <div style={{ fontSize: 13, color: MUTE, marginTop: 3 }}>
        {[cls.program_name, cls.batch_name, cls.module_name].filter(Boolean).join(' · ')}
      </div>
      <div style={{ fontSize: 12.5, color: FAINT, marginTop: 6 }}>
        {fmtTime(cls.starts_at)}–{fmtTime(cls.ends_at)}
        {cls.student_count ? ` · ${cls.student_count} students` : ''}
        {cls.present_count ? ` · ${cls.present_count} present` : ''}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        {cls.meeting_url && <Btn onClick={onJoin}>Join meeting ↗</Btn>}
        {state !== 'live' && !cls.ended_at && (
          <Btn variant="subtle" onClick={onStart} disabled={busy}>{busy ? 'Working…' : 'Start class'}</Btn>
        )}
        {state === 'live' && (
          <Btn variant="subtle" onClick={onEnd} disabled={busy}>{busy ? 'Working…' : 'End class'}</Btn>
        )}
        <Btn variant="ghost" onClick={onConsole}>Attendance &amp; questions →</Btn>
      </div>
    </Card>
  );
};

const ActionRow = ({ tone, label, text, cta, onClick }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: `1px solid ${LINE}`, borderRadius: 10, background: '#fcfcfd' }}>
    <Badge tone={tone}>{label}</Badge>
    <span style={{ fontSize: 13, color: INK, flex: 1, minWidth: 0 }}>{text}</span>
    <Btn size="sm" variant="subtle" onClick={onClick}>{cta}</Btn>
  </div>
);

const ClassList = ({ rows, now, busyId, showDay, onJoin, onConsole, onStart, onEnd }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    {rows.map((c) => {
      const state = stateOf(c, now);
      return (
        <div
          key={c.id}
          onClick={() => onConsole(c)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') onConsole(c); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
            border: `1px solid ${LINE}`, borderRadius: 10, cursor: 'pointer', background: '#fff',
          }}
        >
          <div style={{ minWidth: 86, fontSize: 12.5, fontWeight: 700, color: INK }}>
            {showDay && <div style={{ fontSize: 11, color: FAINT, fontWeight: 600 }}>{fmtDay(c.starts_at)}</div>}
            {fmtTime(c.starts_at)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: INK }}>{c.title}</div>
            <div style={{ fontSize: 11.5, color: FAINT }}>
              {[c.batch_name, c.module_name].filter(Boolean).join(' · ')}
              {c.student_count ? ` · ${c.student_count} students` : ''}
            </div>
          </div>
          {state === 'live' && <Badge tone="danger">● LIVE</Badge>}
          {state === 'done' && <Badge tone="success">Done</Badge>}
          {state === 'missed' && <Badge tone="warning">Not run</Badge>}
          <span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', gap: 6 }}>
            {c.meeting_url && <Btn size="sm" variant="ghost" onClick={() => onJoin(c)}>Join</Btn>}
            {state === 'scheduled' && (
              <Btn size="sm" variant="subtle" disabled={busyId === c.id} onClick={() => onStart(c)}>Start</Btn>
            )}
            {state === 'live' && (
              <Btn size="sm" variant="subtle" disabled={busyId === c.id} onClick={() => onEnd(c)}>End</Btn>
            )}
          </span>
        </div>
      );
    })}
  </div>
);
