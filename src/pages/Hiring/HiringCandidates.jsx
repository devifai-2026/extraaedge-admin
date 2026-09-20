// Speedup Hiring — the candidate pool. The recruiter's main working surface.
//
// Three ways in, all required: manual entry (walk-in or phone enquiry), bulk
// CSV upload, and the interview sheet creating candidates as a side effect.
// All three write the same table, so a hand-added candidate and an imported
// one are indistinguishable afterwards.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Button, TextField, MenuItem, Chip, IconButton, Tooltip, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Pagination,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFileOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import PeopleIcon from '@mui/icons-material/PeopleAltOutlined';
import { hiringApi } from '../../lib/endpoints';
import { PageHeader, Card, EmptyState, lmsTokens } from '../../lib/lmsUi';
import HiringImportDialog from './HiringImportDialog';

const { INK, MUTE, FAINT, LINE } = lmsTokens;
const PAGE_SIZE = 50;

// Status colour follows `kind`, never the name — a tenant can rename
// "Rejected" and the colour must still be right.
const kindTint = (kind) => (kind === 'hired' ? '#059669' : kind === 'rejected' ? '#dc2626' : '#2563eb');

const money = (v) => (v == null ? '—' : `₹${Number(v).toLocaleString('en-IN')}`);

const TH = ({ children, align = 'left' }) => (
  <th style={{
    textAlign: align, padding: '10px 12px', fontSize: 11, fontWeight: 700,
    color: FAINT, textTransform: 'uppercase', letterSpacing: 0.6,
    borderBottom: `1px solid ${LINE}`, whiteSpace: 'nowrap',
  }}
  >{children}
  </th>
);
const TD = ({ children, align = 'left', style }) => (
  <td style={{
    textAlign: align, padding: '11px 12px', fontSize: 13.5, color: INK,
    borderBottom: `1px solid ${LINE}`, ...style,
  }}
  >{children}
  </td>
);

const BLANK = {
  name: '', phone: '', email: '', position_id: '', status_id: '',
  location: '', highest_qualification: '', stream: '', experience_level: '',
  current_area: '', current_salary: '', expected_salary: '', notice_period: '',
  contacted_on: '', remark: '',
};

