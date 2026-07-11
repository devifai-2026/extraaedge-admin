// HR Certificates — pick a course to see issued certificates and bulk-generate
// them for students who have completed the whole course (idempotent).
import { useEffect, useState } from 'react';
import { Box, MenuItem, TextField, Table, TableHead, TableRow, TableCell, TableBody, Snackbar, Alert, Button } from '@mui/material';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import { programsApi, learningApi } from '../../lib/endpoints';
import { PageHeader, Card, EmptyState, Btn, Skeleton } from '../../lib/lmsUi';

const fmtDate = (v) => { try { return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return ''; } };

export default function HrCertificates() {
  const [programs, setPrograms] = useState([]);
  const [programId, setProgramId] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { programsApi.list().then((r) => setPrograms(r?.data || [])).catch(() => {}); }, []);
  const load = () => { if (!programId) { setRows([]); return; } setLoading(true); learningApi.hrCertificates(programId).then((r) => setRows(r?.data || [])).catch((e) => setToast({ severity: 'error', text: e.message })).finally(() => setLoading(false)); };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [programId]);

  const generate = async () => {
    if (!programId) return;
    setBusy(true);
    try { const r = await learningApi.hrAutoIssue({ program_id: programId }); const d = r?.data ?? r; setToast({ severity: 'success', text: `Issued ${d.issued} new certificate${d.issued === 1 ? '' : 's'} (of ${d.total_students} students)` }); load(); }
    catch (e) { setToast({ severity: 'error', text: e.message }); } finally { setBusy(false); }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
      <PageHeader
        title="Certificates"
        subtitle="Certificates auto-issue on course completion. Pick a course to review or bulk-generate."
        icon={WorkspacePremiumIcon}
        right={(
          <>
            <TextField select size="small" label="Course" value={programId} onChange={(e) => setProgramId(e.target.value)} sx={{ minWidth: 260, background: '#fff' }}>
              {programs.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </TextField>
            {programId && <Btn onClick={generate} disabled={busy}>{busy ? 'Generating…' : 'Generate for completed'}</Btn>}
          </>
        )}
      />
      {!programId && <Card><EmptyState icon="🎓" title="Pick a course" text="Choose a course above to see its issued certificates." /></Card>}
      {programId && (loading ? <Card><Skeleton h={16} w="40%" /><div style={{ height: 8 }} /><Skeleton h={12} w="70%" /></Card>
        : rows.length === 0 ? <Card><EmptyState icon="🎓" title="No certificates yet" text="Certificates appear here as students complete the course. Use “Generate for completed” to issue any pending ones." /></Card> : (
          <Card pad={0} style={{ overflow: 'hidden' }}>
            <Table size="small">
              <TableHead><TableRow sx={{ background: '#fafbfc', '& th': { color: '#64748b', fontWeight: 700, fontSize: 12 } }}><TableCell>Student</TableCell><TableCell>Certificate No.</TableCell><TableCell>Issued</TableCell><TableCell>By</TableCell></TableRow></TableHead>
              <TableBody>{rows.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell>{c.student_name}<div style={{ fontSize: 11, color: '#94a3b8' }}>{c.student_email}</div></TableCell>
                  <TableCell sx={{ fontWeight: 700, letterSpacing: 0.5 }}>{c.certificate_number}</TableCell>
                  <TableCell sx={{ color: '#64748b' }}>{fmtDate(c.issued_at)}</TableCell>
                  <TableCell sx={{ color: '#64748b' }}>{c.issued_by_name || 'Auto'}</TableCell>
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
