// Counsellor-facing "My Students" — the admissions for leads THIS counsellor
// converted (scoped server-side by guided_by_counsellor_id). From here the
// counsellor configures the fee offer and sends the student the admission
// link. They cannot approve/reject/drop — that's the Accounts team's job.
import { useCallback, useEffect, useState } from 'react';
import {
  Box, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Button, Chip, Alert, CircularProgress, Paper, Snackbar, Tooltip, IconButton,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import TuneIcon from '@mui/icons-material/Tune';
import LinkIcon from '@mui/icons-material/Link';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { useNavigate } from 'react-router-dom';
import { admissionsApi } from '../../lib/endpoints';
import ConfigureFeeOffer from '../../components/ConfigureFeeOffer/ConfigureFeeOffer';
import StatusPill from './StatusPill';
import { fmtDate } from './utils';

export default function MyStudents() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offerLeadId, setOfferLeadId] = useState(null);
  const [toast, setToast] = useState(null);

  const reload = useCallback(async () => {
    setError('');
    try {
      // Unified list (server-scoped to this counsellor): converted leads
      // awaiting the student's form + admissions the student has submitted.
      const r = await admissionsApi.myStudents();
      setRows(r?.data || []);
    } catch (e) {
      setError(e?.message || 'Failed to load your students');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const copyShareLink = useCallback(async (leadId) => {
    if (!leadId) return;
    try {
      const r = await admissionsApi.generateShareLink(leadId);
      const token = r?.data?.token;
      if (!token) throw new Error('No token returned');
      const url = `${window.location.origin}/apply/${token}`;
      try {
        await navigator.clipboard.writeText(url);
        setToast({ severity: 'success', text: `Admission link copied (valid 24h).\n${url}` });
      } catch {
        setToast({ severity: 'info', text: `Copy this link manually: ${url}` });
      }
    } catch (e) {
      // A common case: no fee offer yet → 412. Nudge to configure first.
      setToast({ severity: 'error', text: e?.message || 'Configure the fee offer first, then send the link.' });
    }
  }, []);

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Typography variant="h6" sx={{ flex: 1 }}>My Students</Typography>
        <Tooltip title="Refresh"><IconButton size="small" onClick={() => { setLoading(true); reload(); }}><RefreshIcon /></IconButton></Tooltip>
      </Box>
      <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
        Students from the leads you converted. Configure the fee offer, then send the admission link.
        The accounts team verifies and approves once the student submits.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
      ) : rows.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', borderRadius: 2, color: '#94a3b8' }}>
          <Typography sx={{ fontWeight: 600, color: '#475569' }}>No students yet</Typography>
          <Typography sx={{ fontSize: 13 }}>Convert a lead to enrolment and it appears here.</Typography>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ background: '#fafafa' }}>
                <TableCell>Student</TableCell>
                <TableCell>Program</TableCell>
                <TableCell>Admission date</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.admission_id || r.lead_id} hover>
                  <TableCell>{r.student_name || r.email || '—'}</TableCell>
                  <TableCell sx={{ color: '#64748b' }}>{r.program_name || '—'}</TableCell>
                  <TableCell sx={{ color: '#64748b' }}>{fmtDate(r.event_at)}</TableCell>
                  <TableCell align="center">
                    {r.has_admission
                      ? <StatusPill status={r.admission_status} />
                      : <Chip size="small" variant="outlined" label="Awaiting form" sx={{ color: '#b45309', borderColor: '#fcd34d' }} />}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {r.has_admission ? (
                      // Student already submitted → the public link is gone;
                      // the counsellor reviews the filled form (read-only).
                      <Button
                        size="small" variant="outlined" startIcon={<DescriptionOutlinedIcon />}
                        onClick={() => navigate(`/leadlist?focus=${r.lead_id}`)}
                        sx={{ textTransform: 'none' }} disabled={!r.lead_id}
                      >
                        View form
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="small" variant="outlined" startIcon={<TuneIcon />}
                          onClick={() => setOfferLeadId(r.lead_id)} sx={{ mr: 1, textTransform: 'none' }}
                          disabled={!r.lead_id}
                        >
                          Configure offer
                        </Button>
                        <Button
                          size="small" variant="contained" disableElevation startIcon={<LinkIcon />}
                          onClick={() => copyShareLink(r.lead_id)} sx={{ textTransform: 'none', bgcolor: '#E53935', '&:hover': { bgcolor: '#c62828' } }}
                          disabled={!r.lead_id}
                        >
                          Send link
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <ConfigureFeeOffer
        open={Boolean(offerLeadId)}
        leadId={offerLeadId}
        onClose={() => setOfferLeadId(null)}
        onSaved={() => { setOfferLeadId(null); setToast({ severity: 'success', text: 'Fee offer saved. You can now send the admission link.' }); reload(); }}
      />

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)} sx={{ whiteSpace: 'pre-line' }}>{toast.text}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
