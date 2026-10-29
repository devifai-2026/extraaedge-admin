// Speedup Hiring — interviews for JOB CANDIDATES.
//
// Not to be confused with HR → Interviews, which is student mock-interview
// scoring: that module hangs off a course (mock_interviews.program_id) and its
// attendees are enrolled students, so it cannot express "interview Akanksha
// for the Telecaller vacancy". This one can.
import { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, TextField, MenuItem, IconButton, Tooltip, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Autocomplete, Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFileOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EventIcon from '@mui/icons-material/EventAvailableOutlined';
import { hiringApi, usersApi } from '../../lib/endpoints';
import { PageHeader, Card, EmptyState, lmsTokens } from '../../lib/lmsUi';
import HiringImportDialog from './HiringImportDialog';

const { INK, FAINT, LINE } = lmsTokens;

const MODES = [
  { v: 'online', l: 'Online' },
  { v: 'in_person', l: 'In person' },
  { v: 'telephonic', l: 'Telephonic' },
];

// A timestamptz from the API (e.g. "2026-10-30T01:00:00.000Z") rendered as the
// value a <input type="datetime-local"> expects: LOCAL wall-clock,
// "YYYY-MM-DDTHH:mm", with no zone suffix.
//
// This used to be `String(v).slice(0, 16)`, which just chopped the raw UTC
// string. The list renders the same instant through toLocaleString (IST), so a
// row reading "6:30 am" opened an edit form showing "01:00" — the same moment,
// displayed in two different zones, which looks like the data changed on open.
// Saving that form then wrote 01:00 as a local time and shifted the interview
// 5h30m earlier each time it was edited.
const toLocalInput = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// The inverse: a datetime-local string is local wall-clock, so turn it into an
// explicit instant before sending. Without this the server stores it using the
// DATABASE's timezone, which happens to be Asia/Kolkata today — correct by
// coincidence, and silently wrong the moment that setting changes.
const fromLocalInput = (v) => {
  if (!v) return v;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toISOString();
};

const fmtWhen = (v) => {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: '2-digit', hour: 'numeric', minute: '2-digit', hour12: true,
    });
  } catch { return String(v); }
};

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

