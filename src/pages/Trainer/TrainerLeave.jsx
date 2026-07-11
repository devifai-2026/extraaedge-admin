// Trainer Leave — a trainer marks themselves unavailable for a date range; the
// head trainer reassigns affected classes to a substitute from the class editor
// (classes.trainer_id). This page is the trainer's own leave record.
import { useEffect, useState, useCallback } from 'react';
import { Box, TextField, Button, IconButton, Snackbar, Alert, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EventBusyIcon from '@mui/icons-material/EventBusyOutlined';
import { coursesApi } from '../../lib/endpoints';
import { PageHeader, Card, EmptyState } from '../../lib/lmsUi';
import { fmtDate } from '../Accounts/utils';

export default function TrainerLeave() {
  const [rows, setRows] = useState([]);
  const [f, setF] = useState({ from_date: '', to_date: '', reason: '' });
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const load = useCallback(() => coursesApi.myLeaves().then((r) => setRows(r?.data || [])).catch((e) => setToast({ severity: 'error', text: e.message })), []);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!f.from_date || !f.to_date) { setToast({ severity: 'error', text: 'Pick both dates' }); return; }
    setBusy(true);
    try { await coursesApi.markLeave({ from_date: f.from_date, to_date: f.to_date, reason: f.reason || null }); setF({ from_date: '', to_date: '', reason: '' }); load(); setToast({ severity: 'success', text: 'Leave marked' }); }
    catch (e) { setToast({ severity: 'error', text: e.message }); } finally { setBusy(false); }
  };
  const cancel = async (id) => { try { await coursesApi.cancelLeave(id); load(); } catch (e) { setToast({ severity: 'error', text: e.message }); } };

  return (
    <Box sx={{ p: 3, maxWidth: 760, mx: 'auto' }}>
      <PageHeader title="My Leave" subtitle="Mark the days you're unavailable so your head trainer can arrange a substitute." icon={EventBusyIcon} />
      <Card style={{ marginBottom: 18 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={f.from_date} onChange={(e) => setF((s) => ({ ...s, from_date: e.target.value }))} />
          <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={f.to_date} onChange={(e) => setF((s) => ({ ...s, to_date: e.target.value }))} />
          <TextField size="small" label="Reason (optional)" value={f.reason} onChange={(e) => setF((s) => ({ ...s, reason: e.target.value }))} sx={{ flex: 1, minWidth: 180 }} />
          <Button variant="contained" startIcon={<AddIcon />} onClick={add} disabled={busy} sx={{ textTransform: 'none', bgcolor: '#E53935' }}>Mark leave</Button>
        </Box>
      </Card>

      {rows.length === 0 ? <Card><EmptyState icon="🗓️" title="No leave marked" text="Add the dates you'll be away above." /></Card> : (
        <Card pad={0} style={{ overflow: 'hidden' }}>
          <Table size="small">
            <TableHead><TableRow sx={{ background: '#fafbfc', '& th': { color: '#64748b', fontWeight: 700, fontSize: 12 } }}><TableCell>From</TableCell><TableCell>To</TableCell><TableCell>Reason</TableCell><TableCell align="right" /></TableRow></TableHead>
            <TableBody>{rows.map((l) => (
              <TableRow key={l.id} hover>
                <TableCell>{fmtDate(l.from_date)}</TableCell>
                <TableCell>{fmtDate(l.to_date)}</TableCell>
                <TableCell sx={{ color: '#64748b' }}>{l.reason || '—'}</TableCell>
                <TableCell align="right"><IconButton size="small" onClick={() => cancel(l.id)}><DeleteOutlineIcon fontSize="small" /></IconButton></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </Card>
      )}
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)}>{toast.text}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
