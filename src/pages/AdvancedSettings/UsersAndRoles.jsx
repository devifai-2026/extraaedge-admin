// User Profiles management — matches the screenshots provided.
// Two tabs: User Profiles (table + filter + add dialog) | Roles & Tabs (custom role editor).
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Tab, Tabs, Button, TextField, CircularProgress, Chip, Avatar, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Switch, MenuItem,
  InputAdornment, Tooltip, Checkbox, FormControlLabel, Autocomplete, Box,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import LoginIcon from '@mui/icons-material/Login';
import { usersApi, customRolesApi, programsApi, authApi, branchesApi, coursesApi } from '../../lib/endpoints';
import { auth } from '../../lib/api';
import { isRole, ROLES, LEAD_OWNER_ROLES } from '../../lib/rbac';
import { isEmail, sanitizeDigits, emailError } from '../../lib/validators';
import Breadcrumb from './Breadcrumb';
import TrainerStudents from '../Trainer/TrainerStudents';
import SecurityAnomaliesBanner from '../../components/SecurityAnomalies/SecurityAnomaliesBanner';

// Scopes a branch_manager may NOT assign to a user (mirrors backend
// BRANCH_MANAGER_FORBIDDEN_ROLES). A BM can't create admins or other BMs.
const BM_FORBIDDEN_SCOPES = ['super_admin', 'branch_manager'];
const pickableRolesFor = (roles, isBM) =>
  (isBM ? roles.filter((r) => !BM_FORBIDDEN_SCOPES.includes(r.scope)) : roles);

// Mirrors backend DEFAULT_TAB_KEYS in src/config/constants.js
const TAB_KEYS = [
  'dashboard', 'leads', 'raw_data', 'failed_leads', 'bulk_upload',
  'followups', 'whatsapp', 'bulk_marketing', 'drip_marketing', 'remarketing',
  'automation', 'connected_accounts',
  'settings.email_templates', 'settings.sms_templates', 'settings.whatsapp_templates',
  'settings.lead_score', 'settings.assignment_rules',
  'advanced.dropdowns', 'advanced.users_roles', 'advanced.communications', 'advanced.subscription',
  'third_party_integration', 'reports', 'analytics',
  // Accounts module (account_manager role). super_admins toggle these
  // per role from the Roles & Tabs editor.
  'accounts.dashboard',
  'accounts.pending_admissions',
  'accounts.this_month_admissions',
  'accounts.total_admissions',
  'accounts.approvals',
  'accounts.attendings',
  'accounts.break',
  'accounts.report',
  'accounts.pay_schedule',
  'accounts.collection_receipt_wise',
  'accounts.bulk_import',
  // Call recordings + QA call reviews.
  'unmatched_recordings',
  'qa.reviews',
  'qa.feedback',
];
const PERM_LEVELS = ['hidden', 'read_only', 'full'];
const blankTabPerms = () => Object.fromEntries(TAB_KEYS.map((k) => [k, 'hidden']));

// Whether a tab key applies to a given role scope.
// account_manager → only accounts.* tabs are applicable.
// Every other scope (counsellor / sales_manager / super_admin / custom)
// → every tab EXCEPT accounts.* is applicable; the Accounts module is
// a dedicated bucket and granting it to a counsellor would land them on
// a page that expects role=account_manager scoping.
const isTabApplicable = (tabKey, scope) => {
  const isAccounts = tabKey.startsWith('accounts.');
  if (scope === 'account_manager') return isAccounts;
  // A QA reviewer only ever works the review queue — granting them a CRM tab
  // would land them on a page their role can't load server-side.
  if (scope === 'qa') return tabKey.startsWith('qa.');
  return !isAccounts;
};

const ACCESS_LEVEL_OPTIONS = [
  { value: 'super_admin', label: 'Admin (Super Admin)' },
  { value: 'branch_manager', label: 'Branch Manager' },
  { value: 'sales_manager', label: 'Sales Manager (Operations)' },
  { value: 'counsellor', label: 'Counsellor (End User)' },
  // The telecalling half of the front line, both under a sales manager.
  { value: 'telecaller_lead', label: 'Telecaller Lead (Team Lead)' },
  { value: 'telecaller', label: 'Telecaller (End User)' },
  { value: 'account_manager', label: 'Account Manager (Post-Conversion)' },
  { value: 'qa', label: 'QA (Call Quality Reviewer)' },
];

// Short label per role bucket, for chips and confirmation copy. Falls back to
// the raw scope for genuine custom roles.
const ROLE_LABEL = {
  super_admin: 'Admin',
  branch_manager: 'Branch Manager',
  sales_manager: 'Manager',
  counsellor: 'Counsellor',
  telecaller_lead: 'Telecaller Lead',
  telecaller: 'Telecaller',
  account_manager: 'Account Mgr',
  head_trainer: 'Head Trainer',
  trainer: 'Trainer',
  qa: 'QA',
  hr: 'HR',
  placement: 'Placement',
};

const initialsColor = (name = '') => {
  const palette = ['#26a69a', '#5c6bc0', '#ef5350', '#ab47bc', '#fb8c00', '#42a5f5', '#66bb6a', '#ec407a'];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
};

export default function UsersAndRoles() {
  const [tab, setTab] = useState(0);
  return (
    <div style={{ background: '#fafafa', minHeight: '100vh' }}>
      <Breadcrumb trail={[
        { label: 'Settings', path: '/advancedsettings' },
        { label: 'User Profiles' },
      ]} />

      <div style={{ padding: '0 24px' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: '1px solid #eee' }}>
          <Tab label="Users" />
          <Tab label="Students" />
          <Tab label="Roles & Tabs" />
        </Tabs>

        <div style={{ paddingTop: 16 }}>
          {tab === 0 && <SecurityAnomaliesBanner />}
          {tab === 0 && <UsersTab />}
          {tab === 1 && <TrainerStudents />}
          {tab === 2 && <RolesTab />}
        </div>
      </div>
    </div>
  );
}

