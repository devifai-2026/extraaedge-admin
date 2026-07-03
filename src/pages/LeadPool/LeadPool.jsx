// Lead Pool — tenant-wide, READ-ONLY lead lookup.
//
// Available to every counsellor (and up). Unlike Lead Manager, this searches
// EVERY lead in the tenant by name or phone number (with or without a 91
// prefix) — but the view is strictly read-only. For each hit we show the lead
// details plus who currently owns it, that owner's manager, and the previous
// owner (if the lead was ever reassigned). No edit / reassign / call actions.
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, TextField, InputAdornment, CircularProgress, Chip, Typography,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Divider, Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import HistoryIcon from '@mui/icons-material/History';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { leadPoolApi } from '../../lib/endpoints';

// A tiny "person" cell: name on top, email/phone muted beneath. `empty` is the
// dash shown when there's nobody (e.g. unassigned / no previous owner).
function PersonCell({ name, sub, empty = 'Unassigned' }) {
  if (!name) {
    return <Typography variant="body2" sx={{ color: '#9ca3af' }}>{empty}</Typography>;
  }
  return (
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>{name}</Typography>
      {sub ? (
        <Typography variant="caption" sx={{ color: '#6b7280' }}>{sub}</Typography>
      ) : null}
    </Box>
  );
}

const fmtDate = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function LeadPool() {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);
  const reqSeq = useRef(0);

  // Debounce the query so we don't fire on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const needle = (debouncedQ || '').trim();
    if (needle.length < 2) {
      setRows([]); setError(''); setLoading(false);
      return;
    }
    // Guard against out-of-order responses (older request resolving last).
    const seq = ++reqSeq.current;
    setLoading(true); setError(''); setTouched(true);
    leadPoolApi.search({ q: needle, limit: 50 })
      .then((r) => {
        if (seq !== reqSeq.current) return;
        setRows(r?.data || []);
      })
      .catch((e) => {
        if (seq !== reqSeq.current) return;
        setError(e?.message || 'Search failed');
        setRows([]);
      })
      .finally(() => { if (seq === reqSeq.current) setLoading(false); });
  }, [debouncedQ]);

  const helper = useMemo(() => {
    const n = (debouncedQ || '').trim();
    if (n.length < 2) return 'Type at least 2 characters — search by lead name or phone number.';
    if (loading) return 'Searching…';
    return `${rows.length} match${rows.length === 1 ? '' : 'es'} for "${n}"`;
  }, [debouncedQ, rows.length, loading]);

  return (
    <Box sx={{ pb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Lead Pool</Typography>
        <Chip
          size="small"
          icon={<LockOutlinedIcon sx={{ fontSize: 15 }} />}
          label="Read-only"
          sx={{ height: 24, background: '#f1f5f9', border: '1px solid #e2e8f0', fontWeight: 600 }}
        />
      </Box>
      <Typography variant="body2" sx={{ color: '#6b7280', mb: 2.5 }}>
        Look up any lead across the whole organisation by name or phone number.
        Shows the current owner, their manager and the previous owner — view only.
      </Typography>

      {/* Search box */}
      <TextField
        fullWidth
        autoFocus
        placeholder="Search by lead name or phone number (with or without 91)…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start"><SearchIcon /></InputAdornment>
          ),
          endAdornment: loading ? (
            <InputAdornment position="end"><CircularProgress size={18} /></InputAdornment>
          ) : null,
        }}
      />
      <Typography variant="caption" sx={{ color: '#888', mt: 1, mb: 2, display: 'block' }}>
        {helper}
      </Typography>

      {error && (
        <Box sx={{ p: 2, mb: 2, color: '#d32f2f', background: '#fff5f5', border: '1px solid #ffd9d9', borderRadius: 1 }}>
          {error}
        </Box>
      )}

      {!loading && !error && touched && debouncedQ.trim().length >= 2 && rows.length === 0 && (
        <Box sx={{ textAlign: 'center', color: '#888', p: 5, background: '#fff', border: '1px solid #eee', borderRadius: 1 }}>
          No leads matched.
        </Box>
      )}

      {rows.length > 0 && (
        <TableContainer component={Paper} sx={{ border: '1px solid #eef0f3', boxShadow: 'none' }}>
          <Table size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow sx={{ background: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 700 }}>Lead</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Stage</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Program</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PersonIcon sx={{ fontSize: 16 }} /> Current owner
                  </Box>
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <SupervisorAccountIcon sx={{ fontSize: 16 }} /> Manager
                  </Box>
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <HistoryIcon sx={{ fontSize: 16 }} /> Previous owner
                  </Box>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.name || '—'}</Typography>
                    <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                      {r.phone || r.whatsapp_number || r.alternate_contact || 'No number'}
                    </Typography>
                    {r.email ? (
                      <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block' }}>{r.email}</Typography>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={r.stage_name || 'No stage'}
                      sx={{ height: 22, background: '#fff', border: '1px solid #e5e7eb' }}
                    />
                    {r.sub_stage_name ? (
                      <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', mt: 0.5 }}>
                        {r.sub_stage_name}
                      </Typography>
                    ) : null}
                    {r.converted_at ? (
                      <Chip size="small" color="success" label="Converted" sx={{ height: 20, mt: 0.5 }} />
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{r.program_name || '—'}</Typography>
                    {r.branch_name ? (
                      <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block' }}>
                        {r.branch_name}
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <PersonCell name={r.assigned_to_name} sub={r.assigned_to_email} empty="Unassigned" />
                  </TableCell>
                  <TableCell>
                    <PersonCell name={r.manager_name} sub={r.manager_email} empty="—" />
                  </TableCell>
                  <TableCell>
                    {r.previous_owner_name ? (
                      <Tooltip title={r.reassigned_at ? `Moved ${fmtDate(r.reassigned_at)}` : ''} arrow>
                        <Box>
                          <PersonCell name={r.previous_owner_name} sub={r.previous_owner_email} empty="—" />
                        </Box>
                      </Tooltip>
                    ) : (
                      <Typography variant="body2" sx={{ color: '#9ca3af' }}>—</Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {rows.length > 0 && (
        <>
          <Divider sx={{ mt: 3, mb: 1 }} />
          <Typography variant="caption" sx={{ color: '#9ca3af' }}>
            Read-only view. To take ownership of a lead, ask the current owner or a manager to reassign it.
          </Typography>
        </>
      )}
    </Box>
  );
}
