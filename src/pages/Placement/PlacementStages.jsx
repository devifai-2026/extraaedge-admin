// Placement pipeline stages — the team defines their OWN ordered candidate
// stages (no seed): e.g. Resume Shortlisted → L1 → L2 → Joined, plus reject/drop
// stages. Each stage has a kind: In progress · Placed (success) · Rejected.
// Moving a candidate into a Rejected-kind stage will require a reason.
import { useEffect, useState, useCallback } from 'react';
import {
  Box, MenuItem, TextField, Button, IconButton, Chip, Snackbar, Alert,
  Table, TableHead, TableRow, TableCell, TableBody,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import AccountTreeIcon from '@mui/icons-material/AccountTreeOutlined';
import { placementApi } from '../../lib/endpoints';
import { PageHeader, Card, EmptyState } from '../../lib/lmsUi';

const KIND_LABEL = { in_progress: 'In progress', success: 'Placed', rejected: 'Rejected / dropped' };
const KIND_COLOR = { in_progress: 'default', success: 'success', rejected: 'error' };

export default function PlacementStages() {
  const [stages, setStages] = useState([]);
  const [form, setForm] = useState({ name: '', kind: 'in_progress', order_index: '' });
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => placementApi.stages().then((r) => setStages(r?.data || [])).catch((e) => setToast({ severity: 'error', text: e.message })), []);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!form.name.trim()) { setToast({ severity: 'error', text: 'Stage name is required' }); return; }
    setBusy(true);
    try {
      await placementApi.createStage({ name: form.name.trim(), kind: form.kind, order_index: form.order_index === '' ? (stages.length + 1) : Number(form.order_index) });
      setForm({ name: '', kind: 'in_progress', order_index: '' }); load(); setToast({ severity: 'success', text: 'Stage added' });
    } catch (e) { setToast({ severity: 'error', text: e.message }); } finally { setBusy(false); }
  };
  const remove = async (s) => {
    if (!window.confirm(`Delete stage "${s.name}"? Existing candidate history is preserved.`)) return;
    try { await placementApi.deleteStage(s.id); load(); } catch (e) { setToast({ severity: 'error', text: e.message }); }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 820, mx: 'auto' }}>
      <PageHeader title="Pipeline stages" subtitle="Define your own hiring pipeline — the stages a candidate moves through." icon={AccountTreeIcon} />

      <Card style={{ marginBottom: 18 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <TextField size="small" label="Stage name" placeholder="e.g. L1 Interview" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} sx={{ flex: 1, minWidth: 200 }} />
          <TextField select size="small" label="Type" value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))} sx={{ width: 180 }}>
            <MenuItem value="in_progress">In progress</MenuItem>
            <MenuItem value="success">Placed (joined)</MenuItem>
            <MenuItem value="rejected">Rejected / dropped</MenuItem>
          </TextField>
          <TextField size="small" type="number" label="Order" value={form.order_index} onChange={(e) => setForm((f) => ({ ...f, order_index: e.target.value }))} sx={{ width: 96 }} inputProps={{ min: 1 }} />
          <Button variant="contained" startIcon={<AddIcon />} onClick={add} disabled={busy} sx={{ textTransform: 'none', bgcolor: '#E53935' }}>Add stage</Button>
        </Box>
      </Card>

      {stages.length === 0 ? (
        <Card><EmptyState icon="🪜" title="No stages yet" text="Add your pipeline stages above — e.g. Resume Shortlisted, L1, L2, Joined, and a Rejected/Dropped stage." /></Card>
      ) : (
        <Card pad={0} style={{ overflow: 'hidden' }}>
          <Table size="small">
            <TableHead><TableRow sx={{ background: '#fafbfc', '& th': { color: '#64748b', fontWeight: 700, fontSize: 12 } }}>
              <TableCell>Order</TableCell><TableCell>Stage</TableCell><TableCell>Type</TableCell><TableCell align="right" />
            </TableRow></TableHead>
            <TableBody>{stages.map((s) => (
              <TableRow key={s.id} hover>
                <TableCell sx={{ color: '#94a3b8', width: 60 }}>{s.order_index}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{s.name}</TableCell>
                <TableCell><Chip size="small" label={KIND_LABEL[s.kind] || s.kind} color={KIND_COLOR[s.kind] || 'default'} variant="outlined" /></TableCell>
                <TableCell align="right"><IconButton size="small" onClick={() => remove(s)}><DeleteOutlineIcon fontSize="small" /></IconButton></TableCell>
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
