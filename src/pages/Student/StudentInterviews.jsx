// Student Mock Interviews — the student's assigned interview slots (join link,
// time) and marks/feedback once graded.
import { useEffect, useState } from 'react';
import { studentApi } from '../../lib/studentApi';

const fmt = (v) => { try { return new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

export default function StudentInterviews() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { studentApi.interviewSlots().then((r) => setRows(r?.data || [])).catch(() => {}).finally(() => setLoading(false)); }, []);

  if (loading) return <p style={{ color: '#94a3b8' }}>Loading…</p>;
  return (
    <div>
      <h2 style={{ fontSize: 20, color: '#0f172a', margin: '0 0 12px' }}>Mock Interviews</h2>
      {rows.length === 0 ? <div style={{ color: '#94a3b8' }}>No interviews assigned yet.</div> : (
        <div style={{ display: 'grid', gap: 12 }}>
          {rows.map((s) => (
            <div key={s.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{s.title}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>{s.slot_at ? fmt(s.slot_at) : 'Time to be confirmed'}</div>
                {s.marks != null && <div style={{ fontSize: 13, color: '#15803d', marginTop: 4 }}>Scored {s.marks}/{s.max_marks}{s.feedback ? ` — ${s.feedback}` : ''}</div>}
              </div>
              {s.meeting_url && s.marks == null && <a href={s.meeting_url} target="_blank" rel="noreferrer" style={{ background: '#E53935', color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, alignSelf: 'center' }}>Join</a>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
