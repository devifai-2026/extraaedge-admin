// Reusable styled table used by every settings sub-page.
// Matches the screenshot look: peach header row, alternating rows, search box, + add button.
// Supports global search, per-column filters, an Active/Inactive toggle, row actions
// (Edit/Delete) and client-side pagination.
import { useState, useMemo, useEffect } from 'react';
import {
  TextField, IconButton, InputAdornment, CircularProgress, Tooltip, Pagination,
  Select, MenuItem, FormControlLabel, Switch,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';

// Stringify any cell value the way `c.render` would, so column filters match
// what the user actually sees (e.g. "True" for is_active, joined name for stage).
const cellText = (row, col) => {
  if (col.render) {
    try {
      const v = col.render(row);
      // render() may return JSX; only filter on plain strings/numbers.
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
      return String(row[col.key] ?? '');
    } catch { return String(row[col.key] ?? ''); }
  }
  return String(row[col.key] ?? '');
};

export default function SettingsTable({
  rows,
  columns,            // [{ key, label, render?, filterable? }] — filterable defaults to true for string-rendered cells
  loading,
  error,
  searchPlaceholder = 'Search',
  onAdd,
  onEdit,
  onDelete,
  onRowClick,
  emptyMessage = 'No items',
  pageSize: initialPageSize = 25,
}) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [showFilters, setShowFilters] = useState(false);
  const [colFilters, setColFilters] = useState({}); // { [colKey]: 'needle' }
  const [activeOnly, setActiveOnly] = useState(false);

  // Reset to first page when search/filters/data change
  useEffect(() => { setPage(1); }, [q, rows?.length, colFilters, activeOnly]);

  const setColFilter = (key, val) => {
    setColFilters((prev) => ({ ...prev, [key]: val }));
  };
  const clearAllFilters = () => { setColFilters({}); setQ(''); setActiveOnly(false); };

  const hasIsActive = (rows || []).some((r) => 'is_active' in r);

  const filtered = useMemo(() => {
    let out = rows || [];

    if (activeOnly && hasIsActive) {
      out = out.filter((r) => r.is_active !== false);
    }

    // Global search — matches against every column's rendered text
    if (q) {
      const needle = q.toLowerCase();
      out = out.filter((r) =>
        columns.some((c) => cellText(r, c).toLowerCase().includes(needle))
      );
    }

    // Per-column filters
    for (const [key, val] of Object.entries(colFilters)) {
      if (!val) continue;
      const col = columns.find((c) => c.key === key);
      if (!col) continue;
      const needle = val.toLowerCase();
      out = out.filter((r) => cellText(r, col).toLowerCase().includes(needle));
    }

    return out;
  }, [rows, q, colFilters, activeOnly, columns, hasIsActive]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageRows = filtered.slice(pageStart, pageStart + pageSize);

  const showActions = !!(onEdit || onDelete);
  const activeFilterCount = Object.values(colFilters).filter(Boolean).length + (q ? 1 : 0) + (activeOnly ? 1 : 0);

  return (
    <div style={{ padding: '0 24px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {hasIsActive && (
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
                sx={{ '& .Mui-checked': { color: '#E53935' } }}
              />
            }
            label={<span style={{ fontSize: 13 }}>Active only</span>}
            sx={{ marginRight: 0 }}
          />
        )}
        <Tooltip title={showFilters ? 'Hide column filters' : 'Show column filters'}>
          <IconButton
            onClick={() => setShowFilters((v) => !v)}
            sx={{
              color: showFilters || activeFilterCount > 0 ? '#E53935' : '#666',
              background: showFilters ? '#fdecea' : 'transparent',
            }}
          >
            {showFilters ? <FilterAltIcon /> : <FilterAltOffIcon />}
          </IconButton>
        </Tooltip>
        {activeFilterCount > 0 && (
          <Tooltip title="Clear all filters">
            <IconButton onClick={clearAllFilters} sx={{ color: '#666' }} size="small">
              <span style={{ fontSize: 12, padding: '0 6px' }}>Clear ({activeFilterCount})</span>
            </IconButton>
          </Tooltip>
        )}
        {onAdd && (
          <IconButton onClick={onAdd} sx={{ color: '#E53935' }} title="Add new">
            <PlaylistAddIcon />
          </IconButton>
        )}
        <TextField
          size="small"
          placeholder={searchPlaceholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{ width: 240, background: '#fff' }}
          InputProps={{
            endAdornment: <InputAdornment position="end"><SearchIcon fontSize="small" /></InputAdornment>,
          }}
        />
      </div>

      {loading && <div style={{ padding: 40, textAlign: 'center' }}><CircularProgress size={28} /></div>}
      {error && <div style={{ padding: 16, color: '#d32f2f', background: '#fff', border: '1px solid #f5c6c6', borderRadius: 4 }}>{error}</div>}
      {!loading && !error && (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', border: '1px solid #e8e8e8', borderRadius: 4 }}>
          <thead>
            <tr style={{ background: '#fdf3ed' }}>
              {columns.map((c) => (
                <th key={c.key} style={{
                  textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600,
                  color: '#6b4a3a', textTransform: 'uppercase', letterSpacing: 0.5,
                }}>{c.label}</th>
              ))}
              {showActions && <th style={{ padding: '12px 16px', width: 100, textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#6b4a3a', textTransform: 'uppercase' }}>Actions</th>}
            </tr>
            {showFilters && (
              <tr style={{ background: '#fff8f3' }}>
                {columns.map((c) => (
                  <th key={`${c.key}-f`} style={{ padding: '6px 12px', borderBottom: '1px solid #f0d9c8' }}>
                    {c.filterable !== false ? (
                      <TextField
                        size="small"
                        placeholder={`Filter ${c.label.toLowerCase()}…`}
                        value={colFilters[c.key] || ''}
                        onChange={(e) => setColFilter(c.key, e.target.value)}
                        sx={{
                          background: '#fff',
                          width: '100%',
                          '& .MuiOutlinedInput-input': { fontSize: 12, padding: '6px 8px' },
                        }}
                      />
                    ) : null}
                  </th>
                ))}
                {showActions && <th style={{ borderBottom: '1px solid #f0d9c8' }} />}
              </tr>
            )}
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={columns.length + (showActions ? 1 : 0)} style={{ padding: 24, textAlign: 'center', color: '#888' }}>{emptyMessage}</td></tr>
            )}
            {pageRows.map((r, idx) => (
              <tr
                key={r.id || idx}
                onClick={(e) => {
                  if (e.target.closest('button')) return;
                  onRowClick?.(r);
                }}
                style={{
                  background: idx % 2 === 1 ? '#fafafa' : '#fff',
                  borderTop: '1px solid #f0f0f0',
                  cursor: onRowClick ? 'pointer' : 'default',
                }}
              >
                {columns.map((c) => (
                  <td key={c.key} style={{ padding: '14px 16px', fontSize: 14, color: '#333' }}>
                    {c.render ? c.render(r) : (r[c.key] ?? '—')}
                  </td>
                ))}
                {showActions && (
                  <td style={{ padding: '8px 16px', textAlign: 'right' }}>
                    {onEdit && (
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => onEdit(r)} sx={{ color: '#fb8c00' }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {onDelete && (
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => onDelete(r)} sx={{ color: '#E53935' }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 4px', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#666' }}>
            <span>Rows per page</span>
            <Select size="small" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} sx={{ height: 32, fontSize: 13 }}>
              {[10, 25, 50, 100].map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
            </Select>
            <span>· Showing {pageStart + 1}–{Math.min(pageStart + pageSize, filtered.length)} of {filtered.length}</span>
          </div>
          {totalPages > 1 && (
            <Pagination
              page={safePage}
              count={totalPages}
              onChange={(_, v) => setPage(v)}
              size="small"
              sx={{ '& .Mui-selected': { background: '#fdf3ed !important' } }}
            />
          )}
        </div>
      )}
    </div>
  );
}
