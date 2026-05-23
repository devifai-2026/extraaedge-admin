// Tenant-wide admission pipeline overview for super_admin (and anyone
// else granted the admissions.pipeline tab). Lives in the main sidebar
// — separate from the Accounts module — so admins can see the
// post-conversion state of every lead at a glance.
//
// What it shows:
//   • Top: 6 status chips (pending_approval / attending / on_break /
//     completed / rejected) + an "Unrouted" chip for converted leads
//     that don't have any admission row yet. Each chip filters the table.
//   • Below: a table of the most recent 500 admissions joined with their
//     lead + program + center + counsellor for context.
//   • Click a row to open the same AddNewLead drawer used elsewhere,
//     in viewOnly mode — same as Pending Admissions does today.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Chip, CircularProgress, IconButton, Tooltip,
  TextField, InputAdornment, Popover, Button,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ClearIcon from '@mui/icons-material/Clear';
import { admissionsApi, leadsApi } from '../../lib/endpoints';
import AddNewLead from '../../components/AddNewLead/AddNewLead';

const STATUS_META = {
  pending_approval: { label: 'Pending Approval', color: '#f59e0b', bg: '#fef3c7', fg: '#92400e' },
  attending:        { label: 'Attending',        color: '#10b981', bg: '#d1fae5', fg: '#065f46' },
  on_break:         { label: 'On Break',         color: '#fb923c', bg: '#ffedd5', fg: '#9a3412' },
  completed:        { label: 'Completed',        color: '#3b82f6', bg: '#dbeafe', fg: '#1e40af' },
  rejected:         { label: 'Rejected',         color: '#ef4444', bg: '#fee2e2', fg: '#991b1b' },
  // Synthetic status. Backend now returns converted leads with no admission
  // row tagged as status='unrouted' so the same table can render them.
  unrouted:         { label: 'Unrouted',         color: '#64748b', bg: '#f3f4f6', fg: '#374151' },
};

const fmtDateTime = (s) => {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return '—'; }
};

