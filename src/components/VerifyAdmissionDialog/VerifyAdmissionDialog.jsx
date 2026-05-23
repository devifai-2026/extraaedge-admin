// Verify & Approve dialog for the accounts team.
//
// Opens from the Pending Admissions row's primary action. Hydrates the
// full admission via admissionsApi.get() and renders a read-only summary
// (student details, education, fee plan + installment schedule, photo)
// so the accounts user can verify everything BEFORE flipping status.
//
// Three actions:
//   • Cancel  → close, no change.
//   • Reject  → POST /admissions/:id/reject. Lead returns to the
//               "no admission yet" state on the queue; a fresh public
//               link can be minted. Optional reason captured.
//   • Approve → POST /admissions/:id/approve. Existing behaviour.
//
// All state lives inside this component — the caller just passes
// admissionId and onChanged() so the parent can refresh its queue.
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  Button, CircularProgress, Alert, Box, Typography, Divider, TextField,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { admissionsApi, uploadsApi } from '../../lib/endpoints';
import { fmtDate, fmtMoney, fullName } from '../../pages/Accounts/utils';

const ZERO = 0;

export default function VerifyAdmissionDialog({ open, admissionId, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Two-step reject so the accounts user can't reject by accident — the
  // first click reveals the reason textarea, the second click commits.
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !admissionId) return undefined;
    let alive = true;
    setLoading(true); setError(''); setData(null); setPhotoUrl(null);
    setRejectMode(false); setRejectReason('');
    admissionsApi.get(admissionId)
      .then((r) => { if (alive) setData(r?.data || null); })
      .catch((e) => { if (alive) setError(e?.message || 'Failed to load'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [open, admissionId]);

  // Resolve the photo r2_key → signed URL once the admission is loaded.
  // Best-effort: a failure just leaves the placeholder visible.
  useEffect(() => {
    if (!data?.photo_r2_key) return undefined;
    let alive = true;
    uploadsApi.signedUrl(data.photo_r2_key)
      .then((r) => { if (alive) setPhotoUrl(r?.data?.url || null); })
      .catch(() => { /* placeholder stays */ });
    return () => { alive = false; };
  }, [data?.photo_r2_key]);

  const installments = useMemo(() => Array.isArray(data?.fee_schedule) ? data.fee_schedule : [], [data]);
  const isInstallment = data?.mode_of_payment === 'Installment' && installments.length > 0;

  const approve = async () => {
    setBusy(true); setError('');
    try {
      await admissionsApi.approve(admissionId);
      onChanged?.();
      onClose?.();
    } catch (e) {
      setError(e?.message || 'Approve failed');
    } finally { setBusy(false); }
  };

  const reject = async () => {
    if (!rejectMode) { setRejectMode(true); return; }
    setBusy(true); setError('');
    try {
      await admissionsApi.reject(admissionId, rejectReason?.trim() || undefined);
      onChanged?.();
      onClose?.();
    } catch (e) {
      setError(e?.message || 'Reject failed');
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Verify Admission</Typography>
          <Typography variant="caption" sx={{ color: '#64748b' }}>
            Review what the student submitted, then Approve or Reject.
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" disabled={busy}><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {loading && (
          <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        )}
        {!loading && error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {!loading && data && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Student snapshot */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {photoUrl ? (
                <Box
                  component="img"
                  src={photoUrl}
                  alt={fullName(data)}
                  sx={{ width: 120, height: 120, borderRadius: 1.5, objectFit: 'contain', background: '#f1f5f9', border: '1px solid #e5e7eb' }}
                />
              ) : (
                <Box sx={{ width: 120, height: 120, borderRadius: 1.5, background: '#f1f5f9', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 11 }}>
                  No photo
                </Box>
              )}
              <Box sx={{ flex: 1, minWidth: 240 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{fullName(data) || '—'}</Typography>
                <Typography variant="body2" sx={{ color: '#475569', mt: 0.5 }}>
                  {data.email || '—'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#475569' }}>
                  {data.whatsapp_number || '—'} {data.alternate_contact ? ` · ${data.alternate_contact}` : ''}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5 }}>
                  {data.address || '—'}
                </Typography>
              </Box>
            </Box>

            <Divider />

            {/* Programme + Schedule */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 1.5 }}>
              <KV label="Course" value={data.program_name} />
              <KV label="Mode of Training" value={data.mode_of_training} />
              <KV label="Center" value={data.center_name} />
              <KV label="Admission Date" value={fmtDate(data.admission_date)} />
            </Box>

            <Divider />

            {/* Education */}
            <Box>
              <SectionLabel>Education</SectionLabel>
              {(data.education || []).length === 0 ? (
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>None recorded.</Typography>
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  <Box component="table" sx={tableSx}>
                    <thead>
                      <tr>
                        <th>Examination</th><th>Stream</th><th>College</th>
                        <th>Board / University</th><th>Year</th><th>Grade</th>
                      </tr>
                    </thead>
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
                  </Box>
                </Box>
              )}
            </Box>

            <Divider />

            {/* Fees */}
            <Box>
              <SectionLabel>Fees</SectionLabel>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 1.5, mb: isInstallment ? 1.5 : 0 }}>
                <KV label="Total Fees" value={data.total_fees != null ? `₹ ${fmtMoney(data.total_fees)}` : '—'} />
                <KV label="Payment Mode" value={data.mode_of_payment || '—'} />
              </Box>
              {isInstallment && (
                <Box sx={{ overflowX: 'auto' }}>
                  <Box component="table" sx={tableSx}>
                    <thead>
                      <tr><th>#</th><th>Due Date</th><th style={{ textAlign: 'right' }}>Amount</th></tr>
                    </thead>
                    <tbody>
                      {installments.map((r) => (
                        <tr key={r.id || r.installment_no}>
                          <td>{r.installment_no}</td>
                          <td>{fmtDate(r.due_date)}</td>
                          <td style={{ textAlign: 'right' }}>₹ {fmtMoney(r.amount || ZERO)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Box>
                </Box>
              )}
            </Box>

            {/* Reject reason (lazy-shown after first Reject click). */}
            {rejectMode && (
              <>
                <Divider />
                <Box>
                  <SectionLabel>Reason for rejection</SectionLabel>
                  <TextField
                    autoFocus
                    fullWidth
                    multiline
                    minRows={2}
                    size="small"
                    placeholder="e.g. Photo unclear — student needs to re-upload."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <Typography variant="caption" sx={{ color: '#64748b', mt: 0.5, display: 'block' }}>
                    The lead returns to the queue with the original share link burned. You can generate a fresh one.
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={busy} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          onClick={reject}
          disabled={busy || loading}
          startIcon={<CancelIcon />}
          variant={rejectMode ? 'contained' : 'outlined'}
          color="error"
          sx={{ textTransform: 'none' }}
        >
          {rejectMode ? (busy ? 'Rejecting…' : 'Confirm Reject') : 'Reject'}
        </Button>
        <Button
          onClick={approve}
          disabled={busy || loading || rejectMode}
          startIcon={<CheckCircleIcon />}
          variant="contained"
          color="success"
          sx={{ textTransform: 'none' }}
        >
          {busy ? 'Approving…' : 'Approve'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const KV = ({ label, value }) => (
  <Box>
    <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 10.5 }}>
      {label}
    </Typography>
    <Typography sx={{ fontSize: 13, color: '#0f172a', mt: 0.25 }}>{value || '—'}</Typography>
  </Box>
);

const SectionLabel = ({ children }) => (
  <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4, mb: 1, display: 'block' }}>
    {children}
  </Typography>
);

const tableSx = {
  width: '100%',
  borderCollapse: 'separate',
  borderSpacing: 0,
  fontSize: 13,
  '& th': {
    textAlign: 'left',
    padding: '8px 10px',
    fontWeight: 600,
    color: '#475569',
    background: '#f8fafc',
    borderBottom: '1px solid #e5e7eb',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  '& td': {
    padding: '8px 10px',
    color: '#0f172a',
    borderBottom: '1px solid #f1f5f9',
  },
  '& tr:last-of-type td': { borderBottom: 'none' },
};
