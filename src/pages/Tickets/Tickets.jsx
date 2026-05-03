// Tickets page — list view + status updater. Shows the same data the
// /tickets API returns: tickets I raised, tickets targeting me, plus team
// tickets if I'm a manager and tenant-wide tickets if I'm a super_admin.
import { useEffect, useState } from 'react';
import {
  Box, Button, Chip, MenuItem, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddCircleOutlinedIcon from '@mui/icons-material/AddCircleOutlined';
import { ticketsApi } from '../../lib/endpoints';
import RaiseTicketModal from '../../components/Layout/RaiseTicketModal';

const STATUS_OPTIONS = [
  { value: 'open',         label: 'Open',         color: '#ef6c00' },
  { value: 'in_progress',  label: 'In Progress',  color: '#1976d2' },
  { value: 'resolved',     label: 'Resolved',     color: '#2e7d32' },
  { value: 'closed',       label: 'Closed',       color: '#616161' },
];
const colorOf = (s) => STATUS_OPTIONS.find((o) => o.value === s)?.color || '#888';

const PRIORITY_COLORS = { urgent: '#d32f2f', high: '#f57c00', normal: '#666', low: '#999' };

export default function Tickets() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [openModal, setOpenModal] = useState(false);

  const reload = () => {
    setLoading(true); setErr('');
    ticketsApi.list()
      .then((r) => setRows(r?.data || []))
      .catch((e) => setErr(e.message || 'Failed to load tickets'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);

  const updateStatus = async (id, status) => {
    try {
      await ticketsApi.updateStatus(id, { status });
      reload();
    } catch (e) {
      setErr(e.message || 'Status update failed');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>Tickets</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button startIcon={<RefreshIcon />} onClick={reload} variant="outlined" size="small">Refresh</Button>
          <Button
            startIcon={<AddCircleOutlinedIcon />}
            onClick={() => setOpenModal(true)}
            variant="contained"
            size="small"
            sx={{ background: '#E53935' }}
          >
            New Ticket
          </Button>
        </Box>
      </Box>

      {err && <div style={{ color: '#d32f2f', marginBottom: 12 }}>{err}</div>}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ background: '#fdf3ed' }}>
              <TableCell>Subject</TableCell>
              <TableCell>Raised by</TableCell>
              <TableCell>Assigned to</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={6}>Loading…</TableCell></TableRow>
            )}
            {!loading && rows.length === 0 && (
              <TableRow><TableCell colSpan={6} sx={{ color: '#888' }}>No tickets yet.</TableCell></TableRow>
            )}
            {rows.map((t) => (
              <TableRow key={t.id} hover>
                <TableCell>
                  <div style={{ fontWeight: 500 }}>{t.subject}</div>
                  {t.description && <div style={{ fontSize: 12, color: '#666' }}>{t.description.slice(0, 80)}{t.description.length > 80 ? '…' : ''}</div>}
                </TableCell>
                <TableCell>
                  <div>{t.raised_by_name || t.raised_by_email}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{String(t.raised_by_role || '').replace('_', ' ')}</div>
                </TableCell>
                <TableCell>
                  {t.target_user_name ? (
                    <>
                      <div>{t.target_user_name}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>{String(t.target_user_role || '').replace('_', ' ')}</div>
                    </>
                  ) : <span style={{ color: '#888' }}>—</span>}
                </TableCell>
                <TableCell>
                  <Chip label={t.priority} size="small" sx={{ background: 'transparent', color: PRIORITY_COLORS[t.priority] || '#666', fontWeight: 600, textTransform: 'capitalize' }} />
                </TableCell>
                <TableCell>
                  <TextField
                    select
                    size="small"
                    value={t.status}
                    onChange={(e) => updateStatus(t.id, e.target.value)}
                    sx={{ minWidth: 140 }}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <MenuItem key={o.value} value={o.value}>
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: o.color, marginRight: 8 }} />
                        {o.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </TableCell>
                <TableCell>
                  <span style={{ fontSize: 12 }}>{t.created_at ? new Date(t.created_at).toLocaleString() : ''}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <RaiseTicketModal open={openModal} onClose={() => setOpenModal(false)} onSubmitted={reload} />
    </Box>
  );
}