export default function HiringInterviews() {
  const [rows, setRows] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [positions, setPositions] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [rounds, setRounds] = useState([]);
  // Everyone in the tenant — anyone can be invited onto a panel, not just HR.
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await hiringApi.interviews();
      setRows(r?.data || []);
    } catch (e) {
      setToast({ severity: 'error', text: e?.message || 'Could not load interviews' });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    hiringApi.statuses().then((r) => setStatuses(r?.data || [])).catch(() => {});
    hiringApi.positions().then((r) => setPositions(r?.data || [])).catch(() => {});
    hiringApi.candidates({ limit: 200 }).then((r) => setCandidates(r?.data || [])).catch(() => {});
    hiringApi.rounds().then((r) => setRounds(r?.data || [])).catch(() => {});
    usersApi.options().then((r) => setUsers(r?.data || [])).catch(() => {});
  }, []);

  // Interview-applicable statuses only — a candidate-only outcome like
  // "Location issue" is not an interview result.
  const interviewStatuses = statuses.filter((s) => s.applies_to !== 'candidate');

  // Open the edit form and pull in the existing panel.
  //
  // The panel MUST be loaded before the form renders: the save path sends
  // panel_user_ids and the server replaces the panel wholesale, so opening an
  // interview with an empty picker and saving would silently un-invite
  // everyone on it.
  const openEdit = async (r) => {
    setForm({ ...r, scheduled_at: toLocalInput(r.scheduled_at), panel_user_ids: [] });
    try {
      const p = await hiringApi.panel(r.id);
      const ids = (p?.data || []).map((m) => m.user_id);
      setForm((f) => (f && f.id === r.id ? { ...f, panel_user_ids: ids } : f));
    } catch { /* leave the picker empty; the user can re-pick */ }
  };

  const save = async () => {
    if (!form?.candidate_id) { setToast({ severity: 'error', text: 'Pick a candidate' }); return; }
    setSaving(true);
    try {
      // Send only the fields the API accepts. `form` is spread from a LIST
      // row, which also carries display-only columns (candidate_name,
      // status_name, round_name, panel_count, legacy_remark…) that the strict
      // zod body schema would reject outright.
      const SENDABLE = [
        'candidate_id', 'scheduled_at', 'mode', 'status_id', 'interviewer_id',
        'remark_1', 'remark_2', 'round_id', 'meeting_link', 'panel_user_ids',
      ];
      const body = {};
      for (const k of SENDABLE) if (form[k] !== undefined) body[k] = form[k];
      body.scheduled_at = fromLocalInput(form.scheduled_at);
      // An empty string is not null to the API; drop unset optionals. The
      // panel array is exempt — [] is a real instruction ("nobody on it").
      for (const k of Object.keys(body)) {
        if (body[k] === '' || body[k] === undefined) delete body[k];
      }
      if (form.id) {
        const { candidate_id: _drop, id: _id, ...rest } = body;
        await hiringApi.updateInterview(form.id, rest);
      } else {
        await hiringApi.createInterview(body);
      }
      setForm(null);
      setToast({ severity: 'success', text: form.id ? 'Interview updated' : 'Interview scheduled' });
      load();
    } catch (e) {
      setToast({ severity: 'error', text: e?.message || 'Could not save' });
    } finally { setSaving(false); }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete the interview for ${row.candidate_name}?`)) return;
    try {
      await hiringApi.deleteInterview(row.id);
      setToast({ severity: 'success', text: 'Interview deleted' });
      load();
    } catch (e) { setToast({ severity: 'error', text: e?.message || 'Could not delete' }); }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1240, mx: 'auto' }}>
      <PageHeader
        title="Interviews"
        subtitle="Scheduled interviews for job candidates."
        icon={EventIcon}
        right={(
          <>
            <Button
              size="small" startIcon={<UploadFileIcon />} variant="outlined"
              onClick={() => setImportOpen(true)} sx={{ textTransform: 'none' }}
            >
              Bulk upload
            </Button>
            <Button
              size="small" startIcon={<AddIcon />} variant="contained"
              onClick={() => setForm({ candidate_id: '', scheduled_at: '', mode: '', status_id: '', remark_1: '' })}
              sx={{ textTransform: 'none', bgcolor: '#E87B2F' }}
            >
              Schedule interview
            </Button>
          </>
        )}
      />

      <Card pad={0} style={{ overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 5 }}><CircularProgress size={26} /></Box>
        ) : rows.length === 0 ? (
          <EmptyState
            icon="📅"
            title="No interviews scheduled"
            text="Schedule one against a candidate, or bulk upload the interview sheet."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr>
                  <TH>Candidate</TH><TH>Position</TH><TH>Round</TH><TH>When</TH><TH>Mode</TH>
                  <TH>Status</TH><TH>Panel</TH><TH>Remarks</TH><TH aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <TD style={{ fontWeight: 600 }}>
                      <button
                        type="button" onClick={() => openEdit(r)}
                        style={{
                          background: 'none', border: 0, padding: 0, font: 'inherit',
                          fontWeight: 600, color: INK, cursor: 'pointer', textAlign: 'left',
                        }}
                      >
                        {r.candidate_name}
                      </button>
                      {r.candidate_phone && <div style={{ fontSize: 11.5, color: FAINT, fontWeight: 400 }}>{r.candidate_phone}</div>}
                    </TD>
                    <TD>{r.position_title || <span style={{ color: FAINT }}>—</span>}</TD>
                    <TD>
                      {r.round_name
                        ? <Chip size="small" label={r.round_name} sx={{ height: 20, fontSize: 11, fontWeight: 700 }} />
                        : <span style={{ color: FAINT }}>—</span>}
                    </TD>
                    <TD>
                      {fmtWhen(r.scheduled_at)}
                      {r.meeting_link && (
                        <div>
                          <a
                            href={r.meeting_link} target="_blank" rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{ fontSize: 11.5, color: '#1976d2' }}
                          >
                            Join link ↗
                          </a>
                        </div>
                      )}
                    </TD>
                    <TD>{MODES.find((m) => m.v === r.mode)?.l || <span style={{ color: FAINT }}>—</span>}</TD>
                    <TD>{r.status_name || <span style={{ color: FAINT }}>—</span>}</TD>
                    <TD>
                      {r.panel_count
                        ? (
                          <span style={{ fontSize: 12 }}>
                            {r.panel_count} invited
                            <div style={{ fontSize: 11, color: r.feedback_count ? '#15803d' : FAINT }}>
                              {r.feedback_count}/{r.panel_count} gave feedback
                            </div>
                          </span>
                        )
                        : <span style={{ color: FAINT }}>—</span>}
                    </TD>
                    <TD style={{ maxWidth: 260, whiteSpace: 'normal' }}>
                      {/* legacy_remark is the pre-panel remark_1/remark_2 pair.
                          Those rows have no author, so they are shown as-is
                          rather than being dropped from the new panel view. */}
                      {r.legacy_remark || <span style={{ color: FAINT }}>—</span>}
                    </TD>
                    <TD align="right">
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => remove(r)} sx={{ color: '#b91c1c' }}>
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

      <Dialog open={!!form} onClose={() => setForm(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 17 }}>
          {form?.id ? 'Edit interview' : 'Schedule interview'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'grid', gap: 2, mt: 0.5 }}>
            {form?.id ? (
              <TextField size="small" label="Candidate" value={form.candidate_name || ''} disabled />
            ) : (
              <Autocomplete
                size="small"
                options={candidates}
                getOptionLabel={(o) => `${o.name}${o.phone ? ` · ${o.phone}` : ''}`}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                onChange={(_e, v) => setForm({ ...form, candidate_id: v?.id || '' })}
                renderInput={(p) => <TextField {...p} label="Candidate *" />}
              />
            )}
            <TextField
              size="small" type="datetime-local" label="Date and time" InputLabelProps={{ shrink: true }}
              value={form?.scheduled_at ?? ''} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
            />
            <TextField select size="small" label="Mode" value={form?.mode ?? ''} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
              <MenuItem value="">—</MenuItem>
              {MODES.map((m) => <MenuItem key={m.v} value={m.v}>{m.l}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Round" value={form?.round_id ?? ''} onChange={(e) => setForm({ ...form, round_id: e.target.value })}>
              <MenuItem value="">—</MenuItem>
              {rounds.map((r) => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
            </TextField>
            {/* Optional: an interview is often booked before the link exists,
                and an in-person round never needs one. */}
            <TextField
              size="small" label="Meeting link" placeholder="Meet / Teams / Zoom — optional"
              value={form?.meeting_link ?? ''}
              onChange={(e) => setForm({ ...form, meeting_link: e.target.value })}
            />
            <TextField select size="small" label="Status" value={form?.status_id ?? ''} onChange={(e) => setForm({ ...form, status_id: e.target.value })}>
              <MenuItem value="">—</MenuItem>
              {interviewStatuses.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </TextField>
            {/* Panel. Anyone in the tenant can be invited; each gets their own
                feedback box and sees this interview under My Interviews. */}
            <Autocomplete
              multiple size="small" options={users}
              getOptionLabel={(o) => `${o.name}${o.role ? ` · ${String(o.role).replace(/_/g, ' ')}` : ''}`}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              value={users.filter((u) => (form?.panel_user_ids || []).includes(u.id))}
              onChange={(_e, v) => setForm({ ...form, panel_user_ids: v.map((u) => u.id) })}
              renderInput={(p) => (
                <TextField {...p} label="Interview panel" placeholder="Invite interviewers" />
              )}
            />
            <TextField size="small" label="1st remark" multiline rows={2}
              value={form?.remark_1 ?? ''} onChange={(e) => setForm({ ...form, remark_1: e.target.value })} />
            <TextField size="small" label="2nd remark" multiline rows={2}
              value={form?.remark_2 ?? ''} onChange={(e) => setForm({ ...form, remark_2: e.target.value })} />
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
        open={importOpen}
        kind="interview"
        positions={positions}
        onClose={() => setImportOpen(false)}
        onDone={(msg) => { setImportOpen(false); setToast({ severity: 'success', text: msg }); load(); }}
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
