// Public, unauthenticated admission form. Mounted at /apply/:token.
//
// Renders its own minimal chrome — NOT wrapped in <Layout>, no sidebar,
// no auth bearer. The accounts user generates this URL from the Pending
// Admissions page (24h TTL, single-use) and shares it with the student.
//
// Field set mirrors the admin /accounts/new-admission form (Programme &
// Schedule, Student Details, Highest Qualification, Fees, Photos) so the
// student fills the same shape; the accounts team can still edit later.
//
// Layout: landscape / multi-column on desktop, collapses to one column
// on mobile. Tenant name + logo + brand color shown in the hero so the
// student instantly recognises the institution they're applying to.
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, Alert, CircularProgress,
  Select, MenuItem, FormControl, InputLabel, IconButton, Divider, Chip,
  Snackbar, useMediaQuery,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import UploadIcon from '@mui/icons-material/Upload';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { publicAdmissionsApi } from '../../lib/endpoints';

const blankEducation = () => ({
  examination: '', stream: '', college_name: '',
  board_university: '', year_of_passing: '', percentage: '',
  // Student picks the grade unit per qualification. '%' assumes 0–100;
  // 'cgpa' assumes 0–10. The number lives in `percentage` either way
  // (the column is reused — the unit tells you how to read it).
  grade_unit: 'percent',
});

const STAGES = {
  loading: 'loading',
  ready: 'ready',
  submitting: 'submitting',
  submitted: 'submitted',
  expired: 'expired',
  notFound: 'notFound',
  error: 'error',
};

const FALLBACK_PRIMARY = '#0F172A';
const TRAINING_MODES = ['Online', 'Offline', 'Hybrid'];
const PAYMENT_MODES = ['Installment', 'Full'];

