// Roster — who is teaching what, when.
//
// Two audiences, one screen, switched on what the server says the caller may
// see. A trainer gets their own week. A head trainer gets every lane side by
// side, which is the only way to answer the two questions that actually come
// up when scheduling: who is free, and who is double-booked.
//
// Clash and leave flags are computed server-side, deliberately. A clash can
// be with a class OUTSIDE the week on screen, and a leave may not be rendered
// at all — so a client-side check would miss exactly the cases worth
// catching. The grid just paints what the server already decided.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CalendarViewWeekIcon from '@mui/icons-material/CalendarViewWeekOutlined';
import {
  PageHeader, Card, EmptyState, Badge, Btn, Skeleton, Modal,
  lmsTokens, useToast,
} from '../../lib/lmsUi';
import { classesApi } from '../../lib/endpoints';

const { INK, MUTE, FAINT, LINE } = lmsTokens;

const startOfWeek = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  // Monday-first: a teaching week does not start on Sunday.
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
const fmtTime = (v) => new Date(v).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });

export default function TrainerRoster() {
  const navigate = useNavigate();
  const toast = useToast();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reassign, setReassign] = useState(null);
  const [target, setTarget] = useState('');
  const [saving, setSaving] = useState(false);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await classesApi.roster({
        from: weekStart.toISOString(),
        to: addDays(weekStart, 7).toISOString(),
      });
      setData(r?.data || null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => { load(); }, [load]);

  const classes = data?.classes || [];
  const trainers = data?.trainers || [];
  const leaves = data?.leaves || [];
  const teamView = !!data?.can_see_everyone;

  // Unassigned classes get their own pinned lane rather than a filter: a
  // class with no trainer is a class nobody is going to teach, and hiding it
  // behind a toggle is how it stays that way.
  const unassigned = classes.filter((c) => !c.trainer_id);

  const onLeave = (userId, day) => leaves.find(
    (l) => l.user_id === userId
      && new Date(l.from_date) <= day && new Date(l.to_date) >= day,
  );

  const stats = useMemo(() => ({
    total: classes.length,
    clashes: classes.filter((c) => c.has_clash).length,
    unassigned: unassigned.length,
    onLeave: classes.filter((c) => c.on_leave).length,
  }), [classes, unassigned.length]);

  const doReassign = async () => {
    if (!reassign || !target) return;
    setSaving(true);
    try {
      await classesApi.update(reassign.id, { trainer_id: target });
      toast.show('Class reassigned');
      setReassign(null);
      await load();
    } catch (e) {
      toast.show(e?.message || 'Could not reassign');
    } finally {
      setSaving(false);
    }
  };

  // Annotate each option from data already in memory — "free", "2 classes",
  // "ON LEAVE" — so picking a substitute is an informed choice, not a guess.
  const optionLabel = (t) => {
    if (!reassign) return t.name;
    const day = new Date(reassign.starts_at);
    const leave = onLeave(t.id, day);
    const n = classes.filter((c) => c.trainer_id === t.id && sameDay(c.starts_at, day)).length;
    if (leave) return `${t.name} — ON ${String(leave.status).toUpperCase()} LEAVE`;
    return n ? `${t.name} — ${n} class${n === 1 ? '' : 'es'} that day` : `${t.name} — free that day`;
  };

  const targetOnLeave = reassign && target ? onLeave(target, new Date(reassign.starts_at)) : null;

  return (
    <div style={{ padding: 24, maxWidth: 1320, margin: '0 auto' }}>
      <PageHeader
        title="Roster"
        subtitle={teamView ? 'Every trainer’s week — spot gaps, clashes and who is free.' : 'Your teaching week.'}
        icon={CalendarViewWeekIcon}
        right={(
          <>
            <Btn size="sm" variant="ghost" onClick={() => setWeekStart(addDays(weekStart, -7))}>‹</Btn>
            <Btn size="sm" variant="ghost" onClick={() => setWeekStart(startOfWeek(new Date()))}>This week</Btn>
            <Btn size="sm" variant="ghost" onClick={() => setWeekStart(addDays(weekStart, 7))}>›</Btn>
          </>
        )}
      />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <Stat label="Classes" value={stats.total} />
        <Stat label="Clashes" value={stats.clashes} tone={stats.clashes ? 'danger' : undefined} />
        {teamView && <Stat label="Unassigned" value={stats.unassigned} tone={stats.unassigned ? 'danger' : undefined} />}
        <Stat label="Scheduled on leave" value={stats.onLeave} tone={stats.onLeave ? 'warning' : undefined} />
      </div>

      {loading ? (
        <Card><Skeleton h={220} /></Card>
      ) : classes.length === 0 && trainers.length === 0 ? (
        <Card>
          <EmptyState icon="📋" title="Nothing scheduled" text="No classes in this week." />
        </Card>
      ) : (
        <Card pad={0} style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 980 }}>
              {/* Day header */}
              <div style={{ display: 'grid', gridTemplateColumns: '170px repeat(7, 1fr)', borderBottom: `1px solid ${LINE}`, background: '#f9fafb' }}>
                <div style={{ padding: '9px 12px', fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: FAINT }}>
                  Trainer
                </div>
                {days.map((d) => {
                  const today = sameDay(d, new Date());
                  return (
                    <div key={d.toISOString()} style={{ padding: '9px 10px', textAlign: 'center', borderLeft: `1px solid ${LINE}` }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: today ? INK : FAINT, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {d.toLocaleDateString('en-IN', { weekday: 'short' })}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: today ? 800 : 600, color: today ? 'var(--lms-accent, #E53935)' : MUTE }}>
                        {d.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {unassigned.length > 0 && (
                <Lane
                  name="⚠ Unassigned"
                  tone="danger"
                  days={days}
                  classes={unassigned}
                  onPick={(c) => { setReassign(c); setTarget(''); }}
                />
              )}

              {trainers.map((t) => (
                <Lane
                  key={t.id}
                  name={t.name}
                  days={days}
                  classes={classes.filter((c) => c.trainer_id === t.id)}
                  leaveFor={(d) => onLeave(t.id, d)}
                  onPick={(c) => { setReassign(c); setTarget(''); }}
                  onOpen={(c) => navigate(`/trainer/classes/${c.id}/console`)}
                  teamView={teamView}
                />
              ))}
            </div>
          </div>
        </Card>
      )}

      <Modal
        open={!!reassign}
        onClose={() => setReassign(null)}
        title="Reassign class"
        subtitle={reassign ? `${reassign.title} · ${new Date(reassign.starts_at).toLocaleDateString('en-IN')} ${fmtTime(reassign.starts_at)}` : ''}
        busy={saving}
        actions={(
          <>
            <Btn variant="ghost" onClick={() => setReassign(null)}>Cancel</Btn>
            <Btn onClick={doReassign} disabled={!target || saving}>
              {saving ? 'Saving…' : targetOnLeave ? 'Reassign anyway' : 'Reassign'}
            </Btn>
          </>
        )}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: MUTE }}>Teacher</span>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            style={{ height: 38, borderRadius: 9, border: '1px solid #cbd5e1', fontSize: 14, fontFamily: 'inherit', padding: '0 10px' }}
          >
            <option value="">Choose a trainer…</option>
            {trainers.map((t) => <option key={t.id} value={t.id}>{optionLabel(t)}</option>)}
          </select>
        </label>
        {/* Warn loudly, block nothing: a head trainer reassigning onto a
            leave day may know the leave was cancelled verbally. */}
        {targetOnLeave && (
          <div style={{ marginTop: 12, fontSize: 12.5, color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '9px 12px' }}>
            That trainer is on {targetOnLeave.status} leave on this date.
          </div>
        )}
      </Modal>

      {toast.node}
    </div>
  );
}

