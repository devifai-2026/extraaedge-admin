// Detail page for a single dropdown — handles both seeded backend types
// (stages, channels, etc.) and dynamic custom-field dropdowns (URL: cf-<uuid>).
// URL: /advancedsettings/dropdowns/:type
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Chip, MenuItem, FormControlLabel, Switch } from '@mui/material';
import { dropdownsApi, programsApi, customFieldsApi } from '../../lib/endpoints';
import { isRole, ROLES } from '../../lib/rbac';
import Breadcrumb from './Breadcrumb';
import SettingsTable from './SettingsTable';

// Seed dropdown types known to the backend.
const TYPE_CONFIG = {
  'stages': {
    label: 'Stage',
    api: 'dropdowns',
    columns: [
      { key: 'name', label: 'Stage' },
      { key: 'is_active', label: 'Activated', render: (r) => r.is_active ? 'True' : 'False' },
      { key: 'code', label: 'Stage Code' },
      { key: 'score', label: 'Score', render: (r) => r.score ?? 0 },
      // Mark-as-converted column — shows "Yes" for stages where reaching them
      // means the lead is "Enrolled" / "Won" / etc.
      { key: 'is_success', label: 'Marks as Converted', render: (r) => r.is_success ? 'Yes' : 'No' },
    ],
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'code', label: 'Code (e.g. 01-New)' },
      { key: 'order_index', label: 'Order', type: 'number' },
      { key: 'score', label: 'Score weight (added to lead_score when this stage is reached)', type: 'number' },
      {
        key: 'is_success',
        label: 'Mark leads as CONVERTED when they reach this stage',
        type: 'bool',
        helper: 'Use for terminal "won" stages like Enrolled. Reports use leads.converted_at to compute conversion %.',
      },
    ],
  },
  'sub-stages': {
    label: 'Sub-Stage',
    api: 'dropdowns',
    needsStageId: true,
    columns: [
      { key: 'name', label: 'Sub-Stage' },
      { key: 'is_active', label: 'Activated', render: (r) => r.is_active ? 'True' : 'False' },
      { key: 'stage_name', label: 'Mapped With Stage', render: (r) => r.stage_name || r.stage_id || '—' },
      { key: 'score', label: 'Score', render: (r) => r.score ?? 0 },
    ],
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'stage_id', label: 'Stage', type: 'stage-select', required: true },
      { key: 'score', label: 'Score weight', type: 'number' },
    ],
  },
  'channels': {
    label: 'Channel', api: 'dropdowns',
    columns: [
      { key: 'name', label: 'Channel' },
      { key: 'is_active', label: 'Activated', render: (r) => r.is_active ? 'True' : 'False' },
    ],
    fields: [{ key: 'name', label: 'Name', required: true }],
  },
  'sources': {
    label: 'Source', api: 'dropdowns',
    columns: [
      { key: 'name', label: 'Source' },
      { key: 'is_active', label: 'Activated', render: (r) => r.is_active ? 'True' : 'False' },
    ],
    fields: [{ key: 'name', label: 'Name', required: true }],
  },
  'campaigns': {
    label: 'Campaign', api: 'dropdowns',
    columns: [
      { key: 'name', label: 'Campaign' },
      { key: 'is_active', label: 'Activated', render: (r) => r.is_active ? 'True' : 'False' },
    ],
    fields: [{ key: 'name', label: 'Name', required: true }],
  },
  'mediums': {
    label: 'Medium', api: 'dropdowns',
    columns: [
      { key: 'name', label: 'Medium' },
      { key: 'is_active', label: 'Activated', render: (r) => r.is_active ? 'True' : 'False' },
    ],
    fields: [{ key: 'name', label: 'Name', required: true }],
  },
  'genders': {
    label: 'Gender', api: 'dropdowns',
    columns: [
      { key: 'name', label: 'Gender' },
      { key: 'is_active', label: 'Activated', render: (r) => r.is_active ? 'True' : 'False' },
    ],
    fields: [{ key: 'name', label: 'Name', required: true }],
  },
  'countries': {
    label: 'Country', api: 'dropdowns',
    columns: [
      { key: 'name', label: 'Country' },
      { key: 'iso', label: 'ISO' },
      { key: 'is_active', label: 'Activated', render: (r) => r.is_active ? 'True' : 'False' },
    ],
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'iso', label: 'ISO code (2-letter)' },
    ],
  },
  'states': {
    label: 'State', api: 'dropdowns',
    needsCountryId: true,
    columns: [
      { key: 'name', label: 'State' },
      { key: 'country_name', label: 'Country', render: (r) => r.country_name || r.country_id || '—' },
      { key: 'is_active', label: 'Activated', render: (r) => r.is_active ? 'True' : 'False' },
    ],
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'country_id', label: 'Country', type: 'country-select', required: true },
    ],
  },
  'degrees': {
    label: 'Degree', api: 'dropdowns',
    columns: [
      { key: 'name', label: 'Degree' },
      { key: 'level', label: 'Level' },
      { key: 'is_active', label: 'Activated', render: (r) => r.is_active ? 'True' : 'False' },
    ],
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'level', label: 'Level (e.g. UG, PG)', required: true },
    ],
  },
  'specializations': {
    label: 'Specialization', api: 'dropdowns',
    columns: [
      { key: 'name', label: 'Specialization' },
      { key: 'is_active', label: 'Activated', render: (r) => r.is_active ? 'True' : 'False' },
    ],
    fields: [{ key: 'name', label: 'Name', required: true }],
  },
  'universities': {
    label: 'University', api: 'dropdowns',
    needsCountryId: true,
    columns: [
      { key: 'name', label: 'University' },
      { key: 'country_name', label: 'Country', render: (r) => r.country_name || '—' },
      { key: 'is_active', label: 'Activated', render: (r) => r.is_active ? 'True' : 'False' },
    ],
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'country_id', label: 'Country', type: 'country-select' },
    ],
  },
  'programs': {
    label: 'Program',
    api: 'programs',
    columns: [
      { key: 'name', label: 'Program' },
      { key: 'is_active', label: 'Activated', render: (r) => r.is_active ? 'True' : 'False' },
      { key: 'category', label: 'Category', render: (r) => r.category || '—' },
      { key: 'type', label: 'Type', render: (r) => r.type || '—' },
      { key: 'price', label: 'Price', render: (r) => (r.price != null ? `${r.currency || ''} ${r.price}`.trim() : '—') },
    ],
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'code', label: 'Code' },
      { key: 'description', label: 'Description' },
      // Backend constrains these via z.enum — show as dropdowns so the user can't type invalid values.
      { key: 'category', label: 'Category', type: 'enum', options: ['', 'abroad', 'domestic', 'coaching'] },
      { key: 'type',     label: 'Type',     type: 'enum', options: ['', 'online', 'offline', 'hybrid'] },
      { key: 'price', label: 'Price', type: 'number' },
      { key: 'currency', label: 'Currency (e.g. INR, USD)' },
      { key: 'discount_price', label: 'Discount Price', type: 'number' },
      { key: 'duration_value', label: 'Duration', type: 'number' },
      { key: 'duration_unit', label: 'Duration Unit', type: 'enum', options: ['', 'days', 'months', 'years'] },
      { key: 'eligibility', label: 'Eligibility' },
      { key: 'intake_month', label: 'Intake Month' },
      { key: 'country', label: 'Country' },
    ],
  },
};

