// Setup Dropdown Values — left rail with grouped categories.
// Stage / Sources & Channels / Courses are seeded backend dropdowns.
// "Additional Fields" is dynamic — admin can add new dropdown-type custom fields here.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, IconButton, Tooltip } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { customFieldsApi, dropdownsApi, programsApi } from '../../lib/endpoints';
import { isRole, ROLES } from '../../lib/rbac';
import Breadcrumb from './Breadcrumb';

const SEED_GROUPS = [
  {
    title: 'Stage',
    items: [
      { label: 'Stage', type: 'stages' },
      { label: 'Sub-Stage', type: 'sub-stages' },
    ],
  },
  {
    title: 'Sources and Channels',
    items: [
      { label: 'Channel', type: 'channels' },
      { label: 'Source', type: 'sources' },
      { label: 'Campaign', type: 'campaigns' },
    ],
  },
  {
    title: 'Courses',
    items: [{ label: 'Program', type: 'programs' }],
  },
  {
    title: 'Other Dropdowns',
    items: [
      { label: 'Gender', type: 'genders' },
      { label: 'Medium', type: 'mediums' },
      { label: 'Country', type: 'countries' },
      { label: 'State', type: 'states' },
      { label: 'Degree', type: 'degrees' },
      { label: 'University', type: 'universities' },
    ],
  },
  // The Accounts module (account_manager) consumes admission_centers via a
  // dedicated endpoint, not the generic /dropdowns. We special-case the card
  // here so super_admin can still curate the list from the same hub.
  {
    title: 'Accounts',
    items: [
      { label: 'Admission Centers', type: 'admission_centers', path: '/advancedsettings/admission-centers' },
    ],
  },
];

export default function DropdownsHub() {
  const navigate = useNavigate();
  const [customFields, setCustomFields] = useState([]);
  const [seedCounts, setSeedCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [editField, setEditField] = useState(null);
  const [deleteField, setDeleteField] = useState(null);
  const canAdd = isRole(ROLES.SUPER_ADMIN);

  useEffect(() => {
    customFieldsApi.list({ entity: 'lead' })
      .then((r) => setCustomFields((r?.data || []).filter((f) => f.field_type === 'select' || f.field_type === 'multiselect')))
      .catch(() => setCustomFields([]))
      .finally(() => setLoading(false));

    const seedTypes = SEED_GROUPS.flatMap((g) => g.items.map((i) => i.type))
      // admission_centers has its own endpoint, not the generic /dropdowns —
      // the count probe below would 404 on it.
      .filter((t) => t !== 'admission_centers');
    Promise.all(seedTypes.map(async (type) => {
      try {
        const r = type === 'programs' ? await programsApi.list() : await dropdownsApi.list(type);
        const total = r?.meta?.total ?? (Array.isArray(r?.data) ? r.data.length : 0);
        return [type, total];
      } catch {
        return [type, null];
      }
    })).then((pairs) => setSeedCounts(Object.fromEntries(pairs)));
  }, [reloadKey]);

  return (
    <div style={{ background: '#fafafa', minHeight: '100vh' }}>
      <Breadcrumb trail={[
        { label: 'Settings', path: '/advancedsettings' },
        { label: 'Setup Dropdown Values' },
      ]} />

      <div style={{ padding: '0 24px 32px', maxWidth: 1100 }}>
        {SEED_GROUPS.map((g) => (
          <Group key={g.title} title={g.title}>
            {g.items.map((it) => {
              const c = seedCounts[it.type];
              const hint = c == null ? null : `${c} options`;
              const path = it.path || `/advancedsettings/dropdowns/${it.type}`;
              return (
                <Card key={it.type} label={it.label} hint={hint} onClick={() => navigate(path)} />
              );
            })}
          </Group>
        ))}

        <Group
          title="Additional Fields"
          action={canAdd && (
            <Button size="small" startIcon={<AddIcon />} onClick={() => setAddOpen(true)} sx={{ color: '#E53935' }}>
              New additional field
            </Button>
          )}
        >
          {loading && <div style={{ color: '#888', fontSize: 13 }}>Loading…</div>}
          {!loading && customFields.length === 0 && (
            <div style={{ color: '#888', fontSize: 13, padding: 12, background: '#fff', border: '1px dashed #ddd', borderRadius: 8 }}>
              No additional fields yet. Click "New additional field" to add one (e.g. PG Graduation Year, Hostel Required).
            </div>
          )}
          {customFields.map((f) => (
            <Card
              key={f.id}
              label={f.label}
              onClick={() => navigate(`/advancedsettings/dropdowns/cf-${f.id}`)}
              hint={`${(f.options_json || []).length} options`}
              actions={canAdd && (
                <>
                  <Tooltip title="Rename field">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditField(f); }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete field">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); setDeleteField(f); }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              )}
            />
          ))}
        </Group>
      </div>

      <NewCustomFieldDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => { setAddOpen(false); setReloadKey((v) => v + 1); }}
      />

      <EditCustomFieldDialog
        field={editField}
        onClose={() => setEditField(null)}
        onSaved={() => { setEditField(null); setReloadKey((v) => v + 1); }}
      />

      <DeleteCustomFieldDialog
        field={deleteField}
        onClose={() => setDeleteField(null)}
        onDeleted={() => { setDeleteField(null); setReloadKey((v) => v + 1); }}
      />
    </div>
  );
}

function Group({ title, action, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#222' }}>{title}</div>
        {action}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children}
      </div>
    </div>
  );
}

