// Students — everyone enrolled in the courses you teach.
//
// Was a bare MUI <Table> with two <TextField select> filters that only
// appeared when there was more than one value, so the page silently changed
// shape depending on the data. Now it is the same chrome as every other list
// in the portal: tabs with counts, a toolbar, filter pills, a sticky-header
// table and row actions.
import { useEffect, useMemo, useState } from 'react';
import GroupsIcon from '@mui/icons-material/GroupsOutlined';
import {
  PageHeader, Card, EmptyState, Badge, Btn, Skeleton, Modal, Tabs, Toolbar,
  SearchBox, FilterPill, TableWrap, TH, TD, TR, RowActions, lmsTokens, useToast,
} from '../../lib/lmsUi';
import { coursesApi } from '../../lib/endpoints';
import { studentAuth } from '../../lib/studentApi';
import { isRole } from '../../lib/rbac';

const { INK, MUTE, FAINT } = lmsTokens;

const statusTone = (s) => (s === 'active' ? 'success' : s === 'dropped' ? 'danger' : s === 'on_break' ? 'info' : 'warning');

export default function TrainerStudents() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  const [course, setCourse] = useState(null);
  const [pw, setPw] = useState(null);
  const [busy, setBusy] = useState('');
  const canManage = isRole('super_admin', 'branch_manager', 'head_trainer');

  const load = () => {
    setLoading(true);
    coursesApi.students()
      .then((r) => setRows(r?.data || []))
      .catch((e) => toast.show(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const courses = useMemo(
    () => [...new Set(rows.map((r) => r.program_name).filter(Boolean))],
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (course && r.program_name !== course) return false;
      if (tab === 'no_batch' && r.batch_name) return false;
      if (tab !== 'all' && tab !== 'no_batch' && r.status !== tab) return false;
      if (needle && !`${r.name} ${r.email || ''} ${r.phone || ''}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [rows, q, tab, course]);

  // Counts ignore the tab's own predicate so each keeps reporting its bucket.
  const counts = useMemo(() => {
    const base = course ? rows.filter((r) => r.program_name === course) : rows;
    return {
      all: base.length,
      no_batch: base.filter((r) => !r.batch_name).length,
      active: base.filter((r) => r.status === 'active').length,
      on_break: base.filter((r) => r.status === 'on_break').length,
      dropped: base.filter((r) => r.status === 'dropped').length,
    };
  }, [rows, course]);

  const reset = async (s) => {
    setBusy(s.id);
    try {
      const r = await coursesApi.resetStudentPassword(s.id);
      const d = r?.data ?? r;
      setPw({ name: s.name, password: d.password });
    } catch (e) { toast.show(e.message); } finally { setBusy(''); }
  };

  const sudo = async (s) => {
    setBusy(s.id);
    try {
      const r = await coursesApi.sudoStudent(s.id);
      const d = r?.data ?? r;
      studentAuth.setSession({ access_token: d.access_token, student: d.student, tenantSlug: d.tenantSlug });
      window.open('/student/home', '_blank');
      toast.show(`Opened the student portal as ${s.name}`);
    } catch (e) { toast.show(e.message); } finally { setBusy(''); }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1180, margin: '0 auto' }}>
      <PageHeader
        title="Students"
        subtitle="Everyone enrolled in your courses."
        icon={GroupsIcon}
      />

      <Card pad={0} style={{ overflow: 'hidden' }}>
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { key: 'all', label: 'All', count: counts.all },
            { key: 'no_batch', label: 'No batch', count: counts.no_batch },
            { key: 'active', label: 'Active', count: counts.active },
            { key: 'on_break', label: 'On break', count: counts.on_break },
            { key: 'dropped', label: 'Dropped', count: counts.dropped },
          ]}
        />

        <Toolbar
          left={<SearchBox value={q} onChange={setQ} placeholder="Search name, email or phone" width={300} />}
          actions={<Btn size="sm" variant="ghost" onClick={load}>Refresh</Btn>}
          filters={courses.length > 1 ? (
            <>
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.07, textTransform: 'uppercase', color: FAINT, whiteSpace: 'nowrap' }}>Course</span>
              {courses.map((c) => (
                <FilterPill key={c} active={course === c} onClick={() => setCourse(course === c ? null : c)}>
                  {c.length > 24 ? `${c.slice(0, 23)}…` : c}
                </FilterPill>
              ))}
            </>
          ) : null}
        />

        {loading ? (
          <div style={{ padding: 18 }}><Skeleton h={180} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="👥"
            title={rows.length === 0 ? 'No students yet' : 'Nothing matches'}
            text={rows.length === 0
              ? 'Students appear here once Accounts confirms them into one of your courses.'
              : 'Try a different filter or clear the search.'}
          />
        ) : (
          <TableWrap minWidth={880} maxHeight="calc(100vh - 330px)">
            <thead>
              <tr>
                <TH>Student</TH>
                <TH>Course</TH>
                <TH>Branch</TH>
                <TH>Batch</TH>
                <TH>Status</TH>
                {canManage && <TH align="right" width={200} />}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <TR key={s.id}>
                  <TD>
                    <div style={{ fontWeight: 650, color: INK }}>{s.name}</div>
                    <div style={{ fontSize: 11.5, color: FAINT }}>
                      {[s.email, s.phone].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </TD>
                  <TD muted>{s.program_name || '—'}</TD>
                  <TD muted>{s.branch_name || '—'}</TD>
                  <TD>
                    {s.batch_name
                      ? <Badge tone="neutral">{s.batch_name}</Badge>
                      : <Badge tone="warning">No batch</Badge>}
                  </TD>
                  <TD>
                    <Badge tone={statusTone(s.status)}>{String(s.status || '—').replace(/_/g, ' ')}</Badge>
                  </TD>
                  {canManage && (
                    <RowActions>
                      <Btn size="sm" variant="ghost" disabled={busy === s.id} onClick={() => reset(s)}>
                        Reset password
                      </Btn>
                      <Btn size="sm" variant="ghost" disabled={busy === s.id} onClick={() => sudo(s)}>
                        Open as student
                      </Btn>
                    </RowActions>
                  )}
                </TR>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>

      {/* The password is generated server-side and shown once — there is no
          way to retrieve it later, so the dialog says so rather than letting
          someone close it and come looking. */}
      <Modal
        open={!!pw}
        onClose={() => setPw(null)}
        title="Temporary password"
        subtitle={pw ? `For ${pw.name}. Share it with them directly.` : ''}
        actions={<Btn onClick={() => setPw(null)}>Done</Btn>}
      >
        <div style={{
          fontFamily: 'ui-monospace, monospace', fontSize: 18, fontWeight: 700, color: INK,
          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', textAlign: 'center',
        }}
        >
          {pw?.password}
        </div>
        <div style={{ fontSize: 12.5, color: MUTE, marginTop: 10 }}>
          This is the only time it is shown. If it is lost, reset again.
        </div>
        <Btn
          size="sm"
          variant="ghost"
          style={{ marginTop: 10 }}
          onClick={() => { navigator.clipboard?.writeText(pw.password).then(() => toast.show('Copied')).catch(() => {}); }}
        >
          Copy
        </Btn>
      </Modal>

      {toast.node}
    </div>
  );
}
