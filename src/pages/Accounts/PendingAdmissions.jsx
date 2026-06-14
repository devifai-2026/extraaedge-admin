import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, IconButton, Chip, CircularProgress, Tooltip, Snackbar, Alert,
} from '@mui/material';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import TuneIcon from '@mui/icons-material/Tune';
import { admissionsApi, leadsApi } from '../../lib/endpoints';
import AddNewLead from '../../components/AddNewLead/AddNewLead';
import ConfigureFeeOffer from '../../components/ConfigureFeeOffer/ConfigureFeeOffer';
import VerifyAdmissionDialog from '../../components/VerifyAdmissionDialog/VerifyAdmissionDialog';
import { onNotification } from '../../lib/socket';
import { fmtDate } from './utils';
import './Accounts.css';

// Unified "what's next on the accounts team's plate" queue. Two row kinds
// share this table:
//   • source_kind === 'lead'      → the lead converted but has NO admission
//     row. The CTA is "Start admission form" which jumps to
//     /accounts/new-admission/:leadId (the form hydrates from the lead).
//   • source_kind === 'admission' → an auto-stub or manual row sitting in
//     'pending_approval'. The CTA is "Verify & Approve" (single click) or
//     "Open" to go into the AdmissionDetail page.
//
// Newest first; backend already sorted by event_at DESC.
const PendingAdmissions = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  // Lead currently being inspected in the read-only modal. Hydrated from
  // leadsApi.get on click so AddNewLead has every field to render.
  const [viewLead, setViewLead] = useState(null);
  const [loadingView, setLoadingView] = useState(false);
  // The lead currently being configured in the ConfigureFeeOffer modal.
  // null = modal closed.
  const [offerLeadId, setOfferLeadId] = useState(null);
  // The admission currently being verified (Approve / Reject modal).
  const [verifyAdmissionId, setVerifyAdmissionId] = useState(null);

  const openViewLead = useCallback(async (leadId) => {
    if (!leadId) return;
    setLoadingView(true);
    try {
      const r = await leadsApi.get(leadId);
      setViewLead(r?.data || null);
    } catch {
      setViewLead(null);
    } finally {
      setLoadingView(false);
    }
  }, []);

  // Toast for the share-link copy / failure feedback. Kept here (parent)
  // instead of the row so multiple rapid clicks don't stack snackbars.
  const [toast, setToast] = useState(null);

  // One-click share-link: mint a fresh 24h token, copy it, toast. The
  // payment account is taken from the lead's saved fee offer (set in the
  // Configure / Reconfigure dialog), so there's no per-share picker here.
  const copyShareLink = useCallback(async (leadId) => {
    if (!leadId) return;
    try {
      const r = await admissionsApi.generateShareLink(leadId);
      const token = r?.data?.token;
      if (!token) throw new Error('No token returned');
      const url = `${window.location.origin}/apply/${token}`;
      try {
        await navigator.clipboard.writeText(url);
        setToast({ severity: 'success', text: `Public link copied. Valid for 24 hours.\n${url}` });
      } catch {
        setToast({ severity: 'info', text: `Copy this link manually: ${url}` });
      }
    } catch (e) {
      setToast({ severity: 'error', text: e?.message || 'Could not generate share link' });
    }
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await admissionsApi.pendingAdmissions();
      setRows(r?.data || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // Live refresh on three signals:
  //   1. Socket: BE emits 'admission.pending' whenever a lead converts
  //      OR the student submits the public form. Both fire-paths route
  //      through admissions/service.notifyPendingAdmission so the same
  //      listener catches both. Without this the page only updated on
  //      focus, which the comment used to claim but never actually did.
  //   2. Window focus: covers cases where the socket dropped silently.
  //   3. Lightweight 30s poll: belt-and-suspenders.
  useEffect(() => {
    const offSocket = onNotification((evt) => {
      if (evt?.type === 'admission.pending') reload();
    });
    const onFocus = () => reload();
    window.addEventListener('focus', onFocus);
    const t = setInterval(reload, 30_000);
    return () => {
      try { offSocket?.(); } catch { /* ignore */ }
      window.removeEventListener('focus', onFocus);
      clearInterval(t);
    };
  }, [reload]);

  return (
    <div className="accounts-page">
      <div className="accounts-page-head">
        <div>
          <div className="accounts-page-title">Pending Admissions</div>
          <div className="accounts-page-subtitle">
            Converted leads waiting for the admission form, admissions
            awaiting verification, and students currently on break.
            Newest first.
          </div>
        </div>
        <Tooltip title="Refresh">
          <IconButton onClick={reload}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </div>

      <div className="accounts-table-card">
        {loading ? (
          <div className="accounts-empty"><CircularProgress size={20} /></div>
        ) : rows.length === 0 ? (
          <div className="accounts-empty">
            🎉 All clear. No leads are waiting on admission.
          </div>
        ) : (
          <table className="accounts-table">
            <thead>
              <tr>
                <th>Converted At</th>
                <th>Student</th>
                <th>Course</th>
                <th>Owner</th>
                <th>State</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <PendingRow
                  key={`${r.source_kind}-${r.source_id}`}
                  row={r}
                  onChanged={reload}
                  navigate={navigate}
                  onView={openViewLead}
                  busyView={loadingView}
                  onCopyLink={copyShareLink}
                  onConfigureOffer={(leadId) => setOfferLeadId(leadId)}
                  onVerify={(admissionId) => setVerifyAdmissionId(admissionId)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Read-only Lead modal. AddNewLead with viewOnly=true reuses the
          existing edit form but disables every input and hides Save. */}
      <AddNewLead
        open={Boolean(viewLead)}
        onClose={() => setViewLead(null)}
        leadData={viewLead}
        viewOnly
      />

      {/* Configure / reconfigure the per-lead fee plan. Saving here is
          what flips the row's has_fee_offer flag and unlocks the
          "Copy link" + "Start admission form" buttons. */}
      <ConfigureFeeOffer
        open={Boolean(offerLeadId)}
        leadId={offerLeadId}
        onClose={() => setOfferLeadId(null)}
        onSaved={() => reload()}
      />

      {/* Verify / Approve / Reject. Replaces the old one-click approve so
          accounts can confirm what the student submitted before flipping
          the status. On Reject, the lead falls back into the queue with
          a fresh-link CTA. */}
      <VerifyAdmissionDialog
        open={Boolean(verifyAdmissionId)}
        admissionId={verifyAdmissionId}
        onClose={() => setVerifyAdmissionId(null)}
        onChanged={() => reload()}
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

const PendingRow = ({ row, onChanged, navigate, onView, busyView, onCopyLink, onConfigureOffer, onVerify }) => {
  const isLead = row.source_kind === 'lead';
  const isOnBreak = row.source_kind === 'admission' && row.admission_status === 'on_break';

  return (
    <tr>
      <td>{fmtDate(row.event_at)}</td>
      <td>
        <div style={{ fontWeight: 600 }}>{row.student_name || '—'}</div>
        <div style={{ fontSize: 11, color: '#9ca3af' }}>
          {row.email || row.whatsapp_number || '—'}
        </div>
      </td>
      <td>{row.program_name || '—'}</td>
      <td style={{ fontSize: 12, color: '#6b7280' }}>{row.owner_name || '—'}</td>
      <td>
        {isLead ? (
          <Chip
            size="small"
            label="No admission form"
            sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 600, height: 22, fontSize: 11 }}
          />
        ) : isOnBreak ? (
          <Tooltip title={row.break_reason || 'Student is currently on break.'}>
            <Chip
              size="small"
              label="On Break"
              sx={{ bgcolor: '#ffedd5', color: '#9a3412', fontWeight: 600, height: 22, fontSize: 11 }}
            />
          </Tooltip>
        ) : (
          <Chip
            size="small"
            label="Awaiting verification"
            sx={{ bgcolor: '#dbeafe', color: '#1e40af', fontWeight: 600, height: 22, fontSize: 11 }}
          />
        )}
      </td>
      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
        {row.lead_id && (
          <Tooltip title="View lead details">
            <span>
              <Button
                size="small"
                startIcon={<VisibilityIcon />}
                onClick={() => onView?.(row.lead_id)}
                disabled={busyView}
                sx={{ textTransform: 'none', mr: 1, color: 'var(--primary)' }}
              >
                View lead
              </Button>
            </span>
          </Tooltip>
        )}
        {isLead ? (
          <>
            {/* Three-state CTA group for converted-but-no-admission leads:
                  • No offer yet  → only "Configure offer" is shown.
                  • Offer exists  → "Reconfigure" + "Copy link" + "Start admission form".
                Backend refuses to mint a share-link without an offer
                anyway; gating the UI here just removes a footgun. */}
            {!row.has_fee_offer ? (
              <Tooltip title="Set the fees + installment plan for this lead before sharing a link.">
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<TuneIcon />}
                  onClick={() => onConfigureOffer?.(row.lead_id)}
                  sx={{ textTransform: 'none', bgcolor: '#E53935' }}
                >
                  Configure offer
                </Button>
              </Tooltip>
            ) : (
              <>
                <Tooltip title="Edit the fee offer for this lead.">
                  <span>
                    <Button
                      size="small"
                      startIcon={<TuneIcon />}
                      onClick={() => onConfigureOffer?.(row.lead_id)}
                      sx={{ textTransform: 'none', mr: 1, color: '#475569' }}
                    >
                      Reconfigure
                    </Button>
                  </span>
                </Tooltip>
                <Tooltip title="Generate a 24h public link to share with the student. Uses the payment account set in the offer.">
                  <span>
                    <Button
                      size="small"
                      startIcon={<ContentCopyIcon />}
                      onClick={() => onCopyLink?.(row.lead_id)}
                      sx={{ textTransform: 'none', mr: 1, color: 'var(--primary)' }}
                    >
                      Copy link
                    </Button>
                  </span>
                </Tooltip>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<AssignmentIndIcon />}
                  onClick={() => navigate(`/accounts/new-admission/${row.lead_id}`)}
                  sx={{ textTransform: 'none', bgcolor: 'var(--primary)' }}
                >
                  Start admission form
                </Button>
              </>
            )}
          </>
        ) : isOnBreak ? (
          <>
            <Button
              size="small"
              onClick={() => navigate(`/accounts/admission/${row.admission_id}`)}
              sx={{ textTransform: 'none', mr: 1 }}
            >
              Open
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={async () => {
                await admissionsApi.resume(row.admission_id);
                onChanged?.();
              }}
              sx={{ textTransform: 'none', bgcolor: 'var(--primary)' }}
            >
              Resume
            </Button>
          </>
        ) : (
          <>
            <Button
              size="small"
              onClick={() => navigate(`/accounts/admission/${row.admission_id}`)}
              sx={{ textTransform: 'none', mr: 1 }}
            >
              Open
            </Button>
            <Button
              size="small"
              variant="contained"
              color="success"
              startIcon={<CheckCircleIcon />}
              onClick={() => onVerify?.(row.admission_id)}
              sx={{ textTransform: 'none' }}
            >
              Verify &amp; Approve
            </Button>
          </>
        )}
      </td>
    </tr>
  );
};

export default PendingAdmissions;
