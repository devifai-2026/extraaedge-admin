// Placement Openings — create an opening with an eligibility-criteria builder,
// preview the matched-student count, fire it to those students, and manage
// open/closed state. Posters (student-facing marketing) can be attached.
import { useEffect, useState, useRef } from 'react';
import { Box, MenuItem, TextField, Button, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel, Checkbox, CircularProgress } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import WorkIcon from '@mui/icons-material/WorkOutlineOutlined';
import { placementApi, programsApi, uploadsApi } from '../../lib/endpoints';
import { PageHeader, Card, EmptyState, Badge, Btn, Skeleton } from '../../lib/lmsUi';
import { useNavigate } from 'react-router-dom';

function putFile(url, method, headers, file) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest(); xhr.open(method, url);
    Object.entries(headers || {}).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error('Upload failed')); xhr.send(file);
  });
}

export default function PlacementOpenings() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('open');
  const [rows, setRows] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const load = () => { setLoading(true); placementApi.listOpenings(status).then((r) => setRows(r?.data || [])).catch((e) => setToast({ severity: 'error', text: e.message })).finally(() => setLoading(false)); };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);
  useEffect(() => { placementApi.listCompanies().then((r) => setCompanies(r?.data || [])).catch(() => {}); }, []);

  const setOpeningStatus = async (o, st) => { try { await placementApi.setOpeningStatus(o.id, st); load(); } catch (e) { setToast({ severity: 'error', text: e.message }); } };

  return (
    <Box sx={{ p: 3, maxWidth: 1040, mx: 'auto' }}>
      <PageHeader title="Job Openings" subtitle="Create openings, set eligibility, and fire them to matched students." icon={WorkIcon}
        right={(
          <>
            <Box sx={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
              {['open', 'closed'].map((v) => (
                <button key={v} onClick={() => setStatus(v)} style={{ border: 'none', background: status === v ? '#0f172a' : '#fff', color: status === v ? '#fff' : '#475569', padding: '7px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>{v}</button>
              ))}
            </Box>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)} disabled={companies.length === 0} sx={{ textTransform: 'none', bgcolor: '#E53935' }}>New opening</Button>
          </>
        )}
      />
      {companies.length === 0 && !loading && <Card style={{ marginBottom: 16, borderLeft: '3px solid #d97706' }}><EmptyState icon="🏢" title="Add a company first" text="Openings belong to a company — add one in Companies, then create openings." action={<Btn onClick={() => navigate('/placement/companies')}>Go to Companies →</Btn>} /></Card>}

      {loading ? <Card><Skeleton h={16} w="40%" /><div style={{ height: 8 }} /><Skeleton h={12} w="70%" /></Card>
        : rows.length === 0 ? <Card><EmptyState icon="💼" title={`No ${status} openings`} text={status === 'open' ? 'Create an opening and fire it to eligible students.' : 'Closed openings will appear here.'} /></Card> : (
          <div style={{ display: 'grid', gap: 12 }}>
            {rows.map((o) => <OpeningCard key={o.id} o={o} onFired={load} onStatus={setOpeningStatus} onError={(m) => setToast({ severity: 'error', text: m })} onToast={(m) => setToast({ severity: 'success', text: m })} navigate={navigate} />)}
          </div>
        )}

      {createOpen && <CreateOpeningDialog companies={companies} onClose={() => setCreateOpen(false)} onDone={() => { setCreateOpen(false); setStatus('open'); load(); setToast({ severity: 'success', text: 'Opening created' }); }} onError={(m) => setToast({ severity: 'error', text: m })} />}
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)}>{toast.text}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}

