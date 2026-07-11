// Student Materials — the study-materials library for the enrolled course,
// grouped by module. Files open via a short-lived signed URL; links open direct.
import { useEffect, useState } from 'react';
import { studentApi } from '../../lib/studentApi';
import { PageHeader, Card, EmptyState, Badge, Skeleton, Toast } from '../../lib/lmsUi';
import MenuBookIcon from '@mui/icons-material/MenuBookOutlined';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFileOutlined';
import LinkIcon from '@mui/icons-material/LinkOutlined';

const fmtSize = (b) => (b == null ? '' : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export default function StudentMaterials() {
  const [materials, setMaterials] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => {
    studentApi.materials().then((r) => { const d = r?.data ?? r; setMaterials(d.materials || []); setModules(d.modules || []); })
      .catch((e) => setToast(e.message)).finally(() => setLoading(false));
  }, []);

  const open = async (m) => {
    try { const r = await studentApi.materialUrl(m.id); const u = (r?.data ?? r)?.url; if (u) window.open(u, '_blank', 'noreferrer'); }
    catch (e) { setToast(e.message); }
  };

  // Group by module (order preserved), with a trailing "General" bucket.
  const groups = [];
  const byModule = new Map();
  for (const m of materials) {
    const key = m.module_id || '__general__';
    if (!byModule.has(key)) byModule.set(key, []);
    byModule.get(key).push(m);
  }
  for (const mod of modules) if (byModule.has(mod.id)) groups.push({ name: mod.name, items: byModule.get(mod.id) });
  if (byModule.has('__general__')) groups.push({ name: 'General', items: byModule.get('__general__') });

  return (
    <div>
      <PageHeader title="Study Materials" subtitle="Slides, notes and resources shared by your trainers." icon={MenuBookIcon} />

      {loading && <Card><Skeleton h={16} w="40%" /><div style={{ height: 8 }} /><Skeleton h={12} w="70%" /></Card>}

      {!loading && materials.length === 0 && (
        <Card><EmptyState icon="📚" title="No materials yet" text="When your trainers upload slides, notes or share links, they'll appear here." /></Card>
      )}

      {!loading && groups.map((g) => (
        <div key={g.name} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: 0.5, margin: '4px 0 10px' }}>{g.name}</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {g.items.map((m) => (
              <Card key={m.id} pad={14} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ width: 38, height: 38, borderRadius: 10, background: m.kind === 'link' ? '#dbeafe' : '#fef3c7', color: m.kind === 'link' ? '#1d4ed8' : '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {m.kind === 'link' ? <LinkIcon /> : <InsertDriveFileIcon />}
                </span>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{m.title}</div>
                  {m.description && <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>{m.description}</div>}
                  <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 3 }}>
                    {m.kind === 'file' ? (m.file_name || 'File') : 'External link'}{m.size_bytes ? ` · ${fmtSize(m.size_bytes)}` : ''}
                  </div>
                </div>
                <Badge tone={m.kind === 'link' ? 'info' : 'warning'}>{m.kind === 'link' ? 'Link' : 'File'}</Badge>
                <button onClick={() => open(m)} style={{ background: 'var(--lms-accent, #E53935)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {m.kind === 'link' ? 'Open' : 'Download'}
                </button>
              </Card>
            ))}
          </div>
        </div>
      ))}
      <Toast msg={toast} onClose={() => setToast('')} />
    </div>
  );
}
