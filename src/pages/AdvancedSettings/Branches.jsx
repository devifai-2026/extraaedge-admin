// Branches management (super_admin). List / create / edit / delete branches,
// set each branch's head (a branch_manager user), and move users between
// branches. This is how an admin splits the org into more branches after the
// initial onboarding adoption.
import { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, IconButton, Chip, Table, TableHead, TableRow, TableCell, TableBody,
  Alert, Typography, CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import { branchesApi, usersApi } from '../../lib/endpoints';
import { isRole, ROLES } from '../../lib/rbac';

export default function Branches() {
  const canManage = isRole(ROLES.SUPER_ADMIN);
  const [branches, setBranches] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // branch object or {} for new

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [b, m] = await Promise.all([
        branchesApi.list(),
        usersApi.list({ role: ROLES.BRANCH_MANAGER, is_active: 'true', page: 1, limit: 200 }),
      ]);
      setBranches(b?.data || []);
      setManagers(m?.data || []);
    } catch (e) {
      setError(e.message || 'Failed to load branches');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (b) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete branch "${b.name}"? Members must be moved first.`)) return;
    try { await branchesApi.remove(b.id); load(); }
    catch (e) { setError(e.message || 'Failed to delete branch'); }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ flex: 1 }}>Branches</Typography>
        {canManage && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing({})}
            sx={{ bgcolor: '#E53935', '&:hover': { bgcolor: '#c62828' } }}>
            Add Branch
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Branch</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Branch Manager</TableCell>
              <TableCell align="center">Members</TableCell>
              <TableCell align="center">Status</TableCell>
              {canManage && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {branches.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center" sx={{ color: '#888', py: 4 }}>
                No branches yet.
              </TableCell></TableRow>
            )}
            {branches.map((b) => (
              <TableRow key={b.id} hover>
                <TableCell>{b.name}</TableCell>
                <TableCell>{b.code || '—'}</TableCell>
                <TableCell>{b.branch_manager_name || <span style={{ color: '#999' }}>Unassigned</span>}</TableCell>
                <TableCell align="center">{b.member_count ?? 0}</TableCell>
                <TableCell align="center">
                  <Chip size="small" label={b.is_active ? 'Active' : 'Inactive'}
                    color={b.is_active ? 'success' : 'default'} variant="outlined" />
                </TableCell>
                {canManage && (
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => setEditing(b)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={() => remove(b)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {editing && (
        <BranchEditDialog
          branch={editing}
          managers={managers}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </Box>
  );
}

function BranchEditDialog({ branch, managers, onClose, onSaved }) {
  const isNew = !branch.id;
  const [form, setForm] = useState({
    name: branch.name || '',
    code: branch.code || '',
    branch_manager_id: branch.branch_manager_id || '',
    is_active: branch.is_active !== false,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    setErr('');
    if (!form.name.trim()) { setErr('Branch name is required'); return; }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        branch_manager_id: form.branch_manager_id || null,
        is_active: form.is_active,
      };
      if (isNew) await branchesApi.create(body);
      else await branchesApi.update(branch.id, body);
      onSaved?.();
    } catch (e) {
      const detail = e?.data?.error?.details;
      const detailText = detail && typeof detail === 'object'
        ? Object.entries(detail).map(([k, v]) => `${k}: ${v}`).join('; ')
        : null;
      setErr(detailText || e?.data?.error?.message || e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isNew ? 'Add Branch' : 'Edit Branch'}</DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField size="small" label="Branch name *" autoFocus value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <TextField size="small" label="Code (optional)" placeholder="e.g. MUM" value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <TextField size="small" select label="Branch manager" value={form.branch_manager_id}
          onChange={(e) => setForm({ ...form, branch_manager_id: e.target.value })}
          helperText="A user with the Branch Manager role. They are assigned to this branch.">
          <MenuItem value=""><em>Unassigned</em></MenuItem>
          {managers.map((m) => (
            <MenuItem key={m.id} value={m.id}>{m.name} — {m.email}</MenuItem>
          ))}
        </TextField>
        <TextField size="small" select label="Status" value={form.is_active ? '1' : '0'}
          onChange={(e) => setForm({ ...form, is_active: e.target.value === '1' })}>
          <MenuItem value="1">Active</MenuItem>
          <MenuItem value="0">Inactive</MenuItem>
        </TextField>
        {err && <Alert severity="error" sx={{ fontSize: 13, whiteSpace: 'pre-line' }}>{err}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving}
          sx={{ bgcolor: '#E53935', '&:hover': { bgcolor: '#c62828' } }}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
