// Placement student-360 — a candidate's full LMS record for the placement team:
// weighted scorecard, per-test marks, project marks, capstone, and interview
// per-category scores, plus their CV. Opened from Applications (candidate name).
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBackOutlined';
import PersonIcon from '@mui/icons-material/PersonOutlineOutlined';
import { placementApi } from '../../lib/endpoints';
import { PageHeader, Card, EmptyState, Badge, Skeleton } from '../../lib/lmsUi';

const pctColor = (v) => (v == null ? '#94a3b8' : v >= 75 ? '#15803d' : v >= 50 ? '#b45309' : '#dc2626');
const fmtDate = (v) => { if (!v) return '—'; try { return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }); } catch { return '—'; } };

export default function PlacementStudentReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    placementApi.studentReport(id).then((r) => setData(r?.data ?? r)).catch((e) => setErr(e.message)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Box sx={{ p: 3, maxWidth: 960, mx: 'auto' }}><Card><Skeleton h={18} w="40%" /><div style={{ height: 10 }} /><Skeleton h={12} w="70%" /></Card></Box>;
  if (err || !data) return <Box sx={{ p: 3, maxWidth: 960, mx: 'auto' }}><Card><EmptyState icon="⚠️" title="Couldn't load" text={err || 'No data'} /></Card></Box>;

  const { student, scorecard, tests = [], projects = [], capstones = [], interviews = [] } = data;
  const sc = scorecard || {};

  return (
    <Box sx={{ p: 3, maxWidth: 960, mx: 'auto' }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ textTransform: 'none', mb: 1, color: '#64748b' }}>Back</Button>
      <PageHeader title={student.name} subtitle={`${student.email}${student.program_name ? ` · ${student.program_name}` : ''}`} icon={PersonIcon}
        right={student.cv_url ? <a href={student.cv_url} target="_blank" rel="noreferrer" style={{ background: '#E53935', color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700 }}>View CV</a> : null}
      />

      {/* Scorecard */}
      <Card title="Scorecard" style={{ marginBottom: 16 }}>
        {!scorecard ? <EmptyState icon="📊" title="No scores yet" text="This student has no graded work yet." /> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
            {[['Overall', sc.total], ['Attendance', sc.attendance_pct], ['Tests', sc.test_score], ['Projects', sc.project_score], ['Capstone', sc.capstone_score], ['Interview', sc.interview_score]].map(([label, v]) => (
              <div key={label} style={{ textAlign: 'center', padding: 12, background: '#f8fafc', borderRadius: 10 }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: pctColor(v), letterSpacing: -0.5 }}>{v == null ? '—' : `${v}`}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Tests */}
      <Card title="Mock tests" style={{ marginBottom: 16 }}>
        {tests.length === 0 ? <div style={muted}>No tests.</div> : tests.map((t) => (
          <Row key={t.id} left={t.title} sub={t.module_name} right={t.my_score != null ? `${t.my_score}/${t.total_marks}` : 'Not attempted'} tone={t.my_score != null ? 'success' : 'neutral'} />
        ))}
      </Card>

      {/* Projects */}
      <Card title="Projects" style={{ marginBottom: 16 }}>
        {projects.length === 0 ? <div style={muted}>No projects.</div> : projects.map((p) => (
          <Row key={p.id} left={p.title} sub={p.module_name} right={p.marks != null ? `${p.marks}/${p.max_marks}` : (p.submitted_at ? 'Submitted' : 'Pending')} tone={p.marks != null ? 'success' : p.submitted_at ? 'info' : 'neutral'} />
        ))}
      </Card>

      {/* Capstone */}
      <Card title="Capstone" style={{ marginBottom: 16 }}>
        {capstones.length === 0 ? <div style={muted}>No capstone.</div> : capstones.map((c) => (
          <Row key={c.id} left={c.title} sub={c.submitted_at ? `Submitted ${fmtDate(c.submitted_at)}` : 'Not submitted'} right={c.marks != null ? `${c.marks}/${c.max_marks}` : (c.submitted_at ? 'Submitted' : 'Pending')} tone={c.marks != null ? 'success' : c.submitted_at ? 'info' : 'neutral'} />
        ))}
      </Card>

      {/* Interviews with per-category breakdown */}
      <Card title="Mock interviews">
        {interviews.length === 0 ? <div style={muted}>No interviews.</div> : interviews.map((iv) => (
          <div key={iv.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 600, color: '#0f172a' }}>{iv.title}</div>
              <Badge tone={iv.graded_at ? 'success' : 'warning'}>{iv.graded_at ? `${iv.marks}/${iv.max_marks}` : 'Pending'}</Badge>
            </div>
            {Array.isArray(iv.scores) && iv.scores.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                {iv.scores.map((s) => (
                  <span key={s.category_id} style={{ fontSize: 11.5, background: '#f1f5f9', color: '#334155', borderRadius: 999, padding: '3px 9px', fontWeight: 600 }}>
                    {s.name}: {s.marks}/{s.max_marks}{s.comment ? ' 💬' : ''}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </Card>
    </Box>
  );
}

const muted = { color: '#94a3b8', fontSize: 13 };
function Row({ left, sub, right, tone }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9', gap: 10 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>{left}</div>
        {sub && <div style={{ fontSize: 12, color: '#94a3b8' }}>{sub}</div>}
      </div>
      <Badge tone={tone}>{right}</Badge>
    </div>
  );
}