function Card({ label, hint, onClick, actions }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        border: '1px solid #e8e8e8',
        borderRadius: 8,
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#fafafa')}
      onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
    >
      <span style={{ fontSize: 14, color: '#222' }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {hint && (
          <span style={{
            fontSize: 11,
            color: '#666',
            background: '#f3f3f3',
            border: '1px solid #e8e8e8',
            borderRadius: 999,
            padding: '2px 10px',
            whiteSpace: 'nowrap',
          }}>{hint}</span>
        )}
        {actions}
        <ChevronRightIcon style={{ color: '#bbb' }} />
      </span>
    </div>
  );
}

function NewCustomFieldDialog({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ label: '', key: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);

  const submit = async () => {
    setErr('');
    if (!form.label.trim()) { setErr('Label is required'); return; }
    const key = form.key.trim() || slugify(form.label);
    setSaving(true);
    try {
      await customFieldsApi.create({
        entity: 'lead',
        key,
        label: form.label.trim(),
        field_type: 'select',
        options_json: [],
      });
      setForm({ label: '', key: '' });
      onCreated?.();
    } catch (e) {
      setErr(e.message || 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>New additional field (dropdown)</DialogTitle>
      <DialogContent>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
          <TextField
            size="small"
            label="Display label *"
            placeholder="e.g. PG Graduation Year"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
          <TextField
            size="small"
            label="API key (optional — auto-generated)"
            placeholder="e.g. pg_graduation_year"
            value={form.key}
            onChange={(e) => setForm({ ...form, key: e.target.value })}
            helperText="snake_case, used in API payloads. Leave blank to auto-generate."
          />
        </div>
        <div style={{ fontSize: 12, color: '#888', marginTop: 12 }}>
          After creating, click the field in the list to add its options/values.
        </div>
        {err && <div style={{ color: '#d32f2f', fontSize: 13, marginTop: 8 }}>{err}</div>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={saving} sx={{ background: '#E53935' }}>
          {saving ? 'Creating…' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function EditCustomFieldDialog({ field, onClose, onSaved }) {
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { setLabel(field?.label || ''); setErr(''); }, [field]);

  if (!field) return null;

  const submit = async () => {
    setErr('');
    if (!label.trim()) { setErr('Label is required'); return; }
    setSaving(true);
    try {
      await customFieldsApi.update(field.id, { label: label.trim() });
      onSaved?.();
    } catch (e) {
      setErr(e.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Rename additional field</DialogTitle>
      <DialogContent>
        <div style={{ paddingTop: 8 }}>
          <TextField
            size="small"
            fullWidth
            label="Display label *"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
            API key <code>{field.key}</code> cannot be changed after creation.
          </div>
        </div>
        {err && <div style={{ color: '#d32f2f', fontSize: 13, marginTop: 8 }}>{err}</div>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={saving} sx={{ background: '#E53935' }}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function DeleteCustomFieldDialog({ field, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  if (!field) return null;

  const submit = async () => {
    setErr('');
    setBusy(true);
    try {
      await customFieldsApi.delete(field.id);
      onDeleted?.();
    } catch (e) {
      setErr(e.message || 'Failed to delete');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Delete "{field.label}"?</DialogTitle>
      <DialogContent>
        <div style={{ fontSize: 14, color: '#444' }}>
          This will remove the field and all its options. Existing leads that have a value
          stored for this field will keep the raw value, but it will no longer appear in forms.
        </div>
        {err && <div style={{ color: '#d32f2f', fontSize: 13, marginTop: 8 }}>{err}</div>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="error" onClick={submit} disabled={busy}>
          {busy ? 'Deleting…' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
