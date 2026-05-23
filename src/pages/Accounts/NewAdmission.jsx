import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  TextField, MenuItem, Select, FormControl, InputLabel, Button,
  CircularProgress, Alert, IconButton, Tooltip,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import UploadIcon from '@mui/icons-material/Upload';
import { useDropdown } from '../../lib/useDropdowns';
import { admissionsApi, leadsApi, uploadsApi } from '../../lib/endpoints';
import { isRole, ROLES } from '../../lib/rbac';
import './Accounts.css';

// Free-text fallback for mode_of_training when there's no enum source.
const TRAINING_MODES = ['Online', 'Offline', 'Hybrid'];

const blankEducation = () => ({
  examination: '', stream: '', college_name: '',
  board_university: '', year_of_passing: '', percentage: '',
  // 'percent' (0–100) or 'cgpa' (0–10). The grade value still lives in
  // `percentage` either way — grade_unit just tells you how to read it.
  grade_unit: 'percent',
});

// Form ingests an optional :leadId route param. When present we pre-fill
// from the lead (lead.name, email, phone, program_id, assigned_to → guided_by).
// The created admission keeps lead_id so the lead → admission link is
// visible in lead detail later.
const NewAdmission = () => {
  const { leadId, id: editId } = useParams(); // route either has :leadId or :id
  const isEditMode = Boolean(editId);
  const navigate = useNavigate();
  const programs = useDropdown('programs', { enabled: true });
  const [centers, setCenters] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [hydrating, setHydrating] = useState(false);
  const [error, setError] = useState('');

  // Account managers can run the rest of the admission flow but they
  // don't own pricing — Course Fees + Mode of Payment are set by the
  // accounts/admin team via the per-lead fee offer page. Lock the Fees
  // section for them so they can't accidentally re-write the offer.
  const isAccountManager = isRole(ROLES.ACCOUNT_MANAGER);
  const feesReadOnly = isAccountManager;

  const [form, setForm] = useState({
    lead_id: null,
    admission_date: new Date().toISOString().slice(0, 10),
    first_name: '', middle_name: '', last_name: '',
    email: '', whatsapp_number: '', alternate_contact: '', address: '',
    program_id: '', mode_of_training: '', center_id: '',
    total_fees: '', mode_of_payment: 'Installment',
    selfie_r2_key: null, photo_r2_key: null,
    education: [blankEducation()],
  });

  // Centers list (no filter; just the active ones)
  useEffect(() => {
    admissionsApi.centers.list()
      .then((r) => setCenters((r?.data || []).filter((c) => c.is_active !== false)))
      .catch(() => setCenters([]));
  }, []);

  // Hydrate from /leads/:id if route was /accounts/new-admission/:leadId
  useEffect(() => {
    if (!leadId) return;
    setHydrating(true);
    leadsApi.get(leadId)
      .then((r) => {
        const lead = r?.data || {};
        const parts = String(lead.name || '').trim().split(/\s+/);
        setForm((prev) => ({
          ...prev,
          lead_id: lead.id,
          first_name: lead.first_name || parts[0] || '',
          last_name: lead.last_name || parts.slice(1).join(' ') || '',
          email: lead.email || '',
          whatsapp_number: lead.whatsapp_number || lead.phone || '',
          alternate_contact: lead.alternate_contact || '',
          address: lead.address || '',
          program_id: lead.program_id || '',
        }));
      })
      .catch(() => setError('Failed to load lead'))
      .finally(() => setHydrating(false));
  }, [leadId]);

  // Hydrate from existing admission when in edit mode
  useEffect(() => {
    if (!editId) return;
    setHydrating(true);
    admissionsApi.get(editId)
      .then((r) => {
        const a = r?.data || {};
        setForm({
          lead_id: a.lead_id || null,
          admission_date: a.admission_date ? String(a.admission_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
          first_name: a.first_name || '',
          middle_name: a.middle_name || '',
          last_name: a.last_name || '',
          email: a.email || '',
          whatsapp_number: a.whatsapp_number || '',
          alternate_contact: a.alternate_contact || '',
          address: a.address || '',
          program_id: a.program_id || '',
          mode_of_training: a.mode_of_training || '',
          center_id: a.center_id || '',
          total_fees: a.total_fees || '',
          mode_of_payment: a.mode_of_payment || 'Installment',
          selfie_r2_key: a.selfie_r2_key || null,
          photo_r2_key: a.photo_r2_key || null,
          education: (a.education || []).length ? a.education.map((e) => ({
            examination: e.examination || '',
            stream: e.stream || '',
            college_name: e.college_name || '',
            board_university: e.board_university || '',
            year_of_passing: e.year_of_passing || '',
            percentage: e.percentage || '',
            grade_unit: e.grade_unit || 'percent',
          })) : [blankEducation()],
        });
      })
      .catch(() => setError('Failed to load admission'))
      .finally(() => setHydrating(false));
  }, [editId]);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const setEdu = (idx, k) => (e) => {
    const v = e.target.value;
    setForm((p) => ({
      ...p,
      education: p.education.map((row, i) => {
        if (i !== idx) return row;
        const next = { ...row, [k]: v };
        // Grade-unit toggle: clamp/clear the value if it no longer fits
        // the new scale (mirrors PublicAdmission setEdu).
        if (k === 'grade_unit') {
          const cap = v === 'cgpa' ? 10 : 100;
          const num = Number(next.percentage);
          if (next.percentage !== '' && !Number.isNaN(num) && num > cap) {
            next.percentage = '';
          }
        }
        if (k === 'percentage' && v !== '') {
          const num = Number(v);
          if (Number.isNaN(num) || num < 0) {
            next.percentage = '';
          } else {
            const cap = row.grade_unit === 'cgpa' ? 10 : 100;
            if (num > cap) next.percentage = String(cap);
          }
        }
        return next;
      }),
    }));
  };
  const addEdu = () => setForm((p) => ({ ...p, education: [...p.education, blankEducation()] }));
  const removeEdu = (idx) => setForm((p) => ({
    ...p,
    education: p.education.filter((_, i) => i !== idx),
  }));

  // Generic upload helper for selfie / photo. Uses the existing
  // /uploads/presign + PUT-to-GCS + /uploads/confirm pipeline so this
  // page doesn't introduce its own storage path.
  const uploadPhoto = async (field) => async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const ps = await uploadsApi.presign({
        purpose: 'admission_photo',
        content_type: file.type || 'image/jpeg',
        size_bytes: file.size,
        filename: file.name,
      });
      const presign = ps?.data;
      if (!presign?.upload_url || !presign?.r2_key) throw new Error('Presign failed');
      const putRes = await fetch(presign.upload_url, {
        method: 'PUT',
        headers: presign.headers || { 'Content-Type': file.type || 'image/jpeg' },
        body: file,
      });
      if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`);
      await uploadsApi.confirm({ r2_key: presign.r2_key, content_type: file.type });
      setForm((p) => ({ ...p, [field]: presign.r2_key }));
    } catch (err) {
      setError(err.message || 'Photo upload failed');
    }
  };

  const handleSubmit = async () => {
    setError('');
    // Required-fields gate.
    const missing = [];
    if (!form.admission_date) missing.push('Date of Admission');
    if (!form.program_id) missing.push('Course');
    if (!form.mode_of_training) missing.push('Mode of Training');
    if (!form.center_id) missing.push('Center');
    if (!form.first_name?.trim()) missing.push('First Name');
    if (!form.last_name?.trim()) missing.push('Last Name');
    if (!form.email?.trim()) missing.push('Email');
    if (!form.whatsapp_number?.trim()) missing.push('WhatsApp');
    if (!form.total_fees) missing.push('Course Fees');
    if (missing.length) { setError(`Required: ${missing.join(', ')}`); return; }

    // Strip blank-string ids → undefined so backend zod doesn't reject.
    const payload = { ...form };
    for (const k of ['program_id', 'center_id', 'lead_id']) {
      if (!payload[k]) delete payload[k];
    }
    payload.total_fees = Number(form.total_fees);
    // Education rows: drop empty ones, coerce numbers.
    payload.education = form.education
      .filter((e) => e.examination?.trim())
      .map((e) => ({
        ...e,
        year_of_passing: e.year_of_passing ? Number(e.year_of_passing) : null,
        percentage: e.percentage ? Number(e.percentage) : null,
      }));

    setSubmitting(true);
    try {
      if (isEditMode) {
        await admissionsApi.update(editId, payload);
      } else {
        await admissionsApi.create(payload);
      }
      // Land back on the Approvals queue so the user immediately sees
      // their new row sitting in pending_approval.
      navigate('/accounts/approvals');
    } catch (e) {
      setError(e?.message || 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (hydrating) {
    return <div className="accounts-page"><div className="accounts-empty"><CircularProgress size={20} /></div></div>;
  }

  return (
    <div className="accounts-page">
      <div className="accounts-page-head">
        <div>
          <div className="accounts-page-title">
            {isEditMode ? 'Edit Admission' : 'Admission Form'}
          </div>
          <div className="accounts-page-subtitle">
            (*) Indicates required field.
            {form.lead_id && ' This admission is linked to an existing lead.'}
          </div>
        </div>
        <Button onClick={() => navigate(-1)} sx={{ textTransform: 'none' }}>Back</Button>
      </div>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <div className="accounts-table-card" style={{ padding: 18 }}>
        <Section title="Programme & Schedule">
          <Grid>
            <Field label="Date Of Admission *">
              <TextField type="date" value={form.admission_date} onChange={set('admission_date')} size="small" fullWidth />
            </Field>
            <Field label="Course *">
              <FormControl size="small" fullWidth>
                <Select value={form.program_id} onChange={set('program_id')} displayEmpty>
                  <MenuItem value=""><em>Select</em></MenuItem>
                  {(programs.data || []).filter((p) => p.is_active !== false).map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Field>
            <Field label="Mode Of Training *">
              <FormControl size="small" fullWidth>
                <Select value={form.mode_of_training} onChange={set('mode_of_training')} displayEmpty>
                  <MenuItem value=""><em>Select</em></MenuItem>
                  {TRAINING_MODES.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                </Select>
              </FormControl>
            </Field>
            <Field label="Center *">
              <FormControl size="small" fullWidth>
                <Select value={form.center_id} onChange={set('center_id')} displayEmpty>
                  <MenuItem value=""><em>Select</em></MenuItem>
                  {centers.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Field>
          </Grid>
        </Section>

        <Section title="Student Details">
          <Grid>
            <Field label="First Name *">
              <TextField value={form.first_name} onChange={set('first_name')} size="small" fullWidth />
            </Field>
            <Field label="Middle Name">
              <TextField value={form.middle_name} onChange={set('middle_name')} size="small" fullWidth />
            </Field>
            <Field label="Last Name *">
              <TextField value={form.last_name} onChange={set('last_name')} size="small" fullWidth />
            </Field>
            <Field label="Email *">
              <TextField type="email" value={form.email} onChange={set('email')} size="small" fullWidth />
            </Field>
            <Field label="WhatsApp Contact No *">
              <TextField value={form.whatsapp_number} onChange={set('whatsapp_number')} size="small" fullWidth />
            </Field>
            <Field label="Alt. Contact">
              <TextField value={form.alternate_contact} onChange={set('alternate_contact')} size="small" fullWidth />
            </Field>
          </Grid>
          <Field label="Address">
            <TextField value={form.address} onChange={set('address')} size="small" fullWidth multiline minRows={2} />
          </Field>
        </Section>

        <Section title="Highest Qualification *">
          <table className="accounts-table" style={{ background: '#fff' }}>
            <thead>
              <tr>
                <th>Examination</th>
                <th>Stream</th>
                <th>College</th>
                <th>Board / University</th>
                <th>Year</th>
                <th>Grade</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {form.education.map((row, idx) => (
                <tr key={idx}>
                  <td><TextField size="small" placeholder="B.E. / M.E. / ..." value={row.examination} onChange={setEdu(idx, 'examination')} fullWidth /></td>
                  <td><TextField size="small" placeholder="IT / E&TC" value={row.stream} onChange={setEdu(idx, 'stream')} fullWidth /></td>
                  <td><TextField size="small" value={row.college_name} onChange={setEdu(idx, 'college_name')} fullWidth /></td>
                  <td><TextField size="small" value={row.board_university} onChange={setEdu(idx, 'board_university')} fullWidth /></td>
                  <td><TextField size="small" type="number" value={row.year_of_passing} onChange={setEdu(idx, 'year_of_passing')} fullWidth /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
                      <TextField
                        size="small"
                        type="number"
                        value={row.percentage}
                        onChange={setEdu(idx, 'percentage')}
                        placeholder={row.grade_unit === 'cgpa' ? '0–10' : '0–100'}
                        fullWidth
                        inputProps={{
                          min: 0,
                          max: row.grade_unit === 'cgpa' ? 10 : 100,
                          step: row.grade_unit === 'cgpa' ? 0.01 : 'any',
                        }}
                      />
                      <select
                        value={row.grade_unit || 'percent'}
                        onChange={(e) => setEdu(idx, 'grade_unit')({ target: { value: e.target.value } })}
                        style={{
                          border: '1px solid #d1d5db', borderRadius: 4,
                          background: '#fff', fontSize: 12, padding: '0 6px',
                          color: '#475569', cursor: 'pointer', minWidth: 64,
                        }}
                        aria-label="Grade unit"
                      >
                        <option value="percent">%</option>
                        <option value="cgpa">CGPA</option>
                      </select>
                    </div>
                  </td>
                  <td>
                    <Tooltip title="Remove row">
                      <span>
                        <IconButton size="small" onClick={() => removeEdu(idx)} disabled={form.education.length === 1} sx={{ color: '#dc2626' }}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button onClick={addEdu} startIcon={<AddCircleOutlineIcon />} sx={{ mt: 1, textTransform: 'none' }}>
            Add qualification
          </Button>
        </Section>

        <Section title={feesReadOnly ? 'Fees (read-only)' : 'Fees'}>
          {feesReadOnly && (
            <div style={{
              background: '#fff7ed', border: '1px solid #fed7aa',
              borderRadius: 6, padding: '8px 12px', marginBottom: 10,
              fontSize: 12, color: '#9a3412',
            }}>
              Course fees are set by the admin / accounts team via the
              per-lead fee offer. Contact them if pricing needs to change.
            </div>
          )}
          <Grid>
            <Field label={`Course Fees${feesReadOnly ? '' : ' *'}`}>
              <TextField
                type="number"
                value={form.total_fees}
                onChange={set('total_fees')}
                size="small"
                fullWidth
                disabled={feesReadOnly}
                InputProps={{ readOnly: feesReadOnly }}
              />
            </Field>
            <Field label={`Mode Of Payment${feesReadOnly ? '' : ' *'}`}>
              <FormControl size="small" fullWidth disabled={feesReadOnly}>
                <Select
                  value={form.mode_of_payment}
                  onChange={set('mode_of_payment')}
                  readOnly={feesReadOnly}
                >
                  <MenuItem value="Installment">Installment</MenuItem>
                  <MenuItem value="Full">Full</MenuItem>
                </Select>
              </FormControl>
            </Field>
          </Grid>
        </Section>

        <Section title="Photo (optional)">
          {/* Single preview tile + two pick options. On a phone the
              "Take photo" input opens the front camera via
              capture="user"; on desktop browsers ignore the attribute
              and fall through to the regular file picker. Both options
              write to the same photo_r2_key — there's no real reason
              to keep selfie + passport as separate columns now that
              the public form already consolidated them. */}
          <PhotoSlot
            r2_key={form.photo_r2_key}
            onPick={uploadPhoto('photo_r2_key')}
            onClear={() => setForm((p) => ({ ...p, photo_r2_key: null }))}
          />
        </Section>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <Button onClick={() => navigate(-1)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting}
            sx={{ textTransform: 'none', bgcolor: 'var(--primary)' }}
          >
            {submitting ? 'Saving…' : (isEditMode ? 'Save Changes' : 'Submit Admission')}
          </Button>
        </div>
      </div>
    </div>
  );
};

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.04 }}>
      {title}
    </div>
    {children}
  </div>
);

const Grid = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 8 }}>
    {children}
  </div>
);

const Field = ({ label, children }) => (
  <div className="accounts-filter-field" style={{ minWidth: 0 }}>
    <span className="accounts-filter-label">{label}</span>
    {children}
  </div>
);

// One preview tile + two pick options (Take photo / Upload from gallery),
// both writing to the same r2_key. The capture="user" attribute on the
// camera input opens the front camera on mobile; desktop browsers
// ignore it and behave like a regular file picker, so the same two
// buttons work everywhere.
const PhotoSlot = ({ r2_key, onPick, onClear }) => {
  // Map r2_key → signed URL. Keyed on the value of r2_key itself so a
  // cleared key naturally drops the preview (no effect-driven setState
  // needed). The Map persists across re-renders via useState's lazy init.
  const [urlCache] = useState(() => new Map());
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!r2_key || urlCache.has(r2_key)) return undefined;
    let alive = true;
    uploadsApi.signedUrl(r2_key)
      .then((r) => {
        if (!alive) return;
        urlCache.set(r2_key, r?.data?.url || null);
        forceTick((n) => n + 1);
      })
      .catch(() => {
        if (!alive) return;
        urlCache.set(r2_key, null);
        forceTick((n) => n + 1);
      });
    return () => { alive = false; };
  }, [r2_key, urlCache]);
  const previewUrl = r2_key ? urlCache.get(r2_key) : null;
  return (
    <div className="admission-photo-block" style={{ alignItems: 'flex-start', gap: 16 }}>
      <div className="admission-photo-thumb" style={{ width: 120, height: 120 }}>
        {previewUrl
          ? <img src={previewUrl} alt="Uploaded photo" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#f1f5f9' }} />
          : <span>No photo</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="contained"
            component="label"
            startIcon={<PhotoCameraIcon />}
            size="small"
            sx={{ textTransform: 'none', bgcolor: 'var(--primary)' }}
          >
            Take photo
            <input
              type="file"
              accept="image/*"
              capture="user"
              hidden
              onChange={(e) => { onPick(e); e.target.value = ''; }}
            />
          </Button>
          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, letterSpacing: 0.5 }}>OR</span>
          <Button
            variant="outlined"
            component="label"
            startIcon={<UploadIcon />}
            size="small"
            sx={{ textTransform: 'none' }}
          >
            Upload from gallery
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => { onPick(e); e.target.value = ''; }}
            />
          </Button>
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>JPEG, PNG or WEBP.</div>
        {r2_key && onClear && (
          <Button
            size="small"
            startIcon={<DeleteOutlineIcon fontSize="small" />}
            onClick={onClear}
            sx={{ textTransform: 'none', color: '#dc2626', alignSelf: 'flex-start' }}
          >
            Remove photo
          </Button>
        )}
      </div>
    </div>
  );
};

export default NewAdmission;
