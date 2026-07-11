// Students — admin & head-trainer view of the students in their courses, with
// reset-password (returns a shareable temp password) and sudo-login (opens the
// student portal as that student). Scoped server-side; write actions gated to
// head/admin here too.
import { useEffect, useMemo, useState } from 'react';
import { Box, TextField, MenuItem, Table, TableHead, TableRow, TableCell, TableBody, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import GroupsIcon from '@mui/icons-material/GroupsOutlined';
import { coursesApi } from '../../lib/endpoints';
import { studentAuth } from '../../lib/studentApi';
import { isRole } from '../../lib/rbac';
import { PageHeader, Card, EmptyState, Badge, Btn, Skeleton } from '../../lib/lmsUi';

const statusTone = (s) => (s === 'active' ? 'success' : s === 'dropped' ? 'danger' : s === 'on_break' ? 'info' : 'warning');

export default function TrainerStudents() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [program, setProgram] = useState('');
  const [branch, setBranch] = useState('');
  const [toast, setToast] = useState(null);
  const [pw, setPw] = useState(null); // { name, password }
  const [busy, setBusy] = useState('');
  const canManage = isRole('super_admin', 'branch_manager', 'head_trainer');

  const load = () => { setLoading(true); coursesApi.students().then((r) => setRows(r?.data || [])).catch((e) => setToast({ severity: 'error', text: e.message })).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const programs = useMemo(() => [...new Set(rows.map((r) => r.program_name).filter(Boolean))], [rows]);
  const branches = useMemo(() => [...new Set(rows.map((r) => r.branch_name).filter(Boolean))], [rows]);
  const filtered = rows.filter((r) => {
    if (program && r.program_name !== program) return false;
    if (branch && r.branch_name !== branch) return false;
    if (!q.trim()) return true;
    const s = `${r.name} ${r.email} ${r.phone || ''}`.toLowerCase();
    return s.includes(q.trim().toLowerCase());
  });

  const reset = async (s) => {
    if (!window.confirm(`Reset password for ${s.name}? A new temporary password will be generated.`)) return;
    setBusy(s.id);
    try { const r = await coursesApi.resetStudentPassword(s.id); const d = r?.data ?? r; setPw({ name: s.name, password: d.password }); }
    catch (e) { setToast({ severity: 'error', text: e.message }); } finally { setBusy(''); }
  };
  const sudo = async (s) => {
    setBusy(s.id);
    try {
      const r = await coursesApi.sudoStudent(s.id); const d = r?.data ?? r;
      studentAuth.setSession({ access_token: d.access_token, student: d.student, tenantSlug: d.tenantSlug });
      window.open('/student/home', '_blank');
      setToast({ severity: 'success', text: `Opened student portal as ${s.name}` });
    } catch (e) { setToast({ severity: 'error', text: e.message }); } finally { setBusy(''); }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
      <PageHeader
        title="Students"
        subtitle="Everyone enrolled in your courses. Reset a login or sudo-login to troubleshoot."
        icon={GroupsIcon}
        right={(
          <>
            <TextField size="small" placeholder="Search name / email / phone" value={q} onChange={(e) => setQ(e.target.value)} sx={{ minWidth: 240, background: '#fff' }} />
            {programs.length > 1 && (
              <TextField select size="small" label="Course" value={program} onChange={(e) => setProgram(e.target.value)} sx={{ minWidth: 180, background: '#fff' }}>
                <MenuItem value="">All courses</MenuItem>
                {programs.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </TextField>
            )}
            {branches.length > 1 && (
              <TextField select size="small" label="Branch" value={branch} onChange={(e) => setBranch(e.target.value)} sx={{ minWidth: 160, background: '#fff' }}>
                <MenuItem value="">All branches</MenuItem>
                {branches.map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}
              </TextField>
            )}
          </>
        )}
      />

      {loading ? <Card><Skeleton h={16} w="40%" /><div style={{ height: 8 }} /><Skeleton h={12} w="70%" /></Card> : (
        filtered.length === 0 ? <Card><EmptyState icon="👥" title="No students" text="Students appear here once they're confirmed into your courses." /></Card> : (
          <Card pad={0} style={{ overflow: 'hidden' }}>
            <Table size="small">
              <TableHead><TableRow sx={{ background: '#fafbfc', '& th': { color: '#64748b', fontWeight: 700, fontSize: 12 } }}>
                <TableCell>Student</TableCell><TableCell>Course</TableCell><TableCell>Branch</TableCell><TableCell>Batch</TableCell><TableCell align="center">Status</TableCell><TableCell align="right" />
              </TableRow></TableHead>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id} hover>
                    <TableCell>{s.name}<div style={{ fontSize: 11.5, color: '#94a3b8' }}>{s.email}{s.phone ? ` · ${s.phone}` : ''}</div></TableCell>
                    <TableCell sx={{ color: '#64748b' }}>{s.program_name || '—'}</TableCell>
                    <TableCell sx={{ color: '#64748b' }}>{s.branch_name || '—'}</TableCell>
                    <TableCell sx={{ color: '#64748b' }}>{s.batch_name || <Badge tone="warning">No batch</Badge>}</TableCell>
                    <TableCell align="center"><Badge tone={statusTone(s.status)}>{s.status}</Badge></TableCell>
                    <TableCell align="right">
                      {canManage && <Button size="small" disabled={busy === s.id} onClick={() => reset(s)} sx={{ textTransform: 'none' }}>Reset password</Button>}
                      {canManage && <Button size="small" disabled={busy === s.id} onClick={() => sudo(s)} sx={{ textTransform: 'none' }}>Sudo login</Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )
      )}

      {/* Reset-password result */}
      <Dialog open={!!pw} onClose={() => setPw(null)} maxWidth="xs" fullWidth>
        <DialogTitle>New password for {pw?.name}</DialogTitle>
        <DialogContent>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>Share this with the student. They can change it after logging in.</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <code style={{ flex: 1, background: '#f1f5f9', borderRadius: 8, padding: '10px 12px', fontSize: 15, fontWeight: 700, letterSpacing: 0.5 }}>{pw?.password}</code>
            <Button variant="outlined" size="small" onClick={() => { navigator.clipboard?.writeText(pw?.password || ''); setToast({ severity: 'success', text: 'Copied' }); }} sx={{ textTransform: 'none' }}>Copy</Button>
          </div>
        </DialogContent>
        <DialogActions><Button onClick={() => setPw(null)} sx={{ textTransform: 'none' }}>Done</Button></DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)}>{toast.text}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