function useFetch(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError('');
    fn().then((r) => { if (!cancelled) setData(r); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);
  return { data, loading, error, reload: () => setReloadKey((v) => v + 1) };
}

// ============================================================================
// USERS TAB — table matches the User Profiles screenshot layout
// ============================================================================

function UsersTab() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useFetch(() => usersApi.list({ limit: 200 }));
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({}); // { role, is_active, manager_id, ... }
  const [filterOpen, setFilterOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [activeUser, setActiveUser] = useState(null);
  const [editUser, setEditUser] = useState(null);
  // Delete confirmation modal. Soft-delete via the existing DELETE
  // /users/:id endpoint — backend sets users.deleted_at; row stays in
  // DB so foreign-key history (lead_assignments etc.) survives.
  const [deleteUser, setDeleteUser] = useState(null);
  const [deleting, setDeleting] = useState(false);
  // Switch Role — move someone between counsellor / telecaller lead /
  // telecaller (or any other bucket). Separate from the edit dialog because
  // the server may demand a lead handover first.
  const [switchUser, setSwitchUser] = useState(null);
  // Branch managers CAN manage users — the backend scopes them to their branch
  // subtree and blocks admin/branch-manager targets (assertBranchManagerScope).
  // Sudo-login ("Login as user") stays super_admin-only.
  const canManage = isRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER);
  const canSudo = isRole(ROLES.SUPER_ADMIN);

  const allUsers = data?.data || [];
  const filteredUsers = useMemo(() => {
    return allUsers.filter((u) => {
      if (search) {
        const q = search.toLowerCase();
        const matches = [u.name, u.email, u.phone].some((v) => v && v.toLowerCase().includes(q));
        if (!matches) return false;
      }
      if (filter.role && u.role !== filter.role) return false;
      if (filter.is_active === 'true' && !u.is_active) return false;
      if (filter.is_active === 'false' && u.is_active) return false;
      if (filter.manager_id && u.manager_id !== filter.manager_id) return false;
      return true;
    });
  }, [allUsers, search, filter]);

  const toggleActive = async (u) => {
    try {
      await usersApi.update(u.id, { is_active: !u.is_active });
      reload();
    } catch (e) { alert(e.message); }
  };

  const openResetPassword = (u) => {
    setActiveUser(u);
    setResetOpen(true);
  };

  // Navigate to the dedicated /users/:id profile page (replaces the old in-place popup
  // which was too small for time-sheet, lead history etc.).
  const openProfile = (u) => {
    if (!u?.id) return;
    navigate(`/users/${u.id}`);
  };

  // Org-admin "Login as user". One confirm prompt so it isn't a single
  // accidental click. On accept we swap the entire session out — the
  // admin's tokens are gone in this browser tab from that point on.
  // No audit trail (explicit product decision); see auth/service.sudoLoginAs.
  const loginAsUser = async (u) => {
    if (!u?.id) return;
    const ok = window.confirm(
      `Log in as "${u.name || u.email}"?\n\n`
      + `Your own admin session in this tab will be replaced. To return, log out and sign in again with your admin credentials.`
    );
    if (!ok) return;
    try {
      const r = await usersApi.sudoLogin(u.id);
      const data = r?.data;
      if (!data?.access_token) throw new Error('No token returned');
      auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user: data.user,
        tenant: data.tenant,
        allowed_tabs: data.allowed_tabs,
      });
      // Hard reload so every cached component re-reads the new session
      // (sidebar, header avatar, dashboard role gates, etc.).
      window.location.href = '/dashboard';
    } catch (e) {
      alert(e.message || 'Login-as failed');
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <div style={{ color: '#d32f2f' }}>{error}</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <IconButton sx={{ color: '#E53935' }} title="Sort"><SwapVertIcon /></IconButton>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconButton sx={{ color: '#E53935' }} onClick={() => setFilterOpen(true)} title="Filter Users">
            <FilterAltIcon />
          </IconButton>
          {canManage && (
            <IconButton sx={{ color: '#E53935' }} onClick={() => setAddOpen(true)} title="Add new user">
              <PersonAddIcon />
            </IconButton>
          )}
          <TextField
            size="small"
            placeholder="Search by Name/ Email/ WhatsApp"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 320, background: '#fff' }}
            InputProps={{ endAdornment: <InputAdornment position="end"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', border: '1px solid #e8e8e8', borderRadius: 4 }}>
        <thead>
          <tr style={{ background: '#fdf3ed' }}>
            {['', 'User Name', 'Email Id', 'WhatsApp Number', 'Access Level', 'Official Designation', 'Reporting To', 'Account Status', 'Actions'].map((h, i) => (
              <th key={i} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6b4a3a', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredUsers.length === 0 && (
            <tr><td colSpan={9} style={{ padding: 24, textAlign: 'center', color: '#888' }}>No users match the filters</td></tr>
          )}
          {filteredUsers.map((u, idx) => {
            const initial = (u.name || u.email || '?')[0].toUpperCase();
            const reportingTo = allUsers.find((x) => x.id === u.manager_id);
            return (
              <tr key={u.id} style={{ background: idx % 2 ? '#fafafa' : '#fff', borderTop: '1px solid #f0f0f0' }}>
                <td style={{ padding: '10px 16px' }}>
                  <Avatar sx={{ width: 32, height: 32, fontSize: 14, bgcolor: initialsColor(u.name || u.email) }}>{initial}</Avatar>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span
                    onClick={() => openProfile(u)}
                    style={{ color: '#1565C0', cursor: 'pointer', fontWeight: 500 }}
                    title="View / edit profile"
                  >{u.name}</span>
                </td>
                <td style={{ padding: '14px 16px', color: '#555' }}>{u.email}</td>
                <td style={{ padding: '14px 16px', color: '#555' }}>{u.phone || '—'}</td>
                <td style={{ padding: '14px 16px' }}>
                  <Chip size="small" label={ROLE_LABEL[u.role] || u.role_name || u.role || 'User'} />
                </td>
                <td style={{ padding: '14px 16px', color: '#555' }}>{u.role_name || '—'}</td>
                <td style={{ padding: '14px 16px', color: '#555' }}>{reportingTo?.name || '—'}</td>
                <td style={{ padding: '14px 16px' }}>
                  <Tooltip title={u.is_active ? 'Deactivate user' : 'Activate user'}>
                    <span>
                      <Switch
                        size="small"
                        checked={!!u.is_active}
                        onChange={() => canManage && toggleActive(u)}
                        disabled={!canManage}
                        sx={{ '& .MuiSwitch-thumb': { backgroundColor: u.is_active ? '#E53935' : undefined } }}
                      />
                    </span>
                  </Tooltip>
                </td>
                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                  <Tooltip title="Edit user (name, email, reporting manager…)">
                    <span>
                      <IconButton
                        size="small"
                        disabled={!canManage}
                        onClick={() => setEditUser(u)}
                        sx={{ color: '#1565C0' }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Switch role (e.g. Counsellor → Telecaller)">
                    <span>
                      <IconButton
                        size="small"
                        disabled={!canManage}
                        onClick={() => setSwitchUser(u)}
                        sx={{ color: '#7c3aed' }}
                      >
                        <SwapHorizIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Reset password">
                    <span>
                      <IconButton
                        size="small"
                        disabled={!canManage}
                        onClick={() => openResetPassword(u)}
                        sx={{ color: '#E53935' }}
                      >
                        <LockOutlinedIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  {/* Login as user — org-admin (super_admin) only. Disabled for
                      the admin's own row (no-op) and for inactive users. */}
                  {canSudo && (
                  <Tooltip title="Login as this user">
                    <span>
                      <IconButton
                        size="small"
                        disabled={!u.is_active || u.id === auth.getUser()?.id}
                        onClick={() => loginAsUser(u)}
                        sx={{ color: '#0f766e' }}
                      >
                        <LoginIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  )}
                  <Tooltip title="Delete user">
                    <span>
                      <IconButton
                        size="small"
                        disabled={!canManage || u.id === auth.getUser()?.id}
                        onClick={() => setDeleteUser(u)}
                        sx={{ color: '#dc2626' }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <FilterDialog
        open={filterOpen}
        value={filter}
        users={allUsers}
        onClose={() => setFilterOpen(false)}
        onApply={(v) => { setFilter(v); setFilterOpen(false); }}
        onReset={() => { setFilter({}); setFilterOpen(false); }}
      />

      <AddUserDialog
        open={addOpen}
        users={allUsers}
        onClose={() => setAddOpen(false)}
        onCreated={() => { setAddOpen(false); reload(); }}
      />

      <UserProfileDialog
        open={Boolean(editUser)}
        user={editUser}
        users={allUsers}
        onClose={() => setEditUser(null)}
        onSaved={() => { setEditUser(null); reload(); }}
        onResetPassword={() => { setActiveUser(editUser); setResetOpen(true); }}
      />

      <ResetPasswordDialog
        open={resetOpen}
        user={activeUser}
        onClose={() => { setResetOpen(false); setActiveUser(null); }}
      />

      <SwitchRoleDialog
        open={Boolean(switchUser)}
        user={switchUser}
        users={allUsers}
        onClose={() => setSwitchUser(null)}
        onSwitched={() => { setSwitchUser(null); reload(); }}
      />

      {/* Delete confirmation — DELETE /users/:id soft-deletes the row.
          Self-delete is blocked by both the button (disabled if u.id ===
          current user) and the dialog (extra confirm gate). */}
      <Dialog open={Boolean(deleteUser)} onClose={() => setDeleteUser(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#dc2626', fontWeight: 700 }}>
          Delete user {deleteUser?.name || deleteUser?.email}?
        </DialogTitle>
        <DialogContent>
          <p style={{ fontSize: 13, color: '#555', marginTop: 0 }}>
            They&apos;ll lose access immediately. Their assignment history
            and lead ownership records stay intact for audit. You can
            re-create them later under the same email if needed.
          </p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteUser(null)} disabled={deleting}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleting}
            onClick={async () => {
              setDeleting(true);
              try {
                await usersApi.delete(deleteUser.id);
                setDeleteUser(null);
                reload();
              } catch (e) {
                alert(e?.message || 'Delete failed');
              } finally {
                setDeleting(false);
              }
            }}
          >
            {deleting ? 'Deleting…' : 'Delete user'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

// ----------------------------- Switch role dialog -----------------------------
// Moves a person between roles — the counsellor / telecaller lead / telecaller
// split this was built for, though it works for any bucket.
//
// Kept separate from the edit dialog because a role change is not a plain
// field edit: the server revokes the user's sessions (their JWT still carries
// the old role), writes an audit_log row, and — when the new role can't own
// leads — refuses with 409 until the caller says who takes over the queue.
// Nothing is deleted: the user row is updated in place and lead handovers
// append to the assignment ledger.
function SwitchRoleDialog({ open, user, users, onClose, onSwitched }) {
  const [roles, setRoles] = useState([]);
  const [roleId, setRoleId] = useState('');
  const [managerIds, setManagerIds] = useState([]);
  const [reassignTo, setReassignTo] = useState(null);
  // Set when the server reports an open queue that has to move first.
  const [pendingLeads, setPendingLeads] = useState(0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const isBM = isRole(ROLES.BRANCH_MANAGER);

  useEffect(() => {
    if (!open) return;
    setErr(''); setPendingLeads(0); setReassignTo(null); setSaving(false);
    setRoleId('');
    setManagerIds(user?.manager_ids?.length ? user.manager_ids : (user?.manager_id ? [user.manager_id] : []));
    customRolesApi.list()
      .then((r) => setRoles(pickableRolesFor(r?.data || [], isBM)))
      .catch((e) => setErr(e?.message || 'Could not load roles'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id]);

  const targetRole = roles.find((r) => r.id === roleId);
  // Whether the role they're moving TO can hold leads. Drives the handover UI.
  const targetOwns = targetRole ? LEAD_OWNER_ROLES.includes(targetRole.scope) : true;
  const currentlyOwns = LEAD_OWNER_ROLES.includes(user?.role);
  const needsHandover = currentlyOwns && !targetOwns;

  // Candidate new owners for the queue: active users who can actually hold a
  // lead, excluding the person being switched.
  const handoverCandidates = useMemo(
    () => (users || []).filter((u) => u.id !== user?.id && u.is_active !== false && LEAD_OWNER_ROLES.includes(u.role)),
    [users, user?.id],
  );
  const managerCandidates = useMemo(
    () => (users || []).filter((u) => u.id !== user?.id && u.is_active !== false),
    [users, user?.id],
  );

  const submit = async () => {
    if (!roleId) { setErr('Pick the new role'); return; }
    setSaving(true); setErr('');
    try {
      const body = { role_id: roleId, manager_ids: managerIds };
      if (reassignTo) body.reassign_leads_to = reassignTo;
      await usersApi.switchRole(user.id, body);
      onSwitched();
    } catch (e) {
      // 409 + details.open_lead_count => the queue must be handed over. Show
      // the picker and let them resubmit rather than failing outright.
      const count = e?.details?.open_lead_count;
      if (count) setPendingLeads(count);
      setErr(e?.message || 'Switch failed');
    } finally {
      setSaving(false);
    }
  };

  const showHandover = needsHandover || pendingLeads > 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        Switch role — {user?.name || user?.email}
      </DialogTitle>
      <DialogContent>
        <p style={{ fontSize: 13, color: '#555', marginTop: 0 }}>
          Currently <b>{ROLE_LABEL[user?.role] || user?.role}</b>
          {user?.role_name ? ` (${user.role_name})` : ''}. Nothing is deleted —
          their leads, history and login records all stay.
        </p>

        <TextField
          select fullWidth size="small" margin="dense"
          label="New role *"
          value={roleId}
          onChange={(e) => { setRoleId(e.target.value); setErr(''); }}
        >
          {roles.filter((r) => r.id !== user?.role_id).map((r) => (
            <MenuItem key={r.id} value={r.id}>
              {r.name}{r.scope && r.scope !== r.name ? ` — ${ROLE_LABEL[r.scope] || r.scope}` : ''}
            </MenuItem>
          ))}
        </TextField>

        <Autocomplete
          multiple size="small"
          options={managerCandidates}
          getOptionLabel={(o) => o.name || o.email || ''}
          isOptionEqualToValue={(o, v) => o.id === (v?.id ?? v)}
          value={managerCandidates.filter((u) => managerIds.includes(u.id))}
          onChange={(_e, picked) => setManagerIds(picked.map((u) => u.id))}
          renderInput={(params) => (
            <TextField
              {...params}
              margin="dense"
              label="Reporting To"
              helperText="Leave as-is to keep their current manager. A telecaller normally reports to a telecaller lead."
            />
          )}
        />

        {showHandover && (
          <Box sx={{ mt: 2, p: 1.5, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#9a3412', marginBottom: 8 }}>
              {pendingLeads > 0
                ? `${pendingLeads} open lead(s) need a new owner`
                : 'This role cannot own leads'}
            </div>
            <div style={{ fontSize: 12, color: '#7c2d12', marginBottom: 8 }}>
              {ROLE_LABEL[targetRole?.scope] || 'This role'} manages a team rather than
              carrying a personal queue, so their open leads have to move to
              someone who can hold them.
            </div>
            <Autocomplete
              size="small"
              options={handoverCandidates}
              getOptionLabel={(o) => `${o.name || o.email} (${ROLE_LABEL[o.role] || o.role})`}
              value={handoverCandidates.find((u) => u.id === reassignTo) || null}
              onChange={(_e, picked) => setReassignTo(picked?.id || null)}
              renderInput={(params) => (
                <TextField {...params} label="Move their open leads to *" />
              )}
            />
          </Box>
        )}

        {err && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 12 }}>{err}</div>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={saving || !roleId}>
          {saving ? 'Switching…' : 'Switch role'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ----------------------------- User profile dialog (view + edit) -----------------------------

function UserProfileDialog({ open, user, users, onClose, onSaved, onResetPassword }) {
  const { data: rolesData } = useFetch(() => customRolesApi.list(), [open]);
  const { data: branchesData } = useFetch(() => branchesApi.list(), [open]);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  // Branch managers may add/edit users in their branch (backend enforces the
  // subtree + forbids admin/branch-manager targets).
  const canManage = isRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER);
  const isBM = isRole(ROLES.BRANCH_MANAGER);

  useEffect(() => {
    if (open && user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        designation: user.designation || '',
        role: user.role || 'counsellor',
        role_id: user.role_id || '',
        // Seed multi-manager from manager_ids (preferred) or fall back to
        // the legacy single manager_id, so existing users don't lose data
        // when the form opens.
        manager_ids: Array.isArray(user.manager_ids) && user.manager_ids.length
          ? user.manager_ids
          : (user.manager_id ? [user.manager_id] : []),
        branch_id: user.branch_id || '',
        branch_ids: Array.isArray(user.branch_ids) ? user.branch_ids : [],
        is_active: !!user.is_active,
      });
      setErr('');
    }
  }, [open, user]);

  if (!user) return null;
  // All active roles in the tenant, system + custom. The server will derive
  // the user's `role` bucket from the chosen role's `scope` automatically.
  const allRoles = pickableRolesFor(rolesData?.data || [], isBM);
  const branches = branchesData?.data || [];
  const hasBranches = branches.length > 0;
  const isSuperAdmin = form.role === 'super_admin';
  const isBranchManager = form.role === 'branch_manager';
  const isTeachingRole = ['head_trainer', 'trainer', 'hr', 'placement'].includes(form.role);
  const branchRequired = hasBranches && !isSuperAdmin && !isBranchManager;

  const save = async () => {
    setErr('');
    if (branchRequired && !form.branch_id) { setErr('Please select a branch for this user'); return; }
    setSaving(true);
    try {
      // We send role_id only — server resolves the role bucket from
      // custom_roles.scope, so we don't have to think about it on the FE.
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        is_active: form.is_active,
        ...(form.phone ? { phone: form.phone.trim() } : { phone: null }),
        // Designation is freeform text shown in the org tree + lead drawer.
        // Send null when cleared so it actually wipes server-side.
        designation: form.designation?.trim() || null,
        ...(form.role_id ? { role_id: form.role_id } : { role: form.role }),
        // Multi-manager. First entry becomes primary manager_id server-side.
        // branch_manager reports to admin (server forces it) — send empty.
        manager_ids: isBranchManager ? [] : (Array.isArray(form.manager_ids) ? form.manager_ids : []),
        // super_admin spans all branches → null; others carry their branch.
        branch_id: isSuperAdmin ? null : (form.branch_id || null),
        // Extra branches a trainer/head works across (multi-branch).
        ...(isTeachingRole ? { branch_ids: Array.isArray(form.branch_ids) ? form.branch_ids : [] } : {}),
      };
      await usersApi.update(user.id, payload);
      onSaved?.();
    } catch (e) {
      setErr(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ background: '#fdf3ed' }}>User Profile</DialogTitle>
      <DialogContent>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0 16px' }}>
          <Avatar sx={{ width: 56, height: 56, bgcolor: initialsColor(user.name || user.email) }}>
            {(user.name || user.email || '?')[0].toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{user.name}</div>
            <div style={{ color: '#777', fontSize: 13 }}>{user.email}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <TextField size="small" label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!canManage} />
          <TextField size="small" type="email" label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!canManage}
            error={!!form.email && !isEmail(form.email)} helperText={form.email && !isEmail(form.email) ? 'Enter a valid email' : ''} />
          {/* This number is now the user's sign-in credential: the login OTP
              goes here, so changing it moves account access to that handset. */}
          <TextField size="small" label="WhatsApp Number (login OTP)" value={form.phone} onChange={(e) => setForm({ ...form, phone: sanitizeDigits(e.target.value) })} disabled={!canManage}
            error={!!form.phone && form.phone.length < 7}
            helperText={form.phone && form.phone.length < 7 ? 'At least 7 digits' : 'Login OTPs are sent to this number'}
            inputProps={{ inputMode: 'numeric' }} />
          <TextField
            size="small"
            label="Official Designation"
            placeholder="e.g. Senior Counsellor"
            value={form.designation || ''}
            onChange={(e) => setForm({ ...form, designation: e.target.value })}
            disabled={!canManage}
          />

          {/* Combined Role picker: lists every role the tenant has — system
              and custom alike. Server derives the role bucket from the
              chosen role's scope, so we only need to send role_id. */}
          <TextField
            size="small"
            select
            label="Role"
            value={form.role_id || ''}
            onChange={(e) => {
              const role_id = e.target.value;
              const picked = allRoles.find((r) => r.id === role_id);
              setForm({ ...form, role_id, role: picked?.scope || form.role });
            }}
            disabled={!canManage}
            helperText={form.role_id
              ? `Inherits scope: ${(allRoles.find((r) => r.id === form.role_id)?.scope || '').replace('_', ' ')}`
              : 'Pick a role'}
          >
            {allRoles.length === 0 && <MenuItem disabled value="">Loading roles…</MenuItem>}
            {allRoles.filter((r) => r.is_system).map((r) => (
              <MenuItem key={r.id} value={r.id}>
                {r.name} <span style={{ color: '#888', fontSize: 11, marginLeft: 6 }}>· system</span>
              </MenuItem>
            ))}
            {allRoles.some((r) => !r.is_system) && (
              <MenuItem disabled value="" sx={{ opacity: 0.6, fontSize: 11 }}>— Custom roles —</MenuItem>
            )}
            {allRoles.filter((r) => !r.is_system).map((r) => (
              <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
            ))}
          </TextField>

          {/* Multi-select reporting managers. All active users in the
              tenant are candidates (excluding the user being edited).
              Disabled for branch_manager — they report to the admin. */}
          <Autocomplete
            multiple
            size="small"
            disabled={!canManage || isBranchManager}
            disableCloseOnSelect
            options={(users || []).filter((u) => u.id !== user.id && u.is_active !== false)}
            value={(users || []).filter((u) => (form.manager_ids || []).includes(u.id))}
            onChange={(_e, picked) => setForm({ ...form, manager_ids: picked.map((u) => u.id) })}
            getOptionLabel={(o) => o?.name || o?.email || ''}
            isOptionEqualToValue={(o, v) => o?.id === v?.id}
            noOptionsText="No other active users in this tenant."
            renderOption={(props, opt, { selected }) => (
              <li {...props} key={opt.id}>
                <Checkbox size="small" checked={selected} sx={{ mr: 1, p: 0.5, '&.Mui-checked': { color: '#E53935' } }} />
                <Box>
                  <div style={{ fontSize: 13 }}>{opt.name || opt.email}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{opt.email} · {String(opt.role || '').replace('_', ' ')}</div>
                </Box>
              </li>
            )}
            renderTags={(picked, getTagProps) =>
              picked.map((u, i) => (
                <Chip
                  {...getTagProps({ index: i })}
                  key={u.id}
                  label={u.name || u.email}
                  size="small"
                  sx={{ background: '#fdf3ed', color: '#c84200' }}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Reporting To (multi-select)"
                placeholder={isBranchManager ? 'Reports to admin' : 'Search by name or email…'}
                helperText={isBranchManager ? 'Branch managers report directly to the admin.' : undefined}
              />
            )}
          />

          {/* Branch assignment — required except super_admin / branch_manager. */}
          {!isSuperAdmin && (
            <TextField
              size="small"
              select
              label={branchRequired ? 'Branch *' : 'Branch'}
              value={form.branch_id || ''}
              onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
              disabled={!canManage}
              helperText={isBranchManager
                ? 'Assigned when this user is set as a branch head.'
                : 'Which branch this user belongs to.'}
            >
              {branches.length === 0 && <MenuItem disabled value="">No branches yet</MenuItem>}
              {!branchRequired && <MenuItem value=""><em>None</em></MenuItem>}
              {branches.map((b) => (
                <MenuItem key={b.id} value={b.id}>{b.name}{b.code ? ` (${b.code})` : ''}</MenuItem>
              ))}
            </TextField>
          )}
          {isTeachingRole && (
            <TextField
              size="small" select label="Additional branches" disabled={!canManage}
              SelectProps={{ multiple: true, renderValue: (sel) => (sel || []).map((id) => branches.find((b) => b.id === id)?.name || '').filter(Boolean).join(', ') || 'None' }}
              value={Array.isArray(form.branch_ids) ? form.branch_ids : []}
              onChange={(e) => setForm({ ...form, branch_ids: e.target.value })}
              helperText="Other branches this trainer works across (they can switch between them)."
            >
              {branches.filter((b) => b.id !== form.branch_id).map((b) => (
                <MenuItem key={b.id} value={b.id}>{b.name}{b.code ? ` (${b.code})` : ''}</MenuItem>
              ))}
            </TextField>
          )}
        </div>

        <FormControlLabel
          control={
            <Switch
              checked={!!form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              disabled={!canManage}
              sx={{ '& .MuiSwitch-thumb': { backgroundColor: form.is_active ? '#E53935' : undefined } }}
            />
          }
          label={form.is_active ? 'Active' : 'Inactive'}
          sx={{ mt: 2 }}
        />

        {canManage && (
          <div style={{ marginTop: 16 }}>
            <Button startIcon={<LockOutlinedIcon />} onClick={onResetPassword} sx={{ color: '#E53935' }}>
              Reset password
            </Button>
          </div>
        )}

        {err && <div style={{ color: '#d32f2f', fontSize: 13, marginTop: 12 }}>{err}</div>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Close</Button>
        {canManage && (
          <Button variant="contained" onClick={save} disabled={saving} sx={{ background: '#fb8c00' }}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ----------------------------- Reset password dialog -----------------------------

function ResetPasswordDialog({ open, user, onClose }) {
  const [pw, setPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { if (open) { setPw(''); setConfirmPw(''); setErr(''); } }, [open]);

  if (!user) return null;

  const submit = async () => {
    setErr('');
    if (pw.length < 10) { setErr('Password must be at least 10 chars'); return; }
    if (pw !== confirmPw) { setErr('Passwords do not match'); return; }
    setSaving(true);
    try {
      await usersApi.resetPassword(user.id, pw);
      alert('Password updated.');
      onClose();
    } catch (e) {
      setErr(e.message || 'Reset failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ background: '#fdf3ed' }}>Reset password — {user.name}</DialogTitle>
      <DialogContent>
        <div style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <TextField size="small" type="password" label="New password (10+ chars)" value={pw} onChange={(e) => setPw(e.target.value)} />
          <TextField size="small" type="password" label="Confirm new password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
          <div style={{ fontSize: 12, color: '#888' }}>The user should change this password after logging in.</div>
          {err && <div style={{ color: '#d32f2f', fontSize: 13 }}>{err}</div>}
        </div>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={saving} sx={{ background: '#E53935' }}>
          {saving ? 'Saving…' : 'Reset password'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ----------------------------- Filter dialog -----------------------------

function FilterDialog({ open, value, users, onClose, onApply, onReset }) {
  const [v, setV] = useState(value || {});
  useEffect(() => { setV(value || {}); }, [value, open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ background: '#fdf3ed' }}>Filter Users</DialogTitle>
      <DialogContent>
        <h4 style={{ marginTop: 16, marginBottom: 12 }}>Filter by User Details</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <TextField size="small" select label="Access Level" value={v.role || ''}
            onChange={(e) => setV({ ...v, role: e.target.value })}>
            <MenuItem value="">All</MenuItem>
            {ACCESS_LEVEL_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
          <TextField size="small" select label="Account Stage" value={v.is_active || ''}
            onChange={(e) => setV({ ...v, is_active: e.target.value })}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="true">Active</MenuItem>
            <MenuItem value="false">Inactive</MenuItem>
          </TextField>
          <TextField size="small" label="Official Designation" value={v.role_name || ''}
            onChange={(e) => setV({ ...v, role_name: e.target.value })} />
          <TextField size="small" select label="Select Reporting To User" value={v.manager_id || ''}
            onChange={(e) => setV({ ...v, manager_id: e.target.value })}>
            <MenuItem value="">All</MenuItem>
            {users.map((u) => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
          </TextField>
        </div>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="outlined" onClick={onReset}>Reset</Button>
        <Button variant="contained" onClick={() => onApply(v)} sx={{ background: '#fb8c00' }}>Apply</Button>
      </DialogActions>
    </Dialog>
  );
}

// ----------------------------- Add user dialog -----------------------------

function AddUserDialog({ open, users, onClose, onCreated }) {
  const { data: programsData } = useFetch(() => programsApi.list(), [open]);
  const { data: rolesData } = useFetch(() => customRolesApi.list(), [open]);
  const { data: branchesData } = useFetch(() => branchesApi.list(), [open]);
  const [form, setForm] = useState(() => initialAddForm());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  // LMS trainer bindings: rows of { program_id, module_id }. A head_trainer
  // binds course(s) only (module_id stays null); a trainer binds course+module.
  // Multiple rows = multiple courses/modules per trainer.
  const [bindings, setBindings] = useState([]);

  useEffect(() => { if (open) { setForm(initialAddForm()); setErr(''); setBindings([]); } }, [open]);

  const programs = programsData?.data || [];
  // System + custom roles. Server derives the user's role bucket from the
  // selected role's scope, so the FE never has to think about buckets. A branch
  // manager can't create admins/other BMs, so those scopes are filtered out.
  const isBM = isRole(ROLES.BRANCH_MANAGER);
  const allRoles = pickableRolesFor(rolesData?.data || [], isBM);
  const branches = branchesData?.data || [];
  // Reporting Managers = every active user in the tenant. Per spec the
  // picker is unrestricted (used to be filtered to "users above this role
  // in the hierarchy" — that was friction without a real benefit).
  const candidateManagers = users.filter((u) => u.is_active !== false);

  // The chosen role's bucket drives branch/reporting rules.
  const isSuperAdmin = form.role === 'super_admin';
  const isBranchManager = form.role === 'branch_manager';
  // LMS teaching roles → show the course-binding section.
  const isHeadTrainer = form.role === 'head_trainer';
  const isTrainer = form.role === 'trainer';
  const isTeachingRole = isHeadTrainer || isTrainer;

  // Course bindings (course-only; head assigns a trainer's modules later).
  const addBinding = () => setBindings((b) => [...b, { program_id: '' }]);
  const setBinding = (i, patch) => setBindings((b) => b.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const removeBinding = (i) => setBindings((b) => b.filter((_, j) => j !== i));

  // super_admin spans all branches (no branch). branch_manager gets their
  // branch when made a head, so it's optional here. Everyone else needs one.
  const branchRequired = !isSuperAdmin && !isBranchManager;

  const submit = async () => {
    setErr('');
    if (!form.first_name.trim()) { setErr('First name is required'); return; }
    if (!form.email.trim()) { setErr('Email is required'); return; }
    if (!isEmail(form.email)) { setErr('Enter a valid email address'); return; }
    if (form.phone && !/^\d{7,15}$/.test(form.phone)) { setErr('Phone must be 7–15 digits'); return; }
    if (!form.password || form.password.length < 10) { setErr('Password must be at least 10 chars'); return; }
    if (branchRequired && !form.branch_id) { setErr('Please select a branch for this user'); return; }
    // Teaching roles must be bound to at least one course at creation. Trainers
    // are course-only here; the head trainer assigns their modules later.
    const cleanBindings = bindings.filter((b) => b.program_id);
    if (isTeachingRole && cleanBindings.length === 0) { setErr(`Assign at least one course for this ${isHeadTrainer ? 'head trainer' : 'trainer'}.`); return; }
    setSaving(true);
    try {
      const fullName = [form.first_name, form.last_name].filter(Boolean).join(' ').trim();
      // We send role_id (the chosen role); server computes the role bucket
      // from custom_roles.scope. Role bucket is a fallback for legacy paths.
      const payload = {
        name: fullName,
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        ...(form.role_id ? { role_id: form.role_id } : {}),
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
        ...(form.designation.trim() ? { designation: form.designation.trim() } : {}),
        // branch_manager reports to admin (server forces it) — don't send managers.
        ...(!isBranchManager && form.manager_ids.length ? { manager_ids: form.manager_ids } : {}),
        // super_admin spans all branches; others carry their branch.
        ...(isSuperAdmin ? {} : (form.branch_id ? { branch_id: form.branch_id } : {})),
        ...(isTeachingRole ? { branch_ids: Array.isArray(form.branch_ids) ? form.branch_ids : [] } : {}),
      };
      const res = await usersApi.create(payload);
      const newUser = res?.data ?? res;
      // Bind teaching roles to their course(s). head → role 'head', trainer →
      // role 'trainer'. Module assignment for trainers happens later (head does
      // it from the Course → Trainers tab). Best-effort per binding; a failure
      // surfaces but doesn't undo the created user.
      if (isTeachingRole && newUser?.id && cleanBindings.length) {
        const role = isHeadTrainer ? 'head' : 'trainer';
        const failures = [];
        for (const b of cleanBindings) {
          try { await coursesApi.addTrainer(b.program_id, { user_id: newUser.id, role }); }
          catch (e) { failures.push(e.message || 'binding failed'); }
        }
        if (failures.length) { setErr(`User created, but course assignment had issues: ${failures[0]}`); }
      }
      onCreated?.();
    } catch (e) {
      setErr(e.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ background: '#fdf3ed' }}>Add New User</DialogTitle>
      <DialogContent>

        <h4 style={{ marginTop: 16, marginBottom: 12 }}>Section 1: Basic User Details</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <TextField size="small" label="First Name *" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          <TextField size="small" label="Last Name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          <TextField size="small" type="email" label="Email Id *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            error={!!form.email && !isEmail(form.email)} helperText={form.email && !isEmail(form.email) ? 'Enter a valid email' : ''} />
          <TextField size="small" label="WhatsApp Number *" value={form.phone} onChange={(e) => setForm({ ...form, phone: sanitizeDigits(e.target.value) })}
            error={!!form.phone && form.phone.length < 7} helperText={form.phone && form.phone.length < 7 ? 'At least 7 digits' : ''} inputProps={{ inputMode: 'numeric' }} />
          <TextField size="small" label="Initial password (10+ chars) *" type="password"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <TextField
            size="small"
            label="Official Designation"
            placeholder="e.g. Senior Counsellor, Team Lead"
            value={form.designation}
            onChange={(e) => setForm({ ...form, designation: e.target.value })}
          />
        </div>

        <h4 style={{ marginTop: 24, marginBottom: 12 }}>Section 2: Access Level Details</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          {/* Combined role picker: every role in the tenant — system + custom.
              Server reads custom_roles.scope to decide the user's role bucket. */}
          <TextField
            size="small"
            select
            label="Role *"
            value={form.role_id || ''}
            onChange={(e) => {
              const role_id = e.target.value;
              const picked = allRoles.find((r) => r.id === role_id);
              setForm({ ...form, role_id, role: picked?.scope || form.role });
            }}
            helperText={form.role_id
              ? `Inherits scope: ${(allRoles.find((r) => r.id === form.role_id)?.scope || '').replace('_', ' ')}`
              : 'Pick a system or custom role'}
          >
            {allRoles.length === 0 && <MenuItem disabled value="">Loading roles…</MenuItem>}
            {allRoles.filter((r) => r.is_system).map((r) => (
              <MenuItem key={r.id} value={r.id}>
                {r.name} <span style={{ color: '#888', fontSize: 11, marginLeft: 6 }}>· system</span>
              </MenuItem>
            ))}
            {allRoles.some((r) => !r.is_system) && (
              <MenuItem disabled value="" sx={{ opacity: 0.6, fontSize: 11 }}>— Custom roles —</MenuItem>
            )}
            {allRoles.filter((r) => !r.is_system).map((r) => (
              <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
            ))}
          </TextField>

          {/* Multi-select reporting managers. All active users in the
              tenant are candidates. Per-spec the picker is unrestricted.
              Disabled for branch_manager — a branch head always reports to the
              tenant admin (server forces this). */}
          <Autocomplete
            multiple
            size="small"
            disabled={isBranchManager}
            disableCloseOnSelect
            options={candidateManagers}
            value={candidateManagers.filter((u) => form.manager_ids.includes(u.id))}
            onChange={(_e, picked) => setForm({ ...form, manager_ids: picked.map((u) => u.id) })}
            getOptionLabel={(o) => o?.name || o?.email || ''}
            isOptionEqualToValue={(o, v) => o?.id === v?.id}
            noOptionsText="No active users in this tenant yet."
            renderOption={(props, opt, { selected }) => (
              <li {...props} key={opt.id}>
                <Checkbox size="small" checked={selected} sx={{ mr: 1, p: 0.5, '&.Mui-checked': { color: '#E53935' } }} />
                <Box>
                  <div style={{ fontSize: 13 }}>{opt.name || opt.email}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{opt.email} · {String(opt.role || '').replace('_', ' ')}</div>
                </Box>
              </li>
            )}
            renderTags={(picked, getTagProps) =>
              picked.map((u, i) => (
                <Chip
                  {...getTagProps({ index: i })}
                  key={u.id}
                  label={u.name || u.email}
                  size="small"
                  sx={{ background: '#fdf3ed', color: '#c84200' }}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Reporting To (multi-select)"
                placeholder={isBranchManager ? 'Reports to admin' : 'Type a name or email to search…'}
                helperText={isBranchManager
                  ? 'Branch managers report directly to the admin.'
                  : 'One or more managers. The first becomes the user’s primary manager.'}
              />
            )}
          />

          {/* Branch assignment. Required for everyone except super_admin (spans
              all branches) and branch_manager (assigned when made a head). */}
          {!isSuperAdmin && (
            <TextField
              size="small"
              select
              label={branchRequired ? 'Branch *' : 'Branch'}
              value={form.branch_id || ''}
              onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
              helperText={isBranchManager
                ? 'Optional — a branch manager is assigned a branch when set as its head.'
                : 'Which branch this user belongs to.'}
            >
              {branches.length === 0 && <MenuItem disabled value="">No branches yet</MenuItem>}
              {!branchRequired && <MenuItem value=""><em>None</em></MenuItem>}
              {branches.map((b) => (
                <MenuItem key={b.id} value={b.id}>{b.name}{b.code ? ` (${b.code})` : ''}</MenuItem>
              ))}
            </TextField>
          )}
          {isTeachingRole && (
            <TextField
              size="small" select label="Additional branches"
              SelectProps={{ multiple: true, renderValue: (sel) => (sel || []).map((id) => branches.find((b) => b.id === id)?.name || '').filter(Boolean).join(', ') || 'None' }}
              value={Array.isArray(form.branch_ids) ? form.branch_ids : []}
              onChange={(e) => setForm({ ...form, branch_ids: e.target.value })}
              helperText="Other branches this trainer works across (they can switch between them)."
            >
              {branches.filter((b) => b.id !== form.branch_id).map((b) => (
                <MenuItem key={b.id} value={b.id}>{b.name}{b.code ? ` (${b.code})` : ''}</MenuItem>
              ))}
            </TextField>
          )}
        </div>
        <FormControlLabel
          control={<Checkbox checked={form.allow_mobile} onChange={(e) => setForm({ ...form, allow_mobile: e.target.checked })} sx={{ color: '#E53935', '&.Mui-checked': { color: '#E53935' } }} />}
          label="Allow this user to Log In ExtraaEdge Mobile App *"
          sx={{ mt: 1 }}
        />

        {/* LMS: bind a head_trainer / trainer to course(s). A course can have
            multiple head trainers. For a trainer, the head assigns modules
            later (Course → Trainers), so only the course is chosen here. */}
        {isTeachingRole && (
          <div style={{ marginTop: 20, padding: 14, border: '1px solid #fde0d5', borderRadius: 10, background: '#fff8f5' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
              Assign course{isHeadTrainer ? 's (as Head Trainer)' : 's (as Trainer)'} *
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
              {isHeadTrainer
                ? 'The head trainer owns these courses. A course can have more than one head.'
                : 'The trainer joins these courses. Their head trainer assigns specific modules afterwards.'}
            </div>
            {bindings.map((b, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <TextField
                  size="small" select label="Course" value={b.program_id} sx={{ flex: 1 }}
                  onChange={(e) => setBinding(i, { program_id: e.target.value })}
                >
                  {programs.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                </TextField>
                <Button size="small" color="inherit" onClick={() => removeBinding(i)} sx={{ minWidth: 0, color: '#dc2626' }}>Remove</Button>
              </div>
            ))}
            <Button size="small" onClick={addBinding} sx={{ textTransform: 'none' }}>+ Add course</Button>
          </div>
        )}

        <h4 style={{ marginTop: 24, marginBottom: 12 }}>Section 3: Default values to be set</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <TextField size="small" select label="Default Program *" value={form.program_id} onChange={(e) => setForm({ ...form, program_id: e.target.value })}>
            <MenuItem value="">— None —</MenuItem>
            {programs.length === 0 && <MenuItem value="" disabled>No programs configured. Add some in Settings → Setup Dropdown Values → Program.</MenuItem>}
            {programs.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </TextField>
        </div>

        {err && <div style={{ color: '#d32f2f', fontSize: 13, marginTop: 12 }}>{err}</div>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="outlined" onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={saving} sx={{ background: '#fb8c00' }}>
          {saving ? 'Adding…' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const initialAddForm = () => ({
  first_name: '', last_name: '', email: '', phone: '', password: '',
  role: 'counsellor', role_id: '', designation: '', manager_ids: [],
  branch_id: '', branch_ids: [],
  allow_mobile: true, program_id: '',
});

// ============================================================================
// ROLES TAB — custom role editor with per-tab access level
// ============================================================================

function RolesTab() {
  const { data, loading, error, reload } = useFetch(() => customRolesApi.list());
  const [editing, setEditing] = useState(null);
  const canEdit = isRole(ROLES.SUPER_ADMIN);

  const startNew = () => setEditing({ name: '', description: '', scope: 'counsellor', tab_permissions: blankTabPerms() });
  const startEdit = (r) => setEditing({
    id: r.id, name: r.name, description: r.description || '',
    scope: r.scope || 'counsellor',
    tab_permissions: { ...blankTabPerms(), ...(r.tab_permissions || {}) },
  });

  const save = async () => {
    if (!editing.name.trim()) { alert('Name required'); return; }
    try {
      const payload = {
        name: editing.name.trim(),
        description: editing.description || undefined,
        // Scope is no longer exposed in the UI — a role is just a name + tabs.
        // Server still needs a value to derive users.role bucket on assignment,
        // so we always submit 'counsellor' (least-privileged) for new roles.
        // For existing system roles the server ignores scope on update.
        scope: editing.scope || 'counsellor',
        tab_permissions: editing.tab_permissions,
      };
      if (editing.id) await customRolesApi.update(editing.id, payload);
      else await customRolesApi.create(payload);
      setEditing(null); reload();
      // If the admin edited their OWN role, the live socket signal is sent to
      // every user with that role_id including themselves — but the signal
      // only fires after the round-trip. Re-fetch /auth/me immediately so the
      // sidebar updates without waiting on the websocket round-trip.
      try {
        const me = await authApi.me();
        const data = me?.data ?? me;
        auth.setSession({
          user: data?.user,
          tenant: data?.tenant,
          allowed_tabs: data?.allowed_tabs,
        });
      } catch { /* non-fatal; socket signal will catch it */ }
    } catch (e) { alert(e.message); }
  };

  if (loading) return <CircularProgress />;
  if (error) return <div style={{ color: '#d32f2f' }}>{error}</div>;

  return (
    <div>
      {canEdit && !editing && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: '#666' }}>
            Define a role and choose which tabs it allows. Then assign it to users in the Users tab.
          </div>
          <Button variant="contained" onClick={startNew} sx={{ background: '#E53935' }}>+ New Role</Button>
        </div>
      )}

      {editing && (
        <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>{editing.id ? 'Edit role' : 'New role'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 12 }}>
            <TextField size="small" label="Role name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <TextField size="small" label="Description" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          </div>

          <h4 style={{ margin: '12px 0 4px' }}>Tabs this role can see</h4>
          {/* Bulk actions operate ONLY on tabs applicable to the role's
              scope — clicking "Allow all" on an account_manager role
              won't accidentally grant Lead Manager etc. */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <Button
              size="small"
              onClick={() => setEditing({
                ...editing,
                tab_permissions: Object.fromEntries(TAB_KEYS.map((k) => [
                  k,
                  isTabApplicable(k, editing.scope) ? 'full' : 'hidden',
                ])),
              })}
            >
              Allow all applicable
            </Button>
            <Button size="small" onClick={() => setEditing({ ...editing, tab_permissions: blankTabPerms() })}>Hide all</Button>
            <span style={{ fontSize: 11, color: '#888', marginLeft: 'auto' }}>
              Scope: <code style={{ fontSize: 11 }}>{editing.scope}</code>
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fafafa', border: '1px solid #eee', borderRadius: 4 }}>
            <thead>
              <tr><th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 12, color: '#666', width: '60%' }}>Tab</th><th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 12, color: '#666' }}>Access level</th></tr>
            </thead>
            <tbody>
              {/* Sort applicable tabs to the top so admins see what matters
                  for this role first; non-applicable rows sink to the bottom
                  greyed out but still visible for context. */}
              {[...TAB_KEYS].sort((a, b) => {
                const aOk = isTabApplicable(a, editing.scope);
                const bOk = isTabApplicable(b, editing.scope);
                if (aOk === bOk) return 0;
                return aOk ? -1 : 1;
              }).map((key) => {
                const applicable = isTabApplicable(key, editing.scope);
                return (
                  <tr key={key} style={{ borderTop: '1px solid #f0f0f0', opacity: applicable ? 1 : 0.45 }}>
                    <td style={{ padding: '6px 12px', fontFamily: 'monospace', fontSize: 12 }}>
                      {key}
                      {!applicable && (
                        <span style={{
                          marginLeft: 8, fontSize: 10, fontWeight: 600,
                          color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.04,
                        }}>
                          not applicable
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '6px 12px' }}>
                      <select
                        value={editing.tab_permissions[key] || 'hidden'}
                        onChange={(e) => setEditing({ ...editing, tab_permissions: { ...editing.tab_permissions, [key]: e.target.value } })}
                        disabled={!applicable}
                        style={{
                          padding: 4, border: '1px solid #ccc', borderRadius: 4,
                          background: applicable ? '#fff' : '#f3f4f6',
                          cursor: applicable ? 'pointer' : 'not-allowed',
                        }}
                      >
                        {PERM_LEVELS.map((lvl) => <option key={lvl} value={lvl}>{lvl}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="contained" onClick={save} sx={{ background: '#E53935' }}>{editing.id ? 'Save changes' : 'Create role'}</Button>
          </div>
        </div>
      )}

      {!editing && (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', border: '1px solid #e8e8e8', borderRadius: 4 }}>
          <thead>
            <tr style={{ background: '#fdf3ed' }}>
              {['Name', 'Description', 'Tabs allowed', ''].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6b4a3a', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.data || []).map((r, idx) => {
              const allowed = Object.entries(r.tab_permissions || {}).filter(([, v]) => v && v !== 'hidden').length;
              return (
                <tr key={r.id} style={{ background: idx % 2 ? '#fafafa' : '#fff', borderTop: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '14px 16px' }}>{r.name} {r.is_system && <span style={{ fontSize: 11, color: '#888' }}>🔒 system</span>}</td>
                  <td style={{ padding: '14px 16px', color: '#555' }}>{r.description || '—'}</td>
                  <td style={{ padding: '14px 16px' }}>{allowed} / {TAB_KEYS.length}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    {canEdit && <Button size="small" onClick={() => startEdit(r)}>Edit tabs</Button>}
                    {canEdit && !r.is_system && (
                      <Button size="small" color="error" onClick={async () => {
                        if (!confirm(`Delete role "${r.name}"?`)) return;
                        try { await customRolesApi.delete(r.id); reload(); } catch (e) { alert(e.message); }
                      }}>Delete</Button>
                    )}
                  </td>
                </tr>
              );
            })}
            {(data?.data || []).length === 0 && <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: '#888' }}>No roles defined</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}
