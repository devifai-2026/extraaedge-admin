// Dashboard — the numbers behind the teaching, one level up from Today.
//
// The old version opened with a gradient hero, a ring of avatars and three
// bar charts. It looked like a report and read like one: nothing on it was
// actionable, the per-course bars repeated what a table says more precisely,
// and it fired one classes request PER COURSE to populate a list whose rows
// could not be clicked.
//
// Today owns "what do I do now". This owns "how are my courses doing" — so it
// is a table of courses with the figures that actually differ between them,
// and every row goes somewhere.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AssessmentIcon from '@mui/icons-material/AssessmentOutlined';
import {
  PageHeader, Card, EmptyState, Badge, Btn, Skeleton, Progress,
  TableWrap, TH, TD, TR, RowActions, lmsTokens,
} from '../../lib/lmsUi';
import { coursesApi } from '../../lib/endpoints';

const { INK, MUTE, FAINT } = lmsTokens;

export default function TrainerDashboard() {
  const navigate = useNavigate();
  const [ins, setIns] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Two requests, not one-per-course. The old page fanned out
      // classesApi.list() across every course to build a list nobody could
      // click; Today covers that need properly now.
      const [insR, cR] = await Promise.all([
        coursesApi.insights().catch(() => ({ data: null })),
        coursesApi.list().catch(() => ({ data: [] })),
      ]);
      setIns(insR?.data || null);
      setCourses(cR?.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const t = ins?.totals || {};
  const perCourse = useMemo(() => ins?.per_course || [], [ins]);

  // Merge the two sources so one row carries both the structure (modules,
  // batches) and the people (students, active).
  const rows = useMemo(() => courses.map((c) => {
    const p = perCourse.find((x) => x.program_id === c.id || x.id === c.id) || {};
    return {
      ...c,
      students: Number(p.students ?? p.student_count ?? 0),
      active: Number(p.active_students ?? p.active ?? 0),
    };
  }), [courses, perCourse]);

  const attention = useMemo(() => ({
    noBatch: rows.filter((r) => !Number(r.batch_count)).length,
    noModules: rows.filter((r) => !Number(r.module_count)).length,
    unplaced: Number(t.unassigned || 0),
  }), [rows, t.unassigned]);

  return (
    <div style={{ padding: 24, maxWidth: 1180, margin: '0 auto' }}>
      <PageHeader
        title="Dashboard"
        subtitle="How your courses are doing."
        icon={AssessmentIcon}
        right={<Btn size="sm" variant="ghost" onClick={load}>Refresh</Btn>}
      />

      {loading ? (
        <Card><Skeleton h={200} /></Card>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon="🎓"
            title="No courses assigned yet"
            text="An admin assigns you to a course as head or trainer — it will show up here."
          />
        </Card>
      ) : (
        <>
          {/* Numbers inline, not five big tiles. They are context for the
              table below, not the point of the page. */}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 14, fontSize: 12.5, color: MUTE }}>
            <Figure n={rows.length} label="courses" />
            <Figure n={t.students || 0} label="students" />
            <Figure n={t.active_students || 0} label="active" />
            <Figure n={t.batches || 0} label="batches" />
            <Figure n={t.modules || 0} label="modules" />
          </div>

          {/* Surfaces only when something is actually wrong, and each item
              links to the screen that fixes it. */}
          {(attention.noBatch || attention.noModules || attention.unplaced) ? (
            <Card style={{ marginBottom: 14, borderLeft: '3px solid #d97706' }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <strong style={{ fontSize: 13, color: INK }}>Needs setting up</strong>
                {attention.unplaced > 0 && (
                  <Btn size="sm" variant="subtle" onClick={() => navigate('/trainer/batch-students')}>
                    {attention.unplaced} student{attention.unplaced === 1 ? '' : 's'} with no batch
                  </Btn>
                )}
                {attention.noBatch > 0 && (
                  <Badge tone="warning">{attention.noBatch} course{attention.noBatch === 1 ? '' : 's'} without a batch</Badge>
                )}
                {attention.noModules > 0 && (
                  <Badge tone="warning">{attention.noModules} without modules</Badge>
                )}
              </div>
            </Card>
          ) : null}

          <Card pad={0} style={{ overflow: 'hidden' }} title="Courses">
            <TableWrap minWidth={860}>
              <thead>
                <tr>
                  <TH>Course</TH>
                  <TH align="right" width={90}>Students</TH>
                  <TH width={150}>Active</TH>
                  <TH align="right" width={90}>Modules</TH>
                  <TH align="right" width={90}>Batches</TH>
                  <TH align="right" width={170} />
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const pct = c.students ? Math.round((c.active / c.students) * 100) : null;
                  return (
                    <TR key={c.id} onClick={() => navigate(`/trainer/courses/${c.id}`)}>
                      <TD>
                        <div style={{ fontWeight: 650, color: INK, fontSize: 13.5 }}>{c.name}</div>
                        <div style={{ fontSize: 11.5, color: FAINT }}>{c.head_trainer_name || '—'}</div>
                      </TD>
                      <TD align="right" style={{ fontWeight: 700 }}>{c.students}</TD>
                      <TD>
                        {pct == null ? (
                          <span style={{ color: FAINT }}>—</span>
                        ) : (
                          <>
                            <Progress value={pct} tint={pct >= 75 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626'} />
                            <div style={{ fontSize: 11, color: FAINT, marginTop: 3 }}>{c.active} of {c.students}</div>
                          </>
                        )}
                      </TD>
                      <TD align="right">
                        {Number(c.module_count) ? c.module_count : <Badge tone="warning">none</Badge>}
                      </TD>
                      <TD align="right">
                        {Number(c.batch_count) ? c.batch_count : <Badge tone="warning">none</Badge>}
                      </TD>
                      <RowActions>
                        <Btn size="sm" variant="ghost" onClick={() => navigate(`/trainer/courses/${c.id}?tab=modules`)}>Modules</Btn>
                        <Btn size="sm" variant="ghost" onClick={() => navigate(`/trainer/attendance?course=${c.id}`)}>Register</Btn>
                      </RowActions>
                    </TR>
                  );
                })}
              </tbody>
            </TableWrap>
          </Card>
        </>
      )}
    </div>
  );
}

const Figure = ({ n, label }) => (
  <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5 }}>
    <strong style={{ fontSize: 17, color: INK }}>{n}</strong>
    <span>{label}</span>
  </span>
);
