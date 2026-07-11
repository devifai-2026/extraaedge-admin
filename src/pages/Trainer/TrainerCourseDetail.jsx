// Course detail — the head trainer's LMS hub for one course. Tabs:
//  • Modules   — each module expands to its classes + study materials + trainer
//  • Trainers  — assign head/trainers to the course (and to modules)
//  • Batches   — create/place students, merge cohorts (merge open to any trainer)
//  • Attendance— per-student attendance history across the course
// Write actions are gated to head_trainer/admin (canManage); trainers get a
// read view + batch merge. The backend enforces the same rules.
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Tabs, Tab, Button, TextField, Alert, Snackbar, Chip,
  CircularProgress, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, MenuItem, FormControlLabel, Checkbox, Table, TableHead, TableRow, TableCell, TableBody,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import MergeIcon from '@mui/icons-material/CallMerge';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import { PageHeader, Card, EmptyState, Badge, Btn, Progress, ACCENT } from '../../lib/lmsUi';
import { coursesApi, classesApi, learningApi } from '../../lib/endpoints';
import { isRole } from '../../lib/rbac';
import { fmtDate } from '../Accounts/utils';
import StudentProfileDialog from '../../components/StudentProfileDialog/StudentProfileDialog';

const TAB_INDEX = { modules: 0, trainers: 1, batches: 2, attendance: 3 };

export default function TrainerCourseDetail() {
  const { programId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(TAB_INDEX[searchParams.get('tab')] ?? 0);
  const [course, setCourse] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const canManage = isRole('super_admin', 'branch_manager', 'head_trainer');

  useEffect(() => {
    coursesApi.get(programId).then((r) => setCourse(r?.data || null)).catch((e) => setError(e?.message || 'Failed to load course'));
  }, [programId]);

  const notify = (severity, text) => setToast({ severity, text });

  return (
    <Box sx={{ p: 3, maxWidth: 1040, mx: 'auto' }}>
      <PageHeader
        title={course?.name || 'Course'}
        subtitle={canManage ? "Manage this course's modules, trainers, batches and attendance." : 'View modules, classes, materials and attendance. You can merge batches.'}
        icon={SchoolOutlinedIcon}
        right={<Btn variant="ghost" size="sm" onClick={() => navigate('/trainer/courses')}><ArrowBackIcon sx={{ fontSize: 16 }} /> All courses</Btn>}
      />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Modules" />
        <Tab label="Trainers" />
        <Tab label="Batches" />
        <Tab label="Attendance" />
      </Tabs>

      {tab === 0 && <ModulesTab programId={programId} notify={notify} canManage={canManage} />}
      {tab === 1 && <TrainersTab programId={programId} notify={notify} canManage={canManage} />}
      {tab === 2 && <BatchesTab programId={programId} notify={notify} canManage={canManage} />}
      {tab === 3 && <AttendanceTab programId={programId} notify={notify} />}

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)}>{toast.text}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}