function OpeningCard({ o, onFired, onStatus, onError, onToast, navigate }) {
  const [preview, setPreview] = useState(null); // { count, students: [{id,name,program_name}] }
  const [busy, setBusy] = useState(false);
  const crit = o.criteria || {};
  const critChips = [
    crit.min_attendance_pct != null && `Attendance ≥ ${crit.min_attendance_pct}%`,
    crit.project_submitted && 'Project submitted',
    crit.capstone_submitted && 'Capstone submitted',
    crit.course_completed && 'Course completed',
    crit.module_completed_id && 'Module completed',
  ].filter(Boolean);
  const noCriteria = critChips.length === 0;
  const doPreview = async () => { setBusy(true); try { const r = await placementApi.previewAudience(o.id); setPreview(r?.data ?? r); } catch (e) { onError(e.message); } finally { setBusy(false); } };
  const doFire = async () => {
    // Require a preview first so the operator sees exactly who will be fired
    // before this irreversible action (creates applications + notifications).
    if (preview == null) { onError('Preview the matches first so you can see who will be notified.'); return; }
    if (preview.count === 0) { onError('No students match this criteria yet — adjust the criteria.'); return; }
    const names = (preview.students || []).slice(0, 8).map((s) => s.name).join(', ');
    const more = preview.count > 8 ? ` and ${preview.count - 8} more` : '';
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Fire "${o.title}" to ${preview.count} student${preview.count === 1 ? '' : 's'}?\n\n${names}${more}`)) return;
    setBusy(true);
    try { const r = await placementApi.fire(o.id); const d = r?.data ?? r; onToast(`Fired to ${d.fired} student${d.fired === 1 ? '' : 's'} (${d.matched} matched)`); setPreview(null); onFired(); } catch (e) { onError(e.message); } finally { setBusy(false); }
  };
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>{o.title} <span style={{ color: '#64748b', fontWeight: 600, fontSize: 14 }}>· {o.company_name}</span></div>
          <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 2 }}>{[o.ctc, o.location, o.job_type, o.program_name].filter(Boolean).join(' · ') || '—'}</div>
          {critChips.length > 0
            ? <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>{critChips.map((c) => <Badge key={c} tone="info">{c}</Badge>)}</div>
            : <div style={{ fontSize: 12, color: '#b45309', marginTop: 8 }}>⚠ No criteria — this matches EVERY active student in scope.</div>}
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>{o.applicant_count || 0} in pipeline</div>
          {/* Preview reveals the actual matched students before firing. */}
          {preview != null && (
            <div style={{ marginTop: 10, padding: 10, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>{preview.count} student{preview.count === 1 ? '' : 's'} match{preview.count === 1 ? 'es' : ''}{noCriteria ? ' (all active students)' : ''}</div>
              {preview.count === 0
                ? <div style={{ fontSize: 12, color: '#94a3b8' }}>No matches — adjust the criteria.</div>
                : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(preview.students || []).slice(0, 24).map((s) => (
                      <span key={s.id} style={{ fontSize: 11.5, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 999, padding: '2px 8px', color: '#475569' }}>{s.name}</span>
                    ))}
                    {preview.count > 24 && <span style={{ fontSize: 11.5, color: '#94a3b8' }}>+{preview.count - 24} more</span>}
                  </div>}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {o.status === 'open' && <Btn size="sm" variant="ghost" onClick={doPreview} disabled={busy}>{preview == null ? 'Preview matches' : `${preview.count} match${preview.count === 1 ? '' : 'es'} · refresh`}</Btn>}
          {o.status === 'open' && <Btn size="sm" onClick={doFire} disabled={busy || preview == null || preview.count === 0}>Fire →</Btn>}
          <Btn size="sm" variant="ghost" onClick={() => navigate(`/placement/applications?opening=${o.id}`)}>Applicants</Btn>
          {o.status === 'open'
            ? <Btn size="sm" variant="ghost" onClick={() => onStatus(o, 'closed')}>Close</Btn>
            : <Badge tone="neutral">Closed</Badge>}
        </div>
      </div>
    </Card>
  );
}

function CreateOpeningDialog({ companies, onClose, onDone, onError }) {
  const [f, setF] = useState({ company_id: '', title: '', description: '', ctc: '', location: '', job_type: 'full_time', program_id: '', poster_r2_key: null });
  const [crit, setCrit] = useState({ min_attendance_pct: '', project_submitted: false, capstone_submitted: false, course_completed: false, module_completed_id: '' });
  const [programs, setPrograms] = useState([]);
  const [modules, setModules] = useState([]);
  const [busy, setBusy] = useState(false);
  const posterRef = useRef(null);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  useEffect(() => { programsApi.list().then((r) => setPrograms(r?.data || [])).catch(() => {}); }, []);
  useEffect(() => { if (f.program_id) placementApi.programModules(f.program_id).then((r) => setModules(r?.data || [])).catch(() => setModules([])); else setModules([]); }, [f.program_id]);

  const pickPoster = async (e) => {
    const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
    setBusy(true);
    try {
      const pre = await uploadsApi.presign({ purpose: 'job_poster', content_type: file.type || 'image/png', size_bytes: file.size, filename: file.name });
      const d = pre?.data ?? pre;
      await putFile(d.upload_url, d.method || 'PUT', d.headers || { 'Content-Type': file.type }, file);
      await uploadsApi.confirm({ purpose: 'job_poster', r2_key: d.r2_key, visibility: 'private' });
      setF((s) => ({ ...s, poster_r2_key: d.r2_key }));
    } catch (err) { onError(err.message); } finally { setBusy(false); }
  };
  const submit = async () => {
    if (!f.company_id || !f.title.trim()) { onError('Company and title are required'); return; }
    const criteria = {};
    if (crit.min_attendance_pct !== '') criteria.min_attendance_pct = Number(crit.min_attendance_pct);
    if (crit.project_submitted) criteria.project_submitted = true;
    if (crit.capstone_submitted) criteria.capstone_submitted = true;
    if (crit.course_completed) criteria.course_completed = true;
    if (crit.module_completed_id) criteria.module_completed_id = crit.module_completed_id;
    setBusy(true);
    try {
      await placementApi.createOpening({ company_id: f.company_id, title: f.title.trim(), description: f.description || null, ctc: f.ctc || null, location: f.location || null, job_type: f.job_type || null, program_id: f.program_id || null, poster_r2_key: f.poster_r2_key, criteria });
      onDone();
    } catch (e) { onError(e.message); } finally { setBusy(false); }
  };
  const setC = (k, v) => setCrit((s) => ({ ...s, [k]: v }));
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>New job opening</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField select size="small" label="Company" value={f.company_id} onChange={set('company_id')} sx={{ flex: 1 }}>
            {companies.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Type" value={f.job_type} onChange={set('job_type')} sx={{ width: 150 }}>
            <MenuItem value="full_time">Full-time</MenuItem><MenuItem value="internship">Internship</MenuItem><MenuItem value="contract">Contract</MenuItem>
          </TextField>
        </Box>
        <TextField size="small" label="Role title" value={f.title} onChange={set('title')} />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField size="small" label="CTC / Stipend" value={f.ctc} onChange={set('ctc')} sx={{ flex: 1 }} />
          <TextField size="small" label="Location" value={f.location} onChange={set('location')} sx={{ flex: 1 }} />
        </Box>
        <TextField size="small" label="Description" multiline minRows={2} value={f.description} onChange={set('description')} />

        <div style={{ borderTop: '1px solid #eef0f5', paddingTop: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Eligibility criteria (all must match)</div>
          <TextField select size="small" label="Scope to course (optional)" value={f.program_id} onChange={set('program_id')} sx={{ width: '100%', mb: 1 }} helperText="Criteria evaluate within this course when set">
            <MenuItem value="">Any course</MenuItem>
            {programs.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </TextField>
          <TextField size="small" type="number" label="Min attendance %" value={crit.min_attendance_pct} onChange={(e) => setC('min_attendance_pct', e.target.value)} sx={{ width: 170 }} inputProps={{ min: 0, max: 100 }} />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', mt: 1 }}>
            <FormControlLabel control={<Checkbox checked={crit.project_submitted} onChange={(e) => setC('project_submitted', e.target.checked)} />} label="Project submitted" />
            <FormControlLabel control={<Checkbox checked={crit.capstone_submitted} onChange={(e) => setC('capstone_submitted', e.target.checked)} />} label="Capstone submitted" />
            <FormControlLabel control={<Checkbox checked={crit.course_completed} onChange={(e) => setC('course_completed', e.target.checked)} />} label="Course completed" />
          </Box>
          {f.program_id && modules.length > 0 && (
            <TextField select size="small" label="Completed module (optional)" value={crit.module_completed_id} onChange={(e) => setC('module_completed_id', e.target.value)} sx={{ width: '100%', mt: 1 }}>
              <MenuItem value="">—</MenuItem>
              {modules.map((m) => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
            </TextField>
          )}
        </div>

        <Box>
          <input ref={posterRef} type="file" accept="image/*" hidden onChange={pickPoster} />
          <Button size="small" startIcon={<UploadFileIcon />} onClick={() => posterRef.current?.click()} disabled={busy} sx={{ textTransform: 'none' }}>{f.poster_r2_key ? 'Poster added ✓' : 'Upload poster (shown to students)'}</Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={busy} sx={{ textTransform: 'none', bgcolor: '#E53935' }}>{busy ? <CircularProgress size={18} /> : 'Create'}</Button>
      </DialogActions>
    </Dialog>
  );
}