const Stat = ({ label, value, tone }) => (
  <div style={{
    display: 'flex', alignItems: 'baseline', gap: 7, padding: '8px 14px',
    border: `1px solid ${LINE}`, borderRadius: 10, background: '#fff',
  }}
  >
    <span style={{ fontSize: 18, fontWeight: 800, color: tone === 'danger' ? '#dc2626' : tone === 'warning' ? '#b45309' : INK }}>{value}</span>
    <span style={{ fontSize: 11.5, color: MUTE }}>{label}</span>
  </div>
);

const Lane = ({ name, tone, days, classes, leaveFor, onPick, onOpen, teamView }) => {
  const none = classes.length === 0;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '170px repeat(7, 1fr)', borderBottom: `1px solid ${LINE}` }}>
      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
        <span style={{ fontSize: 12.5, fontWeight: 650, color: tone === 'danger' ? '#b91c1c' : INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </span>
        {/* A trainer with an empty week is the answer to "who can take
            this?" — so say so rather than leaving a blank row. */}
        {none && teamView && <Badge tone="success">Free</Badge>}
      </div>
      {days.map((d) => {
        const onDay = classes.filter((c) => sameDay(c.starts_at, d));
        const leave = leaveFor?.(d);
        return (
          <div
            key={d.toISOString()}
            style={{
              borderLeft: `1px solid ${LINE}`, padding: 6, minHeight: 58,
              display: 'flex', flexDirection: 'column', gap: 4,
              // Hatched, not filled: a class scheduled ON a leave day must
              // still be readable — that collision is the thing worth seeing.
              background: leave
                ? (leave.status === 'approved'
                  ? 'repeating-linear-gradient(45deg,#fee2e2 0 6px,transparent 6px 12px)'
                  : 'repeating-linear-gradient(45deg,#fef3c7 0 6px,transparent 6px 12px)')
                : 'transparent',
            }}
          >
            {leave && onDay.length === 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, color: leave.status === 'approved' ? '#991b1b' : '#92400e', textTransform: 'uppercase' }}>
                {leave.status === 'approved' ? 'Leave' : 'Leave?'}
              </span>
            )}
            {onDay.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => (onOpen ? onOpen(c) : onPick(c))}
                onContextMenu={(e) => { e.preventDefault(); onPick(c); }}
                title={`${c.title} · ${fmtTime(c.starts_at)}–${fmtTime(c.ends_at)}${c.has_clash ? ' · CLASHES' : ''}${c.on_leave ? ' · on leave' : ''}`}
                style={{
                  textAlign: 'left', width: '100%', cursor: 'pointer', fontFamily: 'inherit',
                  borderRadius: 7, padding: '5px 7px', fontSize: 11,
                  border: c.has_clash || c.on_leave ? '2px solid #dc2626' : '1px solid color-mix(in srgb, var(--lms-accent, #E53935) 30%, transparent)',
                  background: c.ended_at ? '#f1f5f9' : 'color-mix(in srgb, var(--lms-accent, #E53935) 8%, #fff)',
                  color: INK,
                }}
              >
                <span style={{ display: 'block', fontWeight: 700 }}>{fmtTime(c.starts_at)}</span>
                <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                {(c.has_clash || c.on_leave) && (
                  <span style={{ display: 'block', color: '#b91c1c', fontWeight: 700 }}>
                    {c.has_clash ? '⚠ clash' : '⚠ on leave'}
                  </span>
                )}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
};
