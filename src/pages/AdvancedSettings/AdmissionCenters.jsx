// Centers admin — tenant-managed list of admission centers (e.g. "JM Road").
// Lives under Advanced Settings → Dropdown Values so super_admin can curate
// the list; account_managers consume it via the /admissions/centers GET.
import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, IconButton, Tooltip, CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { admissionsApi } from '../../lib/endpoints';
import { isRole, ROLES } from '../../lib/rbac';
import Breadcrumb from './Breadcrumb';

export default function AdmissionCenters() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const canEdit = isRole(ROLES.SUPER_ADMIN);

  const reload = () => {
    setLoading(true);
    return admissionsApi.centers.list()
      .then((r) => setRows(r?.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  // Async IIFE keeps the synchronous-setState-in-effect lint rule happy
  // (reload() calls setLoading/setRows internally).
  useEffect(() => { (async () => { await reload(); })(); }, []);

  return (
    <div style={{ background: '#fafafa', minHeight: '100vh' }}>
      <Breadcrumb trail={[
        { label: 'Settings', path: '/advancedsettings' },
        { label: 'Setup Dropdown Values', path: '/advancedsettings/dropdowns' },
        { label: 'Admission Centers' },
      ]} />

      <div style={{ padding: '0 24px 32px', maxWidth: 900 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Admission Centers</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              These appear in the Admission Form&apos;s &quot;Center&quot; dropdown.
            </div>
          </div>
          {canEdit && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)} sx={{ textTransform: 'none', bgcolor: 'var(--primary)' }}>
              Add Center
            </Button>
          )}
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><CircularProgress size={20} /></div>
          ) : rows.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No centers yet.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={th}>Name</th>
                  <th style={th}>Address</th>
                  <th style={th}>Status</th>
                  {canEdit && <th style={{ ...th, textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td style={td}>{r.name}</td>
                    <td style={{ ...td, color: '#6b7280' }}>{r.address || '—'}</td>
                    <td style={td}>{r.is_active ? 'Active' : 'Inactive'}</td>
                    {canEdit && (
                      <td style={{ ...td, textAlign: 'right' }}>
                        <Tooltip title="Edit"><IconButton size="small" onClick={() => setEditRow(r)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Delete"><IconButton size="small" onClick={() => setDeleteRow(r)} sx={{ color: '#dc2626' }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {(addOpen || editRow) && (
        <CenterDialog
          row={editRow}
          onClose={() => { setAddOpen(false); setEditRow(null); }}
          onSaved={() => { setAddOpen(false); setEditRow(null); reload(); }}
        />
      )}
      {deleteRow && (
        <Dialog open onClose={() => setDeleteRow(null)} maxWidth="xs" fullWidth>
          <DialogTitle>Delete {deleteRow.name}?</DialogTitle>
          <DialogContent>
            <p style={{ fontSize: 13, color: '#555' }}>
              The center won&apos;t appear in the Admission Form anymore. Existing
              admissions stay linked to it for audit.
            </p>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteRow(null)}>Cancel</Button>
            <Button
              variant="contained"
              color="error"
              onClick={async () => { await admissionsApi.centers.delete(deleteRow.id); setDeleteRow(null); reload(); }}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
}

const CenterDialog = ({ row, onClose, onSaved }) => {
  const [name, setName] = useState(row?.name || '');
  const [address, setAddress] = useState(row?.address || '');
  const [isActive, setIsActive] = useState(row?.is_active !== false);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(row);
  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (isEdit) {
        await admissionsApi.centers.update(row.id, { name, address: address || null, is_active: isActive });
      } else {
        await admissionsApi.centers.create({ name, address: address || null, is_active: isActive });
      }
      onSaved?.();
    } finally { setSaving(false); }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Center' : 'Add Center'}</DialogTitle>
      <DialogContent>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
          <TextField label="Name" size="small" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <TextField label="Address (optional)" size="small" value={address} onChange={(e) => setAddress(e.target.value)} multiline minRows={2} />
          <label style={{ fontSize: 12, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving || !name.trim()} sx={{ textTransform: 'none', bgcolor: 'var(--primary)' }}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const th = { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #eef0f3' };
const td = { padding: '10px 14px', fontSize: 13, borderBottom: '1px solid #eef0f3' };
