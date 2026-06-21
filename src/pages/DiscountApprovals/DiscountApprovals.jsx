// Discount Approvals — for branch/sales managers + super_admin.
// Counsellors who request >10% discounts at the conversion (Enrolled) stage
// land here for a manager decision. The list is team/branch-scoped server-side
// (a manager only sees discounts raised inside their own team/branch). Updates
// live via the discount.* socket events.
import { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Button, Chip, Alert, CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, IconButton, Paper, Tooltip, Avatar, Snackbar,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useNavigate } from 'react-router-dom';
import { leadDiscountsApi } from '../../lib/endpoints';
import { onNotification } from '../../lib/socket';

const initialsColor = (s = '') => {
  const colors = ['#E53935', '#8e24aa', '#1976d2', '#2e7d32', '#f9a825', '#00838f'];
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
};

export default function DiscountApprovals() {
  const navigate = useNavigate();
  // Open the lead in the Lead Manager's edit dialog (same ?focus deep-link the
  // notification bell uses), so a manager can inspect it before deciding.
  const viewLead = (leadId) => { if (leadId) navigate(`/leadlist?focus=${leadId}`); };
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [approving, setApproving] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await leadDiscountsApi.pending();
      setRows(res?.data || []);
    } catch (e) {
      setError(e.message || 'Failed to load pending discounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live: refresh when a new request comes in or a peer decides one.
  useEffect(() => {
    const off = onNotification((evt) => {
      if (evt?.type === 'discount.requested' || evt?.type === 'discount.decided') load();
    });
    return () => off();
  }, [load]);

  const submitApprove = async (finalPct) => {
    const row = approving;
    setApproving(null);
    setBusyId(row.id); setError('');
    try {
      const edited = finalPct !== '' && finalPct != null && Number(finalPct) !== Number(row.discount_percent);
      await leadDiscountsApi.decide(row.lead_id, {
        decision: 'approved',
        ...(edited ? { final_percent: Number(finalPct) } : {}),
      });
      const pct = edited ? Number(finalPct) : Number(row.discount_percent);
      setToast({ severity: 'success', text: `Approved ${pct}% for ${row.lead_name || 'lead'} — lead converted` });
      await load();
    } catch (e) {
      setError(e.message || 'Failed to approve');
    } finally {
      setBusyId(null);
    }
  };

  const submitReject = async (reason) => {
    const row = rejecting;
    setRejecting(null);
    setBusyId(row.id); setError('');
    try {
      await leadDiscountsApi.decide(row.lead_id, { decision: 'rejected', reject_reason: reason || undefined });
      setToast({ severity: 'info', text: `Rejected ${Number(row.discount_percent)}% for ${row.lead_name || 'lead'}` });
      await load();
    } catch (e) {
      setError(e.message || 'Failed to reject');
    } finally {
      setBusyId(null);
    }
  };

  const count = rows.length;

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
        <LocalOfferOutlinedIcon sx={{ color: '#E53935' }} />
        <Typography variant="h6" sx={{ flex: 1 }}>Discount Approvals</Typography>
        <Tooltip title="Refresh">
          <IconButton size="small" onClick={() => { setLoading(true); load(); }}><RefreshIcon /></IconButton>
        </Tooltip>
      </Box>
      <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
        Discounts above 10% requested by counsellors at the point of conversion. The lead is held
        un-converted until you decide. Approving (you can adjust the %) converts the lead; rejecting
        keeps it un-converted. The counsellor is notified either way.
      </Typography>

      {/* Summary strip */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 2 }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: count ? '#fff3e0' : '#f1f5f9',
        }}>
          <Typography sx={{ fontWeight: 700, color: count ? '#f9a825' : '#94a3b8' }}>{count}</Typography>
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
            {count === 0 ? 'No pending approvals' : `${count} discount${count === 1 ? '' : 's'} awaiting your decision`}
          </Typography>
          <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>
            You only see requests raised inside your branch / team.
          </Typography>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
      ) : count === 0 ? (
        <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', borderRadius: 2, color: '#94a3b8' }}>
          <CheckCircleOutlineIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
          <Typography sx={{ fontWeight: 600, color: '#475569' }}>All caught up</Typography>
          <Typography sx={{ fontSize: 13 }}>No discount requests need your approval right now.</Typography>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ background: '#fafafa' }}>
                <TableCell>Lead</TableCell>
                <TableCell align="center">Discount</TableCell>
                <TableCell>Requested by</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell align="right">Decision</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: initialsColor(r.lead_name || '') }}>
                        {(r.lead_name || '?')[0]?.toUpperCase()}
                      </Avatar>
                      {/* Click the name to open the lead in the Lead Manager. */}
                      <Tooltip title="View lead">
                        <Box
                          component="span"
                          onClick={() => viewLead(r.lead_id)}
                          sx={{ color: '#1976d2', cursor: 'pointer', fontWeight: 500, '&:hover': { textDecoration: 'underline' } }}
                        >
                          {r.lead_name || r.lead_id?.slice(0, 8)}
                        </Box>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Chip size="small" color="warning" label={`${Number(r.discount_percent)}%`} sx={{ fontWeight: 700 }} />
                  </TableCell>
                  <TableCell>{r.requested_by_name || '—'}</TableCell>
                  <TableCell sx={{ maxWidth: 240, whiteSpace: 'normal', color: '#64748b' }}>{r.reason || '—'}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="View lead">
                      <IconButton size="small" onClick={() => viewLead(r.lead_id)} sx={{ mr: 0.5 }}>
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Button
                      size="small" variant="contained" color="success" disableElevation
                      startIcon={<CheckCircleOutlineIcon />} disabled={busyId === r.id}
                      onClick={() => setApproving(r)} sx={{ mr: 1, textTransform: 'none' }}
                    >
                      Approve
                    </Button>
                    <Button
                      size="small" variant="outlined" color="error"
                      startIcon={<HighlightOffIcon />} disabled={busyId === r.id}
                      onClick={() => setRejecting(r)} sx={{ textTransform: 'none' }}
                    >
                      Reject
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <ApproveDialog open={!!approving} row={approving} onClose={() => setApproving(null)} onSubmit={submitApprove} />
      <RejectDialog open={!!rejecting} lead={rejecting?.lead_name} onClose={() => setRejecting(null)} onSubmit={submitReject} />

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)}>{toast.text}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}

