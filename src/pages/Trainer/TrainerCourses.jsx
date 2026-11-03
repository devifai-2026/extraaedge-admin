// My Courses — a dense, scannable table, not a wall of cards.
//
// The old version laid courses out as 280px cards in an auto-fill grid inside
// a 1000px container, which forced two columns whose rows STRETCHED to the
// tallest card — so one two-line title inflated an entire row and left a
// field of dead whitespace. Every card also carried the same red rail, the
// same icon and the same "Head" badge, so nothing was scannable: five
// identical rectangles with the useful numbers buried in grey pills.
//
// A table fits five courses in the space one card row used, puts the numbers
// in aligned columns where they can be compared, and gives each row the thing
// a card never had: somewhere to go other than "open this course".
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import {
  PageHeader, Card, EmptyState, Badge, Btn, Skeleton, Toolbar, SearchBox,
  TableWrap, TH, TD, TR, RowActions, lmsTokens,
} from '../../lib/lmsUi';
import { coursesApi } from '../../lib/endpoints';

const { INK, MUTE, FAINT } = lmsTokens;

export default function TrainerCourses() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    coursesApi.list()
      .then((r) => setRows(r?.data || []))
      .catch((e) => setError(e?.message || 'Failed to load courses'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((c) => `${c.name} ${c.code || ''}`.toLowerCase().includes(needle));
  }, [rows, q]);

  const totals = useMemo(() => ({
    modules: rows.reduce((n, c) => n + (Number(c.module_count) || 0), 0),
    batches: rows.reduce((n, c) => n + (Number(c.batch_count) || 0), 0),
    empty: rows.filter((c) => !Number(c.batch_count)).length,
  }), [rows]);

  const go = (c, tab) => navigate(`/trainer/courses/${c.id}${tab ? `?tab=${tab}` : ''}`);

  return (
    <div style={{ padding: 24, maxWidth: 1180, margin: '0 auto' }}>
      <PageHeader
        title="My Courses"
        subtitle="Everything you teach, and what still needs setting up."
        icon={SchoolOutlinedIcon}
      />

      {error && (
        <Card style={{ marginBottom: 14, borderLeft: '3px solid #dc2626' }}>
          <span style={{ color: '#b91c1c', fontSize: 13 }}>{error}</span>
        </Card>
      )}

      {/* Inline counters, not three big tiles. The numbers matter but they
          are not the page — the courses are. */}
      {!loading && rows.length > 0 && (
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 12, fontSize: 12.5, color: MUTE }}>
          <Counter n={rows.length} label="courses" />
          <Counter n={totals.modules} label="modules" />
          <Counter n={totals.batches} label="batches" />
          {totals.empty > 0 && <Counter n={totals.empty} label="with no batch yet" tone="warning" />}
        </div>
      )}

      <Card pad={0} style={{ overflow: 'hidden' }}>
        <Toolbar
          left={<SearchBox value={q} onChange={setQ} placeholder="Search courses" width={280} />}
        />

        {loading ? (
          <div style={{ padding: 18 }}><Skeleton h={180} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="🎓"
            title={rows.length === 0 ? 'No courses assigned yet' : 'Nothing matches'}
            text={rows.length === 0
              ? 'An admin assigns you to a course as head or trainer — it will show up here.'
              : 'Try a different search.'}
          />
        ) : (
          <TableWrap minWidth={820}>
            <thead>
              <tr>
                <TH>Course</TH>
                <TH align="right" width={90}>Modules</TH>
                <TH align="right" width={90}>Batches</TH>
                <TH width={110}>Mode</TH>
                <TH width={130}>Head trainer</TH>
                <TH align="right" width={190} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const noBatch = !Number(c.batch_count);
                const noModules = !Number(c.module_count);
                return (
                  <TR key={c.id} onClick={() => go(c)}>
                    <TD>
                      <div style={{ fontWeight: 650, color: INK, fontSize: 13.5 }}>{c.name}</div>
                      <div style={{ fontSize: 11.5, color: FAINT }}>
                        {[c.code, c.duration_value ? `${c.duration_value} ${c.duration_unit}` : null]
                          .filter(Boolean).join(' · ') || '—'}
                      </div>
                    </TD>
                    <TD align="right">
                      {noModules
                        ? <Badge tone="warning">none</Badge>
                        : <span style={{ fontWeight: 700, color: INK }}>{c.module_count}</span>}
                    </TD>
                    <TD align="right">
                      {noBatch
                        ? <Badge tone="warning">none</Badge>
                        : <span style={{ fontWeight: 700, color: INK }}>{c.batch_count}</span>}
                    </TD>
                    <TD muted>{c.type || '—'}</TD>
                    <TD muted>{c.head_trainer_name || '—'}</TD>
                    {/* The old card's only action was "open this course".
                        These go straight to the panel you actually wanted. */}
                    <RowActions>
                      <Btn size="sm" variant="ghost" onClick={() => go(c, 'modules')}>Modules</Btn>
                      <Btn size="sm" variant={noBatch ? 'primary' : 'ghost'} onClick={() => go(c, 'batches')}>
                        {noBatch ? 'Add batch' : 'Batches'}
                      </Btn>
                    </RowActions>
                  </TR>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}

const Counter = ({ n, label, tone }) => (
  <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5 }}>
    <strong style={{ fontSize: 15, color: tone === 'warning' ? '#b45309' : INK }}>{n}</strong>
    <span>{label}</span>
  </span>
);
