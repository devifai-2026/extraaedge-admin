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
import { coursesApi, classesApi, learningApi, capstoneApi } from '../../lib/endpoints';
import { isRole } from '../../lib/rbac';
import { fmtDate } from '../Accounts/utils';
import StudentProfileDialog from '../../components/StudentProfileDialog/StudentProfileDialog';

const TAB_INDEX = { modules: 0, trainers: 1, batches: 2, attendance: 3, capstone: 4 };

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
        <Tab label="Capstone" />
      </Tabs>

      {tab === 0 && <ModulesTab programId={programId} notify={notify} canManage={canManage} />}
      {tab === 1 && <TrainersTab programId={programId} notify={notify} canManage={canManage} />}
      {tab === 2 && <BatchesTab programId={programId} notify={notify} canManage={canManage} />}
      {tab === 3 && <AttendanceTab programId={programId} notify={notify} />}
      {tab === 4 && <CapstoneTab programId={programId} notify={notify} canManage={canManage} />}

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
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [open, setOpen] = useState({}); // moduleId → expanded
  const [topicInput, setTopicInput] = useState({}); // moduleId → draft topic
  const [scheduleFor, setScheduleFor] = useState(null); // module to schedule a class in
  const [completionFor, setCompletionFor] = useState(null); // module to certify completion

  const load = useCallback(() => {
    Promise.all([
      coursesApi.listModules(programId),
      classesApi.list({ programId }).catch(() => ({ data: [] })),
      learningApi.listMaterials(programId).catch(() => ({ data: [] })),
      coursesApi.listBatches(programId).catch(() => ({ data: [] })),
    ]).then(([m, c, mat, b]) => { setRows(m?.data || []); setClasses(c?.data || []); setMaterials(mat?.data || []); setBatches((b?.data || []).filter((x) => x.status !== 'merged')); })
      .catch((e) => notify('error', e.message)).finally(() => setLoading(false));
  }, [programId, notify]);
  useEffect(() => { load(); }, [load]);

  const saveTopics = async (m, syllabus) => {
    try { await coursesApi.updateModule(programId, m.id, { syllabus }); load(); }
    catch (e) { notify('error', e.message); }
  };
  const addTopic = (m) => {
    const val = (topicInput[m.id] || '').trim();
    if (!val) return;
    const syllabus = [...(Array.isArray(m.syllabus) ? m.syllabus : []), val];
    setTopicInput((s) => ({ ...s, [m.id]: '' }));
    saveTopics(m, syllabus);
  };
  const removeTopic = (m, idx) => {
    const syllabus = (Array.isArray(m.syllabus) ? m.syllabus : []).filter((_, j) => j !== idx);
    saveTopics(m, syllabus);
  };

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
                    <div style={{ marginBottom: 12 }}>
                      <SubHead>Topics ({Array.isArray(m.syllabus) ? m.syllabus.length : 0})</SubHead>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                        {(Array.isArray(m.syllabus) ? m.syllabus : []).map((s, j) => {
                          const label = typeof s === 'string' ? s : (s?.title || JSON.stringify(s));
                          return (
                            <span key={j} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 999, padding: '4px 10px', fontSize: 12.5, color: '#334155' }}>
                              {label}
                              {canManage && <span onClick={() => removeTopic(m, j)} style={{ cursor: 'pointer', color: '#94a3b8', fontWeight: 700 }}>×</span>}
                            </span>
                          );
                        })}
                        {(!m.syllabus || m.syllabus.length === 0) && !canManage && <Muted>No topics added yet.</Muted>}
                      </div>
                      {canManage && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, maxWidth: 460 }}>
                          <TextField size="small" placeholder="Add a topic (e.g. Flexbox)" value={topicInput[m.id] || ''} onChange={(e) => setTopicInput((s) => ({ ...s, [m.id]: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') addTopic(m); }} sx={{ flex: 1 }} />
                          <Button size="small" variant="outlined" onClick={() => addTopic(m)} sx={{ textTransform: 'none' }}>Add topic</Button>
                        </div>
                      )}
                    </div>
                    {canManage && (
                      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <SubHead>Completion</SubHead>
                        <Button size="small" onClick={() => setCompletionFor(m)} sx={{ textTransform: 'none', color: '#E53935' }}>Certify students →</Button>
                      </div>
                    )}
                    <div style={{ marginBottom: 12 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <SubHead>Classes ({mClasses.length})</SubHead>
                        {canManage && <Button size="small" startIcon={<AddIcon />} onClick={() => setScheduleFor(m)} sx={{ textTransform: 'none', color: '#E53935' }}>Schedule class</Button>}
                      </Box>
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
      {scheduleFor && <ScheduleClassDialog programId={programId} moduleId={scheduleFor.id} moduleName={scheduleFor.name} batches={batches}
        onClose={() => setScheduleFor(null)} onDone={() => { setScheduleFor(null); load(); notify('success', 'Class scheduled'); }} onError={(m) => notify('error', m)} />}
      {completionFor && <ModuleCompletionDialog programId={programId} moduleId={completionFor.id} moduleName={completionFor.name}
        onClose={() => setCompletionFor(null)} onSaved={() => { load(); }} onError={(m) => notify('error', m)} notify={notify} />}
    </div>
  );
}

// Trainer certifies which students have completed a module (per-student + a
// "mark all" bulk action). Drives student progress + certificate eligibility.
function ModuleCompletionDialog({ programId, moduleId, moduleName, onClose, onSaved, onError, notify }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    setLoading(true);
    learningApi.moduleCompletion(moduleId, programId).then((r) => setRows(r?.data || [])).catch((e) => onError(e.message)).finally(() => setLoading(false));
  }, [moduleId, programId, onError]);
  useEffect(() => { load(); }, [load]);

  const set = async (studentIds, completed) => {
    if (!studentIds.length) return;
    setBusy(true);
    try { const r = await learningApi.markModuleCompletion({ program_id: programId, module_id: moduleId, student_ids: studentIds, completed }); setRows(r?.data || []); onSaved(); notify('success', completed ? 'Marked complete' : 'Marked incomplete'); }
    catch (e) { onError(e.message); } finally { setBusy(false); }
  };

  const allIds = rows.map((r) => r.student_id);
  const doneCount = rows.filter((r) => r.completed).length;
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Completion · {moduleName}</DialogTitle>
      <DialogContent>
        {loading ? <CircularProgress /> : rows.length === 0 ? <EmptyState icon="👥" title="No students" text="No students are enrolled in this course yet." /> : (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <div style={{ fontSize: 13, color: '#64748b' }}>{doneCount}/{rows.length} completed</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button size="small" disabled={busy} onClick={() => set(allIds, true)} sx={{ textTransform: 'none' }}>Mark all complete</Button>
                <Button size="small" disabled={busy} onClick={() => set(allIds, false)} sx={{ textTransform: 'none', color: '#64748b' }}>Clear all</Button>
              </div>
            </Box>
            <Table size="small">
              <TableHead><TableRow sx={{ background: '#fafbfc', '& th': { color: '#64748b', fontWeight: 700, fontSize: 12 } }}><TableCell>Student</TableCell><TableCell>Batch</TableCell><TableCell align="center">Completed</TableCell></TableRow></TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.student_id} hover>
                    <TableCell>{r.name}<div style={{ fontSize: 11, color: '#94a3b8' }}>{r.email}</div></TableCell>
                    <TableCell sx={{ color: '#64748b' }}>{r.batch_name || '—'}</TableCell>
                    <TableCell align="center"><Checkbox size="small" checked={!!r.completed} disabled={busy} onChange={(e) => set([r.student_id], e.target.checked)} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose} sx={{ textTransform: 'none' }}>Done</Button></DialogActions>
    </Dialog>
  );
}

