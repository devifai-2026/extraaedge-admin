// Placement Applications — per-opening pipeline. Pick an opening, then move each
// applicant through fired → applied → shortlisted → selected / rejected.
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, MenuItem, TextField, Table, TableHead, TableRow, TableCell, TableBody, Snackbar, Alert } from '@mui/material';
import PeopleIcon from '@mui/icons-material/PeopleAltOutlined';
import { placementApi } from '../../lib/endpoints';
import { PageHeader, Card, EmptyState, Badge, Skeleton } from '../../lib/lmsUi';

const STATUSES = ['fired', 'applied', 'shortlisted', 'offer', 'selected', 'rejected'];
const tone = (s) => (s === 'selected' ? 'success' : s === 'rejected' ? 'danger' : s === 'offer' ? 'success' : s === 'shortlisted' ? 'info' : s === 'applied' ? 'accent' : 'warning');

export default function PlacementApplications() {
  const [params] = useSearchParams();
  const [openings, setOpenings] = useState([]);
  const [openingId, setOpeningId] = useState(params.get('opening') || '');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    Promise.all([placementApi.listOpenings('open'), placementApi.listOpenings('closed')])
      .then(([a, b]) => setOpenings([...(a?.data || []), ...(b?.data || [])])).catch(() => {});
  }, []);
  const load = () => { if (!openingId) { setRows([]); return; } setLoading(true); placementApi.applications(openingId).then((r) => setRows(r?.data || [])).catch((e) => setToast({ severity: 'error', text: e.message })).finally(() => setLoading(false)); };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [openingId]);

  const setStatus = async (a, status) => {
    try {
      // Moving to "offer" prompts for the CTC offered (stored on the application).
      let offer_ctc;
      if (status === 'offer') {
        // eslint-disable-next-line no-alert
        offer_ctc = window.prompt('CTC offered (e.g. ₹6.5 LPA)?', a.offer_ctc || '') || undefined;
      }
      await placementApi.setApplicationStatus(a.id, { status, offer_ctc });
      load();
    } catch (e) { setToast({ severity: 'error', text: e.message }); }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
      <PageHeader title="Applications" subtitle="Track each opening's candidates through the hiring pipeline." icon={PeopleIcon}
        right={(
          <TextField select size="small" label="Opening" value={openingId} onChange={(e) => setOpeningId(e.target.value)} sx={{ minWidth: 280, background: '#fff' }}>
            {openings.map((o) => <MenuItem key={o.id} value={o.id}>{o.title} · {o.company_name}</MenuItem>)}
          </TextField>
        )}
      />
      {!openingId && <Card><EmptyState icon="📋" title="Pick an opening" text="Choose an opening above to see its applicants." /></Card>}
      {openingId && (loading ? <Card><Skeleton h={16} w="40%" /><div style={{ height: 8 }} /><Skeleton h={12} w="70%" /></Card>
        : rows.length === 0 ? <Card><EmptyState icon="📋" title="No candidates yet" text="Fire this opening to eligible students, or wait for applications." /></Card> : (
          <Card pad={0} style={{ overflow: 'hidden' }}>
            <Table size="small">
              <TableHead><TableRow sx={{ background: '#fafbfc', '& th': { color: '#64748b', fontWeight: 700, fontSize: 12 } }}><TableCell>Student</TableCell><TableCell align="center">CV</TableCell><TableCell align="center">Status</TableCell><TableCell align="right">Move to</TableCell></TableRow></TableHead>
              <TableBody>{rows.map((a) => (
                <TableRow key={a.id} hover>
                  <TableCell>{a.name}<div style={{ fontSize: 11, color: '#94a3b8' }}>{a.email}</div></TableCell>
                  <TableCell align="center">
                    {a.cv_url
                      ? <a href={a.cv_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontSize: 12.5, fontWeight: 600 }}>View CV</a>
                      : <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>}
                  </TableCell>
                  <TableCell align="center">
                    <Badge tone={tone(a.status)}>{a.status}</Badge>
                    {a.status === 'offer' && a.offer_ctc && <div style={{ fontSize: 11, color: '#059669', marginTop: 2 }}>{a.offer_ctc}</div>}
                  </TableCell>
                  <TableCell align="right">
                    <TextField select size="small" value={a.status} onChange={(e) => setStatus(a, e.target.value)} sx={{ minWidth: 150 }}>
                      {STATUSES.map((st) => <MenuItem key={st} value={st}>{st}</MenuItem>)}
                    </TextField>
                  </TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          </Card>
        ))}
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)}>{toast.text}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