export default function DropdownDetail() {
  const { type } = useParams();
  const isCustomField = type?.startsWith('cf-');
  const customFieldId = isCustomField ? type.slice(3) : null;

  const cfg = isCustomField ? null : TYPE_CONFIG[type];

  // Every dropdown row in the DB has an `is_active` flag. Surface it in the
  // edit dialog as a Switch (for any type whose config didn't already declare
  // its own is_active field). The Active-only filter on the Settings table
  // already exists; this just lets admins flip the value.
  // (Reads cfg.fields, not effectiveFields, to avoid TDZ.)
  const effectiveFields = (() => {
    if (!cfg) return [];
    const hasActive = cfg.fields.some((f) => f.key === 'is_active');
    if (hasActive) return cfg.fields;
    return [
      ...cfg.fields,
      { key: 'is_active', label: 'Active', type: 'bool', helper: 'Inactive entries stay in the DB but are hidden from dropdowns.' },
    ];
  })();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [stages, setStages] = useState([]);
  const [countries, setCountries] = useState([]);
  const [customField, setCustomField] = useState(null); // for cf-<id>
  const canEdit = isRole(ROLES.SUPER_ADMIN);

  // Load stages list once if we'll need it for a sub-stage select.
  useEffect(() => {
    if (cfg?.needsStageId) {
      dropdownsApi.list('stages').then((r) => setStages(r?.data || [])).catch(() => {});
    }
    if (cfg?.needsCountryId) {
      dropdownsApi.list('countries').then((r) => setCountries(r?.data || [])).catch(() => {});
    }
  }, [cfg]);

  // ----- list / create handlers -----

  const apiList = useCallback(async () => {
    if (isCustomField) {
      // Re-fetch the custom field, options come from options_json
      const all = await customFieldsApi.list({ entity: 'lead' });
      const cf = (all?.data || []).find((f) => f.id === customFieldId);
      setCustomField(cf || null);
      const opts = cf?.options_json || [];
      return {
        data: opts.map((o, idx) => ({
          id: `${o.value}__${idx}`,
          value: o.value,
          name: o.label || o.value,
          is_active: true,
          added_by_apis: false,
        })),
      };
    }
    if (!cfg) return { data: [] };
    if (cfg.api === 'programs') return programsApi.list();
    return dropdownsApi.list(type);
  }, [cfg, type, isCustomField, customFieldId]);

  const apiCreate = useCallback(async (body) => {
    if (isCustomField) {
      // Append new option to options_json
      const cf = customField;
      if (!cf) throw new Error('Custom field not loaded');
      const next = [...(cf.options_json || []), { value: body.value || body.name, label: body.name }];
      await customFieldsApi.update(cf.id, { options_json: next });
      return;
    }
    if (cfg.api === 'programs') return programsApi.create(body);
    return dropdownsApi.create(type, body);
  }, [cfg, type, isCustomField, customField]);

  const apiUpdate = useCallback(async (row, body) => {
    if (isCustomField) {
      const cf = customField;
      if (!cf) throw new Error('Custom field not loaded');
      const opts = (cf.options_json || []).map((o, idx) => {
        const rowMatchesId = `${o.value}__${idx}` === row.id;
        return rowMatchesId
          ? { value: body.value || body.name, label: body.name }
          : o;
      });
      await customFieldsApi.update(cf.id, { options_json: opts });
      return;
    }
    // Programs use optimistic locking — backend rejects PUT without an If-Match header
    // matching the row's last `updated_at`. Pass it through so the FE never gets a 412.
    if (cfg.api === 'programs') return programsApi.update(row.id, body, row.updated_at);
    return dropdownsApi.update(type, row.id, body);
  }, [cfg, type, isCustomField, customField]);

  const apiDelete = useCallback(async (row) => {
    if (isCustomField) {
      const cf = customField;
      if (!cf) throw new Error('Custom field not loaded');
      const opts = (cf.options_json || []).filter((o, idx) => `${o.value}__${idx}` !== row.id);
      await customFieldsApi.update(cf.id, { options_json: opts });
      return;
    }
    if (cfg.api === 'programs') return programsApi.delete(row.id);
    return dropdownsApi.delete(type, row.id);
  }, [cfg, type, isCustomField, customField]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await apiList();
      setRows(r?.data || []);
    } catch (e) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [apiList]);

  useEffect(() => { load(); }, [load]);

  // ----- dialog (handles both Add and Edit) -----

  const [editingRow, setEditingRow] = useState(null); // null = Add mode

  const openAdd = () => {
    setEditingRow(null);
    if (isCustomField) {
      setForm({ name: '', value: '' });
    } else if (cfg) {
      // Booleans default to true (most common case: a new dropdown row should
      // be active). Other fields start empty — required ones are validated on submit.
      setForm(Object.fromEntries(effectiveFields.map((f) => [f.key, f.type === 'bool' ? true : ''])));
    }
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditingRow(row);
    if (isCustomField) {
      setForm({ name: row.name, value: row.value });
    } else if (cfg) {
      setForm(Object.fromEntries(
        effectiveFields.map((f) => {
          if (f.type === 'bool') return [f.key, row[f.key] === true];
          return [f.key, row[f.key] != null ? String(row[f.key]) : ''];
        })
      ));
    }
    setDialogOpen(true);
  };

  const onDelete = async (row) => {
    if (!confirm(`Delete "${row.name}"?`)) return;
    try {
      await apiDelete(row);
      load();
    } catch (e) {
      alert(e.message || 'Delete failed');
    }
  };

  const onSave = async () => {
    if (isCustomField) {
      if (!form.name?.trim()) { alert('Value is required'); return; }
    } else {
      for (const f of effectiveFields) {
        if (f.required && !form[f.key]) { alert(`${f.label} is required`); return; }
        // Number lower-bound check (defaults to 0; allow override via f.min on the field config).
        if (f.type === 'number' && form[f.key] !== '' && form[f.key] != null) {
          const n = Number(form[f.key]);
          const min = f.min ?? 0;
          if (Number.isNaN(n)) { alert(`${f.label} must be a number`); return; }
          if (n < min) { alert(`${f.label} cannot be less than ${min}`); return; }
        }
      }
    }
    setSaving(true);
    try {
      const isEdit = !!editingRow;
      if (isCustomField) {
        const body = { name: form.name.trim(), value: form.value?.trim() || form.name.trim() };
        if (isEdit) await apiUpdate(editingRow, body);
        else await apiCreate(body);
      } else {
        const payload = Object.fromEntries(
          effectiveFields
            .filter((f) => {
              const v = form[f.key];
              if (f.type === 'bool') return typeof v === 'boolean'; // include true and false
              return v !== '' && v != null;
            })
            .map((f) => {
              if (f.type === 'number') return [f.key, Number(form[f.key])];
              if (f.type === 'bool')   return [f.key, !!form[f.key]];
              return [f.key, form[f.key]];
            })
        );
        if (isEdit) await apiUpdate(editingRow, payload);
        else await apiCreate(payload);
      }
      setDialogOpen(false);
      setEditingRow(null);
      load();
    } catch (e) {
      alert(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // ----- render -----

  if (!isCustomField && !cfg) {
    return (
      <div style={{ background: '#fafafa', minHeight: '100vh' }}>
        <Breadcrumb trail={[
          { label: 'Settings', path: '/advancedsettings' },
          { label: 'Setup Dropdown Values', path: '/advancedsettings/dropdowns' },
          { label: type },
        ]} />
        <div style={{ padding: 24, color: '#666' }}>This dropdown type is not configured.</div>
      </div>
    );
  }

  const heading = isCustomField ? (customField?.label || 'Custom field') : cfg.label;
  const columns = isCustomField
    ? [
        { key: 'name', label: heading.toUpperCase() },
        { key: 'is_active', label: 'Activated', render: (r) => r.is_active ? 'True' : 'False' },
        { key: 'added_by_apis', label: 'Added By APIs', render: (r) => r.added_by_apis ? 'True' : 'False' },
      ]
    : cfg.columns;

  return (
    <div style={{ background: '#fafafa', minHeight: '100vh' }}>
      <Breadcrumb trail={[
        { label: 'Settings', path: '/advancedsettings' },
        { label: 'Setup Dropdown Values', path: '/advancedsettings/dropdowns' },
        { label: heading },
      ]} />

      <SettingsTable
        rows={rows}
        columns={columns}
        loading={loading}
        error={error}
        searchKey="name"
        searchPlaceholder={`Search ${heading}`}
        onAdd={canEdit ? openAdd : undefined}
        onEdit={canEdit ? openEdit : undefined}
        onDelete={canEdit ? onDelete : undefined}
        emptyMessage={`No ${heading.toLowerCase()} values yet`}
      />

      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditingRow(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>{editingRow ? `Edit ${heading}` : `Add ${heading}`}</DialogTitle>
        <DialogContent>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
            {isCustomField && (
              <>
                <TextField size="small" label="Display value *" value={form.name || ''}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <TextField size="small" label="Stored value (optional)" value={form.value || ''}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  helperText="What the API stores for this option. Leave blank to use the display value." />
              </>
            )}
            {!isCustomField && effectiveFields.map((f) => {
              if (f.type === 'stage-select') {
                return (
                  <div key={f.key}>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{f.label}{f.required && ' *'}</div>
                    <select
                      value={form[f.key] || ''}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4, width: '100%' }}
                    >
                      <option value="">— Select stage —</option>
                      {stages.map((s) => (
                        <option key={s.id} value={s.id}>{s.code || s.name}</option>
                      ))}
                    </select>
                  </div>
                );
              }
              if (f.type === 'country-select') {
                // Country dropdown — required field is enforced on submit; here we
                // just render a clean "type-and-pick" using the loaded countries.
                return (
                  <TextField
                    key={f.key}
                    size="small"
                    select
                    fullWidth
                    label={f.label + (f.required ? ' *' : '')}
                    value={form[f.key] || ''}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    helperText={countries.length === 0 ? 'No countries configured yet — add one in Settings → Country first.' : ''}
                  >
                    <MenuItem value=""><em>— Select country —</em></MenuItem>
                    {countries.filter((c) => c.is_active !== false).map((c) => (
                      <MenuItem key={c.id} value={c.id}>{c.name}{c.iso ? ` (${c.iso})` : ''}</MenuItem>
                    ))}
                  </TextField>
                );
              }
              if (f.type === 'enum') {
                return (
                  <TextField
                    key={f.key}
                    size="small"
                    select
                    fullWidth
                    label={f.label + (f.required ? ' *' : '')}
                    value={form[f.key] ?? ''}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  >
                    {(f.options || []).map((opt) => (
                      <MenuItem key={opt || '__none__'} value={opt}>
                        {opt === '' ? '— None —' : opt}
                      </MenuItem>
                    ))}
                  </TextField>
                );
              }
              if (f.type === 'bool') {
                // Boolean toggle — value is stored as 'true' / 'false' / '' string in form
                // (Settings table strips empties before submit, so '' = leave alone).
                const checked = form[f.key] === true || form[f.key] === 'true';
                return (
                  <FormControlLabel
                    key={f.key}
                    sx={{ gridColumn: 'span 2' }}
                    control={
                      <Switch
                        checked={checked}
                        onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })}
                      />
                    }
                    label={
                      <span>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{f.label}</span>
                        {f.helper && (
                          <span style={{ display: 'block', fontSize: 11, color: '#888', marginTop: 2 }}>
                            {f.helper}
                          </span>
                        )}
                      </span>
                    }
                  />
                );
              }
              const isNumber = f.type === 'number';
              return (
                <TextField
                  key={f.key}
                  size="small"
                  label={f.label + (f.required ? ' *' : '')}
                  type={f.type || 'text'}
                  value={form[f.key] || ''}
                  onChange={(e) => {
                    let v = e.target.value;
                    // Prevent negative numbers from sneaking in via paste / arrow-down past 0.
                    if (isNumber && v !== '' && Number(v) < (f.min ?? 0)) v = String(f.min ?? 0);
                    setForm({ ...form, [f.key]: v });
                  }}
                  inputProps={isNumber ? { min: f.min ?? 0, step: f.step ?? 'any' } : undefined}
                />
              );
            })}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDialogOpen(false); setEditingRow(null); }}>Cancel</Button>
          <Button variant="contained" onClick={onSave} disabled={saving} sx={{ background: '#E53935' }}>
            {saving ? 'Saving…' : (editingRow ? 'Save' : 'Add')}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