export default function PublicAdmission() {
  const { token } = useParams();
  const [stage, setStage] = useState(STAGES.loading);
  const [errorMsg, setErrorMsg] = useState('');
  const [prefill, setPrefill] = useState(null);
  const [form, setForm] = useState(null);
  // Toast for validation/upload feedback. The student gets a clear,
  // transient nudge (e.g. "Upload your payment screenshot") on top of the
  // inline error strip in the footer.
  const [toast, setToast] = useState(null);
  const isNarrow = useMediaQuery('(max-width: 720px)');

  // Initial prefill fetch.
  useEffect(() => {
    let cancelled = false;
    publicAdmissionsApi.prefill(token)
      .then((r) => {
        if (cancelled) return;
        const data = r?.data || {};
        setPrefill(data);
        const lead = data.lead || {};
        // Seed fee fields from the offer (the student can't edit them).
        // If there's no offer (shouldn't happen — BE refuses to mint
        // tokens then — but defensively handle it), fall back to empty.
        const offer = data.offer || null;
        setForm({
          admission_date: new Date().toISOString().slice(0, 10),
          first_name: lead.first_name || '',
          middle_name: '',
          last_name: lead.last_name || '',
          email: lead.email || '',
          whatsapp_number: lead.whatsapp_number || lead.phone || '',
          alternate_contact: lead.alternate_contact || '',
          address: lead.address || '',
          // Program comes from the offer, not the lead. The offer is the
          // course the accounts team confirmed for this student. The
          // select is locked on-screen so the student can't change it.
          program_id: offer?.program_id || lead.program_id || '',
          // Pre-fill mode_of_training from the offer (set by accounts).
          // When the offer doesn't carry one (legacy offers), the field
          // unlocks so the student can pick — otherwise it stays locked.
          mode_of_training: offer?.mode_of_training || '',
          center_id: '',
          // Total fees mirror the offer (read-only).
          total_fees: offer?.course_fees != null ? String(offer.course_fees) : '',
          // Mode of payment seeds from the offer but the student CAN
          // change it on the form. Stored values are 'Full' (one-time)
          // or 'Installment'. UI labels say "Pay in Full" / "Pay in
          // Installments" for clarity.
          mode_of_payment: offer?.payment_mode === 'full' ? 'Full' : 'Installment',
          photo_r2_key: null,
          // Registration-amount payment proof. The student pays into the
          // account the accounts team bound to this link and proves it
          // here. Both are required to submit (backend enforces too).
          payment_proof_r2_key: null,
          payment_utr: '',
          education: [blankEducation()],
        });
        setStage(STAGES.ready);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.status === 410) setStage(STAGES.expired);
        else if (err?.status === 404) setStage(STAGES.notFound);
        else { setErrorMsg(err?.message || 'Could not load form'); setStage(STAGES.error); }
      });
    return () => { cancelled = true; };
  }, [token]);

  const accent = useMemo(() => {
    return prefill?.tenant?.brand_primary_color || FALLBACK_PRIMARY;
  }, [prefill]);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const setEdu = (idx, k) => (e) => {
    const v = e.target.value;
    setForm((p) => ({
      ...p,
      education: p.education.map((row, i) => {
        if (i !== idx) return row;
        const next = { ...row, [k]: v };
        // Grade-unit toggle: clamp/clear the value if it no longer fits
        // the new scale. e.g. flipping 85% → CGPA invalidates 85 (max 10).
        if (k === 'grade_unit') {
          const cap = v === 'cgpa' ? 10 : 100;
          const num = Number(next.percentage);
          if (next.percentage !== '' && !Number.isNaN(num) && num > cap) {
            next.percentage = '';
          }
        }
        // Percentage edit: clamp to unit-aware range. Negatives → '',
        // overshoot → snap back to the cap. Done as a string so the
        // user can type freely; only the final committed value is
        // bounded.
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
    education: p.education.length === 1
      ? p.education
      : p.education.filter((_, i) => i !== idx),
  }));

  // Per-photo-slot upload state. Keyed by form field so we could one day
  // have multiple slots (selfie + passport) without them sharing a
  // single global flag. Each entry is { active, percent } — null/absent
  // means the slot is idle.
  const [uploadProgress, setUploadProgress] = useState({});

  const uploadPhoto = (field) => async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');
    setUploadProgress((p) => ({ ...p, [field]: { active: true, percent: 0 } }));
    try {
      const ps = await publicAdmissionsApi.uploadPresign(token, {
        content_type: file.type || 'image/jpeg',
        size_bytes: file.size,
        filename: file.name,
      });
      const presign = ps?.data;
      if (!presign?.upload_url || !presign?.r2_key) throw new Error('Presign failed');
      // Use XHR for the PUT (instead of fetch) because it gives upload-
      // progress events out of the box. The percent drives the visible
      // bar/spinner; even a fast LAN upload pops to 100% briefly which
      // is the right cue that the file is on the wire.
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', presign.upload_url);
        const headers = presign.headers || { 'Content-Type': file.type || 'image/jpeg' };
        Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
        xhr.upload.onprogress = (ev) => {
          if (!ev.lengthComputable) return;
          const percent = Math.round((ev.loaded / ev.total) * 100);
          setUploadProgress((p) => ({ ...p, [field]: { active: true, percent } }));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed (${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error('Upload failed (network)'));
        xhr.send(file);
      });
      // PUT done; flip to indeterminate while the confirm round-trip
      // happens (usually <200ms but worth signalling so the bar doesn't
      // freeze at 100% without explanation).
      setUploadProgress((p) => ({ ...p, [field]: { active: true, percent: 100 } }));
      await publicAdmissionsApi.uploadConfirm(token, { r2_key: presign.r2_key });
      setForm((p) => ({ ...p, [field]: presign.r2_key }));
    } catch (err) {
      setErrorMsg(err?.message || 'Photo upload failed');
    } finally {
      setUploadProgress((p) => {
        const next = { ...p };
        delete next[field];
        return next;
      });
      // Allow re-picking the same file in case of error.
      if (e.target) e.target.value = '';
    }
  };

  const clearPhoto = (field) => () => setForm((p) => ({ ...p, [field]: null }));

  const submit = async () => {
    setErrorMsg('');
    const missing = [];
    if (!form.admission_date) missing.push('Date of Admission');
    if (!form.program_id) missing.push('Course');
    if (!form.mode_of_training) missing.push('Mode of Training');
    if (!form.center_id) missing.push('Center');
    if (!form.first_name?.trim()) missing.push('First Name');
    if (!form.last_name?.trim()) missing.push('Last Name');
    if (!form.email?.trim()) missing.push('Email');
    if (!form.whatsapp_number?.trim()) missing.push('WhatsApp Contact No');
    // Course Fees is pinned to the offer server-side. Mode of Payment is
    // student-editable but always seeded from the offer, so it can't be
    // missing either. No client-side validation needed for either.
    if (!form.photo_r2_key) missing.push('Photo');
    // Registration payment proof — both the screenshot and the UTR /
    // reference number are mandatory (backend enforces the same).
    if (!form.payment_proof_r2_key) missing.push('Payment screenshot');
    if (!form.payment_utr?.trim() || form.payment_utr.trim().length < 6) {
      missing.push('UTR / payment reference (min 6 chars)');
    }
    // At least one qualification with an examination filled is required.
    // The empty starter row counts as "not filled" — we need a real entry.
    const validEducationCount = (form.education || []).filter((e) => e.examination?.trim()).length;
    if (validEducationCount === 0) missing.push('At least one Qualification (Examination)');
    if (missing.length) {
      const msg = `Please complete: ${missing.join(', ')}`;
      setErrorMsg(msg);
      setToast({ severity: 'warning', msg });
      return;
    }

    setStage(STAGES.submitting);
    try {
      const payload = {
        admission_date: form.admission_date,
        first_name: form.first_name.trim(),
        middle_name: form.middle_name?.trim() || null,
        last_name: form.last_name?.trim() || null,
        email: form.email?.trim() || null,
        whatsapp_number: form.whatsapp_number.trim(),
        alternate_contact: form.alternate_contact?.trim() || null,
        address: form.address?.trim() || null,
        program_id: form.program_id || undefined,
        mode_of_training: form.mode_of_training || undefined,
        center_id: form.center_id || undefined,
        total_fees: Number(form.total_fees),
        mode_of_payment: form.mode_of_payment || null,
        photo_r2_key: form.photo_r2_key || null,
        // Registration-amount payment proof + the account the link was
        // bound to (chosen by the accounts team at link-generation time).
        payment_proof_r2_key: form.payment_proof_r2_key || null,
        payment_utr: form.payment_utr?.trim() || null,
        payment_account_id: prefill?.payment_account?.id || undefined,
        education: (form.education || [])
          .filter((e) => e.examination?.trim())
          .map((e) => ({
            ...e,
            year_of_passing: e.year_of_passing ? Number(e.year_of_passing) : null,
            percentage: e.percentage ? Number(e.percentage) : null,
          })),
      };
      await publicAdmissionsApi.submit(token, payload);
      setStage(STAGES.submitted);
    } catch (err) {
      if (err?.status === 410) setStage(STAGES.expired);
      else if (err?.status === 409) setStage(STAGES.submitted);
      else {
        setErrorMsg(err?.message || 'Submission failed');
        setStage(STAGES.ready);
      }
    }
  };

  // ---------- Stage-specific empty states ----------

  if (stage === STAGES.loading) {
    return (
      <Shell accent={accent}>
        <Centered>
          <CircularProgress sx={{ color: accent }} />
          <Typography sx={{ mt: 2, color: '#475569' }}>Loading admission form…</Typography>
        </Centered>
      </Shell>
    );
  }

  if (stage === STAGES.notFound) {
    return (
      <Shell accent={accent}>
        <Centered>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#0f172a' }}>Link not found</Typography>
          <Typography sx={{ color: '#475569', maxWidth: 440, textAlign: 'center' }}>
            The link you opened doesn’t match any active admission form.
            Please ask your counsellor to send you a fresh link.
          </Typography>
        </Centered>
      </Shell>
    );
  }

  if (stage === STAGES.expired) {
    return (
      <Shell accent={accent}>
        <Centered>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#0f172a' }}>Link expired</Typography>
          <Typography sx={{ color: '#475569', maxWidth: 480, textAlign: 'center' }}>
            This link is no longer valid. Please contact your counsellor and
            ask them to generate a new admission form link for you.
          </Typography>
        </Centered>
      </Shell>
    );
  }

  if (stage === STAGES.submitted) {
    return (
      <Shell accent={accent}>
        <Centered>
          <CheckCircleOutlineIcon sx={{ fontSize: 64, color: '#16a34a', mb: 1 }} />
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#16a34a' }}>Submitted</Typography>
          <Typography sx={{ color: '#475569', maxWidth: 480, textAlign: 'center' }}>
            Thank you. Your admission details have been received.
            The team will reach out to you with the next steps.
          </Typography>
        </Centered>
      </Shell>
    );
  }

  if (stage === STAGES.error) {
    return (
      <Shell accent={accent}>
        <Centered>
          <Alert severity="error">{errorMsg || 'Something went wrong'}</Alert>
        </Centered>
      </Shell>
    );
  }

  const tenantName = prefill?.tenant?.name || 'Admission Form';
  const logoUrl = prefill?.tenant?.logo_url || null;
  const programs = prefill?.programs || [];
  const centers = prefill?.centers || [];

  // ---------- Main form ----------
  return (
    <Shell accent={accent}>
      {/* Hero */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${accent} 0%, ${shade(accent, -20)} 100%)`,
          color: '#fff',
          py: { xs: 4, md: 6 },
          px: { xs: 3, md: 6 },
          borderBottom: `1px solid ${shade(accent, -30)}`,
        }}
      >
        <Box sx={{ maxWidth: 1100, mx: 'auto', display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
          {logoUrl ? (
            <Box
              component="img"
              src={logoUrl}
              alt={tenantName}
              sx={{
                width: 64, height: 64, borderRadius: 2, objectFit: 'cover',
                background: '#fff', p: 0.5, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            />
          ) : (
            <Box sx={{
              width: 64, height: 64, borderRadius: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.15)',
              fontSize: 28, fontWeight: 800, letterSpacing: 0.5,
            }}>
              {tenantName.slice(0, 2).toUpperCase()}
            </Box>
          )}
          <Box sx={{ flex: 1, minWidth: 240 }}>
            <Typography variant="overline" sx={{ opacity: 0.85, letterSpacing: 1.4, fontSize: 11 }}>
              Admission Application
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.15, mt: 0.5 }}>
              {tenantName}
            </Typography>
            <Typography sx={{ mt: 0.5, opacity: 0.85, maxWidth: 640 }}>
              Welcome. Please complete the form below — our team will follow up
              with payment details and next steps after you submit.
            </Typography>
          </Box>
          {/* Top-of-page advisory: this link expires + is single-use.
              Sits in the hero so the student sees it before filling
              anything in (was previously buried in the footer). */}
          <Chip
            icon={<LockOutlinedIcon sx={{ color: '#fff !important' }} />}
            label="This link expires in 24 hours · single-use"
            sx={{
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              fontWeight: 600,
              border: '1px solid rgba(255,255,255,0.3)',
              backdropFilter: 'blur(4px)',
              height: 32,
              fontSize: 12,
            }}
          />
        </Box>
      </Box>

      {/* Form card */}
      <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, md: 4 }, mt: { xs: -3, md: -4 }, mb: 4 }}>
        <Box
          sx={{
            background: '#fff',
            borderRadius: 3,
            border: '1px solid #e5e7eb',
            boxShadow: '0 20px 60px -20px rgba(15, 23, 42, 0.18)',
            overflow: 'hidden',
          }}
        >
          {/* Section: Programme & Schedule */}
          <SectionCard title="Programme & Schedule" subtitle="Course, mode and centre you’re applying for.">
            <GridRow cols={isNarrow ? 1 : 4}>
              <FieldDate
                label="Date of Admission"
                required
                value={form.admission_date}
                onChange={set('admission_date')}
                accent={accent}
              />
              <FieldSelect
                label="Course"
                required
                value={form.program_id || ''}
                onChange={set('program_id')}
                accent={accent}
                disabled
                helperText="Locked — confirmed with your counsellor."
                options={[{ value: '', label: 'Select' }, ...programs.map((p) => ({ value: p.id, label: p.name }))]}
              />
              <FieldSelect
                label="Mode of Training"
                required
                value={form.mode_of_training || ''}
                onChange={set('mode_of_training')}
                accent={accent}
                // Locked when accounts already set it on the offer. For
                // legacy offers without a mode, the student picks here.
                disabled={Boolean(prefill?.offer?.mode_of_training)}
                helperText={prefill?.offer?.mode_of_training ? 'Locked — set by your counsellor.' : ''}
                options={[{ value: '', label: 'Select' }, ...TRAINING_MODES.map((m) => ({ value: m, label: m }))]}
              />
              <FieldSelect
                label="Center"
                required
                value={form.center_id || ''}
                onChange={set('center_id')}
                accent={accent}
                options={[{ value: '', label: 'Select' }, ...centers.map((c) => ({ value: c.id, label: c.name }))]}
              />
            </GridRow>
          </SectionCard>

          <Divider />

          {/* Section: Student Details */}
          <SectionCard title="Student Details" subtitle="Tell us who you are.">
            <GridRow cols={isNarrow ? 1 : 3}>
              <FieldInput label="First Name" required value={form.first_name} onChange={set('first_name')} accent={accent} />
              <FieldInput label="Middle Name" value={form.middle_name} onChange={set('middle_name')} accent={accent} />
              <FieldInput label="Last Name" required value={form.last_name} onChange={set('last_name')} accent={accent} />
            </GridRow>
            <GridRow cols={isNarrow ? 1 : 3}>
              <FieldInput label="Email" required type="email" value={form.email} onChange={set('email')} accent={accent} />
              <FieldInput label="WhatsApp Contact No" required value={form.whatsapp_number} onChange={set('whatsapp_number')} accent={accent} />
              <FieldInput label="Alt. Contact" value={form.alternate_contact} onChange={set('alternate_contact')} accent={accent} />
            </GridRow>
            <GridRow cols={1}>
              <FieldInput label="Address" value={form.address} onChange={set('address')} accent={accent} multiline minRows={2} />
            </GridRow>
          </SectionCard>

          <Divider />

          {/* Section: Highest Qualification */}
          <SectionCard
            title="Highest Qualification"
            required
            subtitle="Add your most recent qualification(s)."
            action={
              <Button
                size="small"
                startIcon={<AddCircleOutlineIcon />}
                onClick={addEdu}
                sx={{ textTransform: 'none', color: accent, fontWeight: 600 }}
              >
                Add qualification
              </Button>
            }
          >
            <Box sx={{ overflowX: 'auto' }}>
              <Box
                component="table"
                sx={{
                  width: '100%',
                  borderCollapse: 'separate',
                  borderSpacing: 0,
                  fontSize: 13,
                  '& th': {
                    textAlign: 'left',
                    fontWeight: 700,
                    color: '#475569',
                    background: '#f8fafc',
                    padding: '10px 12px',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                    borderBottom: '1px solid #e5e7eb',
                  },
                  '& td': {
                    padding: '8px 12px',
                    verticalAlign: 'top',
                    borderBottom: '1px solid #f1f5f9',
                  },
                  '& tr:last-of-type td': { borderBottom: 'none' },
                }}
              >
                <thead>
                  <tr>
                    <th>Examination</th>
                    <th>Stream</th>
                    <th>College</th>
                    <th>Board / University</th>
                    <th>Year</th>
                    <th>Grade</th>
                    <th aria-label="actions" style={{ width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {form.education.map((row, idx) => (
                    <tr key={idx}>
                      <td><CompactInput value={row.examination} onChange={setEdu(idx, 'examination')} placeholder="B.E. / M.E. / ..." accent={accent} /></td>
                      <td><CompactInput value={row.stream} onChange={setEdu(idx, 'stream')} placeholder="IT / E&TC" accent={accent} /></td>
                      <td><CompactInput value={row.college_name} onChange={setEdu(idx, 'college_name')} accent={accent} /></td>
                      <td><CompactInput value={row.board_university} onChange={setEdu(idx, 'board_university')} accent={accent} /></td>
                      <td><CompactInput value={row.year_of_passing} onChange={setEdu(idx, 'year_of_passing')} type="number" accent={accent} /></td>
                      <td>
                        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'stretch', minWidth: 140 }}>
                          <CompactInput
                            value={row.percentage}
                            onChange={setEdu(idx, 'percentage')}
                            type="number"
                            placeholder={row.grade_unit === 'cgpa' ? '0–10' : '0–100'}
                            accent={accent}
                            inputProps={{
                              min: 0,
                              max: row.grade_unit === 'cgpa' ? 10 : 100,
                              step: row.grade_unit === 'cgpa' ? 0.01 : 'any',
                            }}
                          />
                          <Box
                            component="select"
                            value={row.grade_unit || 'percent'}
                            onChange={(e) => setEdu(idx, 'grade_unit')({ target: { value: e.target.value } })}
                            sx={{
                              border: '1px solid #e2e8f0',
                              borderRadius: 1.5,
                              background: '#fff',
                              fontSize: 12,
                              px: 1,
                              minWidth: 64,
                              color: '#475569',
                              cursor: 'pointer',
                            }}
                            aria-label="Grade unit"
                          >
                            <option value="percent">%</option>
                            <option value="cgpa">CGPA</option>
                          </Box>
                        </Box>
                      </td>
                      <td>
                        <IconButton
                          size="small"
                          onClick={() => removeEdu(idx)}
                          disabled={form.education.length === 1}
                          sx={{ color: '#dc2626' }}
                          aria-label="remove row"
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Box>
            </Box>
          </SectionCard>

          <Divider />

          {/* Section: Fees — read-only mirror of the offer the accounts
              team configured for this lead. Layout matches the spec
              screenshot: Course Fees + Mode of Payment on top, then a
              registration row, then the installment breakup table. */}
          <FeesOfferSection
            offer={prefill?.offer}
            accent={accent}
            isNarrow={isNarrow}
            modeOfPayment={form.mode_of_payment}
            onChangeModeOfPayment={(v) => setForm((p) => ({ ...p, mode_of_payment: v }))}
          />

          <Divider />

          {/* Section: Payment. Read-only display of the ONE account the
              accounts team bound to this link, plus the student's required
              proof (screenshot + UTR). The student cannot edit the account
              details — only pay into them and prove it. */}
          <SectionCard
            title="Payment"
            required
            subtitle="Pay the amount shown into the account below, then upload your payment screenshot and reference number."
          >
            <PaymentSection
              account={prefill?.payment_account}
              registrationAmount={prefill?.offer?.pay_now_amount ?? prefill?.offer?.registration_amount}
              accent={accent}
              token={token}
              isNarrow={isNarrow}
              proofKey={form.payment_proof_r2_key}
              utr={form.payment_utr}
              onUtrChange={set('payment_utr')}
              onPick={uploadPhoto('payment_proof_r2_key')}
              onClear={clearPhoto('payment_proof_r2_key')}
              upload={uploadProgress.payment_proof_r2_key}
              onCopyToast={(msg) => setToast({ severity: 'success', msg })}
            />
          </SectionCard>

          <Divider />

          {/* Section: Photo. Single slot with two ways to pick — take a
              selfie with the camera, or pick an existing file. Either
              source writes to the same photo_r2_key. */}
          <SectionCard title="Photo" required subtitle="Take a selfie or upload a passport photo from your device.">
            <PhotoSlot
              accent={accent}
              token={token}
              r2_key={form.photo_r2_key}
              onPick={uploadPhoto('photo_r2_key')}
              onClear={clearPhoto('photo_r2_key')}
              upload={uploadProgress.photo_r2_key}
            />
          </SectionCard>

          {/* Footer */}
          <Box
            sx={{
              borderTop: '1px solid #e5e7eb',
              background: '#f8fafc',
              px: { xs: 3, md: 4 },
              py: 2.5,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            {errorMsg && (
              <Alert severity="error" sx={{ flex: 1, minWidth: 280 }}>
                {errorMsg}
              </Alert>
            )}
            {/* Spacer to push the Submit button to the right edge when
                there's no error message in the footer. */}
            {!errorMsg && <Box sx={{ flex: 1 }} />}
            <Button
              variant="contained"
              size="large"
              onClick={submit}
              disabled={stage === STAGES.submitting}
              sx={{
                background: accent,
                textTransform: 'none',
                fontWeight: 700,
                px: 4,
                py: 1.2,
                borderRadius: 2,
                boxShadow: `0 6px 16px -6px ${withAlpha(accent, 0.5)}`,
                '&:hover': { background: shade(accent, -10), boxShadow: `0 8px 22px -6px ${withAlpha(accent, 0.55)}` },
                '&.Mui-disabled': { background: accent, opacity: 0.6, color: '#fff' },
              }}
            >
              {stage === STAGES.submitting ? 'Submitting…' : 'Submit Admission'}
            </Button>
          </Box>
        </Box>

        <Typography variant="caption" sx={{ display: 'block', mt: 3, textAlign: 'center', color: '#94a3b8' }}>
          Submitted via {tenantName} · Admission Portal
        </Typography>
      </Box>

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity={toast.severity || 'info'} variant="filled" onClose={() => setToast(null)} sx={{ maxWidth: 460 }}>
            {toast.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Shell>
  );
}

/* ---------- Photo slot with signed-URL preview ---------- */

// Single-slot photo picker with two equally-prominent ways to add a
// photo: take a selfie with the device camera (capture="user") OR pick
// an existing file from the gallery. Both writes go through the same
// onPick handler — only one photo is stored on the admission row.
function PhotoSlot({ accent, token, r2_key, onPick, onClear, upload }) {
  const uploading = Boolean(upload?.active);
  const percent = upload?.percent ?? 0;
  // r2_key → signed URL. Fetched once per key; on clear the preview disappears.
  const [urlByKey, setUrlByKey] = useState({});
  const previewUrl = r2_key ? urlByKey[r2_key] : null;
  useEffect(() => {
    if (!r2_key || urlByKey[r2_key]) return undefined;
    let alive = true;
    publicAdmissionsApi.signedUrl(token, r2_key)
      .then((r) => {
        if (!alive) return;
        const url = r?.data?.url;
        if (url) setUrlByKey((m) => ({ ...m, [r2_key]: url }));
      })
      .catch(() => { /* preview is best-effort */ });
    return () => { alive = false; };
  }, [r2_key, token, urlByKey]);

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 3,
        flexWrap: 'wrap',
        alignItems: 'stretch',
        background: '#fff',
        border: `1.5px dashed ${r2_key ? withAlpha(accent, 0.4) : '#cbd5e1'}`,
        borderRadius: 2,
        p: 2,
        transition: 'border-color 120ms',
      }}
    >
      {/* Preview tile */}
      <Box
        sx={{
          width: 180,
          height: 180,
          flexShrink: 0,
          borderRadius: 2,
          background: '#f1f5f9',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {previewUrl ? (
          <Box component="img" src={previewUrl} alt="Uploaded photo" sx={{ width: '100%', height: '100%', objectFit: 'contain', background: '#f1f5f9' }} />
        ) : r2_key ? (
          <CircularProgress size={22} sx={{ color: accent }} />
        ) : (
          <Box sx={{ textAlign: 'center', color: '#94a3b8' }}>
            <PhotoCameraIcon sx={{ fontSize: 36, opacity: 0.6 }} />
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>No photo yet</Typography>
          </Box>
        )}
        {/* Upload-in-progress overlay. Sits on top of whatever the tile
            is currently showing (empty placeholder, signed-URL spinner,
            or preview being replaced) so the student gets immediate
            feedback the file is going up. */}
        {uploading && (
          <Box
            sx={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 1,
              background: 'rgba(15, 23, 42, 0.55)', color: '#fff',
            }}
          >
            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
              <CircularProgress
                variant={percent >= 100 ? 'indeterminate' : 'determinate'}
                value={percent}
                size={48}
                sx={{ color: '#fff' }}
              />
              <Box
                sx={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                }}
              >
                {percent < 100 ? `${percent}%` : '…'}
              </Box>
            </Box>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {percent < 100 ? 'Uploading…' : 'Finalising…'}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Pick controls — two paths, with an "OR" divider between them */}
      <Box sx={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1.5 }}>
        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, fontSize: 10.5 }}>
          {r2_key ? 'Replace your photo' : 'Add your photo'}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'stretch', gap: 1.5, flexWrap: 'wrap' }}>
          {/* Take photo — opens the front camera on mobile via capture="user" */}
          <Button
            component="label"
            htmlFor="photo-camera"
            size="medium"
            startIcon={uploading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <PhotoCameraIcon />}
            variant="contained"
            disabled={uploading}
            sx={{
              textTransform: 'none', fontWeight: 600, px: 2,
              background: accent, color: '#fff',
              boxShadow: 'none',
              '&:hover': { background: shade(accent, -10), boxShadow: 'none' },
            }}
          >
            {uploading ? 'Uploading…' : 'Take photo'}
            <input
              id="photo-camera"
              type="file"
              accept="image/*"
              capture="user"
              onChange={onPick}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </Button>

          {/* "OR" divider — visible between the two pick options */}
          <Box sx={{ display: 'flex', alignItems: 'center', color: '#94a3b8', fontSize: 11, fontWeight: 700, letterSpacing: 1, px: 0.5 }}>
            OR
          </Box>

          {/* Upload from gallery / files */}
          <Button
            component="label"
            htmlFor="photo-gallery"
            size="medium"
            startIcon={uploading ? <CircularProgress size={16} sx={{ color: accent }} /> : <UploadIcon />}
            variant="outlined"
            disabled={uploading}
            sx={{
              textTransform: 'none', fontWeight: 600, px: 2,
              borderColor: '#e2e8f0', color: accent,
              '&:hover': { borderColor: accent, background: withAlpha(accent, 0.06) },
            }}
          >
            {uploading ? 'Uploading…' : 'Upload from gallery'}
            <input
              id="photo-gallery"
              type="file"
              accept="image/*"
              onChange={onPick}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </Button>
        </Box>

        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
          JPEG, PNG or WEBP. Up to 5 MB.
        </Typography>

        {r2_key && (
          <Button
            size="small"
            startIcon={<DeleteOutlineIcon fontSize="small" />}
            onClick={onClear}
            sx={{
              alignSelf: 'flex-start',
              textTransform: 'none',
              color: '#dc2626',
              mt: 0.5,
              '&:hover': { background: 'rgba(220,38,38,0.06)' },
            }}
          >
            Remove photo
          </Button>
        )}
      </Box>
    </Box>
  );
}

/* ---------- Shell + helpers ---------- */

// Fees offer block — student-facing, read-only. Mirrors the layout from
// the product spec screenshot: course fees + mode on top, then a
// registration row, then a 4-column installments table when applicable.
// All values come from the BE-resolved `offer` payload; no inputs.
function FeesOfferSection({ offer, accent, isNarrow, modeOfPayment, onChangeModeOfPayment }) {
  if (!offer) {
    // Defensive: BE refuses to mint a link without an offer, so this
    // branch shouldn't happen — but render a graceful note rather than
    // silently dropping the section.
    return (
      <SectionCard title="Fees" subtitle="Pending — please contact your counsellor for the fee plan.">
        <Box sx={{ color: '#94a3b8', fontSize: 13 }}>No fee details on file for this application yet.</Box>
      </SectionCard>
    );
  }
  // The OFFER's installment plan is what accounts configured. The
  // STUDENT chooses whether to actually go installment or pay in full
  // — `modeOfPayment` is the live form value, defaulted to the offer's
  // mode but flippable.
  const offerHasInstallments = offer.payment_mode === 'installment';
  const studentInstallment = modeOfPayment === 'Installment';
  // Show the installment table only when both: the offer carries a
  // plan AND the student opted into it. Picking "Pay in Full" hides
  // the schedule (mirrors the BE drop on submit).
  const showInstallments = offerHasInstallments && studentInstallment;
  const fmtMoney = (n) => (n != null ? Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—');
  const fmtDate = (v) => {
    if (!v) return '—';
    try { return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return '—'; }
  };
  // Pad installments to a fixed visual width of 4 columns so the layout
  // stays consistent with the screenshot regardless of count.
  const installments = Array.isArray(offer.fee_installments) ? offer.fee_installments : [];
  const padded = [1, 2, 3, 4].map((n) => installments.find((r) => Number(r.installment_no) === n) || null);

  return (
    <SectionCard title="Fees" subtitle="Approved by your counsellor. Choose how you'd like to pay.">
      {/* Top row: course fees (read-only) + mode of payment (student-editable
          when the offer has an installment plan to opt out of). */}
      <GridRow cols={isNarrow ? 1 : 2}>
        <ReadOnlyField label="Course Fees" value={fmtMoney(offer.course_fees)} accent={accent} />
        {offerHasInstallments ? (
          <FieldSelect
            label="Mode of Payment"
            required
            value={modeOfPayment || 'Installment'}
            onChange={(e) => onChangeModeOfPayment?.(e.target.value)}
            accent={accent}
            options={[
              { value: 'Full', label: 'Pay in Full' },
              { value: 'Installment', label: 'Pay in Installments' },
            ]}
          />
        ) : (
          // Offer is Full-only — no installment plan to pick into, so
          // we keep this read-only to avoid implying a choice exists.
          <ReadOnlyField label="Mode of Payment" value="Pay in Full" accent={accent} />
        )}
      </GridRow>

      {/* Registration row — only shown when there's a non-zero registration */}
      {Number(offer.registration_amount) > 0 && (
        <Box sx={{
          mt: 1.5, p: 2, borderRadius: 1.5, border: '1px solid #e5e7eb', background: '#fafafa',
          display: 'grid',
          gridTemplateColumns: isNarrow ? '1fr' : '160px 1fr 160px 1fr',
          gap: 2, alignItems: 'center',
        }}>
          <Box sx={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Registration Amount</Box>
          <Box sx={{ fontSize: 14, color: '#0f172a' }}>{fmtMoney(offer.registration_amount)}</Box>
          <Box sx={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Date of Registration</Box>
          <Box sx={{ fontSize: 14, color: '#0f172a' }}>{fmtDate(offer.registration_date)}</Box>
        </Box>
      )}

      {/* Installment table — matches the screenshot 1st/2nd/3rd/4th
          headers. Hidden when the student picks "Pay in Full" (the
          offer's plan no longer applies in that case). */}
      {showInstallments && (
        <Box sx={{ mt: 1.5, border: '1px solid #e5e7eb', borderRadius: 1.5, overflow: 'hidden' }}>
          <Box sx={{ overflowX: 'auto' }}>
            <Box component="table" sx={{
              width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13,
              '& th': { textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: '#475569', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' },
              '& td': { padding: '10px 12px', verticalAlign: 'middle', borderBottom: '1px solid #f1f5f9' },
              '& tr:last-of-type td': { borderBottom: 'none' },
            }}>
              <thead>
                <tr>
                  <th style={{ width: 160 }} />
                  <th>1st Installment</th>
                  <th>2nd Installment</th>
                  <th>3rd Installment</th>
                  <th>4th Installment</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 600, color: '#374151' }}>Fees Payment Breakup</td>
                  {padded.map((r, idx) => (
                    <td key={`amt-${idx}`} style={{ color: '#0f172a' }}>{r ? fmtMoney(r.amount) : '—'}</td>
                  ))}
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, color: '#374151' }}>Date of Installments</td>
                  {padded.map((r, idx) => (
                    <td key={`date-${idx}`} style={{ color: '#475569' }}>{r ? fmtDate(r.due_date) : '—'}</td>
                  ))}
                </tr>
              </tbody>
            </Box>
          </Box>
        </Box>
      )}
    </SectionCard>
  );
}

// One labelled, copyable account detail row (account number, IFSC, UPI…).
// Top-level (not nested in PaymentSection) so it isn't recreated on every
// render. Renders nothing when the value is empty.
function PayCopyRow({ label, value, accent, onCopy }) {
  if (!value) return null;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
      <Box sx={{ width: 140, flexShrink: 0, fontSize: 12, color: '#64748b', fontWeight: 600 }}>{label}</Box>
      <Box sx={{ flex: 1, fontSize: 14, color: '#0f172a', wordBreak: 'break-all' }}>{value}</Box>
      <IconButton size="small" onClick={() => onCopy?.(value, label)} aria-label={`Copy ${label}`} sx={{ color: accent }}>
        <ContentCopyIcon sx={{ fontSize: 15 }} />
      </IconButton>
    </Box>
  );
}

// Payment section — read-only account the link is bound to + the
// student's required proof (screenshot + UTR). The account details are
// display-only; the student pays into them off-platform and proves it.
function PaymentSection({
  account, registrationAmount, accent, token, isNarrow,
  proofKey, utr, onUtrChange, onPick, onClear, upload, onCopyToast,
}) {
  const uploading = Boolean(upload?.active);
  const percent = upload?.percent ?? 0;
  const fmtMoney = (n) => (n != null ? `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : null);

  // Signed-URL preview for the uploaded proof (token-scoped). Keyed by
  // r2_key so clearing the proof (key → null) naturally yields no preview
  // without a synchronous setState in the effect body.
  const [proofUrlByKey, setProofUrlByKey] = useState({});
  const proofUrl = proofKey ? proofUrlByKey[proofKey] : null;
  useEffect(() => {
    if (!proofKey || proofUrlByKey[proofKey]) return undefined;
    let alive = true;
    publicAdmissionsApi.signedUrl(token, proofKey)
      .then((r) => {
        const url = r?.data?.url;
        if (alive && url) setProofUrlByKey((m) => ({ ...m, [proofKey]: url }));
      })
      .catch(() => { /* preview is best-effort */ });
    return () => { alive = false; };
  }, [proofKey, token, proofUrlByKey]);

  const copy = (value, label) => {
    if (!value) return;
    try {
      navigator.clipboard?.writeText(String(value));
      onCopyToast?.(`${label} copied`);
    } catch { /* clipboard may be blocked; ignore */ }
  };

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '1.1fr 1fr', gap: 2.5 }}>
      {/* LEFT: the bound account (read-only) + amount callout */}
      <Box>
        {registrationAmount != null && Number(registrationAmount) > 0 && (
          <Box sx={{
            mb: 2, p: 2, borderRadius: 1.5,
            border: `1px solid ${withAlpha(accent, 0.35)}`, background: withAlpha(accent, 0.06),
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap',
          }}>
            <Box sx={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Amount to pay now (Registration)</Box>
            <Box sx={{ fontSize: 22, fontWeight: 800, color: accent }}>{fmtMoney(registrationAmount)}</Box>
          </Box>
        )}

        {account ? (
          <Box sx={{ border: '1px solid #e5e7eb', borderRadius: 1.5, p: 2, background: '#fafafa' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: '#334155', fontWeight: 700, fontSize: 13 }}>
              <AccountBalanceIcon sx={{ fontSize: 18, color: accent }} />
              Pay into this account
              {account.label && <Chip size="small" label={account.label} sx={{ height: 20, fontSize: 10, ml: 0.5 }} />}
            </Box>

            {/* Bank block */}
            {account.account_number && (
              <Box sx={{ mb: account.upi_id || account.qr_url ? 1.5 : 0 }}>
                <PayCopyRow label="Account holder" value={account.account_holder_name} accent={accent} onCopy={copy} />
                <PayCopyRow label="Account number" value={account.account_number} accent={accent} onCopy={copy} />
                <PayCopyRow label="IFSC" value={account.ifsc} accent={accent} onCopy={copy} />
                {account.bank_name && <PayCopyRow label="Bank" value={[account.bank_name, account.branch].filter(Boolean).join(' · ')} accent={accent} onCopy={copy} />}
                {account.account_type && <PayCopyRow label="Type" value={account.account_type} accent={accent} onCopy={copy} />}
              </Box>
            )}

            {/* UPI block */}
            {account.upi_id && (
              <Box sx={{ pt: account.account_number ? 1.5 : 0, borderTop: account.account_number ? '1px dashed #e2e8f0' : 'none' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5, color: '#334155', fontWeight: 600, fontSize: 12 }}>
                  <QrCode2Icon sx={{ fontSize: 16, color: accent }} /> UPI
                </Box>
                <PayCopyRow label="UPI ID" value={account.upi_id} accent={accent} onCopy={copy} />
              </Box>
            )}

            {/* QR image */}
            {account.qr_url && (
              <Box sx={{ pt: 1.5, mt: 1, borderTop: '1px dashed #e2e8f0', textAlign: 'center' }}>
                <Box sx={{ fontSize: 12, color: '#64748b', fontWeight: 600, mb: 1 }}>Scan to pay</Box>
                <Box
                  component="img" src={account.qr_url} alt="Payment QR"
                  sx={{ width: 160, height: 160, objectFit: 'contain', borderRadius: 1.5, border: '1px solid #e5e7eb', background: '#fff', p: 0.5 }}
                />
              </Box>
            )}
          </Box>
        ) : (
          <Alert severity="info" sx={{ fontSize: 13 }}>
            Payment account details aren’t available on this link yet. Please contact your counsellor for where to pay.
          </Alert>
        )}
      </Box>

      {/* RIGHT: the student's proof — screenshot + UTR */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box>
          <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, fontSize: 10.5 }}>
            Payment screenshot<RequiredMark />
          </Typography>
          <Box sx={{
            mt: 1, border: `1.5px dashed ${proofKey ? withAlpha(accent, 0.4) : '#cbd5e1'}`,
            borderRadius: 2, p: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap',
          }}>
            <Box sx={{
              width: 120, height: 120, flexShrink: 0, borderRadius: 1.5, background: '#f1f5f9',
              overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {proofUrl ? (
                <Box component="img" src={proofUrl} alt="Payment proof" sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : proofKey ? (
                <CircularProgress size={20} sx={{ color: accent }} />
              ) : (
                <UploadIcon sx={{ fontSize: 30, color: '#94a3b8' }} />
              )}
              {uploading && (
                <Box sx={{
                  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 0.5,
                  background: 'rgba(15,23,42,0.55)', color: '#fff',
                }}>
                  <CircularProgress variant={percent >= 100 ? 'indeterminate' : 'determinate'} value={percent} size={36} sx={{ color: '#fff' }} />
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>{percent < 100 ? `${percent}%` : '…'}</Typography>
                </Box>
              )}
            </Box>
            <Box sx={{ flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                component="label" size="medium" variant="contained" disabled={uploading}
                startIcon={uploading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <UploadIcon />}
                sx={{ textTransform: 'none', fontWeight: 600, background: accent, boxShadow: 'none',
                  '&:hover': { background: shade(accent, -10), boxShadow: 'none' } }}
              >
                {uploading ? 'Uploading…' : proofKey ? 'Replace screenshot' : 'Upload screenshot'}
                <input type="file" accept="image/*" onChange={onPick} disabled={uploading} style={{ display: 'none' }} />
              </Button>
              {proofKey && !uploading && (
                <Button size="small" startIcon={<DeleteOutlineIcon fontSize="small" />} onClick={onClear}
                  sx={{ alignSelf: 'flex-start', textTransform: 'none', color: '#dc2626' }}>
                  Remove
                </Button>
              )}
              <Typography variant="caption" sx={{ color: '#94a3b8' }}>JPEG, PNG or WEBP. Up to 5 MB.</Typography>
            </Box>
          </Box>
        </Box>

        <TextField
          label={<>UTR / Payment Reference No.<RequiredMark /></>}
          value={utr || ''}
          onChange={onUtrChange}
          size="small"
          fullWidth
          placeholder="e.g. 4012 3456 7890 or UPI ref"
          InputLabelProps={{ shrink: true }}
          helperText="The reference number from your bank / UPI app (min 6 characters)."
          sx={fieldSx(accent)}
        />
      </Box>
    </Box>
  );
}

// Read-only labelled value rendered like an input box. Used inside
// FeesOfferSection so the locked fields visually echo the editable
// ones above them.
function ReadOnlyField({ label, value, accent }) {
  return (
    <Box sx={{ position: 'relative' }}>
      <Box component="label" sx={{
        position: 'absolute', top: -8, left: 10, px: 0.5,
        background: '#fff', color: accent || '#475569',
        fontSize: 11, fontWeight: 600, letterSpacing: 0.2, zIndex: 1,
      }}>
        {label}
      </Box>
      <Box sx={{
        width: '100%', height: 40, px: 1.25, display: 'flex', alignItems: 'center',
        fontSize: 14, color: '#0f172a',
        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 1.5,
      }}>
        {value || '—'}
      </Box>
    </Box>
  );
}

function Shell({ accent, children }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#f1f5f9',
        '--primary': accent,
        '--primary-dark': shade(accent, -15),
        '--primary-light': withAlpha(accent, 0.08),
        fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {children}
    </Box>
  );
}

function Centered({ children }) {
  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', p: 3,
    }}>
      {children}
    </Box>
  );
}

