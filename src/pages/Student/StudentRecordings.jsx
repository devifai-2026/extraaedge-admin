// Student Recordings — the class recordings the student has access to (gated
// server-side by their batch join / recordings_from cutoff). Opens a signed URL.
import { useEffect, useState } from 'react';
import { studentApi } from '../../lib/studentApi';

const fmt = (v) => { try { return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return ''; } };

export default function StudentRecordings() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    studentApi.recordings().then((r) => setRows(r?.data || [])).catch((e) => setErr(e.message)).finally(() => setLoading(false));
  }, []);

  const open = async (id) => {
    try { const r = await studentApi.recordingUrl(id); const u = (r?.data ?? r)?.url; if (u) window.open(u, '_blank', 'noreferrer'); }
    catch (e) { setErr(e.message); }
  };

  if (loading) return <p style={{ color: '#94a3b8' }}>Loading recordings…</p>;
  return (
    <div>
      <h2 style={{ fontSize: 20, margin: '0 0 12px', color: '#0f172a' }}>Recordings</h2>
      {err && <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{err}</div>}
      {rows.length === 0 ? <div style={{ color: '#94a3b8' }}>No recordings available yet.</div> : (
        <div style={{ display: 'grid', gap: 10 }}>
          {rows.map((r) => (
            <div key={r.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{r.class_title}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{r.module_name ? `${r.module_name} · ` : ''}{fmt(r.starts_at)}</div>
              </div>
              <button onClick={() => open(r.id)} style={{ background: '#E53935', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>▶ Watch</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
