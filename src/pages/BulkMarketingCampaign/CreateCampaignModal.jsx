// Create Bulk Campaign — a DRAFT campaign with an audience filter.
//
// Flow: fill name/channel/template + audience filter → POST /campaigns/bulk
// (creates a DRAFT) → immediately POST /campaigns/bulk/:id/preview to surface
// the live matching-audience count. The card list refreshes on close so the
// new DRAFT shows up and can be launched from its card.
//
// WhatsApp is intentionally NOT a selectable automated channel (ban risk) —
// only email + SMS are offered. WhatsApp is shown disabled for clarity.
import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogActions, Button, IconButton, TextField,
  Autocomplete, Chip, MenuItem, Snackbar, Alert, CircularProgress, Divider,
  ToggleButton, ToggleButtonGroup, Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import SmsOutlinedIcon from '@mui/icons-material/SmsOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import GroupIcon from '@mui/icons-material/Group';
import { colors } from '../../theme/colors';
import {
  campaignsBulkApi, emailApi, smsApi, programsApi, usersApi, dropdownsApi,
} from '../../lib/endpoints';

const initialFilter = {
  stage_ids: [],
  program_ids: [],
  assigned_to: [],
  sources: '',
  created_from: '',
  created_to: '',
};

const CreateCampaignModal = ({ open, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [channel, setChannel] = useState('email');
  const [emailTemplateId, setEmailTemplateId] = useState('');
  const [smsTemplateId, setSmsTemplateId] = useState('');
  const [respectsBusinessHours, setRespectsBusinessHours] = useState(true);
  const [filter, setFilter] = useState(initialFilter);

  // Option sources
  const [stages, setStages] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [owners, setOwners] = useState([]);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [smsTemplates, setSmsTemplates] = useState([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  // After create: the fresh DRAFT id + its live audience count.
  const [createdCount, setCreatedCount] = useState(null);
  const [countLoading, setCountLoading] = useState(false);

  // Reset the form each time it opens and load option lists.
  useEffect(() => {
    if (!open) return;
    setName('');
    setDescription('');
    setChannel('email');
    setEmailTemplateId('');
    setSmsTemplateId('');
    setRespectsBusinessHours(true);
    setFilter(initialFilter);
    setError('');
    setCreatedCount(null);
    (async () => {
      const [st, pr, us, et, st2] = await Promise.all([
        dropdownsApi.stages().catch(() => ({ data: [] })),
        programsApi.list().catch(() => ({ data: [] })),
        usersApi.list().catch(() => ({ data: [] })),
        emailApi.templates.list().catch(() => ({ data: [] })),
        smsApi.templates.list().catch(() => ({ data: [] })),
      ]);
      setStages((st?.data || []).filter((s) => s?.is_active !== false));
      setPrograms((pr?.data || []).filter((p) => p?.is_active !== false));
      setOwners((us?.data || []).filter((u) => u?.is_active !== false));
      setEmailTemplates(et?.data || []);
      setSmsTemplates(st2?.data || []);
    })();
  }, [open]);

  // Build the audience_filter_json from the form state (drop empty keys).
  const buildAudienceFilter = () => {
    const af = {};
    if (filter.stage_ids.length) af.stage_ids = filter.stage_ids.map((s) => s.id);
    if (filter.program_ids.length) af.program_ids = filter.program_ids.map((p) => p.id);
    if (filter.assigned_to.length) af.assigned_to = filter.assigned_to.map((u) => u.id);
    const sources = filter.sources
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (sources.length) af.sources = sources;
    if (filter.created_from) af.created_from = filter.created_from;
    if (filter.created_to) af.created_to = filter.created_to;
    return af;
  };

  const audienceIsEmpty = useMemo(() => {
    const af = buildAudienceFilter();
    return Object.keys(af).length === 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const validate = () => {
    if (!name.trim()) return 'Campaign name is required';
    if (channel === 'email' && !emailTemplateId) return 'Select an email template';
    if (channel === 'sms' && !smsTemplateId) return 'Select an SMS template';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    setError('');
    try {
      const body = {
        name: name.trim(),
        description: description.trim() || undefined,
        channel,
        audience_filter_json: buildAudienceFilter(),
        respects_business_hours: respectsBusinessHours,
      };
      if (channel === 'email') body.email_template_id = emailTemplateId;
      if (channel === 'sms') body.sms_template_id = smsTemplateId;

      const res = await campaignsBulkApi.create(body);
      const created = res?.data;
      setToast({ severity: 'success', text: 'Draft campaign created.' });

      // Surface the live audience count for the just-created draft.
      if (created?.id) {
        setCountLoading(true);
        try {
          const prev = await campaignsBulkApi.preview(created.id);
          setCreatedCount(prev?.data?.audience_count ?? 0);
        } catch {
          setCreatedCount(null);
        } finally {
          setCountLoading(false);
        }
      }
      onCreated?.();
    } catch (e) {
      setError(e.message || 'Failed to create campaign');
    } finally {
      setSaving(false);
    }
  };

  const headerBar = (
    <div
      style={{
        background: colors.primary,
        color: colors.white,
        padding: '12px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <span style={{ fontWeight: 600 }}>Create Bulk Campaign</span>
      <IconButton size="small" onClick={onClose} sx={{ color: colors.white }}>
        <CloseIcon />
      </IconButton>
    </div>
  );

  // Post-create success screen: show the audience count for the new draft.
  if (createdCount !== null || countLoading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        {headerBar}
        <DialogContent sx={{ p: 3, textAlign: 'center' }}>
          <GroupIcon sx={{ fontSize: 48, color: colors.primary, mb: 1 }} />
          <p style={{ fontSize: 18, color: colors.textDark, margin: '0 0 8px' }}>
            Draft campaign created.
          </p>
          {countLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 12 }}>
              <CircularProgress size={24} sx={{ color: colors.primary }} />
            </div>
          ) : (
            <p style={{ fontSize: 15, color: colors.textSecondary, margin: 0 }}>
              This campaign currently matches{' '}
              <strong style={{ color: colors.primary }}>{createdCount}</strong>{' '}
              lead{createdCount === 1 ? '' : 's'}. Launch it from its card when
              you are ready.
            </p>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="contained"
            onClick={onClose}
            sx={{
              textTransform: 'none',
              backgroundColor: colors.primary,
              '&:hover': { backgroundColor: colors.primaryDark },
            }}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        {headerBar}
        <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

          {/* ── BASICS ── */}
          <TextField
            label="Campaign Name"
            size="small"
            required
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            label="Description (optional)"
            size="small"
            fullWidth
            multiline
            minRows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {/* ── CHANNEL ── */}
          <div>
            <p style={{ fontSize: 13, color: colors.textSecondary, margin: '0 0 8px' }}>
              Channel
            </p>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={channel}
              onChange={(_e, v) => v && setChannel(v)}
            >
              <ToggleButton value="email" sx={{ textTransform: 'none', gap: 0.5 }}>
                <EmailOutlinedIcon fontSize="small" /> Email
              </ToggleButton>
              <ToggleButton value="sms" sx={{ textTransform: 'none', gap: 0.5 }}>
                <SmsOutlinedIcon fontSize="small" /> SMS
              </ToggleButton>
              <Tooltip title="WhatsApp automated sends are disabled (manual only)">
                <span>
                  <ToggleButton value="whatsapp" disabled sx={{ textTransform: 'none', gap: 0.5 }}>
                    <WhatsAppIcon fontSize="small" /> WhatsApp
                  </ToggleButton>
                </span>
              </Tooltip>
            </ToggleButtonGroup>
          </div>

          {/* ── TEMPLATE PICKER ── */}
          {channel === 'email' && (
            <TextField
              select
              label="Email Template"
              size="small"
              fullWidth
              value={emailTemplateId}
              onChange={(e) => setEmailTemplateId(e.target.value)}
            >
              <MenuItem value="">Select a template</MenuItem>
              {emailTemplates.map((t) => (
                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
              ))}
            </TextField>
          )}
          {channel === 'sms' && (
            <TextField
              select
              label="SMS Template"
              size="small"
              fullWidth
              value={smsTemplateId}
              onChange={(e) => setSmsTemplateId(e.target.value)}
            >
              <MenuItem value="">Select a template</MenuItem>
              {smsTemplates.map((t) => (
                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
              ))}
            </TextField>
          )}

          <Divider>
            <span style={{ fontSize: 12, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Audience Filter
            </span>
          </Divider>

          {/* ── AUDIENCE FILTER BUILDER ── */}
          <Autocomplete
            multiple
            size="small"
            options={stages}
            value={filter.stage_ids}
            getOptionLabel={(o) => o?.name || ''}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            onChange={(_e, v) => setFilter((f) => ({ ...f, stage_ids: v }))}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip size="small" label={option.name} {...getTagProps({ index })} key={option.id} />
              ))
            }
            renderInput={(params) => <TextField {...params} label="Stages" placeholder="Any stage" />}
          />
          <Autocomplete
            multiple
            size="small"
            options={programs}
            value={filter.program_ids}
            getOptionLabel={(o) => o?.name || ''}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            onChange={(_e, v) => setFilter((f) => ({ ...f, program_ids: v }))}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip size="small" label={option.name} {...getTagProps({ index })} key={option.id} />
              ))
            }
            renderInput={(params) => <TextField {...params} label="Programs" placeholder="Any program" />}
          />
          <Autocomplete
            multiple
            size="small"
            options={owners}
            value={filter.assigned_to}
            getOptionLabel={(o) => o?.name || o?.email || ''}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            onChange={(_e, v) => setFilter((f) => ({ ...f, assigned_to: v }))}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip size="small" label={option.name || option.email} {...getTagProps({ index })} key={option.id} />
              ))
            }
            renderInput={(params) => <TextField {...params} label="Owner (Assigned To)" placeholder="Any owner" />}
          />
          <TextField
            label="Sources"
            size="small"
            fullWidth
            placeholder="Comma-separated, e.g. Facebook, Google"
            helperText="Match leads whose source is any of these (comma-separated)."
            value={filter.sources}
            onChange={(e) => setFilter((f) => ({ ...f, sources: e.target.value }))}
          />
          <div style={{ display: 'flex', gap: 16 }}>
            <TextField
              label="Created From"
              type="date"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={filter.created_from}
              onChange={(e) => setFilter((f) => ({ ...f, created_from: e.target.value }))}
            />
            <TextField
              label="Created To"
              type="date"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={filter.created_to}
              onChange={(e) => setFilter((f) => ({ ...f, created_to: e.target.value }))}
            />
          </div>
          {audienceIsEmpty && (
            <Alert severity="info" sx={{ py: 0 }}>
              No filters set — this campaign will target the entire lead base.
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button variant="outlined" onClick={onClose} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} sx={{ color: colors.white }} /> : null}
            sx={{
              textTransform: 'none',
              backgroundColor: colors.primary,
              '&:hover': { backgroundColor: colors.primaryDark },
            }}
          >
            {saving ? 'Creating…' : 'Create Draft'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? <Alert severity={toast.severity}>{toast.text}</Alert> : undefined}
      </Snackbar>
    </>
  );
};

export default CreateCampaignModal;