export default function HiringCandidates() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [positions, setPositions] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [filters, setFilters] = useState({ q: '', position_id: '', status_id: '', experience_level: '' });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [importKind, setImportKind] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: PAGE_SIZE };
      for (const [k, v] of Object.entries(filters)) if (v) params[k] = v;
      const r = await hiringApi.candidates(params);
      setRows(r?.data || []);
      setTotal(r?.meta?.total ?? 0);
    } catch (e) {
      setToast({ severity: 'error', text: e?.message || 'Could not load candidates' });
    } finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    hiringApi.positions().then((r) => setPositions(r?.data || [])).catch(() => {});
    hiringApi.statuses().then((r) => setStatuses(r?.data || [])).catch(() => {});
  }, []);

  const setFilter = (k, v) => { setFilters((p) => ({ ...p, [k]: v })); setPage(1); };
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Only statuses that apply to a candidate — an interview-only status would
  // 403 on save and confuses the dropdown.
  const candidateStatuses = useMemo(
    () => statuses.filter((s) => s.applies_to !== 'interview'),
    [statuses],
  );

  const save = async () => {
    if (!form?.name?.trim()) { setToast({ severity: 'error', text: 'Name is required' }); return; }
    setSaving(true);
    try {
      const body = { ...form };
      // Empty strings are not nulls to the API; strip them so optional fields
      // stay unset rather than becoming "".
      for (const k of Object.keys(body)) if (body[k] === '') delete body[k];
      if (body.current_salary) body.current_salary = Number(body.current_salary);
      if (body.expected_salary) body.expected_salary = Number(body.expected_salary);
      if (form.id) await hiringApi.updateCandidate(form.id, body);
      else await hiringApi.createCandidate(body);
      setForm(null);
      setToast({ severity: 'success', text: form.id ? 'Candidate updated' : 'Candidate added' });
      load();
    } catch (e) {
      setToast({ severity: 'error', text: e?.message || 'Could not save' });
    } finally { setSaving(false); }
  };

  const remove = async (row) => {
    if (!window.confirm(`Remove ${row.name} from the candidate pool?`)) return;
    try {
      await hiringApi.deleteCandidate(row.id);
      setToast({ severity: 'success', text: 'Candidate removed' });
      load();
    } catch (e) { setToast({ severity: 'error', text: e?.message || 'Could not remove' }); }
  };

  const changeStatus = async (row, statusId) => {
    try {
      await hiringApi.setCandidateStatus(row.id, { status_id: statusId || null });
      load();
    } catch (e) { setToast({ severity: 'error', text: e?.message || 'Could not update status' }); }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <PageHeader
        title="Candidates"
        subtitle="People applying for our own vacancies."
        icon={PeopleIcon}
        right={(
          <>
            <Button
              size="small" startIcon={<UploadFileIcon />} variant="outlined"
              onClick={() => setImportKind('candidate')} sx={{ textTransform: 'none' }}
            >
              Bulk upload
            </Button>
            <Button
              size="small" startIcon={<AddIcon />} variant="contained"
              onClick={() => setForm({ ...BLANK })}
              sx={{ textTransform: 'none', bgcolor: '#E87B2F' }}
            >
              Add candidate
            </Button>
          </>
        )}
      />

      <Card style={{ marginBottom: 16 }}>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <TextField
            size="small" label="Search name, phone or email" sx={{ minWidth: 260 }}
            value={filters.q} onChange={(e) => setFilter('q', e.target.value)}
          />
          <TextField
            select size="small" label="Position" sx={{ minWidth: 180 }}
            value={filters.position_id} onChange={(e) => setFilter('position_id', e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {positions.map((p) => <MenuItem key={p.id} value={p.id}>{p.title}</MenuItem>)}
          </TextField>
          <TextField
            select size="small" label="Status" sx={{ minWidth: 180 }}
            value={filters.status_id} onChange={(e) => setFilter('status_id', e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {candidateStatuses.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </TextField>
          <TextField
            select size="small" label="Experience" sx={{ minWidth: 150 }}
            value={filters.experience_level} onChange={(e) => setFilter('experience_level', e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="fresher">Fresher</MenuItem>
            <MenuItem value="experienced">Experienced</MenuItem>
          </TextField>
        </Box>
      </Card>

      <Card pad={0} style={{ overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 5 }}><CircularProgress size={26} /></Box>
        ) : rows.length === 0 ? (
          <EmptyState
            icon="🧑‍💼"
            title="No candidates yet"
            text="Add someone by hand, or bulk upload the recruitment sheet."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
              <thead>
                <tr>
                  <TH>Name</TH><TH>Position</TH><TH>Contact</TH><TH>Qualification</TH>
                  <TH>Experience</TH><TH align="right">Expected</TH><TH>Status</TH>
                  <TH align="center">Interviews</TH><TH aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <TD style={{ fontWeight: 600 }}>
                      <button
                        type="button" onClick={() => setForm({ ...BLANK, ...c })}
                        style={{
                          background: 'none', border: 0, padding: 0, font: 'inherit',
                          fontWeight: 600, color: INK, cursor: 'pointer', textAlign: 'left',
                        }}
                      >
                        {c.name}
                      </button>
                      {c.location && <div style={{ fontSize: 11.5, color: FAINT, fontWeight: 400 }}>{c.location}</div>}
                    </TD>
                    <TD>{c.position_title || <span style={{ color: FAINT }}>—</span>}</TD>
                    <TD>
                      <div style={{ fontSize: 13 }}>{c.phone || '—'}</div>
                      {c.email && <div style={{ fontSize: 11.5, color: FAINT }}>{c.email}</div>}
                    </TD>
                    <TD>
                      {c.highest_qualification || '—'}
                      {c.stream && <div style={{ fontSize: 11.5, color: FAINT }}>{c.stream}</div>}
                    </TD>
                    <TD>
                      {c.experience_level
                        ? <Chip size="small" label={c.experience_level} sx={{ fontSize: 11, height: 20 }} />
                        : <span style={{ color: FAINT }}>—</span>}
                    </TD>
                    <TD align="right">{money(c.expected_salary)}</TD>
                    <TD>
                      <TextField
                        select size="small" variant="standard"
                        value={c.status_id || ''}
                        onChange={(e) => changeStatus(c, e.target.value)}
                        SelectProps={{ disableUnderline: true }}
                        sx={{
                          minWidth: 150,
                          '& .MuiInputBase-input': {
                            fontSize: 12.5, fontWeight: 700, py: 0.3, px: 1, borderRadius: 999,
                            color: c.status_kind ? kindTint(c.status_kind) : MUTE,
                            background: c.status_kind
                              ? `color-mix(in srgb, ${kindTint(c.status_kind)} 12%, transparent)`
                              : 'transparent',
                          },
                        }}
                      >
                        <MenuItem value=""><em>Not set</em></MenuItem>
                        {candidateStatuses.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                      </TextField>
                    </TD>
                    <TD align="center">{c.interview_count || 0}</TD>
                    <TD align="right">
                      <Tooltip title="Remove">
                        <IconButton size="small" onClick={() => remove(c)} sx={{ color: '#b91c1c' }}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {total > PAGE_SIZE && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <Pagination count={pages} page={page} onChange={(_e, p) => setPage(p)} shape="rounded" />
        </Box>
      )}

      {/* Manual add / edit */}
      <Dialog open={!!form} onClose={() => setForm(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 17 }}>
          {form?.id ? 'Edit candidate' : 'Add candidate'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mt: 0.5 }}>
            <TextField size="small" label="Name *" value={form?.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField size="small" label="Contact number" value={form?.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <TextField size="small" label="Email" value={form?.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <TextField select size="small" label="Position" value={form?.position_id ?? ''} onChange={(e) => setForm({ ...form, position_id: e.target.value })}>
              <MenuItem value="">—</MenuItem>
              {positions.map((p) => <MenuItem key={p.id} value={p.id}>{p.title}</MenuItem>)}
            </TextField>
            <TextField size="small" type="date" label="Date of contact" InputLabelProps={{ shrink: true }}
              value={(form?.contacted_on ?? '').slice(0, 10)} onChange={(e) => setForm({ ...form, contacted_on: e.target.value })} />
            <TextField select size="small" label="Status" value={form?.status_id ?? ''} onChange={(e) => setForm({ ...form, status_id: e.target.value })}>
              <MenuItem value="">—</MenuItem>
              {candidateStatuses.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </TextField>
            <TextField size="small" label="Location" value={form?.location ?? ''} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <TextField size="small" label="Current location with area" value={form?.current_area ?? ''} onChange={(e) => setForm({ ...form, current_area: e.target.value })} />
            <TextField size="small" label="Highest qualification" value={form?.highest_qualification ?? ''} onChange={(e) => setForm({ ...form, highest_qualification: e.target.value })} />
            <TextField size="small" label="Stream" value={form?.stream ?? ''} onChange={(e) => setForm({ ...form, stream: e.target.value })} />
            <TextField select size="small" label="Work experience" value={form?.experience_level ?? ''} onChange={(e) => setForm({ ...form, experience_level: e.target.value })}>
              <MenuItem value="">—</MenuItem>
              <MenuItem value="fresher">Fresher</MenuItem>
              <MenuItem value="experienced">Experienced</MenuItem>
            </TextField>
            <TextField size="small" label="Notice period" value={form?.notice_period ?? ''} onChange={(e) => setForm({ ...form, notice_period: e.target.value })} />
            <TextField size="small" type="number" label="Current salary" value={form?.current_salary ?? ''} onChange={(e) => setForm({ ...form, current_salary: e.target.value })} />
            <TextField size="small" type="number" label="Expected salary" value={form?.expected_salary ?? ''} onChange={(e) => setForm({ ...form, expected_salary: e.target.value })} />
            <TextField size="small" label="Remark" multiline rows={2} sx={{ gridColumn: { sm: '1 / -1' } }}
              value={form?.remark ?? ''} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setForm(null)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button onClick={save} disabled={saving} variant="contained" sx={{ textTransform: 'none', bgcolor: '#E87B2F' }}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <HiringImportDialog
        open={!!importKind}
        kind={importKind || 'candidate'}
        positions={positions}
        onClose={() => setImportKind(null)}
        onDone={(msg) => { setImportKind(null); setToast({ severity: 'success', text: msg }); load(); }}
      />

      <Snackbar
        open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)}>{toast.text}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
