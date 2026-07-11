// Placement Applications — per-opening pipeline using the team's OWN dynamic
// stages. Pick an opening, move each candidate through the configured stages;
// moving into a Rejected/dropped stage requires a reason. Each candidate has a
// timestamped stage-history timeline.
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Box, MenuItem, TextField, Table, TableHead, TableRow, TableCell, TableBody, Snackbar, Alert,
  IconButton, Collapse, Dialog, DialogTitle, DialogContent, DialogActions, Button,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/PeopleAltOutlined';
import HistoryIcon from '@mui/icons-material/HistoryOutlined';
import { placementApi } from '../../lib/endpoints';
import { PageHeader, Card, EmptyState, Badge, Skeleton } from '../../lib/lmsUi';
import { fmtDate } from '../Accounts/utils';

const kindTone = (k) => (k === 'success' ? 'success' : k === 'rejected' ? 'danger' : 'info');
const REJECT_REASONS = ['Candidate dropped', 'Client dropped', 'Rejected in interview', 'Did not appear'];

export default function PlacementApplications() {
  const [params] = useSearchParams();
  const [openings, setOpenings] = useState([]);
  const [openingId, setOpeningId] = useState(params.get('opening') || '');
  const [stages, setStages] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [history, setHistory] = useState({});
  const [rejectFor, setRejectFor] = useState(null); // { app, stage }
  const [reason, setReason] = useState('');

  useEffect(() => {
    Promise.all([placementApi.listOpenings('open'), placementApi.listOpenings('closed'), placementApi.stages()])
      .then(([a, b, s]) => { setOpenings([...(a?.data || []), ...(b?.data || [])]); setStages(s?.data || []); })
      .catch(() => {});
  }, []);
  const load = () => { if (!openingId) { setRows([]); return; } setLoading(true); placementApi.applications(openingId).then((r) => setRows(r?.data || [])).catch((e) => setToast({ severity: 'error', text: e.message })).finally(() => setLoading(false)); };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [openingId]);

  const loadHistory = (a) => {
    if (expanded === a.id) { setExpanded(null); return; }
    setExpanded(a.id);
    placementApi.applicationHistory(a.id).then((r) => setHistory((h) => ({ ...h, [a.id]: r?.data || [] }))).catch(() => {});
  };

  const move = async (a, stageId, reasonText) => {
    try {
      await placementApi.moveStage(a.id, { stage_id: stageId, reason: reasonText || undefined });
      load();
      if (expanded === a.id) placementApi.applicationHistory(a.id).then((r) => setHistory((h) => ({ ...h, [a.id]: r?.data || [] })));
    } catch (e) { setToast({ severity: 'error', text: e.message }); }
  };
  const onPickStage = (a, stageId) => {
    const stage = stages.find((s) => s.id === stageId);
    if (!stage) return;
    if (stage.kind === 'rejected') { setRejectFor({ app: a, stage }); setReason(''); return; }
    move(a, stageId);
  };
  const confirmReject = () => {
    if (!reason.trim()) { setToast({ severity: 'error', text: 'A reason is required' }); return; }
    move(rejectFor.app, rejectFor.stage.id, reason.trim());
    setRejectFor(null); setReason('');
  };

  const noStages = stages.length === 0;

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
      <PageHeader title="Applications" subtitle="Move each candidate through your hiring pipeline." icon={PeopleIcon}
        right={(
          <TextField select size="small" label="Opening" value={openingId} onChange={(e) => setOpeningId(e.target.value)} sx={{ minWidth: 280, background: '#fff' }}>
            {openings.map((o) => <MenuItem key={o.id} value={o.id}>{o.title} · {o.company_name}</MenuItem>)}
          </TextField>
        )}
      />

      {noStages && (
        <Card style={{ marginBottom: 14, borderColor: '#fde68a', background: '#fffbeb' }}>
          <div style={{ fontSize: 13.5, color: '#92400e' }}>
            No pipeline stages defined yet. <Link to="/placement/stages" style={{ color: '#b45309', fontWeight: 700 }}>Set up your stages</Link> (e.g. Resume Shortlisted → L1 → L2 → Joined) to start moving candidates.
          </div>
        </Card>
      )}

      {!openingId && <Card><EmptyState icon="📋" title="Pick an opening" text="Choose an opening above to see its applicants." /></Card>}
      {openingId && (loading ? <Card><Skeleton h={16} w="40%" /><div style={{ height: 8 }} /><Skeleton h={12} w="70%" /></Card>
        : rows.length === 0 ? <Card><EmptyState icon="📋" title="No candidates yet" text="Fire this opening to eligible students, or wait for applications." /></Card> : (
          <Card pad={0} style={{ overflow: 'hidden' }}>
            <Table size="small">
              <TableHead><TableRow sx={{ background: '#fafbfc', '& th': { color: '#64748b', fontWeight: 700, fontSize: 12 } }}>
                <TableCell>Student</TableCell><TableCell align="center">CV</TableCell><TableCell align="center">Current stage</TableCell><TableCell align="right">Move to stage</TableCell><TableCell align="center">History</TableCell>
              </TableRow></TableHead>
              <TableBody>{rows.map((a) => (
                <>
                  <TableRow key={a.id} hover>
                    <TableCell>
                      <Link to={`/placement/students/${a.student_id}`} style={{ fontWeight: 600, color: '#0f172a', textDecoration: 'none' }}>{a.name}</Link>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{a.email}</div>
                    </TableCell>
                    <TableCell align="center">
                      {a.cv_url ? <a href={a.cv_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontSize: 12.5, fontWeight: 600 }}>View CV</a> : <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>}
                    </TableCell>
                    <TableCell align="center">
                      {a.stage_name ? <Badge tone={kindTone(a.stage_kind)}>{a.stage_name}</Badge> : <Badge tone="warning">{a.status}</Badge>}
                      {a.offer_ctc && <div style={{ fontSize: 11, color: '#059669', marginTop: 2 }}>{a.offer_ctc}</div>}
                    </TableCell>
                    <TableCell align="right">
                      <TextField select size="small" value={a.stage_id || ''} onChange={(e) => onPickStage(a, e.target.value)} disabled={noStages} sx={{ minWidth: 170 }} SelectProps={{ displayEmpty: true }}>
                        <MenuItem value="" disabled>Select stage…</MenuItem>
                        {stages.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                      </TextField>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => loadHistory(a)}><HistoryIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                  <TableRow key={`${a.id}-h`}>
                    <TableCell colSpan={5} sx={{ p: 0, border: 0 }}>
                      <Collapse in={expanded === a.id} unmountOnExit>
                        <Box sx={{ p: 2, background: '#f8fafc' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>Stage history</div>
                          {(history[a.id] || []).length === 0 ? <div style={{ fontSize: 13, color: '#94a3b8' }}>No stage moves yet.</div> : (
                            <div style={{ display: 'grid', gap: 6 }}>
                              {(history[a.id] || []).map((h) => (
                                <div key={h.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline', fontSize: 13 }}>
                                  <span style={{ color: '#94a3b8', minWidth: 150, fontVariantNumeric: 'tabular-nums' }}>{fmtDate(h.created_at)}</span>
                                  <Badge tone={kindTone(h.stage_kind)}>{h.stage_name}</Badge>
                                  {h.reason && <span style={{ color: '#b45309' }}>· {h.reason}</span>}
                                  {h.moved_by_name && <span style={{ color: '#cbd5e1' }}>· by {h.moved_by_name}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </>
              ))}</TableBody>
            </Table>
          </Card>
        ))}

      {/* Reason dialog for reject/drop */}
      <Dialog open={!!rejectFor} onClose={() => setRejectFor(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Reason for {rejectFor?.stage?.name}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 1.5, pt: 1 }}>
          <TextField select size="small" label="Reason" value={REJECT_REASONS.includes(reason) ? reason : (reason ? '__other' : '')} onChange={(e) => setReason(e.target.value === '__other' ? ' ' : e.target.value)}>
            {REJECT_REASONS.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            <MenuItem value="__other">Other…</MenuItem>
          </TextField>
          <TextField size="small" label="Details" multiline minRows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What happened?" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectFor(null)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmReject} sx={{ textTransform: 'none' }}>Confirm</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)}>{toast.text}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
