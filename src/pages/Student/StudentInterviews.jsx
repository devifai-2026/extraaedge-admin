// Student Mock Interviews — the student's assigned interview slots (join link,
// time) and marks/feedback once graded.
import { useEffect, useState } from 'react';
import { studentApi } from '../../lib/studentApi';
import { PageHeader } from '../../lib/lmsUi';
import InterviewIcon from '@mui/icons-material/RecordVoiceOverOutlined';

const fmt = (v) => { try { return new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

export default function StudentInterviews() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { studentApi.interviewSlots().then((r) => setRows(r?.data || [])).catch(() => {}).finally(() => setLoading(false)); }, []);

  if (loading) return <p style={{ color: '#94a3b8' }}>Loading…</p>;
  return (
    <div>
      <PageHeader title="Mock Interviews" subtitle="Your assigned slots, join links and scores." icon={InterviewIcon} />
      {rows.length === 0 ? <div style={{ color: '#94a3b8' }}>No interviews assigned yet.</div> : (
        <div style={{ display: 'grid', gap: 12 }}>
          {rows.map((s) => (
            <div key={s.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{s.title}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  {(() => {
                    const start = s.starts_at || s.slot_at;
                    if (!start) return 'Time to be confirmed';
                    if (s.ends_at) { try { return `${fmt(start)} – ${new Date(s.ends_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`; } catch { return fmt(start); } }
                    return fmt(start);
                  })()}
                </div>
                {s.complete
                  ? <div style={{ fontSize: 13, color: '#15803d', marginTop: 4, fontWeight: 700 }}>Scored {s.marks}/{s.max_marks}</div>
                  : (Array.isArray(s.scores) && s.scores.length > 0
                    ? <div style={{ fontSize: 12.5, color: '#b45309', marginTop: 4, fontWeight: 600 }}>Scoring in progress…</div>
                    : null)}
                {Array.isArray(s.scores) && s.scores.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                    {s.scores.map((sc) => (
                      <span key={sc.category_id} style={{ fontSize: 11.5, background: '#f1f5f9', color: '#334155', borderRadius: 999, padding: '3px 9px', fontWeight: 600 }} title={sc.comment || ''}>
                        {sc.name}: {sc.marks}/{sc.max_marks}
                      </span>
                    ))}
                  </div>
                )}
                {/* Per-category qualitative feedback (HR/trainer notes). */}
                {Array.isArray(s.scores) && s.scores.some((sc) => sc.comment) && (
                  <div style={{ marginTop: 6, display: 'grid', gap: 3 }}>
                    {s.scores.filter((sc) => sc.comment).map((sc) => (
                      <div key={sc.category_id} style={{ fontSize: 12, color: '#475569' }}>
                        <b style={{ color: '#334155' }}>{sc.name}:</b> {sc.comment}
                      </div>
                    ))}
                  </div>
                )}
                {s.feedback && <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 4, fontStyle: 'italic' }}>“{s.feedback}”</div>}
              </div>
              {s.meeting_url && !s.complete && <a href={s.meeting_url} target="_blank" rel="noreferrer" style={{ background: '#E53935', color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, alignSelf: 'center' }}>Join</a>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
