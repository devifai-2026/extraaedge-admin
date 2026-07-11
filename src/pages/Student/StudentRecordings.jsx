// Student Recordings — class recordings the student can access (gated
// server-side by their batch join / recordings_from cutoff).
import { useEffect, useState } from 'react';
import { studentApi } from '../../lib/studentApi';
import { PageHeader, Card, EmptyState, Btn, Skeleton, useToast } from '../../lib/lmsUi';
import VideoIcon from '@mui/icons-material/VideoLibraryOutlined';
import PlayIcon from '@mui/icons-material/PlayCircleOutlined';

const fmt = (v) => { try { return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return ''; } };

export default function StudentRecordings() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => { studentApi.recordings().then((r) => setRows(r?.data || [])).catch((e) => toast.show(e.message)).finally(() => setLoading(false)); }, []); // eslint-disable-line

  const open = async (id) => { try { const r = await studentApi.recordingUrl(id); const u = (r?.data ?? r)?.url; if (u) window.open(u, '_blank', 'noreferrer'); } catch (e) { toast.show(e.message); } };

  return (
    <div>
      <PageHeader title="Recordings" subtitle="Catch up on past classes you have access to." icon={VideoIcon} />
      {toast.node}
      {loading ? <Card><Skeleton h={14} w="60%" /></Card>
        : rows.length === 0 ? <Card><EmptyState icon="🎬" title="No recordings yet" text="Recordings your trainer uploads (and that you have access to) will show here." /></Card>
        : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {rows.map((r) => (
              <Card key={r.id} pad={16}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ width: 42, height: 42, borderRadius: 11, background: 'color-mix(in srgb, var(--lms-accent,#E53935) 12%, transparent)', color: 'var(--lms-accent,#E53935)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><PlayIcon /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.class_title}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>{r.module_name ? `${r.module_name} · ` : ''}{fmt(r.starts_at)}</div>
                    <Btn size="sm" onClick={() => open(r.id)}>▶ Watch</Btn>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}
