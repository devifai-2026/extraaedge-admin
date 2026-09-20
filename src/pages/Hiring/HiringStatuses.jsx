// Speedup Hiring — configurable pipeline statuses.
//
// "Status can be anything" — so the recruiter owns this list rather than
// waiting on a deploy. Each status carries a `kind` (open / hired / rejected)
// so reports can count outcomes without matching on the name; rename
// "Rejected" to "Not selected" and every funnel still works.
//
// Retire, never delete: a status in use is referenced by candidates and
// interviews, and removing it would blank their history. Setting is_active
// false hides it from the pickers while leaving existing records readable.
import { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, TextField, MenuItem, Switch, Chip, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import TuneIcon from '@mui/icons-material/TuneOutlined';
import { hiringApi } from '../../lib/endpoints';
import { PageHeader, Card, lmsTokens } from '../../lib/lmsUi';

const { INK, MUTE, FAINT, LINE } = lmsTokens;

const KIND_TINT = { open: '#2563eb', hired: '#059669', rejected: '#dc2626' };
const KINDS = [
  { v: 'open', l: 'In progress' },
  { v: 'hired', l: 'Hired' },
  { v: 'rejected', l: 'Rejected / closed' },
];
const APPLIES = [
  { v: 'both', l: 'Candidates and interviews' },
  { v: 'candidate', l: 'Candidates only' },
  { v: 'interview', l: 'Interviews only' },
];

export default function HiringStatuses() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows((await hiringApi.statuses(true))?.data || []); } catch (e) {
      setToast({ severity: 'error', text: e?.message || 'Could not load statuses' });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form?.name?.trim()) { setToast({ severity: 'error', text: 'Name is required' }); return; }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        kind: form.kind || 'open',
        applies_to: form.applies_to || 'both',
        order_index: Number(form.order_index) || 0,
      };
      if (form.id) await hiringApi.updateStatus(form.id, body);
      else await hiringApi.createStatus(body);
      setForm(null);
      setToast({ severity: 'success', text: form.id ? 'Status updated' : 'Status added' });
      load();
    } catch (e) {
      setToast({ severity: 'error', text: e?.message || 'Could not save' });
    } finally { setSaving(false); }
  };

  const toggleActive = async (row) => {
    try {
      await hiringApi.updateStatus(row.id, { is_active: !row.is_active });
      load();
    } catch (e) { setToast({ severity: 'error', text: e?.message || 'Could not update' }); }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <PageHeader
        title="Hiring statuses"
        subtitle="The outcomes a candidate or interview can be marked with."
        icon={TuneIcon}
        right={(
          <Button
            size="small" startIcon={<AddIcon />} variant="contained"
            onClick={() => setForm({ name: '', kind: 'open', applies_to: 'both', order_index: (rows.length + 1) * 10 })}
            sx={{ textTransform: 'none', bgcolor: '#E87B2F' }}
          >
            Add status
          </Button>
        )}
      />

      <Card pad={0} style={{ overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 5 }}><CircularProgress size={26} /></Box>
        ) : (
          <Box>
            {rows.map((s) => (
              <Box
                key={s.id}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.5,
                  borderBottom: `1px solid ${LINE}`, opacity: s.is_active ? 1 : 0.55,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <button
                    type="button" onClick={() => setForm({ ...s })}
                    style={{
                      background: 'none', border: 0, padding: 0, font: 'inherit',
                      fontSize: 14, fontWeight: 600, color: INK, cursor: 'pointer',
                    }}
                  >
                    {s.name}
                  </button>
                  <div style={{ fontSize: 11.5, color: FAINT, marginTop: 2 }}>
                    {APPLIES.find((a) => a.v === s.applies_to)?.l}
                  </div>
                </Box>
                <Chip
                  size="small"
                  label={KINDS.find((k) => k.v === s.kind)?.l || s.kind}
                  sx={{
                    height: 22, fontSize: 11, fontWeight: 700,
                    color: KIND_TINT[s.kind],
                    background: `color-mix(in srgb, ${KIND_TINT[s.kind]} 12%, transparent)`,
                  }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span style={{ fontSize: 11.5, color: MUTE }}>{s.is_active ? 'In use' : 'Retired'}</span>
                  <Switch size="small" checked={s.is_active} onChange={() => toggleActive(s)} />
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Card>

      <Box sx={{ fontSize: 12.5, color: FAINT, mt: 1.5 }}>
        Retiring a status hides it from the dropdowns but keeps it readable on
        candidates who already have it. Statuses are never deleted.
      </Box>

      <Dialog open={!!form} onClose={() => setForm(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 17 }}>{form?.id ? 'Edit status' : 'Add status'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'grid', gap: 2, mt: 0.5 }}>
            <TextField size="small" label="Name *" placeholder="Offer Accepted"
              value={form?.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField
              select size="small" label="Counts as"
              helperText="Drives the reports — not the label people see."
              value={form?.kind ?? 'open'} onChange={(e) => setForm({ ...form, kind: e.target.value })}
            >
              {KINDS.map((k) => <MenuItem key={k.v} value={k.v}>{k.l}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Applies to"
              value={form?.applies_to ?? 'both'} onChange={(e) => setForm({ ...form, applies_to: e.target.value })}>
              {APPLIES.map((a) => <MenuItem key={a.v} value={a.v}>{a.l}</MenuItem>)}
            </TextField>
            <TextField size="small" type="number" label="Order"
              value={form?.order_index ?? 0} onChange={(e) => setForm({ ...form, order_index: e.target.value })} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setForm(null)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button onClick={save} disabled={saving} variant="contained" sx={{ textTransform: 'none', bgcolor: '#E87B2F' }}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)}>{toast.text}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
