// Per-admission detail page — read view + receipt management.
//
// Sections:
//   1. Header with name, status, primary actions (Edit / Verify & Approve).
//   2. KPI strip: total / paid / pending.
//   3. Photo + identity + address + counsellor/manager/source.
//   4. Education table.
//   5. Fee schedule: per-installment row with paid status + receipt link.
//      Registration shown above the installment table when present.
//   6. Receipts table with public share-link + view buttons.
//
// Receipts can be tagged to a specific installment slot OR the one-time
// registration amount OR generic Misc. The AddReceiptDialog reads the
// schedule + existing receipts so it can pre-fill amounts and gate
// already-paid slots.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button, TextField, MenuItem, Select, FormControl, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip,
  Chip, Snackbar, RadioGroup, FormControlLabel, Radio, InputLabel,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DownloadIcon from '@mui/icons-material/Download';
import SchoolIcon from '@mui/icons-material/School';
import { admissionsApi, uploadsApi, paymentAccountsApi, publicReceiptsApi } from '../../lib/endpoints';
import { buildReceiptHtml } from '../../lib/receiptTemplate';
import { downloadHtmlAsPdf } from '../../lib/htmlToPdf';
import { fullName, fmtDate, fmtMoney } from './utils';
import StatusPill from './StatusPill';
import VerifyAdmissionDialog from '../../components/VerifyAdmissionDialog/VerifyAdmissionDialog';
import './Accounts.css';

// Assemble a copy-paste-friendly login message from the credentials the
// confirm-course response returns (for Accounts to WhatsApp/share).
const credentialMessage = (c) => [
  'Your student portal login:',
  `Portal: ${window.location.origin}/student/login`,
  `Institute code: ${c.tenant_slug}`,
  `Email: ${c.email}`,
  `Temporary password: ${c.temp_password}`,
  'Please change your password after logging in.',
].join('\n');

const AdmissionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [receiptOpen, setReceiptOpen] = useState(null); // null | {kind, installment_no?, suggestedAmount?}
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmResult, setConfirmResult] = useState(null); // { student, credentials }

  const reload = useCallback(() => {
    setLoading(true);
    return admissionsApi.get(id)
      .then((r) => setData(r?.data || null))
      .catch((e) => setError(e?.message || 'Failed to load admission'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { (async () => { await reload(); })(); }, [reload]);

  // Photo signed URL — fetched once per photo_r2_key. Best-effort.
  useEffect(() => {
    if (!data?.photo_r2_key) { setPhotoUrl(null); return undefined; }
    let alive = true;
    uploadsApi.signedUrl(data.photo_r2_key)
      .then((r) => { if (alive) setPhotoUrl(r?.data?.url || null); })
      .catch(() => { /* placeholder stays */ });
    return () => { alive = false; };
  }, [data?.photo_r2_key]);

  // Index receipts by what they paid for, so the schedule row can show
  // "Paid" vs "Pending" and the AddReceipt dialog can grey out slots
  // that are already covered.
  const paidIndex = useMemo(() => {
    const idx = { registration: null, installments: {} };
    for (const r of data?.receipts || []) {
      if (r.receipt_kind === 'registration') idx.registration = r;
      else if (r.receipt_kind === 'installment' && r.installment_no != null) {
        idx.installments[r.installment_no] = r;
      }
    }
    return idx;
  }, [data?.receipts]);

  const installments = useMemo(() => Array.isArray(data?.fee_schedule) ? data.fee_schedule : [], [data]);
  const offerRegistration = useMemo(() => {
    // Prefer the server-supplied `registration_amount` (sourced from the
    // per-lead fee offer). Fall back to the legacy total − Σ installments
    // synthesis when the BE hasn't surfaced one (very old admissions).
    if (data?.registration_amount != null) {
      const n = Number(data.registration_amount);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
    if (!installments.length) return null;
    const total = Number(data?.total_fees || 0);
    const sumInst = installments.reduce((s, r) => s + Number(r.amount || 0), 0);
    const reg = total - sumInst;
    return reg > 0.01 ? reg : null;
  }, [installments, data]);

  // Full-mode admissions still have something to capture: total_fees
  // minus whatever the offer's registration_amount carved out. We
  // surface this as a single "Course Fees" row so accounts can tag a
  // receipt to it (receipt_kind='misc'). Empty for installment-mode —
  // the per-slot rows already cover the course amount end-to-end.
  const fullModeCourseBalance = useMemo(() => {
    if (data?.mode_of_payment !== 'Full') return null;
    const total = Number(data?.total_fees || 0);
    if (!Number.isFinite(total) || total <= 0) return null;
    const reg = offerRegistration || 0;
    const balance = total - reg;
    return balance > 0.01 ? balance : null;
  }, [data?.mode_of_payment, data?.total_fees, offerRegistration]);

  const copyReceiptLink = useCallback(async (r) => {
    if (!r?.share_token) {
      setToast({ severity: 'error', text: 'Old receipt — re-create it to mint a share link.' });
      return;
    }
    const url = `${window.location.origin}/r/${r.share_token}`;
    try {
      await navigator.clipboard.writeText(url);
      setToast({ severity: 'success', text: `Receipt link copied:\n${url}` });
    } catch {
      setToast({ severity: 'info', text: `Copy this link manually:\n${url}` });
    }
  }, []);

  // Download the receipt as a PDF that matches the public /r/:token page
  // exactly — we fetch the SAME public payload and feed the SAME shared
  // template, so print and download can't drift.
  const [downloadingId, setDownloadingId] = useState(null);
  const downloadReceiptPdf = useCallback(async (r) => {
    if (!r?.share_token) {
      setToast({ severity: 'error', text: 'Old receipt — re-create it to mint a downloadable receipt.' });
      return;
    }
    setDownloadingId(r.id);
    try {
      const res = await publicReceiptsApi.lookup(r.share_token);
      const payload = res?.data;
      if (!payload) throw new Error('Receipt not found');
      const html = buildReceiptHtml(payload);
      const safeNo = String(r.receipt_no || 'receipt').replace(/[^a-z0-9_\-]/gi, '_');
      await downloadHtmlAsPdf(html, `Receipt_${safeNo}.pdf`);
    } catch (e) {
      setToast({ severity: 'error', text: e?.message || 'Failed to generate the PDF.' });
    } finally {
      setDownloadingId(null);
    }
  }, []);

  // Confirm the student into their course (post-approval): provisions the LMS
  // portal and returns the student's login credentials (email + temp password)
  // for Accounts to share manually. Shown once (temp password isn't stored).
  const confirmCourse = useCallback(async () => {
    setConfirming(true);
    try {
      const res = await admissionsApi.confirmCourse(id);
      const data = res?.data ?? res;
      setConfirmResult(data);
      setToast({ severity: 'success', text: 'Course confirmed — copy the login details below and share them with the student.' });
      reload();
    } catch (e) {
      setToast({ severity: 'error', text: e?.message || 'Failed to confirm the course.' });
    } finally {
      setConfirming(false);
    }
  }, [id, reload]);

  // Open the student's submitted payment screenshot via a signed URL.
  const viewPaymentProof = useCallback(async () => {
    const key = data?.payment_proof_r2_key;
    if (!key) return;
    try {
      const sr = await uploadsApi.signedUrl(key);
      const u = sr?.data?.url;
      if (u) window.open(u, '_blank', 'noreferrer');
    } catch (e) { setToast({ severity: 'error', text: e?.message || 'Could not open the screenshot.' }); }
  }, [data]);

  const copyText = useCallback(async (text, label = 'Link') => {
    try { await navigator.clipboard.writeText(text); setToast({ severity: 'success', text: `${label} copied.` }); }
    catch { setToast({ severity: 'info', text: text }); }
  }, []);

  // Has the lump-sum Course Fees row been captured? We treat the first
  // 'misc' receipt as the course-balance payment. (No DB enum dedicated
  // to this yet — misc covers it cleanly.) MUST live above the early
  // returns so the hook order stays stable across loading → ready.
  const courseBalancePaid = useMemo(
    () => (data?.receipts || []).find((r) => r.receipt_kind === 'misc') || null,
    [data?.receipts],
  );

  if (loading) return <div className="accounts-page"><div className="accounts-empty"><CircularProgress size={20} /></div></div>;
  if (!data) return <div className="accounts-page"><Alert severity="error">{error || 'Not found'}</Alert></div>;

  const isInstallmentMode = data.mode_of_payment === 'Installment' && installments.length > 0;
  // Show the Fee Schedule section whenever there is *something* to
  // track money against — installment slots, a registration line, or
  // the Full-mode course balance. Without this, Full-mode admissions
  // had no surface to tag the registration receipt (the section was
  // hidden entirely).
  const showFeeSchedule = isInstallmentMode
    || offerRegistration != null
    || fullModeCourseBalance != null;

  return (
    <div className="accounts-page">
      <div className="accounts-page-head">
        <div>
          <div className="accounts-page-title">{fullName(data)}</div>
          <div className="accounts-page-subtitle">
            <StatusPill status={data.status} />
            {' '}· {data.program_name || '—'}{' '}· Admitted {fmtDate(data.admission_date)}
          </div>
          {/* Uncollected registration balance flag — reminds Accounts to
              collect the remaining registration amount. */}
          {Number(data.registration_due || 0) > 0.01 && (
            <Chip
              size="small"
              label={`Registration balance ₹ ${fmtMoney(data.registration_due)} to collect`}
              sx={{ mt: 1, bgcolor: '#fef9c3', color: '#854d0e', fontWeight: 600, height: 22, fontSize: 11 }}
            />
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(`/accounts/admission/${id}/edit`)} sx={{ textTransform: 'none' }}>
            Edit
          </Button>
          {data.status === 'pending_approval' && (
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircleIcon />}
              onClick={() => setVerifyOpen(true)}
              sx={{ textTransform: 'none' }}
            >
              Verify &amp; Approve
            </Button>
          )}
          {/* Course-confirm: available once approved (attending/break/completed).
              Before confirmation → primary "Confirm course". After → a
              "Course confirmed" chip + a subtle "Reissue credentials" action
              (re-confirm is idempotent and mints a fresh temp password so
              Accounts can re-share it if the student lost it). */}
          {['attending', 'on_break', 'completed'].includes(data.status) && (
            data.course_confirmed_at ? (
              <>
                <Chip size="small" color="success" variant="outlined" label="Course confirmed" sx={{ alignSelf: 'center' }} />
                <Button
                  variant="text" size="small" startIcon={<SchoolIcon />}
                  onClick={confirmCourse} disabled={confirming}
                  sx={{ textTransform: 'none', color: '#64748b' }}
                >
                  {confirming ? 'Reissuing…' : 'Reissue credentials'}
                </Button>
              </>
            ) : (
              <Button
                variant="contained"
                startIcon={<SchoolIcon />}
                onClick={confirmCourse}
                disabled={confirming}
                sx={{ textTransform: 'none', bgcolor: '#E53935', '&:hover': { bgcolor: '#c62828' } }}
              >
                {confirming ? 'Confirming…' : 'Confirm course'}
              </Button>
            )
          )}
        </div>
      </div>

      {/* Credentials callout — shown ONCE right after confirming so Accounts
          can copy + share the student's login details manually (WhatsApp/call).
          The temp password isn't stored in plaintext, so it can't be shown
          again — re-confirm to reissue a fresh one. */}
      {confirmResult?.credentials && (
        <Alert severity="success" sx={{ mt: 2 }} action={
          <Button size="small" onClick={() => copyText(credentialMessage(confirmResult.credentials), 'Login details')} sx={{ textTransform: 'none' }}>
            Copy details
          </Button>
        }>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Student portal ready — share these login details:</div>
          <div style={{ fontFamily: 'monospace', fontSize: 13, lineHeight: 1.7 }}>
            Portal: {window.location.origin}/student/login<br />
            Institute code: <b>{confirmResult.credentials.tenant_slug}</b><br />
            Email: <b>{confirmResult.credentials.email}</b><br />
            Temp password: <b>{confirmResult.credentials.temp_password}</b>
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
            Won’t be shown again — copy it now. The student can change their password after logging in.
          </div>
        </Alert>
      )}

      <div className="accounts-kpi-row">
        <div className="accounts-kpi-card" style={{ '--kpi-accent': '#4f46e5' }}>
          <div className="accounts-kpi-label">Total Fees</div>
          <div className="accounts-kpi-value">₹ {fmtMoney(data.total_fees)}</div>
        </div>
        <div className="accounts-kpi-card" style={{ '--kpi-accent': '#10b981' }}>
          <div className="accounts-kpi-label">Paid Till Date</div>
          <div className="accounts-kpi-value">₹ {fmtMoney(data.paid_till_date)}</div>
        </div>
        <div className="accounts-kpi-card" style={{ '--kpi-accent': '#f59e0b' }}>
          <div className="accounts-kpi-label">Pending</div>
          <div className="accounts-kpi-value">₹ {fmtMoney(data.pending_fees)}</div>
        </div>
      </div>

      {/* Identity card — photo on the left, KV grid on the right. */}
      <div className="accounts-table-card" style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={fullName(data)}
              style={{ width: 120, height: 120, borderRadius: 8, objectFit: 'contain', background: '#f1f5f9', border: '1px solid #e5e7eb', flexShrink: 0 }}
            />
          ) : data.photo_r2_key ? (
            <div style={{ width: 120, height: 120, borderRadius: 8, background: '#f1f5f9', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CircularProgress size={20} />
            </div>
          ) : (
            <div style={{ width: 120, height: 120, borderRadius: 8, background: '#f1f5f9', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 11, flexShrink: 0 }}>
              No photo
            </div>
          )}
          <div style={{ flex: 1, minWidth: 240, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <KV label="Email" value={data.email} />
            <KV label="WhatsApp" value={data.whatsapp_number} />
            <KV label="Alt Contact" value={data.alternate_contact} />
            <KV label="Mode of Training" value={data.mode_of_training} />
            <KV label="Mode of Payment" value={data.mode_of_payment} />
            <KV label="Center" value={data.center_name} />
            <KV label="Counsellor" value={data.guided_by_counsellor_name} />
            <KV label="Manager" value={data.guided_by_manager_name} />
            <KV label="Source" value={data.source} />
            <KV label="Address" value={data.address} fullSpan />
          </div>
        </div>
      </div>

      {/* Payment the student submitted with the form (registration/pay-now).
          Recorded UNVERIFIED — accounts confirm it at approval. */}
      {(data.payment_amount != null || data.payment_utr || data.payment_proof_r2_key) && (
        <Section title="Payment submitted by student">
          <div className="accounts-table-card" style={{ padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, alignItems: 'start' }}>
              <KV label="Amount paid" value={data.payment_amount != null ? `₹ ${fmtMoney(data.payment_amount)}` : '—'} />
              <KV label="UTR / Reference" value={data.payment_utr || '—'} />
              <KV label="Status" value={data.payment_verified_at ? 'Verified' : 'Awaiting verification'} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.04 }}>Payment proof</div>
                {data.payment_proof_r2_key ? (
                  <Button size="small" startIcon={<AttachFileIcon />} onClick={viewPaymentProof} sx={{ textTransform: 'none', mt: 0.25, ml: -0.5 }}>
                    View screenshot
                  </Button>
                ) : <div style={{ fontSize: 13, color: '#111827', marginTop: 2 }}>—</div>}
              </div>
            </div>
          </div>
        </Section>
      )}

      {data.education?.length > 0 && (
        <Section title="Education">
          <table className="accounts-table">
            <thead><tr>
              <th>Examination</th><th>Stream</th><th>College</th>
              <th>Board / University</th><th>Year</th><th>Grade</th>
            </tr></thead>
            <tbody>
              {data.education.map((e) => (
                <tr key={e.id}>
                  <td>{e.examination}</td>
                  <td>{e.stream || '—'}</td>
                  <td>{e.college_name || '—'}</td>
                  <td>{e.board_university || '—'}</td>
                  <td>{e.year_of_passing || '—'}</td>
                  <td>
                    {e.percentage != null && e.percentage !== ''
                      ? `${e.percentage} ${e.grade_unit === 'cgpa' ? 'CGPA' : '%'}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* Fee schedule with per-row paid status. Renders whenever there
          is something to track:
            • Installment-mode → registration (if any) + per-slot rows.
            • Full-mode        → registration (if any) + a single
                                 Course Fees row covering the rest.
          Each row carries a Pending / Paid chip and a Capture CTA. */}
      {showFeeSchedule && (
        <Section
          title="Fee Schedule"
          right={
            <Button startIcon={<AddIcon />} onClick={() => setReceiptOpen({ kind: 'misc' })} variant="outlined" sx={{ textTransform: 'none' }}>
              Add receipt
            </Button>
          }
        >
          <table className="accounts-table">
            <thead><tr>
              <th>Slot</th>
              <th>Due Date</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr></thead>
            <tbody>
              {/* Registration row — with a PAID/DUE split so a partial reg
                  payment (e.g. reg 5000, paid 2500 now) shows 2500 still to
                  collect. Uses the backend's registration_paid / _due /
                  _declared_unverified breakdown. */}
              {offerRegistration != null && (() => {
                const regPaid = Number(data.registration_paid || 0);
                const regUnverified = Number(data.registration_declared_unverified || 0);
                const regDue = data.registration_due != null ? Number(data.registration_due) : Math.max(0, offerRegistration - regPaid - regUnverified);
                const settled = regPaid + regUnverified;
                const fullyPaid = regDue <= 0.01;
                return (
                  <tr>
                    <td>
                      <strong>Registration</strong>
                      {(regPaid > 0 || regUnverified > 0) && !fullyPaid && (
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                          ₹ {fmtMoney(settled)} {regUnverified > 0 && regPaid === 0 ? 'declared' : 'paid'} · ₹ {fmtMoney(regDue)} due
                        </div>
                      )}
                    </td>
                    <td>—</td>
                    <td style={{ textAlign: 'right' }}>₹ {fmtMoney(offerRegistration)}</td>
                    <td>
                      {fullyPaid ? (
                        <Chip size="small" label="Paid" sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 600, height: 22, fontSize: 11 }} />
                      ) : settled > 0 ? (
                        <Chip size="small" label={regUnverified > 0 && regPaid === 0 ? 'Partial · unverified' : 'Partial'} sx={{ bgcolor: '#fef9c3', color: '#854d0e', fontWeight: 600, height: 22, fontSize: 11 }} />
                      ) : (
                        <Chip size="small" label="Pending" sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 600, height: 22, fontSize: 11 }} />
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {!fullyPaid && (
                        <Button
                          size="small"
                          onClick={() => setReceiptOpen({ kind: 'registration', suggestedAmount: regDue > 0 ? regDue : offerRegistration })}
                          sx={{ textTransform: 'none' }}
                        >
                          {settled > 0 ? 'Collect balance' : 'Capture'}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })()}
              {/* Full-mode lump sum row — only when there's no installment
                  schedule. Tagged as misc on receipt creation. */}
              {fullModeCourseBalance != null && !isInstallmentMode && (
                <tr>
                  <td><strong>Course Fees</strong></td>
                  <td>—</td>
                  <td style={{ textAlign: 'right' }}>₹ {fmtMoney(fullModeCourseBalance)}</td>
                  <td>
                    {courseBalancePaid ? (
                      <Chip size="small" label="Paid" sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 600, height: 22, fontSize: 11 }} />
                    ) : (
                      <Chip size="small" label="Pending" sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 600, height: 22, fontSize: 11 }} />
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {!courseBalancePaid && (
                      <Button
                        size="small"
                        onClick={() => setReceiptOpen({ kind: 'misc', suggestedAmount: fullModeCourseBalance })}
                        sx={{ textTransform: 'none' }}
                      >
                        Capture
                      </Button>
                    )}
                  </td>
                </tr>
              )}
              {installments.map((s) => {
                const paid = paidIndex.installments[s.installment_no];
                return (
                  <tr key={s.id || s.installment_no}>
                    <td>Installment {s.installment_no}</td>
                    <td>{fmtDate(s.due_date)}</td>
                    <td style={{ textAlign: 'right' }}>₹ {fmtMoney(s.amount)}</td>
                    <td>
                      {paid ? (
                        <Chip size="small" label="Paid" sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 600, height: 22, fontSize: 11 }} />
                      ) : (
                        <Chip size="small" label="Pending" sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 600, height: 22, fontSize: 11 }} />
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {!paid && (
                        <Button
                          size="small"
                          onClick={() => setReceiptOpen({ kind: 'installment', installment_no: s.installment_no, suggestedAmount: s.amount })}
                          sx={{ textTransform: 'none' }}
                        >
                          Capture
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>
      )}

      <Section
        title="Receipts"
        right={
          <Button startIcon={<AddIcon />} onClick={() => setReceiptOpen({ kind: 'misc' })} variant="outlined" sx={{ textTransform: 'none' }}>
            Add receipt
          </Button>
        }
      >
        {(!data.receipts || data.receipts.length === 0) ? (
          <div className="accounts-empty">No receipts yet.</div>
        ) : (
          <table className="accounts-table">
            <thead><tr>
              <th>Receipt No.</th><th>Date</th><th>For</th><th>Mode</th>
              <th style={{ textAlign: 'right' }}>Amount</th><th>Notes</th><th aria-label="actions" />
            </tr></thead>
            <tbody>
              {data.receipts.map((r) => (
                <tr key={r.id}>
                  <td>{r.receipt_no}</td>
                  <td>{fmtDate(r.receipt_date)}</td>
                  <td>
                    {r.receipt_kind === 'installment' ? `Installment ${r.installment_no}` :
                     r.receipt_kind === 'registration' ? 'Registration' :
                     'Misc'}
                  </td>
                  <td>{r.mode_of_payment}{r.is_old_collection ? ' · Old' : ''}</td>
                  <td style={{ textAlign: 'right' }}>{fmtMoney(r.amount)}</td>
                  <td style={{ fontSize: 12, color: '#6b7280' }}>{r.transaction_details || '—'}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {r.payment_screenshot_r2_key && (
                      <Tooltip title="View payment screenshot">
                        <IconButton
                          size="small"
                          onClick={async () => {
                            try {
                              const sr = await uploadsApi.signedUrl(r.payment_screenshot_r2_key);
                              const u = sr?.data?.url;
                              if (u) window.open(u, '_blank', 'noreferrer');
                            } catch { /* silent — clicking again retries */ }
                          }}
                          sx={{ color: '#475569' }}
                        >
                          <AttachFileIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Copy public share link">
                      <span>
                        <IconButton size="small" onClick={() => copyReceiptLink(r)} disabled={!r.share_token} sx={{ color: '#475569' }}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    {r.share_token && (
                      <Tooltip title="Open receipt in new tab">
                        <IconButton size="small" component="a" href={`/r/${r.share_token}`} target="_blank" rel="noreferrer" sx={{ color: '#475569' }}>
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {r.share_token && (
                      <Tooltip title="Download receipt PDF">
                        <span>
                          <IconButton size="small" onClick={() => downloadReceiptPdf(r)} disabled={downloadingId === r.id} sx={{ color: '#475569' }}>
                            {downloadingId === r.id ? <CircularProgress size={16} /> : <DownloadIcon fontSize="small" />}
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={async () => {
                        if (!window.confirm('Delete this receipt?')) return;
                        await admissionsApi.deleteReceipt(r.id);
                        reload();
                      }} sx={{ color: '#dc2626' }}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <AddReceiptDialog
        open={Boolean(receiptOpen)}
        prefill={receiptOpen || undefined}
        installments={installments}
        offerRegistration={offerRegistration}
        paidIndex={paidIndex}
        onClose={() => setReceiptOpen(null)}
        admissionId={id}
        onSaved={() => { setReceiptOpen(null); reload(); }}
      />

      <VerifyAdmissionDialog
        open={verifyOpen}
        admissionId={id}
        onClose={() => setVerifyOpen(false)}
        onChanged={() => { setVerifyOpen(false); reload(); }}
      />

      <Snackbar
        open={!!toast}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast && (
          <Alert severity={toast.severity} sx={{ whiteSpace: 'pre-line', maxWidth: 520 }}>
            {toast.text}
          </Alert>
        )}
      </Snackbar>
    </div>
  );
};

const Section = ({ title, right, children }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.04 }}>{title}</div>
      {right}
    </div>
    <div className="accounts-table-card">{children}</div>
  </div>
);

const KV = ({ label, value, fullSpan }) => (
  <div style={fullSpan ? { gridColumn: '1 / -1' } : undefined}>
    <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.04 }}>{label}</div>
    <div style={{ fontSize: 13, color: '#111827', marginTop: 2 }}>{value || '—'}</div>
  </div>
);

const MODES = ['cash', 'online', 'cheque', 'upi', 'card'];

const AddReceiptDialog = ({ open, onClose, admissionId, onSaved, prefill, installments, offerRegistration, paidIndex }) => {
  // Init form once per open — re-init when the prefill kind changes (e.g.
  // user clicked "Capture" on a specific slot vs the generic "Add receipt").
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  // Tracks whether a screenshot upload is in-flight so we can disable
  // the Save button while bytes are still on the wire.
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  // Tenant payment accounts for the "Received into" picker. Primaries
  // first; the form defaults to the first one (required before save).
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    if (!open) return;
    setForm({
      receipt_date: new Date().toISOString().slice(0, 10),
      amount: prefill?.suggestedAmount != null ? String(prefill.suggestedAmount) : '',
      mode_of_payment: 'cash',
      transaction_details: '',
      is_old_collection: false,
      receipt_kind: prefill?.kind || 'misc',
      installment_no: prefill?.installment_no ?? '',
      // Optional payment screenshot — accounts can attach a UPI / bank
      // confirmation image so the public receipt page can show what
      // was sent. r2_key only; the FE swaps for a signed URL on render.
      payment_screenshot_r2_key: null,
      // Which account the money was received into. Defaulted below once
      // accounts load.
      payment_account_id: '',
    });
    setErr('');
    setUploadingScreenshot(false);
  }, [open, prefill?.kind, prefill?.installment_no, prefill?.suggestedAmount]);

  // Load active payment accounts when the dialog opens; default-select
  // the first primary (else the first active one).
  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    paymentAccountsApi.list()
      .then((r) => {
        if (!alive) return;
        const active = (r?.data || []).filter((a) => a.is_active !== false);
        const ordered = [...active.filter((a) => a.is_primary), ...active.filter((a) => !a.is_primary)];
        setAccounts(ordered);
        if (ordered[0]) setForm((f) => (f ? { ...f, payment_account_id: f.payment_account_id || ordered[0].id } : f));
      })
      .catch(() => { if (alive) setAccounts([]); });
    return () => { alive = false; };
  }, [open]);

  // Which installment slots are still unpaid — drives the dropdown.
  const unpaidSlots = useMemo(() => {
    if (!installments) return [];
    return installments
      .filter((s) => !paidIndex?.installments?.[s.installment_no])
      .map((s) => ({ no: s.installment_no, amount: s.amount, due_date: s.due_date }));
  }, [installments, paidIndex]);

  const registrationAlreadyPaid = Boolean(paidIndex?.registration);

  if (!open || !form) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogContent>
          <div style={{ padding: 20, textAlign: 'center' }}><CircularProgress size={20} /></div>
        </DialogContent>
      </Dialog>
    );
  }

  const onKindChange = (kind) => {
    // Switching kind clears the slot picker + suggested amount unless we
    // can recompute it. Keeps the form honest.
    setForm((f) => ({
      ...f,
      receipt_kind: kind,
      installment_no: kind === 'installment' ? (unpaidSlots[0]?.no || '') : '',
      amount: kind === 'registration' && offerRegistration != null
        ? String(offerRegistration)
        : kind === 'installment' && unpaidSlots[0]?.amount != null
          ? String(unpaidSlots[0].amount)
          : '',
    }));
  };

  const onSlotChange = (no) => {
    const slot = unpaidSlots.find((s) => s.no === Number(no));
    setForm((f) => ({
      ...f,
      installment_no: Number(no),
      amount: slot?.amount != null ? String(slot.amount) : f.amount,
    }));
  };

  // Upload an optional payment screenshot. Same presign + PUT + confirm
  // pipeline used elsewhere; we hold only the r2_key in form state.
  const onPickScreenshot = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr('');
    setUploadingScreenshot(true);
    try {
      const ps = await uploadsApi.presign({
        purpose: 'receipt_screenshot',
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
      await uploadsApi.confirm({ purpose: 'receipt_screenshot', r2_key: presign.r2_key });
      setForm((f) => ({ ...f, payment_screenshot_r2_key: presign.r2_key }));
    } catch (uploadErr) {
      setErr(uploadErr?.message || 'Screenshot upload failed');
    } finally {
      setUploadingScreenshot(false);
      // Reset so re-picking the same file works (browser would
      // otherwise skip the change event).
      if (e.target) e.target.value = '';
    }
  };
  const clearScreenshot = () => setForm((f) => ({ ...f, payment_screenshot_r2_key: null }));

  const submit = async () => {
    setErr('');
    if (!form.amount || Number(form.amount) <= 0) { setErr('Enter a positive amount'); return; }
    if (form.receipt_kind === 'installment' && !form.installment_no) { setErr('Pick which installment this pays for.'); return; }
    if (form.receipt_kind === 'registration' && registrationAlreadyPaid) {
      setErr('Registration is already captured for this admission.'); return;
    }
    // Require an account when the tenant has any configured — we want
    // every recorded rupee attributed to where it landed.
    if (accounts.length > 0 && !form.payment_account_id) {
      setErr('Pick which account this payment was received into.'); return;
    }
    setSaving(true);
    try {
      await admissionsApi.createReceipt(admissionId, {
        receipt_date: form.receipt_date,
        amount: Number(form.amount),
        mode_of_payment: form.mode_of_payment,
        transaction_details: form.transaction_details || null,
        is_old_collection: form.is_old_collection,
        receipt_kind: form.receipt_kind,
        installment_no: form.receipt_kind === 'installment' ? Number(form.installment_no) : null,
        payment_screenshot_r2_key: form.payment_screenshot_r2_key || null,
        payment_account_id: form.payment_account_id || null,
      });
      onSaved?.();
    } catch (e) {
      setErr(e?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add Receipt</DialogTitle>
      <DialogContent>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
          {/* What is this money for? — radio with three options. The
              Registration radio is disabled when registration is already
              captured for this admission (DB uniqueness backs it up). */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>
              Pay for
            </div>
            <RadioGroup
              row
              value={form.receipt_kind}
              onChange={(e) => onKindChange(e.target.value)}
            >
              <FormControlLabel
                value="registration"
                control={<Radio size="small" />}
                label="Registration"
                disabled={registrationAlreadyPaid || offerRegistration == null}
              />
              <FormControlLabel
                value="installment"
                control={<Radio size="small" />}
                label="Installment"
                disabled={unpaidSlots.length === 0}
              />
              <FormControlLabel value="misc" control={<Radio size="small" />} label="Other" />
            </RadioGroup>
          </div>

          {form.receipt_kind === 'installment' && (
            <FormControl size="small" fullWidth>
              <InputLabel id="slot-label" shrink>Installment slot</InputLabel>
              <Select
                labelId="slot-label"
                value={form.installment_no || ''}
                label="Installment slot"
                onChange={(e) => onSlotChange(e.target.value)}
              >
                {unpaidSlots.map((s) => (
                  <MenuItem key={s.no} value={s.no}>
                    Installment {s.no} · ₹ {fmtMoney(s.amount)} · due {fmtDate(s.due_date)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <TextField label="Date" type="date" size="small" value={form.receipt_date} onChange={(e) => setForm({ ...form, receipt_date: e.target.value })} InputLabelProps={{ shrink: true }} />
          <TextField label="Amount (₹)" type="number" size="small" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <FormControl size="small">
            <InputLabel id="mode-label" shrink>Mode of payment</InputLabel>
            <Select labelId="mode-label" label="Mode of payment" value={form.mode_of_payment} onChange={(e) => setForm({ ...form, mode_of_payment: e.target.value })}>
              {MODES.map((m) => <MenuItem key={m} value={m}>{m.toUpperCase()}</MenuItem>)}
            </Select>
          </FormControl>

          {/* Received into — which bank/UPI account this money landed in.
              Required when the tenant has any account configured. */}
          {accounts.length > 0 && (
            <FormControl size="small" error={!form.payment_account_id}>
              <InputLabel id="acct-label" shrink>Received into</InputLabel>
              <Select
                labelId="acct-label"
                label="Received into"
                value={form.payment_account_id || ''}
                onChange={(e) => setForm({ ...form, payment_account_id: e.target.value })}
              >
                {accounts.map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {(a.label || a.bank_name || a.upi_id || 'Account')}
                    {a.account_number ? ` · ••••${String(a.account_number).slice(-4)}` : a.upi_id ? ` · ${a.upi_id}` : ''}
                    {a.is_primary ? ' · Primary' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <TextField label="Transaction details" size="small" value={form.transaction_details} onChange={(e) => setForm({ ...form, transaction_details: e.target.value })} multiline minRows={2} />
          <label style={{ fontSize: 12, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={form.is_old_collection} onChange={(e) => setForm({ ...form, is_old_collection: e.target.checked })} />
            Old collection (pre-system entry)
          </label>

          {/* Optional payment screenshot — UPI / bank confirmation that
              the student / parent forwarded. Surfaces on the public
              receipt URL for parents to verify. */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>
              Payment screenshot <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, color: '#94a3b8' }}>(optional)</span>
            </div>
            {form.payment_screenshot_r2_key ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6 }}>
                <span style={{ fontSize: 12, color: '#15803d', fontWeight: 600, flex: 1 }}>
                  ✓ Attached
                </span>
                <Button size="small" onClick={clearScreenshot} sx={{ textTransform: 'none', fontSize: 11, color: '#dc2626', minWidth: 0 }}>
                  Remove
                </Button>
              </div>
            ) : (
              <Button
                component="label"
                size="small"
                variant="outlined"
                disabled={uploadingScreenshot}
                sx={{ textTransform: 'none', fontSize: 12, borderColor: '#cbd5e1', color: '#0f172a' }}
              >
                {uploadingScreenshot ? 'Uploading…' : 'Attach screenshot'}
                <input type="file" accept="image/*" onChange={onPickScreenshot} disabled={uploadingScreenshot} style={{ display: 'none' }} />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={saving || uploadingScreenshot} sx={{ textTransform: 'none', bgcolor: 'var(--primary)' }}>
          {saving ? 'Saving…' : uploadingScreenshot ? 'Uploading…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdmissionDetail;