function ApproveDialog({ open, row, onClose, onSubmit }) {
  const [pct, setPct] = useState('');
  useEffect(() => { if (open && row) setPct(String(Number(row.discount_percent))); }, [open, row]);
  if (!row) return null;
  const requested = Number(row.discount_percent);
  const edited = pct !== '' && Number(pct) !== requested;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Approve discount{row.lead_name ? ` · ${row.lead_name}` : ''}</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 13, color: '#64748b', mb: 1.5 }}>
          Requested <strong>{requested}%</strong> by {row.requested_by_name || 'a counsellor'}.
          You can grant a different % below. Approving will convert the lead.
        </Typography>
        <TextField
          size="small" type="number" fullWidth autoFocus label="Approved discount %"
          value={pct} onChange={(e) => setPct(e.target.value)}
          inputProps={{ min: 0, max: 100, step: 1 }}
        />
        {edited && (
          <Alert severity="info" sx={{ mt: 1.5, fontSize: 12, py: 0 }}>
            Granting {Number(pct)}% instead of the requested {requested}%.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="success" variant="contained" disableElevation onClick={() => onSubmit(pct)}>
          Approve &amp; convert
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function RejectDialog({ open, lead, onClose, onSubmit }) {
  const [reason, setReason] = useState('');
  useEffect(() => { if (open) setReason(''); }, [open]);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Reject discount{lead ? ` · ${lead}` : ''}</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 13, color: '#64748b', mb: 1.5 }}>
          The counsellor will be notified. A reason helps them adjust the offer.
        </Typography>
        <TextField
          size="small" fullWidth autoFocus label="Reason (optional)"
          value={reason} onChange={(e) => setReason(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="error" variant="contained" disableElevation onClick={() => onSubmit(reason)}>Reject discount</Button>
      </DialogActions>
    </Dialog>
  );
}
