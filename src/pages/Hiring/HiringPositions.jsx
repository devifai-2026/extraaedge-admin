// Speedup Hiring — vacancies, and where each one was advertised.
//
// Posting is tracked rather than API-driven: the recruiter posts to LinkedIn /
// Facebook / Instagram themselves and records the channel + URL here. That
// answers "which channel produced this candidate" without depending on five
// third-party APIs, none of which actually offer job posting on open terms.
import { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, TextField, MenuItem, Chip, IconButton, Tooltip, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import ShareIcon from '@mui/icons-material/ShareOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import WorkIcon from '@mui/icons-material/WorkOutlineOutlined';
import { hiringApi, branchesApi } from '../../lib/endpoints';
import { PageHeader, Card, EmptyState, lmsTokens } from '../../lib/lmsUi';

const { INK, MUTE, FAINT, LINE } = lmsTokens;

const CHANNELS = ['linkedin', 'facebook', 'instagram', 'naukri', 'indeed', 'referral', 'walk_in', 'other'];
const CHANNEL_LABEL = {
  linkedin: 'LinkedIn', facebook: 'Facebook', instagram: 'Instagram',
  naukri: 'Naukri', indeed: 'Indeed', referral: 'Referral',
  walk_in: 'Walk-in', other: 'Other',
};
const STATUS_TINT = { open: '#059669', on_hold: '#d97706', closed: '#64748b' };

// Small muted caption. Declared up here, not at the bottom of the file: a
// const referenced above its declaration throws on render (temporal dead zone).
const Caption = ({ children }) => (
  <div style={{ fontSize: 12.5, color: MUTE, marginTop: 3 }}>{children}</div>
);

export default function HiringPositions() {
  const [rows, setRows] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState(null);
  const [postingFor, setPostingFor] = useState(null);
  const [postings, setPostings] = useState([]);
  const [newPosting, setNewPosting] = useState({ channel: 'linkedin', external_url: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows((await hiringApi.positions())?.data || []); } catch (e) {
      setToast({ severity: 'error', text: e?.message || 'Could not load positions' });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { branchesApi.list().then((r) => setBranches(r?.data || [])).catch(() => {}); }, []);

  const save = async () => {
    if (!form?.title?.trim()) { setToast({ severity: 'error', text: 'Title is required' }); return; }
    setSaving(true);
    try {
      const body = {
        title: form.title.trim(),
        department: form.department || null,
        branch_id: form.branch_id || null,
        openings_count: Number(form.openings_count) || 1,
        status: form.status || 'open',
      };
      if (form.id) await hiringApi.updatePosition(form.id, body);
      else await hiringApi.createPosition(body);
      setForm(null);
      setToast({ severity: 'success', text: form.id ? 'Position updated' : 'Position created' });
      load();
    } catch (e) {
      setToast({ severity: 'error', text: e?.message || 'Could not save' });
    } finally { setSaving(false); }
  };

  const openPostings = async (p) => {
    setPostingFor(p);
    try { setPostings((await hiringApi.postings(p.id))?.data || []); } catch { setPostings([]); }
  };

  const addPosting = async () => {
    if (!newPosting.channel) return;
    try {
      await hiringApi.createPosting(postingFor.id, newPosting);
      setNewPosting({ channel: 'linkedin', external_url: '', notes: '' });
      setPostings((await hiringApi.postings(postingFor.id))?.data || []);
      load();
    } catch (e) { setToast({ severity: 'error', text: e?.message || 'Could not add' }); }
  };

  const removePosting = async (id) => {
    try {
      await hiringApi.deletePosting(id);
      setPostings((await hiringApi.postings(postingFor.id))?.data || []);
      load();
    } catch (e) { setToast({ severity: 'error', text: e?.message || 'Could not remove' }); }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
      <PageHeader
        title="Positions"
        subtitle="Vacancies we are recruiting for, and where they are advertised."
        icon={WorkIcon}
        right={(
          <Button
            size="small" startIcon={<AddIcon />} variant="contained"
            onClick={() => setForm({ title: '', department: '', branch_id: '', openings_count: 1, status: 'open' })}
            sx={{ textTransform: 'none', bgcolor: '#E87B2F' }}
          >
            New position
          </Button>
        )}
      />

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 5 }}><CircularProgress size={26} /></Box>
      ) : rows.length === 0 ? (
        <Card><EmptyState icon="💼" title="No positions yet" text="Create the vacancy you are hiring for, then add candidates against it." /></Card>
      ) : (
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          {rows.map((p) => (
            <Card key={p.id}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <button
                      type="button" onClick={() => setForm({ ...p })}
                      style={{
                        background: 'none', border: 0, padding: 0, font: 'inherit',
                        fontSize: 15, fontWeight: 700, color: INK, cursor: 'pointer',
                      }}
                    >
                      {p.title}
                    </button>
                    <Chip
                      size="small" label={p.status.replace('_', ' ')}
                      sx={{
                        height: 20, fontSize: 11, fontWeight: 700,
                        color: STATUS_TINT[p.status],
                        background: `color-mix(in srgb, ${STATUS_TINT[p.status]} 12%, transparent)`,
                      }}
                    />
                  </Box>
                  <Caption>
                    {p.department ? `${p.department} · ` : ''}
                    {p.branch_name ? `${p.branch_name} · ` : ''}
                    {p.openings_count} opening{p.openings_count === 1 ? '' : 's'}
                  </Caption>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: INK }}>{p.candidate_count}</div>
                    <div style={{ fontSize: 11, color: FAINT }}>candidates</div>
                  </Box>
                  <Button
                    size="small" startIcon={<ShareIcon />} variant="outlined"
                    onClick={() => openPostings(p)} sx={{ textTransform: 'none' }}
                  >
                    Posted to ({p.posting_count})
                  </Button>
                </Box>
              </Box>
            </Card>
          ))}
        </Box>
      )}

      {/* Create / edit position */}
      <Dialog open={!!form} onClose={() => setForm(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 17 }}>{form?.id ? 'Edit position' : 'New position'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'grid', gap: 2, mt: 0.5 }}>
            <TextField size="small" label="Title *" placeholder="Telecaller"
              value={form?.title ?? ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <TextField size="small" label="Department"
              value={form?.department ?? ''} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            <TextField select size="small" label="Branch"
              value={form?.branch_id ?? ''} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}>
              <MenuItem value="">—</MenuItem>
              {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
            </TextField>
            <TextField size="small" type="number" label="Openings"
              value={form?.openings_count ?? 1} onChange={(e) => setForm({ ...form, openings_count: e.target.value })} />
            <TextField select size="small" label="Status"
              value={form?.status ?? 'open'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <MenuItem value="open">Open</MenuItem>
              <MenuItem value="on_hold">On hold</MenuItem>
              <MenuItem value="closed">Closed</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setForm(null)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button onClick={save} disabled={saving} variant="contained" sx={{ textTransform: 'none', bgcolor: '#E87B2F' }}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Where this vacancy was advertised */}
      <Dialog open={!!postingFor} onClose={() => setPostingFor(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 17 }}>
          Posted to — {postingFor?.title}
        </DialogTitle>
        <DialogContent dividers>
          <Caption>
            Post the vacancy on each channel yourself, then record it here with the
            link. Candidates can then be attributed to the channel that produced them.
          </Caption>

          <Box sx={{ display: 'grid', gap: 1.5, mt: 2 }}>
            {postings.length === 0 && (
              <div style={{ fontSize: 13, color: FAINT }}>Not posted anywhere yet.</div>
            )}
            {postings.map((h) => (
              <Box
                key={h.id}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1, p: 1.2,
                  border: `1px solid ${LINE}`, borderRadius: 2,
                }}
              >
                <Chip size="small" label={CHANNEL_LABEL[h.channel] || h.channel} sx={{ fontSize: 11, height: 20 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: MUTE, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {h.external_url || h.notes || '—'}
                  </div>
                </Box>
                {h.external_url && (
                  <Tooltip title="Open">
                    <IconButton size="small" component="a" href={h.external_url} target="_blank" rel="noreferrer">
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                <IconButton size="small" onClick={() => removePosting(h.id)} sx={{ color: '#b91c1c' }}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>

          <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
            <TextField
              select size="small" label="Channel" sx={{ minWidth: 140 }}
              value={newPosting.channel} onChange={(e) => setNewPosting({ ...newPosting, channel: e.target.value })}
            >
              {CHANNELS.map((c) => <MenuItem key={c} value={c}>{CHANNEL_LABEL[c]}</MenuItem>)}
            </TextField>
            <TextField
              size="small" label="Link to the post" sx={{ flex: 1, minWidth: 200 }}
              value={newPosting.external_url} onChange={(e) => setNewPosting({ ...newPosting, external_url: e.target.value })}
            />
            <Button onClick={addPosting} variant="outlined" sx={{ textTransform: 'none' }}>Add</Button>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setPostingFor(null)} sx={{ textTransform: 'none' }}>Done</Button>
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