export default function AdmissionPipeline() {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' or one of STATUS_META keys
  const [search, setSearch] = useState('');
  const [viewLead, setViewLead] = useState(null);
  // Date range filter (applies to converted_at). Both bounds are optional.
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dateAnchor, setDateAnchor] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await admissionsApi.leadStatusSnapshot();
      setSnapshot(r?.data || null);
    } catch {
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const counts = snapshot?.counts || {};
  // useMemo so the array reference is stable across renders when the
  // snapshot hasn't changed; otherwise the filteredRows useMemo below
  // re-runs every render (eslint react-hooks/exhaustive-deps warning).
  const rows = useMemo(() => snapshot?.rows || [], [snapshot]);

  const filteredRows = useMemo(() => {
    let out = rows;
    if (filter !== 'all') out = out.filter((r) => r.status === filter);
    // Date filter on converted_at — inclusive at both ends. "to" extends
    // to the end of that day so picking the same value as "from" yields
    // a single-day window.
    if (dateFrom) {
      const fromMs = new Date(dateFrom).getTime();
      out = out.filter((r) => r.converted_at && new Date(r.converted_at).getTime() >= fromMs);
    }
    if (dateTo) {
      const toMs = new Date(dateTo).getTime() + 24 * 3600 * 1000 - 1;
      out = out.filter((r) => r.converted_at && new Date(r.converted_at).getTime() <= toMs);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter((r) => {
        const blob = [
          r.lead_name, r.first_name, r.last_name, r.email,
          r.whatsapp_number, r.program_name, r.counsellor_name,
        ].filter(Boolean).join(' ').toLowerCase();
        return blob.includes(q);
      });
    }
    return out;
  }, [rows, filter, search, dateFrom, dateTo]);

  const dateLabel = useMemo(() => {
    if (!dateFrom && !dateTo) return 'All dates';
    const fmt = (d) => {
      try {
        return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      } catch { return d; }
    };
    if (dateFrom && dateTo) return `${fmt(dateFrom)} → ${fmt(dateTo)}`;
    if (dateFrom) return `From ${fmt(dateFrom)}`;
    return `Until ${fmt(dateTo)}`;
  }, [dateFrom, dateTo]);

  const openView = async (leadId) => {
    if (!leadId) return;
    try {
      const r = await leadsApi.get(leadId);
      setViewLead(r?.data || null);
    } catch { setViewLead(null); }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Admission Pipeline</Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Tenant-wide view of every converted lead and its current admission status.
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={reload}><RefreshIcon /></IconButton>
        </Tooltip>
      </Box>

      {/* Status chips. Each acts as a filter — click to scope the table.
          The 'unrouted' bucket is now a real filter: backend ships those
          converted-but-unrouted leads as rows with status='unrouted'. */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 3 }}>
        <StatusChip
          active={filter === 'all'}
          label="All"
          count={rows.length}
          onClick={() => setFilter('all')}
          fg="#0f172a"
          bg="#e5e7eb"
        />
        {Object.entries(STATUS_META).map(([key, meta]) => {
          const count = key === 'unrouted'
            ? (snapshot?.unrouted_converted || 0)
            : (counts[key] || 0);
          return (
            <StatusChip
              key={key}
              active={filter === key}
              label={key === 'unrouted' ? 'Unrouted (converted, no admission)' : meta.label}
              count={count}
              onClick={() => setFilter(key)}
              fg={meta.fg}
              bg={meta.bg}
            />
          );
        })}
      </Box>

      {/* Search + Date filter */}
      <Box sx={{ mb: 2, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Search by student name, email, phone, program or counsellor…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment>
            ),
          }}
          sx={{ flex: '1 1 360px', maxWidth: 520 }}
        />
        <Button
          variant="outlined"
          size="small"
          startIcon={<CalendarTodayIcon sx={{ fontSize: 16 }} />}
          onClick={(e) => setDateAnchor(e.currentTarget)}
          sx={{
            textTransform: 'none',
            borderColor: (dateFrom || dateTo) ? '#E87B2F' : '#cbd5e1',
            color: (dateFrom || dateTo) ? '#E87B2F' : '#475569',
            height: 40,
          }}
        >
          {dateLabel}
        </Button>
        {(dateFrom || dateTo) && (
          <Tooltip title="Clear date filter">
            <IconButton size="small" onClick={() => { setDateFrom(''); setDateTo(''); }}>
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Popover
          open={Boolean(dateAnchor)}
          anchorEl={dateAnchor}
          onClose={() => setDateAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <Box sx={{ p: 2, width: 280 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1.5 }}>
              Filter by converted date
            </Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>FROM</Typography>
            <TextField
              type="date"
              size="small"
              fullWidth
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              sx={{ mb: 1.5 }}
            />
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>TO</Typography>
            <TextField
              type="date"
              size="small"
              fullWidth
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button size="small" onClick={() => { setDateFrom(''); setDateTo(''); }}>Clear</Button>
              <Button size="small" variant="contained" onClick={() => setDateAnchor(null)} sx={{ background: '#E87B2F' }}>
                Apply
              </Button>
            </Box>
          </Box>
        </Popover>
      </Box>

      {/* Table */}
      <Box sx={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={22} /></Box>
        ) : filteredRows.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', color: '#64748b' }}>
            No admissions match this view.
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Box component="table" sx={tableSx}>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Program</th>
                  <th>Counsellor</th>
                  <th>Center</th>
                  <th>Status</th>
                  <th>Converted</th>
                  <th>Last Updated</th>
                  <th style={{ width: 60 }} aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => {
                  const m = STATUS_META[r.status] || { label: r.status, bg: '#e5e7eb', fg: '#374151' };
                  const studentName = r.lead_name
                    || [r.first_name, r.last_name].filter(Boolean).join(' ')
                    || '—';
                  return (
                    <tr key={r.admission_id || `unrouted-${r.lead_id}`}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{studentName}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{r.email || r.whatsapp_number || ''}</div>
                      </td>
                      <td>{r.program_name || '—'}</td>
                      <td style={{ color: '#475569' }}>{r.counsellor_name || '—'}</td>
                      <td style={{ color: '#475569' }}>{r.center_name || '—'}</td>
                      <td>
                        <Chip
                          size="small"
                          label={m.label}
                          sx={{ background: m.bg, color: m.fg, fontWeight: 600, height: 22, fontSize: 11 }}
                        />
                      </td>
                      <td style={{ fontSize: 12, color: '#64748b' }}>{fmtDateTime(r.converted_at)}</td>
                      <td style={{ fontSize: 12, color: '#64748b' }}>{fmtDateTime(r.updated_at)}</td>
                      <td>
                        <Tooltip title="View lead details">
                          <span>
                            <IconButton size="small" onClick={() => openView(r.lead_id)} disabled={!r.lead_id}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Box>
          </Box>
        )}
      </Box>

      {/* Lead drawer (read-only) — same component the Pending Admissions
          page uses, so admins land in a familiar view. */}
      <AddNewLead
        open={Boolean(viewLead)}
        onClose={() => setViewLead(null)}
        leadData={viewLead}
        viewOnly
      />
    </Box>
  );
}

function StatusChip({ label, count, active, onClick, fg, bg }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        userSelect: 'none',
        background: bg,
        color: fg,
        borderRadius: 10,
        px: 1.75,
        py: 0.75,
        fontSize: 12,
        fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: 1,
        border: active ? `2px solid ${fg}` : '2px solid transparent',
        transition: 'border-color 120ms, transform 80ms',
        '&:hover': { transform: 'translateY(-1px)' },
      }}
    >
      <span>{label}</span>
      <Box component="span" sx={{ background: 'rgba(255,255,255,0.6)', borderRadius: 99, px: 1, fontSize: 11 }}>
        {count}
      </Box>
    </Box>
  );
}

const tableSx = {
  width: '100%',
  borderCollapse: 'separate',
  borderSpacing: 0,
  fontSize: 13,
  '& th': {
    textAlign: 'left',
    fontWeight: 700,
    color: '#475569',
    background: '#f8fafc',
    padding: '10px 14px',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottom: '1px solid #e5e7eb',
  },
  '& td': {
    padding: '10px 14px',
    verticalAlign: 'top',
    borderBottom: '1px solid #f1f5f9',
  },
  '& tr:last-of-type td': { borderBottom: 'none' },
  '& tr:hover td': { background: '#f8fafc' },
};
