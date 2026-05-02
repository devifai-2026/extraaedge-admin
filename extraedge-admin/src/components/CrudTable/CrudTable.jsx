// Reusable list+table+pagination shell used by every wired page.
// Page passes: title, columns (array of {key,label,render?}), loadFn, deleteFn?, onRowClick?,
// extraActions (rendered next to Refresh), createButton (rendered next to extraActions).
import { useEffect, useState, useCallback } from 'react';
import { Button, CircularProgress, TextField, Pagination } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { isRole } from '../../lib/rbac';

export default function CrudTable({
  title,
  columns,
  loadFn,                 // async ({ page, limit, q }) => { data, meta }
  deleteFn,               // async (id) => void
  deleteRoles,            // optional: only show delete to these roles (e.g. ['super_admin'])
  searchable = true,
  paginate = true,
  pageSize = 20,
  rowKey = 'id',
  emptyMessage = 'Nothing here yet',
  extraActions = null,
  createButton = null,
  onRowClick,
  refreshKey,             // pass a number/string to force reload
}) {
  const canDelete = !deleteRoles || isRole(...deleteRoles);
  const showDelete = deleteFn && canDelete;
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await loadFn({ page, limit: pageSize, q: q || undefined });
      setItems(res?.data || []);
      setMeta(res?.meta || { total: (res?.data || []).length });
    } catch (err) {
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [loadFn, page, pageSize, q]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const totalPages = paginate ? Math.max(1, Math.ceil((meta.total || items.length || 0) / pageSize)) : 1;

  const handleDelete = async (id) => {
    if (!deleteFn) return;
    if (!confirm('Delete this item?')) return;
    try { await deleteFn(id); load(); } catch (e) { alert(e.message); }
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>{title}{meta.total != null && <span style={{ color: '#888', fontWeight: 400, fontSize: 14 }}> ({meta.total})</span>}</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {searchable && (
            <TextField size="small" placeholder="Search" value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} sx={{ width: 240 }} />
          )}
          {extraActions}
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load}>Refresh</Button>
          {createButton}
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, overflow: 'auto' }}>
        {loading && <div style={{ padding: 40, textAlign: 'center' }}><CircularProgress size={28} /></div>}
        {error && <div style={{ padding: 16, color: '#d32f2f' }}>{error}</div>}
        {!loading && !error && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#fafafa' }}>
              <tr>
                {columns.map((c) => (
                  <th key={c.key} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#666', borderBottom: '1px solid #eee' }}>{c.label}</th>
                ))}
                {showDelete && <th style={{ width: 80 }}></th>}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={columns.length + (showDelete ? 1 : 0)} style={{ padding: 24, textAlign: 'center', color: '#888' }}>{emptyMessage}</td></tr>
              )}
              {items.map((row) => (
                <tr key={row[rowKey]} style={{ borderBottom: '1px solid #f4f4f4', cursor: onRowClick ? 'pointer' : 'default' }} onClick={onRowClick ? (e) => { if (e.target.closest('button')) return; onRowClick(row); } : undefined}>
                  {columns.map((c) => (
                    <td key={c.key} style={{ padding: '10px 12px', color: c.muted ? '#666' : undefined, fontSize: c.small ? 12 : undefined }}>
                      {c.render ? c.render(row) : (row[c.key] ?? '—')}
                    </td>
                  ))}
                  {showDelete && (
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <Button size="small" color="error" onClick={() => handleDelete(row[rowKey])}>Delete</Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {paginate && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
          <Pagination page={page} count={totalPages} onChange={(_, v) => setPage(v)} />
        </div>
      )}
    </div>
  );
}
