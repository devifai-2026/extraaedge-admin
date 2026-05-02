// Tiny "create a new dropdown row inline" dialog. Used by AddNewLead's
// degree / specialization / university / program selects so the user can add
// a missing option without leaving the form.
//
// The host (parent) modal stays mounted in the background — we just open this
// child dialog on top with its own backdrop. On success we:
//   1. POST to the right endpoint (programs vs dropdowns/<type>)
//   2. Notify the dropdown cache so all mounted useDropdown(type) hooks reload
//   3. Hand the new id back so the host can auto-select it
//   4. Close only this dialog, leaving the host open
import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  TextField, Button, Alert, MenuItem,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { dropdownsApi, programsApi } from '../../lib/endpoints';
import { refreshDropdown } from '../../lib/useDropdowns';

const TITLE_BY_TYPE = {
  degrees: 'Add Degree',
  specializations: 'Add Specialization',
  universities: 'Add University',
  programs: 'Add Program',
  channels: 'Add Channel',
  sources: 'Add Source',
  campaigns: 'Add Campaign',
  mediums: 'Add Medium',
  countries: 'Add Country',
  states: 'Add State',
  genders: 'Add Gender',
  stages: 'Add Stage',
  'sub-stages': 'Add Sub-Stage',
};

const PROGRAM_CATEGORIES = ['domestic', 'abroad', 'coaching'];

export default function QuickCreateDialog({ open, type, onClose, onCreated }) {
  // Generic fields most types use
  const [name, setName] = useState('');
  // Type-specific extras
  const [level, setLevel] = useState('UG');           // degrees: UG | PG
  const [iso, setIso] = useState('');                 // countries
  const [code, setCode] = useState('');               // stages
  const [category, setCategory] = useState('domestic'); // programs

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(''); setLevel('UG'); setIso(''); setCode(''); setCategory('domestic'); setError('');
  }, [open, type]);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!name.trim()) { setError('Name is required'); return; }
    setBusy(true); setError('');
    try {
      let createdId = null;
      let createdName = name.trim();
      if (type === 'programs') {
        const res = await programsApi.create({ name: createdName, category });
        createdId = res?.data?.id;
        createdName = res?.data?.name || createdName;
      } else {
        const body = { name: createdName, is_active: true };
        if (type === 'degrees' && level) body.level = level;
        if (type === 'countries' && iso.trim()) body.iso = iso.trim().toUpperCase();
        if (type === 'stages' && code.trim()) body.code = code.trim();
        const res = await dropdownsApi.create(type, body);
        createdId = res?.data?.id;
        createdName = res?.data?.name || createdName;
      }
      // Refresh every consumer of this list (the parent's <Select>s pick up the new entry).
      refreshDropdown(type);
      onCreated?.({ id: createdId, name: createdName });
    } catch (err) {
      // Surface zod validation details if present
      const detail = err?.data?.error?.details;
      const detailText = Array.isArray(detail) && detail.length
        ? detail.map((d) => `${d.path}: ${d.message}`).join('; ')
        : null;
      setError(detailText || err?.data?.error?.message || err?.message || 'Failed to create');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      // High z-index so we sit above the parent AddNewLead dialog.
      sx={{ zIndex: (theme) => theme.zIndex.modal + 5 }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        <span>{TITLE_BY_TYPE[type] || `Add ${type}`}</span>
        <IconButton size="small" onClick={onClose} disabled={busy}><CloseIcon /></IconButton>
      </DialogTitle>
      <form onSubmit={submit}>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            size="small"
            label="Name *"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />

          {type === 'degrees' && (
            <TextField
              size="small"
              select
              label="Level"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              fullWidth
            >
              <MenuItem value="UG">UG (Undergraduate)</MenuItem>
              <MenuItem value="PG">PG (Postgraduate)</MenuItem>
              <MenuItem value="DIPLOMA">Diploma</MenuItem>
              <MenuItem value="DOCTORATE">Doctorate</MenuItem>
            </TextField>
          )}

          {type === 'programs' && (
            <TextField
              size="small"
              select
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              fullWidth
            >
              {PROGRAM_CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
          )}

          {type === 'countries' && (
            <TextField
              size="small"
              label="ISO code (2 letters)"
              placeholder="e.g. IN"
              value={iso}
              onChange={(e) => setIso(e.target.value.toUpperCase().slice(0, 2))}
              fullWidth
            />
          )}

          {type === 'stages' && (
            <TextField
              size="small"
              label="Code (e.g. 01-New)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              fullWidth
            />
          )}

          {error && <Alert severity="error" sx={{ fontSize: 13, whiteSpace: 'pre-line' }}>{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy}>
            {busy ? 'Saving…' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
