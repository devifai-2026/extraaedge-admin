// Students & batches — bulk placement and movement.
//
// The ask was "they dont have bulk students to move or add in batch". The
// write path has supported it all along: POST .../batches/place takes a
// student_ids array, and placeStudentInBatch soft-removes any prior
// membership first, so a place IS a move in the single-batch model.
//
// What was missing was read-side. The only listing endpoint used NOT EXISTS
// on batch_students, so it could only ever return students with no batch — on
// the live course every student is already placed, so that endpoint returned
// an empty list and the screen looked broken. students-with-batch returns
// everyone, annotated, so one surface does both jobs.
import { useCallback, useEffect, useMemo, useState } from 'react';
import GroupsIcon from '@mui/icons-material/GroupsOutlined';
import {
  PageHeader, Card, EmptyState, Badge, Btn, Skeleton, Modal, Tabs, Toolbar,
  SearchBox, FilterPill, TableWrap, TH, TD, TR, lmsTokens, useToast,
} from '../../lib/lmsUi';
import { coursesApi } from '../../lib/endpoints';
import { useCourseScope, CoursePicker } from './CourseScope';

const { INK, MUTE, FAINT } = lmsTokens;
const UNASSIGNED = '__none__';

export default function TrainerBatchStudents() {
  const { programId, courses } = useCourseScope();
  const courseId = programId || courses[0]?.id || '';
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  const [batchFilter, setBatchFilter] = useState(null);
  // A Set, not an array: membership checks run once per row per render, and
  // the Lead Manager already proved this shape at list scale.
  const [selected, setSelected] = useState(() => new Set());
  const [moveOpen, setMoveOpen] = useState(false);
  const [targetBatch, setTargetBatch] = useState('');
  const [shareRecordings, setShareRecordings] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!courseId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [s, b] = await Promise.all([
        coursesApi.studentsWithBatch(courseId).then((r) => r?.data || []).catch(() => []),
        coursesApi.listBatches(courseId).then((r) => (r?.data || []).filter((x) => x.status !== 'merged')).catch(() => []),
      ]);
      setRows(s);
      setBatches(b);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { load(); }, [load]);

  // Any change to what the list MATCHES invalidates the selection. Keeping
  // ticks across a filter change is how people accidentally move students
  // they can no longer see.
  useEffect(() => { setSelected(new Set()); }, [courseId, tab, batchFilter, q]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab === 'unassigned' && r.batch_id) return false;
      if (tab !== 'all' && tab !== 'unassigned' && r.status !== tab) return false;
      if (batchFilter === UNASSIGNED && r.batch_id) return false;
      if (batchFilter && batchFilter !== UNASSIGNED && r.batch_id !== batchFilter) return false;
      if (needle && !`${r.name} ${r.email || ''}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [rows, q, tab, batchFilter]);

  // Counts are computed from the FULL list minus the tab's own predicate, so
  // every tab keeps reporting its own bucket while a tab is selected.
  const counts = useMemo(() => {
    const base = rows.filter((r) => {
      if (batchFilter === UNASSIGNED && r.batch_id) return false;
      if (batchFilter && batchFilter !== UNASSIGNED && r.batch_id !== batchFilter) return false;
      return true;
    });
    return {
      all: base.length,
      unassigned: base.filter((r) => !r.batch_id).length,
      active: base.filter((r) => r.status === 'active').length,
      on_break: base.filter((r) => r.status === 'on_break').length,
      dropped: base.filter((r) => r.status === 'dropped').length,
    };
  }, [rows, batchFilter]);

  const allTicked = filtered.length > 0 && filtered.every((r) => selected.has(r.student_id));
  const toggleAll = () => {
    setSelected(allTicked ? new Set() : new Set(filtered.map((r) => r.student_id)));
  };
  const toggleOne = (id) => setSelected((prev) => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  // Which batches are LOSING students. A move silently removes the previous
  // membership, so the confirmation has to say so by name rather than leaving
  // the trainer to discover it afterwards.
  const losing = useMemo(() => {
    const names = new Map();
    for (const r of rows) {
      if (!selected.has(r.student_id) || !r.batch_id) continue;
      if (r.batch_id === targetBatch) continue;
      names.set(r.batch_name, (names.get(r.batch_name) || 0) + 1);
    }
    return [...names.entries()];
  }, [rows, selected, targetBatch]);

  const doMove = async () => {
    if (!targetBatch) return;
    setSaving(true);
    try {
      await coursesApi.placeStudent(courseId, {
        batch_id: targetBatch,
        student_ids: [...selected],
        share_recordings: shareRecordings,
      });
      const name = batches.find((b) => b.id === targetBatch)?.name || 'the batch';
      toast.show(`Moved ${selected.size} student${selected.size === 1 ? '' : 's'} to ${name}`);
      setMoveOpen(false);
      setSelected(new Set());
      await load();
    } catch (e) {
      toast.show(e?.message || 'Could not move the students');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1180, margin: '0 auto' }}>
      <PageHeader
        title="Students &amp; batches"
        subtitle="Move students between batches, or place the ones who have none."
        icon={GroupsIcon}
        right={<CoursePicker allowAll={false} />}
      />

      <Card pad={0} style={{ overflow: 'hidden' }}>
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { key: 'all', label: 'All', count: counts.all },
            { key: 'unassigned', label: 'No batch', count: counts.unassigned },
            { key: 'active', label: 'Active', count: counts.active },
            { key: 'on_break', label: 'On break', count: counts.on_break },
            { key: 'dropped', label: 'Dropped', count: counts.dropped },
          ]}
        />

        <Toolbar
          left={<SearchBox value={q} onChange={setQ} placeholder="Search name or email" width={280} />}
          actions={<Btn size="sm" variant="ghost" onClick={load}>Refresh</Btn>}
          filters={(
            <>
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.07, textTransform: 'uppercase', color: FAINT, whiteSpace: 'nowrap' }}>Batch</span>
              <FilterPill active={batchFilter === UNASSIGNED} onClick={() => setBatchFilter(batchFilter === UNASSIGNED ? null : UNASSIGNED)}>
                No batch
              </FilterPill>
              {batches.map((b) => (
                <FilterPill key={b.id} active={batchFilter === b.id} onClick={() => setBatchFilter(batchFilter === b.id ? null : b.id)}>
                  {b.name}
                </FilterPill>
              ))}
            </>
          )}
        />

        {loading ? (
          <div style={{ padding: 18 }}><Skeleton h={160} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="👥"
            title={rows.length === 0 ? 'No students on this course yet' : 'Nothing matches'}
            text={rows.length === 0
              ? 'Students appear here once Accounts confirms them into the course.'
              : 'Try a different batch or clear the search.'}
          />
        ) : (
          <TableWrap minWidth={760} maxHeight="calc(100vh - 360px)">
            <thead>
              <tr>
                <TH width={44}>
                  <input type="checkbox" checked={allTicked} onChange={toggleAll} aria-label="Select all" style={{ cursor: 'pointer' }} />
                </TH>
                <TH>Student</TH>
                <TH>Batch</TH>
                <TH>Status</TH>
                <TH>Joined batch</TH>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const on = selected.has(r.student_id);
                return (
                  <TR key={r.student_id} selected={on} onClick={() => toggleOne(r.student_id)}>
                    <TD>
                      <input type="checkbox" checked={on} onChange={() => toggleOne(r.student_id)} aria-label={`Select ${r.name}`} style={{ cursor: 'pointer' }} />
                    </TD>
                    <TD>
                      <div style={{ fontWeight: 600, color: INK }}>{r.name}</div>
                      {r.email && <div style={{ fontSize: 11.5, color: FAINT }}>{r.email}</div>}
                    </TD>
                    <TD>
                      {r.batch_name
                        ? <Badge tone="neutral">{r.batch_name}</Badge>
                        : <Badge tone="warning">No batch</Badge>}
                    </TD>
                    <TD>
                      <Badge tone={r.status === 'active' ? 'success' : r.status === 'dropped' ? 'danger' : r.status === 'on_break' ? 'info' : 'neutral'}>
                        {String(r.status || '—').replace(/_/g, ' ')}
                      </Badge>
                    </TD>
                    <TD muted>{r.joined_batch_at ? new Date(r.joined_batch_at).toLocaleDateString('en-IN') : '—'}</TD>
                  </TR>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Card>

      {/* Sticky action bar — only while something is ticked. */}
      {selected.size > 0 && (
        <div style={{
          position: 'sticky', bottom: 16, marginTop: 14, display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px', background: INK, color: '#fff', borderRadius: 12,
          boxShadow: '0 14px 34px -14px rgba(15,23,42,0.6)',
        }}
        >
          <strong style={{ fontSize: 13.5 }}>{selected.size} selected</strong>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.35)', color: '#fff', borderRadius: 10, padding: '7px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Clear
          </button>
          <Btn size="sm" onClick={() => { setTargetBatch(''); setMoveOpen(true); }}>Move to batch →</Btn>
        </div>
      )}

      <Modal
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        title={`Move ${selected.size} student${selected.size === 1 ? '' : 's'}`}
        subtitle="A student belongs to one batch, so this moves them out of their current one."
        busy={saving}
        actions={(
          <>
            <Btn variant="ghost" onClick={() => setMoveOpen(false)}>Cancel</Btn>
            <Btn onClick={doMove} disabled={!targetBatch || saving}>{saving ? 'Moving…' : 'Move students'}</Btn>
          </>
        )}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: MUTE }}>Target batch</span>
            <select
              value={targetBatch}
              onChange={(e) => setTargetBatch(e.target.value)}
              style={{ height: 38, borderRadius: 9, border: '1px solid #cbd5e1', fontSize: 14, fontFamily: 'inherit', padding: '0 10px' }}
            >
              <option value="">Choose a batch…</option>
              {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>

          {losing.length > 0 && (
            <div style={{ fontSize: 12.5, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '9px 12px' }}>
              Leaving: {losing.map(([n, c]) => `${n} (${c})`).join(', ')}
            </div>
          )}

          <label style={{ display: 'flex', gap: 9, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input type="checkbox" checked={shareRecordings} onChange={(e) => setShareRecordings(e.target.checked)} style={{ marginTop: 3 }} />
            <span>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: INK }}>Give them the batch&apos;s earlier recordings</span>
              <span style={{ display: 'block', fontSize: 12, color: MUTE }}>
                Leave this on for a mid-course joiner so they can catch up. Off, they only see classes from today onward.
              </span>
            </span>
          </label>
        </div>
      </Modal>

      {toast.node}
    </div>
  );
}