// ---------- Modules (each expands to classes + materials) ----------
function ModulesTab({ programId, notify, canManage }) {
  const [rows, setRows] = useState([]);
  const [classes, setClasses] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [open, setOpen] = useState({}); // moduleId → expanded

  const load = useCallback(() => {
    Promise.all([
      coursesApi.listModules(programId),
      classesApi.list({ programId }).catch(() => ({ data: [] })),
      learningApi.listMaterials(programId).catch(() => ({ data: [] })),
    ]).then(([m, c, mat]) => { setRows(m?.data || []); setClasses(c?.data || []); setMaterials(mat?.data || []); })
      .catch((e) => notify('error', e.message)).finally(() => setLoading(false));
  }, [programId, notify]);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!name.trim()) return;
    try { await coursesApi.createModule(programId, { name: name.trim(), order_index: rows.length }); setName(''); load(); notify('success', 'Module added'); }
    catch (e) { notify('error', e.message); }
  };
  const remove = async (id) => {
    if (!window.confirm('Delete this module?')) return;
    try { await coursesApi.deleteModule(programId, id); load(); notify('success', 'Module removed'); } catch (e) { notify('error', e.message); }
  };
  const openMaterial = async (id) => {
    try { const r = await learningApi.materialUrl(id); const u = (r?.data ?? r)?.url; if (u) window.open(u, '_blank', 'noreferrer'); } catch (e) { notify('error', e.message); }
  };

  if (loading) return <CircularProgress />;
  return (
    <div>
      {canManage && (
        <Card style={{ marginBottom: 14 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField size="small" label="New module (e.g. HTML)" value={name} onChange={(e) => setName(e.target.value)} sx={{ flex: 1 }} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} />
            <Button variant="contained" startIcon={<AddIcon />} onClick={add} sx={{ textTransform: 'none', bgcolor: '#E53935', '&:hover': { bgcolor: '#c62828' } }}>Add module</Button>
          </Box>
        </Card>
      )}

      {rows.length === 0 ? (
        <Card><EmptyState icon="🧩" title="No modules yet" text={canManage ? 'Add your first module above (e.g. “HTML”). Then schedule classes and upload materials into it.' : 'The head trainer hasn’t set up modules yet.'} /></Card>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {rows.map((m, i) => {
            const mClasses = classes.filter((c) => c.module_id === m.id);
            const mMaterials = materials.filter((x) => x.module_id === m.id);
            const isOpen = !!open[m.id];
            return (
              <Card key={m.id} pad={0} style={{ overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14, cursor: 'pointer' }} onClick={() => setOpen((s) => ({ ...s, [m.id]: !s[m.id] }))}>
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: `color-mix(in srgb, ${ACCENT} 12%, transparent)`, color: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{m.name}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{mClasses.length} class{mClasses.length === 1 ? '' : 'es'} · {mMaterials.length} material{mMaterials.length === 1 ? '' : 's'}</div>
                  </div>
                  {m.trainer_name ? <Badge tone="neutral">{m.trainer_name}</Badge> : <Badge tone="warning">No trainer</Badge>}
                  {canManage && <IconButton size="small" onClick={(e) => { e.stopPropagation(); remove(m.id); }}><DeleteOutlineIcon fontSize="small" /></IconButton>}
                  <span style={{ color: '#94a3b8', fontSize: 18, width: 18, textAlign: 'center' }}>{isOpen ? '▾' : '▸'}</span>
                </div>

                {isOpen && (
                  <div style={{ borderTop: '1px solid #eef0f5', padding: 14, background: '#fafbfc' }}>
                    {Array.isArray(m.syllabus) && m.syllabus.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <SubHead>Syllabus</SubHead>
                        <ul style={{ margin: '4px 0 0', paddingLeft: 18, color: '#475569', fontSize: 13, display: 'grid', gap: 2 }}>
                          {m.syllabus.map((s, j) => <li key={j}>{typeof s === 'string' ? s : (s?.title || JSON.stringify(s))}</li>)}
                        </ul>
                      </div>
                    )}
                    <div style={{ marginBottom: 12 }}>
                      <SubHead>Classes ({mClasses.length})</SubHead>
                      {mClasses.length === 0 ? <Muted>No classes scheduled in this module yet.</Muted> : (
                        <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
                          {mClasses.map((c) => (
                            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', fontSize: 13, background: '#fff', border: '1px solid #eef0f5', borderRadius: 8, padding: '7px 10px' }}>
                              <div><b style={{ color: '#0f172a' }}>{c.title}</b> <span style={{ color: '#94a3b8' }}>· {c.batch_name}</span></div>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span style={{ color: '#64748b', fontSize: 12 }}>{fmtDate(c.starts_at)}</span>
                                {c.ended_at ? <Badge tone="neutral">Ended</Badge> : c.started_at ? <Badge tone="danger">● LIVE</Badge> : <Badge tone="warning">Scheduled</Badge>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <SubHead>Materials ({mMaterials.length})</SubHead>
                      {mMaterials.length === 0 ? <Muted>No materials uploaded to this module yet.</Muted> : (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                          {mMaterials.map((x) => (
                            <button key={x.id} onClick={() => openMaterial(x.id)} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', border: '1px solid #cbd5e1', background: '#fff', borderRadius: 999, padding: '5px 12px', fontSize: 12.5, cursor: 'pointer', color: '#334155' }}>
                              {x.kind === 'link' ? '🔗' : '📄'} {x.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- Trainers ----------
function TrainersTab({ programId, notify, canManage }) {
  const [rows, setRows] = useState([]);
  const [modules, setModules] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ user_id: '', role: 'trainer', module_id: '' });
  const load = useCallback(() => {
    Promise.all([coursesApi.listTrainers(programId), coursesApi.listModules(programId)])
      .then(([t, m]) => { setRows(t?.data || []); setModules(m?.data || []); })
      .catch((e) => notify('error', e.message)).finally(() => setLoading(false));
  }, [programId, notify]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { coursesApi.assignableStaff().then((r) => setStaff(r?.data || [])).catch(() => {}); }, []);

  const add = async () => {
    if (!form.user_id) return;
    try {
      await coursesApi.addTrainer(programId, { user_id: form.user_id, role: form.role, module_id: form.module_id || null });
      setForm({ user_id: '', role: 'trainer', module_id: '' }); load(); notify('success', 'Trainer added');
    } catch (e) { notify('error', e.message); }
  };
  const remove = async (id) => { try { await coursesApi.removeTrainer(programId, id); load(); } catch (e) { notify('error', e.message); } };

  if (loading) return <CircularProgress />;
  return (
    <Card>
      {canManage && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField size="small" select label="User" value={form.user_id} onChange={(e) => setForm((s) => ({ ...s, user_id: e.target.value }))} sx={{ minWidth: 200 }}
            helperText={staff.length === 0 ? 'No head_trainer/trainer users yet — create one from Users & Roles.' : undefined}>
            {staff.map((u) => <MenuItem key={u.id} value={u.id}>{u.name} ({u.role})</MenuItem>)}
          </TextField>
          <TextField size="small" select label="Role" value={form.role} onChange={(e) => setForm((s) => ({ ...s, role: e.target.value }))} sx={{ width: 130 }}>
            <MenuItem value="trainer">Trainer</MenuItem>
            <MenuItem value="head">Head</MenuItem>
          </TextField>
          <TextField size="small" select label="Module (optional)" value={form.module_id} onChange={(e) => setForm((s) => ({ ...s, module_id: e.target.value }))} sx={{ minWidth: 160 }}>
            <MenuItem value="">—</MenuItem>
            {modules.map((m) => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
          </TextField>
          <Button variant="contained" startIcon={<AddIcon />} onClick={add} sx={{ textTransform: 'none', bgcolor: '#E53935', '&:hover': { bgcolor: '#c62828' } }}>Add</Button>
        </Box>
      )}
      {rows.length === 0 ? <EmptyState icon="🧑‍🏫" title="No trainers yet" text="Assign a head trainer and module trainers to this course." /> : (
        <Table size="small">
          <TableHead><TableRow sx={{ background: '#fafbfc', '& th': { color: '#64748b', fontWeight: 700, fontSize: 12 } }}><TableCell>Name</TableCell><TableCell>Role</TableCell><TableCell>Module</TableCell><TableCell align="right" /></TableRow></TableHead>
          <TableBody>
            {rows.map((t) => (
              <TableRow key={t.id} hover>
                <TableCell>{t.user_name}<div style={{ fontSize: 11, color: '#94a3b8' }}>{t.user_email}</div></TableCell>
                <TableCell>{t.role === 'head' ? <Chip size="small" color="primary" label="Head" /> : 'Trainer'}</TableCell>
                <TableCell sx={{ color: '#64748b' }}>{t.module_name || '— (whole course)'}</TableCell>
                <TableCell align="right">{canManage && <IconButton size="small" onClick={() => remove(t.id)}><DeleteOutlineIcon fontSize="small" /></IconButton>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

// ---------- Batches ----------
function BatchesTab({ programId, notify, canManage }) {
  const [batches, setBatches] = useState([]);
  const [unassigned, setUnassigned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newBatch, setNewBatch] = useState('');
  const [placeDlg, setPlaceDlg] = useState(null);
  const [mergeDlg, setMergeDlg] = useState(false);
  const [profileId, setProfileId] = useState(null);

  const load = useCallback(() => {
    Promise.all([coursesApi.listBatches(programId), coursesApi.listUnassignedStudents(programId).catch(() => ({ data: [] }))])
      .then(([b, u]) => { setBatches(b?.data || []); setUnassigned(u?.data || []); })
      .catch((e) => notify('error', e.message)).finally(() => setLoading(false));
  }, [programId, notify]);
  useEffect(() => { load(); }, [load]);

  const createBatch = async () => {
    if (!newBatch.trim()) return;
    try { await coursesApi.createBatch(programId, { name: newBatch.trim() }); setNewBatch(''); load(); notify('success', 'Batch created'); }
    catch (e) { notify('error', e.message); }
  };

  if (loading) return <CircularProgress />;
  const activeBatches = batches.filter((b) => b.status !== 'merged');

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card title="Batches" right={<Button size="small" startIcon={<MergeIcon />} variant="outlined" disabled={activeBatches.length < 2} onClick={() => setMergeDlg(true)} sx={{ textTransform: 'none' }}>Merge</Button>}>
        {canManage && (
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField size="small" label="New batch (e.g. MERN-Aug)" value={newBatch} onChange={(e) => setNewBatch(e.target.value)} sx={{ flex: 1 }} onKeyDown={(e) => { if (e.key === 'Enter') createBatch(); }} />
            <Button variant="contained" startIcon={<AddIcon />} onClick={createBatch} sx={{ textTransform: 'none', bgcolor: '#E53935', '&:hover': { bgcolor: '#c62828' } }}>Create</Button>
          </Box>
        )}
        {activeBatches.length === 0 ? <EmptyState icon="👥" title="No batches yet" text="Create a batch (a cohort) — classes are scheduled into a batch." /> : (
          <Table size="small">
            <TableHead><TableRow sx={{ background: '#fafbfc', '& th': { color: '#64748b', fontWeight: 700, fontSize: 12 } }}><TableCell>Batch</TableCell><TableCell align="center">Students</TableCell><TableCell>Started</TableCell></TableRow></TableHead>
            <TableBody>{activeBatches.map((b) => (
              <TableRow key={b.id} hover><TableCell>{b.name}</TableCell><TableCell align="center">{b.student_count}</TableCell><TableCell sx={{ color: '#64748b' }}>{b.start_date ? fmtDate(b.start_date) : '—'}</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        )}
      </Card>

      {canManage && (
        <Card title={`Unassigned students (${unassigned.length})`}>
          {unassigned.length === 0 ? <Muted>Everyone is placed in a batch.</Muted> : (
            <Table size="small">
              <TableHead><TableRow sx={{ background: '#fafbfc', '& th': { color: '#64748b', fontWeight: 700, fontSize: 12 } }}><TableCell>Student</TableCell><TableCell>Email</TableCell><TableCell align="right" /></TableRow></TableHead>
              <TableBody>{unassigned.map((s) => (
                <TableRow key={s.student_id} hover>
                  <TableCell>{s.name}</TableCell>
                  <TableCell sx={{ color: '#64748b' }}>{s.email}</TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => setProfileId(s.student_id)} sx={{ textTransform: 'none' }}>Profile</Button>
                    <Button size="small" disabled={activeBatches.length === 0} onClick={() => setPlaceDlg({ student: s })} sx={{ textTransform: 'none' }}>Place in batch</Button>
                  </TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
        </Card>
      )}

      {placeDlg && <PlaceDialog programId={programId} student={placeDlg.student} batches={activeBatches} onClose={() => setPlaceDlg(null)} onDone={() => { setPlaceDlg(null); load(); notify('success', 'Student placed'); }} onError={(m) => notify('error', m)} />}
      {mergeDlg && <MergeDialog programId={programId} batches={activeBatches} onClose={() => setMergeDlg(false)} onDone={(r) => { setMergeDlg(false); load(); notify('success', `Merged — ${r.moved} student(s) moved`); }} onError={(m) => notify('error', m)} />}
      {profileId && <StudentProfileDialog studentId={profileId} onClose={() => setProfileId(null)} />}
    </div>
  );
}

// ---------- Attendance history ----------
function AttendanceTab({ programId, notify }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    coursesApi.attendanceHistory(programId).then((r) => setRows(r?.data || [])).catch((e) => notify('error', e.message)).finally(() => setLoading(false));
  }, [programId, notify]);
  if (loading) return <CircularProgress />;
  return (
    <Card title="Student attendance history" pad={rows.length ? 0 : 18} style={rows.length ? { overflow: 'hidden' } : undefined}>
      {rows.length === 0 ? <EmptyState icon="🟢" title="No attendance yet" text="Attendance appears here once classes have ended for this course's batches." /> : (
        <Table size="small">
          <TableHead><TableRow sx={{ background: '#fafbfc', '& th': { color: '#64748b', fontWeight: 700, fontSize: 12 } }}>
            <TableCell>Student</TableCell><TableCell>Batch</TableCell><TableCell align="center">Present</TableCell><TableCell align="center">Absent</TableCell><TableCell align="center">Total</TableCell><TableCell style={{ width: 140 }}>Attendance</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.student_id} hover>
                <TableCell>{r.name}</TableCell>
                <TableCell sx={{ color: '#64748b' }}>{r.batch_name || '—'}</TableCell>
                <TableCell align="center" sx={{ color: '#15803d', fontWeight: 700 }}>{r.present}</TableCell>
                <TableCell align="center" sx={{ color: '#b91c1c' }}>{r.absent}</TableCell>
                <TableCell align="center">{r.total}</TableCell>
                <TableCell>
                  {r.pct == null ? <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span> : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1 }}><Progress value={r.pct} tint={r.pct >= 75 ? '#16a34a' : r.pct >= 50 ? '#d97706' : '#dc2626'} /></div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#334155', width: 34 }}>{r.pct}%</span>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

const SubHead = ({ children }) => <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{children}</div>;
const Muted = ({ children }) => <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{children}</div>;

function PlaceDialog({ programId, student, batches, onClose, onDone, onError }) {
  const [batchId, setBatchId] = useState('');
  const [share, setShare] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!batchId) return;
    setBusy(true);
    try { await coursesApi.placeStudent(programId, { batch_id: batchId, student_id: student.student_id, share_recordings: share }); onDone(); }
    catch (e) { onError(e.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Place {student.name} in a batch</DialogTitle>
      <DialogContent>
        <TextField select fullWidth size="small" label="Batch" value={batchId} onChange={(e) => setBatchId(e.target.value)} sx={{ mt: 1 }}>
          {batches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
        </TextField>
        <FormControlLabel sx={{ mt: 1 }} control={<Checkbox checked={share} onChange={(e) => setShare(e.target.checked)} />}
          label="Share this batch's previous class recordings" />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={busy || !batchId} sx={{ textTransform: 'none', bgcolor: '#E53935' }}>Place</Button>
      </DialogActions>
    </Dialog>
  );
}

function MergeDialog({ programId, batches, onClose, onDone, onError }) {
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [share, setShare] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!source || !target || source === target) { onError('Pick two different batches'); return; }
    setBusy(true);
    try { const r = await coursesApi.mergeBatches(programId, { source_batch_id: source, target_batch_id: target, share_recordings: share }); onDone(r?.data || r); }
    catch (e) { onError(e.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Merge batches</DialogTitle>
      <DialogContent>
        <TextField select fullWidth size="small" label="Merge this batch…" value={source} onChange={(e) => setSource(e.target.value)} sx={{ mt: 1 }}>
          {batches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name} ({b.student_count})</MenuItem>)}
        </TextField>
        <TextField select fullWidth size="small" label="…into this batch" value={target} onChange={(e) => setTarget(e.target.value)} sx={{ mt: 2 }}>
          {batches.filter((b) => b.id !== source).map((b) => <MenuItem key={b.id} value={b.id}>{b.name} ({b.student_count})</MenuItem>)}
        </TextField>
        <FormControlLabel sx={{ mt: 1 }} control={<Checkbox checked={share} onChange={(e) => setShare(e.target.checked)} />}
          label="Share target batch's previous recordings with moved students" />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={busy} sx={{ textTransform: 'none', bgcolor: '#E53935' }}>Merge</Button>
      </DialogActions>
    </Dialog>
  );
}