// ---------- Trainers ----------
function TrainersTab({ programId, notify, canManage }) {
  const [rows, setRows] = useState([]);
  const [modules, setModules] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ user_id: '', role: 'trainer', module_id: '' });
  const [createOpen, setCreateOpen] = useState(false);
  const loadStaff = useCallback(() => { coursesApi.assignableStaff().then((r) => setStaff(r?.data || [])).catch(() => {}); }, []);
  const load = useCallback(() => {
    Promise.all([coursesApi.listTrainers(programId), coursesApi.listModules(programId)])
      .then(([t, m]) => { setRows(t?.data || []); setModules(m?.data || []); })
      .catch((e) => notify('error', e.message)).finally(() => setLoading(false));
  }, [programId, notify]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadStaff(); }, [loadStaff]);

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
          <Button variant="outlined" onClick={() => setCreateOpen(true)} sx={{ textTransform: 'none' }}>+ New trainer</Button>
        </Box>
      )}
      {createOpen && <CreateTrainerDialog programId={programId} modules={modules} onClose={() => setCreateOpen(false)}
        onDone={(name) => { setCreateOpen(false); load(); loadStaff(); notify('success', `${name} created & added`); }} onError={(m) => notify('error', m)} />}
      {rows.length === 0 ? <EmptyState icon="🧑‍🏫" title="No trainers yet" text="Assign an existing user above, or create a brand-new trainer with “+ New trainer”." /> : (
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
  const [placeDlg, setPlaceDlg] = useState(null); // { students: [...] }
  const [mergeDlg, setMergeDlg] = useState(false);
  const [profileId, setProfileId] = useState(null);
  const [selected, setSelected] = useState({}); // student_id → bool

  const load = useCallback(() => {
    Promise.all([coursesApi.listBatches(programId), coursesApi.listUnassignedStudents(programId).catch(() => ({ data: [] }))])
      .then(([b, u]) => { setBatches(b?.data || []); setUnassigned(u?.data || []); setSelected({}); })
      .catch((e) => notify('error', e.message)).finally(() => setLoading(false));
  }, [programId, notify]);
  useEffect(() => { load(); }, [load]);

  const createBatch = async () => {
    if (!newBatch.trim()) return;
    try { await coursesApi.createBatch(programId, { name: newBatch.trim() }); setNewBatch(''); load(); notify('success', 'Batch created'); }
    catch (e) { notify('error', e.message); }
  };
  const complete = async (b) => {
    if (!window.confirm(`Mark batch "${b.name}" as completed?`)) return;
    try { await coursesApi.completeBatch(programId, b.id); load(); notify('success', 'Batch marked completed'); }
    catch (e) { notify('error', e.message); }
  };

  if (loading) return <CircularProgress />;
  const nonMerged = batches.filter((b) => b.status !== 'merged');
  const activeBatches = nonMerged.filter((b) => b.status !== 'completed'); // valid targets for place/merge
  const selectedStudents = unassigned.filter((s) => selected[s.student_id]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card title="Batches" right={<Button size="small" startIcon={<MergeIcon />} variant="outlined" disabled={activeBatches.length < 2} onClick={() => setMergeDlg(true)} sx={{ textTransform: 'none' }}>Merge</Button>}>
        {canManage && (
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField size="small" label="New batch (e.g. MERN-Aug)" value={newBatch} onChange={(e) => setNewBatch(e.target.value)} sx={{ flex: 1 }} onKeyDown={(e) => { if (e.key === 'Enter') createBatch(); }} />
            <Button variant="contained" startIcon={<AddIcon />} onClick={createBatch} sx={{ textTransform: 'none', bgcolor: '#E53935', '&:hover': { bgcolor: '#c62828' } }}>Create</Button>
          </Box>
        )}
        {nonMerged.length === 0 ? <EmptyState icon="👥" title="No batches yet" text="Create a batch (a cohort) — classes are scheduled into a batch." /> : (
          <Table size="small">
            <TableHead><TableRow sx={{ background: '#fafbfc', '& th': { color: '#64748b', fontWeight: 700, fontSize: 12 } }}><TableCell>Batch</TableCell><TableCell align="center">Students</TableCell><TableCell>Started</TableCell><TableCell align="center">Status</TableCell><TableCell align="right" /></TableRow></TableHead>
            <TableBody>{nonMerged.map((b) => (
              <TableRow key={b.id} hover>
                <TableCell>{b.name}</TableCell>
                <TableCell align="center">{b.student_count}</TableCell>
                <TableCell sx={{ color: '#64748b' }}>{b.start_date ? fmtDate(b.start_date) : '—'}</TableCell>
                <TableCell align="center">{b.status === 'completed' ? <Badge tone="neutral">Completed</Badge> : <Badge tone="success">Active</Badge>}</TableCell>
                <TableCell align="right">{canManage && b.status !== 'completed' && <Button size="small" onClick={() => complete(b)} sx={{ textTransform: 'none' }}>Mark complete</Button>}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        )}
      </Card>

      {canManage && (
        <Card title={`Unassigned students (${unassigned.length})`}
          right={selectedStudents.length > 0 && <Btn size="sm" onClick={() => setPlaceDlg({ students: selectedStudents })}>Place {selectedStudents.length} selected →</Btn>}>
          {unassigned.length === 0 ? <Muted>Everyone is placed in a batch.</Muted> : (
            <Table size="small">
              <TableHead><TableRow sx={{ background: '#fafbfc', '& th': { color: '#64748b', fontWeight: 700, fontSize: 12 } }}>
                <TableCell padding="checkbox"><Checkbox size="small" checked={selectedStudents.length === unassigned.length && unassigned.length > 0} indeterminate={selectedStudents.length > 0 && selectedStudents.length < unassigned.length} onChange={(e) => setSelected(e.target.checked ? Object.fromEntries(unassigned.map((s) => [s.student_id, true])) : {})} /></TableCell>
                <TableCell>Student</TableCell><TableCell>Email</TableCell><TableCell align="right" />
              </TableRow></TableHead>
              <TableBody>{unassigned.map((s) => (
                <TableRow key={s.student_id} hover selected={!!selected[s.student_id]}>
                  <TableCell padding="checkbox"><Checkbox size="small" checked={!!selected[s.student_id]} onChange={(e) => setSelected((sel) => ({ ...sel, [s.student_id]: e.target.checked }))} /></TableCell>
                  <TableCell>{s.name}</TableCell>
                  <TableCell sx={{ color: '#64748b' }}>{s.email}</TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => setProfileId(s.student_id)} sx={{ textTransform: 'none' }}>Profile</Button>
                    <Button size="small" disabled={activeBatches.length === 0} onClick={() => setPlaceDlg({ students: [s] })} sx={{ textTransform: 'none' }}>Place</Button>
                  </TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
        </Card>
      )}

      {placeDlg && <PlaceDialog programId={programId} students={placeDlg.students} batches={activeBatches} onClose={() => setPlaceDlg(null)} onDone={(n) => { setPlaceDlg(null); load(); notify('success', `${n} student${n > 1 ? 's' : ''} placed`); }} onError={(m) => notify('error', m)} />}
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

// ---------- Capstone (course-level project) ----------
function CapstoneTab({ programId, notify, canManage }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [subsFor, setSubsFor] = useState(null);
  const load = useCallback(() => { setLoading(true); capstoneApi.list(programId).then((r) => setRows(r?.data || [])).catch((e) => notify('error', e.message)).finally(() => setLoading(false)); }, [programId, notify]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <CircularProgress />;
  return (
    <div>
      {canManage && <div style={{ marginBottom: 12 }}><Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)} sx={{ textTransform: 'none', bgcolor: '#E53935', '&:hover': { bgcolor: '#c62828' } }}>New capstone</Button></div>}
      {rows.length === 0 ? (
        <Card><EmptyState icon="🚀" title="No capstone yet" text={canManage ? 'Add a capstone brief — students submit a live link + GitHub for you to grade.' : 'No capstone has been set for this course yet.'} /></Card>
      ) : (
        <Card pad={0} style={{ overflow: 'hidden' }}>
          <Table size="small">
            <TableHead><TableRow sx={{ background: '#fafbfc', '& th': { color: '#64748b', fontWeight: 700, fontSize: 12 } }}><TableCell>Capstone</TableCell><TableCell align="center">Max</TableCell><TableCell align="center">Submitted</TableCell><TableCell align="center">Graded</TableCell><TableCell align="right" /></TableRow></TableHead>
            <TableBody>{rows.map((c) => (
              <TableRow key={c.id} hover>
                <TableCell>{c.title}</TableCell><TableCell align="center">{c.max_marks}</TableCell><TableCell align="center">{c.submission_count}</TableCell><TableCell align="center">{c.graded_count}</TableCell>
                <TableCell align="right"><Button size="small" onClick={() => setSubsFor(c)} sx={{ textTransform: 'none' }}>Submissions</Button></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </Card>
      )}
      {createOpen && <CreateCapstoneDialog programId={programId} onClose={() => setCreateOpen(false)} onDone={() => { setCreateOpen(false); load(); notify('success', 'Capstone created'); }} onError={(m) => notify('error', m)} />}
      {subsFor && <CapstoneSubmissionsDialog capstone={subsFor} onClose={() => setSubsFor(null)} onGraded={() => { load(); }} onError={(m) => notify('error', m)} />}
    </div>
  );
}

function CreateCapstoneDialog({ programId, onClose, onDone, onError }) {
  const [f, setF] = useState({ title: '', brief: '', marking_scheme: '', max_marks: 100, deadline: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async () => {
    if (!f.title.trim()) { onError('Title required'); return; }
    setBusy(true);
    try { await capstoneApi.create({ program_id: programId, title: f.title.trim(), brief: f.brief || null, marking_scheme: f.marking_scheme || null, max_marks: Number(f.max_marks) || 100, deadline: f.deadline ? new Date(f.deadline).toISOString() : null }); onDone(); }
    catch (e) { onError(e.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>New capstone</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
        <TextField size="small" label="Title" value={f.title} onChange={set('title')} />
        <TextField size="small" label="Brief" multiline minRows={2} value={f.brief} onChange={set('brief')} />
        <TextField size="small" label="Marking scheme" multiline minRows={2} value={f.marking_scheme} onChange={set('marking_scheme')} />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField size="small" type="number" label="Max marks" value={f.max_marks} onChange={set('max_marks')} sx={{ width: 130 }} />
          <TextField size="small" type="datetime-local" label="Deadline" InputLabelProps={{ shrink: true }} value={f.deadline} onChange={set('deadline')} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={busy} sx={{ textTransform: 'none', bgcolor: '#E53935' }}>Create</Button>
      </DialogActions>
    </Dialog>
  );
}

function CapstoneSubmissionsDialog({ capstone, onClose, onGraded, onError }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => { setLoading(true); capstoneApi.submissions(capstone.id).then((r) => setRows(r?.data || [])).catch((e) => onError(e.message)).finally(() => setLoading(false)); }, [capstone.id, onError]);
  useEffect(() => { load(); }, [load]);
  const grade = async (submissionId, marks, feedback) => { try { await capstoneApi.grade(capstone.id, { submission_id: submissionId, marks: Number(marks), feedback }); load(); onGraded(); } catch (e) { onError(e.message); } };
  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{capstone.title} — submissions (max {capstone.max_marks})</DialogTitle>
      <DialogContent>
        {loading ? <CircularProgress /> : rows.length === 0 ? <EmptyState icon="🚀" title="No submissions yet" text="Students' capstone submissions will show up here to grade." /> : (
          <Table size="small">
            <TableHead><TableRow sx={{ background: '#fafbfc' }}><TableCell>Student</TableCell><TableCell>Links</TableCell><TableCell align="right">Marks</TableCell><TableCell align="right" /></TableRow></TableHead>
            <TableBody>{rows.map((s) => <CapstoneGradeRow key={s.id} s={s} max={capstone.max_marks} onGrade={grade} />)}</TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose} sx={{ textTransform: 'none' }}>Close</Button></DialogActions>
    </Dialog>
  );
}

function CapstoneGradeRow({ s, max, onGrade }) {
  const [marks, setMarks] = useState(s.marks ?? '');
  const [fb, setFb] = useState(s.feedback ?? '');
  return (
    <TableRow>
      <TableCell>{s.name}<div style={{ fontSize: 11, color: '#94a3b8' }}>{s.email}</div></TableCell>
      <TableCell sx={{ fontSize: 12 }}>
        {s.live_url && <a href={s.live_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', display: 'block' }}>Live ↗</a>}
        {s.github_url && <a href={s.github_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', display: 'block' }}>GitHub ↗</a>}
        {s.file_url && <a href={s.file_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', display: 'block' }}>File ↗</a>}
        {!s.live_url && !s.github_url && !s.file_url && <span style={{ color: '#94a3b8' }}>—</span>}
      </TableCell>
      <TableCell align="right"><TextField size="small" type="number" value={marks} onChange={(e) => setMarks(e.target.value)} sx={{ width: 80 }} inputProps={{ min: 0, max }} /></TableCell>
      <TableCell align="right">
        <TextField size="small" placeholder="Feedback" value={fb} onChange={(e) => setFb(e.target.value)} sx={{ width: 150, mr: 1 }} />
        <Button size="small" onClick={() => onGrade(s.id, marks, fb)} disabled={marks === ''} sx={{ textTransform: 'none' }}>Save</Button>
      </TableCell>
    </TableRow>
  );
}

const SubHead = ({ children }) => <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{children}</div>;
const Muted = ({ children }) => <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{children}</div>;

// Create a brand-new teaching user and bind them to this course in one step.
function CreateTrainerDialog({ programId, modules, onClose, onDone, onError }) {
  const gen = () => `Tr@${Math.random().toString(36).slice(2, 8)}${Math.floor(Math.random() * 90 + 10)}`;
  const [f, setF] = useState({ name: '', email: '', password: gen(), role: 'trainer', module_id: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async () => {
    if (!f.name.trim() || !f.email.trim()) { onError('Name and email are required'); return; }
    if ((f.password || '').length < 10) { onError('Password must be 10+ characters'); return; }
    setBusy(true);
    try {
      await coursesApi.createTrainer(programId, { name: f.name.trim(), email: f.email.trim(), password: f.password, role: f.role, module_id: f.module_id || null });
      onDone(f.name.trim());
    } catch (e) { onError(e.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>New trainer</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
        <div style={{ fontSize: 12.5, color: '#64748b' }}>Creates a login for this person and adds them to this course. Share the credentials with them.</div>
        <TextField size="small" label="Full name" value={f.name} onChange={set('name')} />
        <TextField size="small" type="email" label="Email (login)" value={f.email} onChange={set('email')} />
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <TextField size="small" label="Initial password" value={f.password} onChange={set('password')} sx={{ flex: 1 }} helperText="10+ chars" />
          <Button size="small" onClick={() => setF((s) => ({ ...s, password: gen() }))} sx={{ textTransform: 'none' }}>Regenerate</Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <TextField size="small" select label="Role" value={f.role} onChange={set('role')} sx={{ width: 150 }}>
            <MenuItem value="trainer">Trainer</MenuItem>
            <MenuItem value="head">Head trainer</MenuItem>
          </TextField>
          <TextField size="small" select label="Module (optional)" value={f.module_id} onChange={set('module_id')} sx={{ flex: 1 }}>
            <MenuItem value="">— whole course</MenuItem>
            {modules.map((m) => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
          </TextField>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={busy} sx={{ textTransform: 'none', bgcolor: '#E53935' }}>Create & add</Button>
      </DialogActions>
    </Dialog>
  );
}

// Schedule a class directly inside a module (picks a batch + time).
function ScheduleClassDialog({ programId, moduleId, moduleName, batches, onClose, onDone, onError }) {
  const [f, setF] = useState({ batch_id: '', title: '', mode: 'online', meeting_url: '', starts_at: '', duration: 60 });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async () => {
    if (!f.batch_id || !f.title.trim() || !f.starts_at) { onError('Batch, title and start time are required'); return; }
    setBusy(true);
    try {
      const start = new Date(f.starts_at);
      const end = new Date(start.getTime() + (Number(f.duration) || 60) * 60000);
      await classesApi.create({ program_id: programId, module_id: moduleId, batch_id: f.batch_id, title: f.title.trim(), kind: 'lecture', mode: f.mode, meeting_url: f.meeting_url || null, starts_at: start.toISOString(), ends_at: end.toISOString() });
      onDone();
    } catch (e) { onError(e.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Schedule class · {moduleName}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
        {batches.length === 0 && <Alert severity="warning">Create a batch first (Batches tab) — classes are scheduled into a batch.</Alert>}
        <TextField size="small" select label="Batch" value={f.batch_id} onChange={set('batch_id')}>
          {batches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
        </TextField>
        <TextField size="small" label="Title" value={f.title} onChange={set('title')} />
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <TextField size="small" type="datetime-local" label="Starts" InputLabelProps={{ shrink: true }} value={f.starts_at} onChange={set('starts_at')} sx={{ flex: 1 }} />
          <TextField size="small" type="number" label="Minutes" value={f.duration} onChange={set('duration')} sx={{ width: 110 }} />
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <TextField size="small" select label="Mode" value={f.mode} onChange={set('mode')} sx={{ width: 130 }}>
            <MenuItem value="online">Online</MenuItem>
            <MenuItem value="offline">Offline</MenuItem>
          </TextField>
          <TextField size="small" label="Meeting URL (optional)" placeholder="https://…" value={f.meeting_url} onChange={set('meeting_url')} sx={{ flex: 1 }} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={busy || batches.length === 0} sx={{ textTransform: 'none', bgcolor: '#E53935' }}>Schedule</Button>
      </DialogActions>
    </Dialog>
  );
}

function PlaceDialog({ programId, students, batches, onClose, onDone, onError }) {
  const list = students || [];
  const [batchId, setBatchId] = useState('');
  const [share, setShare] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!batchId || list.length === 0) return;
    setBusy(true);
    try {
      await coursesApi.placeStudent(programId, { batch_id: batchId, student_ids: list.map((s) => s.student_id), share_recordings: share });
      onDone(list.length);
    } catch (e) { onError(e.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{list.length === 1 ? `Place ${list[0].name} in a batch` : `Place ${list.length} students in a batch`}</DialogTitle>
      <DialogContent>
        {list.length > 1 && <div style={{ fontSize: 12.5, color: '#64748b', marginBottom: 8 }}>{list.map((s) => s.name).join(', ')}</div>}
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