function SectionCard({ title, subtitle, action, required, children }) {
  return (
    <Box sx={{ px: { xs: 3, md: 4 }, py: { xs: 3, md: 3.5 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="overline" sx={{ color: '#94a3b8', letterSpacing: 1.2, fontSize: 10.5, fontWeight: 700 }}>
            {title}{required && <RequiredMark />}
          </Typography>
          {subtitle && (
            <Typography sx={{ color: '#475569', fontSize: 13, mt: 0.25 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {action}
      </Box>
      {children}
    </Box>
  );
}

function GridRow({ cols = 2, children }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap: 2,
        mb: 2,
        '&:last-of-type': { mb: 0 },
      }}
    >
      {children}
    </Box>
  );
}

// Red asterisk used everywhere a field is required. Keeping it as a
// single source of truth means the color + size stay consistent.
function RequiredMark() {
  return (
    <Box component="span" sx={{ color: '#dc2626', ml: 0.4, fontWeight: 700 }}>
      *
    </Box>
  );
}

function labelWithRequired(label, required) {
  return required ? <>{label}<RequiredMark /></> : label;
}

function FieldInput({ label, value, onChange, type = 'text', accent, multiline, minRows, required }) {
  return (
    <TextField
      label={labelWithRequired(label, required)}
      value={value}
      onChange={onChange}
      type={type}
      size="small"
      fullWidth
      multiline={multiline}
      minRows={minRows}
      InputLabelProps={{ shrink: true }}
      sx={fieldSx(accent)}
    />
  );
}

// Native <input type="date"> wrapped in the same outlined-card chrome so
// the look matches FieldInput. We use a native input here — not MUI's
// TextField type="date" — because MUI's input layout swallows the
// browser's calendar picker icon click target on Chrome, which made
// the field appear inert ("disabled-looking"). The label is rendered
// alongside, not floating, since the native input already shows its
// own value text without any shrink interaction.
function FieldDate({ label, value, onChange, accent, required }) {
  return (
    <Box sx={{ position: 'relative' }}>
      <Typography
        component="label"
        sx={{
          position: 'absolute',
          top: -8,
          left: 10,
          px: 0.5,
          background: '#fff',
          color: '#475569',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 0.2,
          zIndex: 1,
        }}
      >
        {label}{required && <RequiredMark />}
      </Typography>
      <Box
        component="input"
        type="date"
        value={value || ''}
        onChange={onChange}
        sx={{
          width: '100%',
          height: 40,
          px: 1.25,
          fontFamily: 'inherit',
          fontSize: 14,
          color: '#0f172a',
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 1.5,
          outline: 'none',
          transition: 'border-color 120ms, box-shadow 120ms',
          '&:hover': { borderColor: '#cbd5e1' },
          '&:focus': {
            borderColor: accent,
            boxShadow: `0 0 0 3px ${withAlpha(accent, 0.12)}`,
          },
          // Make sure the native calendar picker icon stays clickable.
          '&::-webkit-calendar-picker-indicator': {
            cursor: 'pointer',
            filter: 'invert(0.3)',
          },
        }}
      />
    </Box>
  );
}

function FieldSelect({ label, value, onChange, options, accent, required, disabled, helperText }) {
  const rendered = labelWithRequired(label, required);
  return (
    <FormControl size="small" fullWidth sx={fieldSx(accent)} disabled={disabled}>
      <InputLabel shrink>{rendered}</InputLabel>
      <Select label={rendered} value={value} onChange={onChange} displayEmpty notched disabled={disabled}>
        {options.map((o) => (
          <MenuItem key={`${o.value}::${o.label}`} value={o.value}>{o.label}</MenuItem>
        ))}
      </Select>
      {helperText ? (
        <Box sx={{ fontSize: 11, color: '#94a3b8', mt: 0.5, ml: 0.5 }}>{helperText}</Box>
      ) : null}
    </FormControl>
  );
}

function CompactInput({ value, onChange, placeholder, type = 'text', accent, inputProps }) {
  return (
    <TextField
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      type={type}
      size="small"
      fullWidth
      variant="outlined"
      inputProps={inputProps}
      sx={{
        ...fieldSx(accent),
        '& .MuiOutlinedInput-root': {
          background: '#fff',
          fontSize: 13,
        },
      }}
    />
  );
}

const fieldSx = (accent) => ({
  '& .MuiOutlinedInput-root': {
    background: '#fff',
    borderRadius: 1.5,
    transition: 'box-shadow 120ms, border-color 120ms',
    '& fieldset': { borderColor: '#e2e8f0' },
    '&:hover fieldset': { borderColor: '#cbd5e1' },
    '&.Mui-focused fieldset': { borderColor: accent, borderWidth: 1.5 },
    '&.Mui-focused': { boxShadow: `0 0 0 3px ${withAlpha(accent, 0.12)}` },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: accent },
});

/* ---------- Color helpers ---------- */

function withAlpha(hex, alpha) {
  const { r, g, b } = hexToRgb(hex) || { r: 0, g: 0, b: 0 };
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function shade(hex, amount) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const f = amount / 100;
  const adj = (c) => {
    const target = f < 0 ? 0 : 255;
    return Math.round(c + (target - c) * Math.abs(f));
  };
  return rgbToHex(adj(rgb.r), adj(rgb.g), adj(rgb.b));
}

function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return null;
  const m = hex.replace('#', '').match(/^([\da-f]{6}|[\da-f]{3})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

function rgbToHex(r, g, b) {
  const to = (n) => n.toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}
