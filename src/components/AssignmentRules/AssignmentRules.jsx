// Settings → Assignment Rules
//
// CRUD UI for assignment_rules. Backend supports six strategies; we surface
// each with a one-line "what it does" caption + an example so super-admins
// pick the right one without reading docs.
//
//   round_robin       — rotates through all active counsellors in order.
//   load_balanced     — picks the counsellor with the fewest open leads.
//   by_program        — pin specific programs to specific counsellors via condition.
//   by_geography      — same idea, keyed on city / state.
//   specific_user     — every lead matching the condition goes to one named user.
//   team_round_robin  — round-robin within a single team.
import { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Button, Chip, IconButton, Switch, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  CircularProgress, Alert, FormControlLabel, Autocomplete, Popover,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { assignmentRulesApi, usersApi } from '../../lib/endpoints';

// One canonical place describing each strategy. The dialog reads label +
// description + example; the row card uses label + chip color.
const STRATEGY_INFO = {
  round_robin: {
    label: 'Round Robin',
    short: 'Rotate fairly through all counsellors',
    description: 'Every new lead is handed to the next counsellor in the pool, looping back to the start. Best when leads are roughly equivalent and you want even distribution.',
    example: 'Pool [Asha, Ben, Cara]. Lead #1 → Asha, #2 → Ben, #3 → Cara, #4 → Asha …',
    color: '#1E88E5',
  },
  load_balanced: {
    label: 'Load Balanced',
    short: 'Whoever has the fewest open leads',
    description: 'Picks the counsellor currently holding the fewest open leads. Good when handling time varies wildly — slow performers don\'t pile up.',
    example: 'Asha has 12 open, Ben has 8, Cara has 15 → next lead goes to Ben.',
    color: '#43A047',
  },
  by_program: {
    label: 'By Program',
    short: 'Pin programs to specific counsellors',
    description: 'Use the condition to target specific programs (e.g. condition_json = { "lead.program_id": "<UUID>" }) and route them only to a chosen pool.',
    example: '"MBA Domestic" leads only go to Asha & Ben; "PhD Abroad" leads only to Cara.',
    color: '#FB8C00',
  },
  by_geography: {
    label: 'By Geography',
    short: 'Route by city / state',
    description: 'Same as by_program but the condition keys on lead.city or lead.state_id. Useful for regional language-fit or in-person follow-ups.',
    example: 'Pune leads → local counsellor; Bangalore leads → BLR team.',
    color: '#5E35B1',
  },
  specific_user: {
    label: 'Specific User',
    short: 'Always the same person',
    description: 'Every matching lead goes to exactly one user. Pair with a condition (e.g. high lead_score, or VIP source) to send hot leads to your best closer.',
    example: 'Source = "Referral" + program "Premium" → always Cara (senior counsellor).',
    color: '#E53935',
  },
  team_round_robin: {
    label: 'Team Round Robin',
    short: 'Round robin within one team',
    description: 'Round-robin scoped to a single team. Different teams can have different rules with different priorities; the highest-priority matching rule wins.',
    example: 'Sales-North team rotates among 5 members; Sales-South has its own 3-member rotation.',
    color: '#0277BD',
  },
};

const blankRule = () => ({
  name: '',
  priority: 100,
  strategy: 'round_robin',
  condition_json: {},
  target_users: [],
  target_team_id: null,
  fallback_user_id: null,
  is_active: true,
});

// Quick-start templates. Picking one pre-fills the editor; the admin still
// reviews and saves explicitly. Each carries a one-line "what / when / how".
//
// Tips:
//   - Templates with conditions are illustrative — admins must replace the
//     placeholder UUIDs (program_id, state_id, etc.) with real ones from
//     their tenant before saving. The editor doesn't enforce this; it's
//     surfaced in the description so the user knows.
//   - Priorities are spaced so admins can insert their own rules between
//     them later without renumbering.
const TEMPLATES = [
  {
    key: 'default_round_robin',
    label: 'Default Round Robin (recommended)',
    use_when: 'Use when you want every counsellor to get a fair share of new leads.',
    example: 'Asha, Ben, Cara on team. Lead #1 → Asha, #2 → Ben, #3 → Cara, #4 → Asha …',
    seed: () => ({
      ...blankRule(),
      name: 'Default round-robin',
      strategy: 'round_robin',
      priority: 1000,
    }),
  },
  {
    key: 'least_loaded',
    label: 'Least Loaded First',
    use_when: 'Use when handling time varies — slow counsellors don\'t pile up.',
    example: 'Open leads — Asha 12, Ben 8, Cara 15. New lead → Ben (lowest count).',
    seed: () => ({
      ...blankRule(),
      name: 'Least loaded',
      strategy: 'load_balanced',
      priority: 200,
    }),
  },
  {
    key: 'vip_to_specific',
    label: 'VIP / High-Score → Top Closer',
    use_when: 'Use when hot leads (referrals, high score) should go to your best closer.',
    example: 'Score ≥ 50 → always Cara (senior). Everything else falls through to round-robin.',
    seed: () => ({
      ...blankRule(),
      name: 'VIP leads → top closer',
      strategy: 'specific_user',
      priority: 50,
      condition_json: { 'lead.lead_score': { gte: 50 } },
    }),
  },
  {
    key: 'program_specialists',
    label: 'Program Specialists',
    use_when: 'Use when specific programs need domain experts.',
    example: 'MBA leads → Asha & Ben pool; PhD leads → Cara & Dev pool. Use one rule per program.',
    seed: () => ({
      ...blankRule(),
      name: 'MBA → MBA team',
      strategy: 'by_program',
      priority: 100,
      condition_json: { 'lead.program_id': '<replace-with-program-uuid>' },
    }),
  },
  {
    key: 'regional',
    label: 'Regional Routing',
    use_when: 'Use for in-person follow-ups or language-fit by location.',
    example: 'Maharashtra leads → Pune team; Karnataka leads → Bangalore team.',
    seed: () => ({
      ...blankRule(),
      name: 'Maharashtra → Pune team',
      strategy: 'by_geography',
      priority: 150,
      condition_json: { 'lead.state_id': '<replace-with-state-uuid>' },
    }),
  },
  {
    key: 'team_rotation',
    label: 'Team Round Robin',
    use_when: 'Use when each team owns its own pool and rotates within it.',
    example: 'Sales-North rotates 5 members; Sales-South rotates 3 members. Different rules per team.',
    seed: () => ({
      ...blankRule(),
      name: 'Sales-North team rotation',
      strategy: 'team_round_robin',
      priority: 300,
    }),
  },
  {
    key: 'after_hours_to_admin',
    label: 'Catch-All Fallback',
    use_when: 'Use as the last-resort rule so no lead is ever stranded.',
    example: 'If no other rule matches → assign to fallback user (e.g. team lead) for triage.',
    seed: () => ({
      ...blankRule(),
      name: 'Catch-all fallback',
      strategy: 'specific_user',
      priority: 9000,
    }),
  },
];

export default function AssignmentRules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [editing, setEditing] = useState(null); // rule object or null
  const [tmplAnchor, setTmplAnchor] = useState(null);
  const [showRef, setShowRef] = useState(false);

  const reload = async () => {
    setLoading(true); setError('');
    try {
      const r = await assignmentRulesApi.list();
      setRules(r?.data || []);
    } catch (e) {
      setError(e.message || 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    usersApi.list({ role: 'counsellor', limit: 200 })
      .then((r) => setUsers((r?.data || []).filter((u) => u.is_active !== false)))
      .catch(() => setUsers([]));
  }, []);

  const onToggle = async (r) => {
    try { await assignmentRulesApi.update(r.id, { is_active: !r.is_active }); reload(); }
    catch (e) { alert(e.message || 'Toggle failed'); }
  };
  const onDelete = async (r) => {
    if (!window.confirm(`Delete rule "${r.name}"?`)) return;
    try { await assignmentRulesApi.delete(r.id); reload(); }
    catch (e) { alert(e.message || 'Delete failed'); }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Assignment Rules</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setShowRef((v) => !v)}
            sx={{ textTransform: 'none' }}
          >
            {showRef ? 'Hide examples' : 'See examples'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<AutoAwesomeIcon />}
            onClick={(e) => setTmplAnchor(e.currentTarget)}
            sx={{ textTransform: 'none' }}
          >
            Use a template
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setEditing(blankRule())}
            sx={{ background: '#E53935' }}
          >
            New Rule
          </Button>
        </Box>
      </Box>
      <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
        Rules are evaluated by <b>priority</b> (lower number wins). The first rule whose condition matches a new lead picks the strategy.
      </Typography>

      {showRef && <ExamplesReference />}

      {/* Template picker popover — clicking an item opens the editor pre-filled. */}
      <Popover
        open={!!tmplAnchor}
        anchorEl={tmplAnchor}
        onClose={() => setTmplAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ width: 460, maxHeight: 500, overflow: 'auto', p: 1.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 0.5, color: '#444' }}>
            Pick a template — you can edit before saving
          </Typography>
          {TEMPLATES.map((t) => {
            const seeded = t.seed();
            const info = STRATEGY_INFO[seeded.strategy];
            return (
              <Box
                key={t.key}
                onClick={() => { setTmplAnchor(null); setEditing(seeded); }}
                sx={{
                  p: 1.5, mb: 0.5, borderRadius: 1.5, cursor: 'pointer',
                  border: '1px solid #eee',
                  '&:hover': { borderColor: info?.color || '#aaa', background: '#fafafa' },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: info?.color || '#666' }} />
                  <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{t.label}</Typography>
                  <Chip
                    size="small"
                    label={info?.label || seeded.strategy}
                    sx={{ ml: 'auto', height: 20, fontSize: 10, background: info?.color, color: '#fff' }}
                  />
                </Box>
                <Typography sx={{ fontSize: 12, color: '#666', mb: 0.5 }}>{t.use_when}</Typography>
                <Typography sx={{ fontSize: 11, color: '#888', fontStyle: 'italic' }}>
                  e.g. {t.example}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Popover>

      {loading && <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && rules.length === 0 && (
        <Box sx={{ p: 4, textAlign: 'center', background: '#fff', border: '1px dashed #ddd', borderRadius: 2 }}>
          <Typography sx={{ color: '#888' }}>No rules yet. Click "New Rule" to add one.</Typography>
        </Box>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {rules.map((r) => {
          const info = STRATEGY_INFO[r.strategy] || { label: r.strategy, color: '#666' };
          return (
            <Box
              key={r.id}
              sx={{
                background: '#fff', border: '1px solid #e8e8e8', borderRadius: 2, p: 2,
                display: 'flex', alignItems: 'center', gap: 2,
                opacity: r.is_active ? 1 : 0.55,
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                  <Typography sx={{ fontWeight: 600 }}>{r.name}</Typography>
                  <Chip
                    size="small"
                    label={info.label}
                    sx={{ background: info.color, color: '#fff', height: 22, fontSize: 11, fontWeight: 600 }}
                  />
                  <Chip size="small" label={`Priority ${r.priority}`} sx={{ height: 22, fontSize: 11 }} />
                  <Chip
                    size="small"
                    label={`${r.total_assignments ?? 0} assigned`}
                    sx={{ height: 22, fontSize: 11, background: '#f5f5f5' }}
                  />
                </Box>
                <Typography variant="body2" sx={{ color: '#666' }}>{info.short}</Typography>
                {r.target_users?.length > 0 && (
                  <Typography variant="caption" sx={{ color: '#888' }}>
                    Targets: {r.target_users.length} user{r.target_users.length === 1 ? '' : 's'}
                  </Typography>
                )}
              </Box>
              <Tooltip title={r.is_active ? 'Active — toggle off' : 'Inactive — toggle on'}>
                <Switch checked={r.is_active} onChange={() => onToggle(r)} />
              </Tooltip>
              <IconButton onClick={() => setEditing(r)} sx={{ color: '#1E88E5' }} title="Edit"><EditIcon /></IconButton>
              <IconButton onClick={() => onDelete(r)} sx={{ color: '#E53935' }} title="Delete"><DeleteIcon /></IconButton>
            </Box>
          );
        })}
      </Box>

      <RuleEditor
        open={!!editing}
        rule={editing}
        users={users}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); reload(); }}
      />
    </Box>
  );
}

function RuleEditor({ open, rule, users, onClose, onSaved }) {
  const [form, setForm] = useState(blankRule());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(rule ? { ...blankRule(), ...rule, target_users: rule.target_users || [] } : blankRule());
    setError('');
  }, [open, rule]);

  const info = STRATEGY_INFO[form.strategy] || {};
  const isEdit = !!rule?.id;

  const selectedTargetUsers = useMemo(
    () => users.filter((u) => (form.target_users || []).includes(u.id)),
    [users, form.target_users],
  );
  const selectedFallback = users.find((u) => u.id === form.fallback_user_id) || null;

  const submit = async (e) => {
    e?.preventDefault();
    if (!form.name?.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        name: form.name.trim(),
        priority: Number(form.priority) || 100,
        strategy: form.strategy,
        condition_json: form.condition_json || {},
        is_active: !!form.is_active,
      };
      if (form.target_users?.length) payload.target_users = form.target_users;
      if (form.fallback_user_id) payload.fallback_user_id = form.fallback_user_id;
      if (form.target_team_id) payload.target_team_id = form.target_team_id;

      if (isEdit) await assignmentRulesApi.update(rule.id, payload);
      else        await assignmentRulesApi.create(payload);
      onSaved?.();
    } catch (err) {
      const detail = err?.data?.error?.details;
      const detailText = Array.isArray(detail) && detail.length
        ? detail.map((d) => `${d.path}: ${d.message}`).join('; ')
        : null;
      setError(detailText || err?.data?.error?.message || err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? 'Edit rule' : 'New assignment rule'}</DialogTitle>
      <form onSubmit={submit}>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 2 }}>
            <TextField
              size="small" label="Rule name *" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              fullWidth autoFocus
            />
            <TextField
              size="small" label="Priority" type="number" value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              helperText="Lower wins. Defaults to 100."
              sx={{ width: 130 }}
            />
          </Box>

          <TextField
            size="small" select label="Strategy *" value={form.strategy}
            onChange={(e) => setForm({ ...form, strategy: e.target.value })}
            fullWidth
          >
            {Object.entries(STRATEGY_INFO).map(([key, val]) => (
              <MenuItem key={key} value={key}>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: val.color, marginRight: 8 }} />
                {val.label} — <span style={{ color: '#888', marginLeft: 4 }}>{val.short}</span>
              </MenuItem>
            ))}
          </TextField>

          {info.description && (
            <Box sx={{ background: '#f8f9fa', border: '1px solid #e8e8e8', borderLeft: `4px solid ${info.color}`, borderRadius: 1, p: 1.5 }}>
              <Typography variant="body2" sx={{ color: '#444', mb: 0.5 }}>{info.description}</Typography>
              <Typography variant="caption" sx={{ color: '#888' }}>
                <b>Example:</b> {info.example}
              </Typography>
            </Box>
          )}

          {/* Pool selection — hidden for specific_user (uses fallback only) and team_round_robin (uses team) */}
          {form.strategy !== 'specific_user' && form.strategy !== 'team_round_robin' && (
            <Autocomplete
              multiple
              size="small"
              options={users}
              getOptionLabel={(u) => `${u.name || u.email}`}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              value={selectedTargetUsers}
              onChange={(_e, picked) => setForm({ ...form, target_users: picked.map((u) => u.id) })}
              renderInput={(p) => (
                <TextField
                  {...p}
                  label="Pool of counsellors"
                  helperText="Leave empty to use every active counsellor in the tenant."
                />
              )}
            />
          )}

          {/* specific_user uses fallback as the actual target */}
          <Autocomplete
            size="small"
            options={users}
            getOptionLabel={(u) => `${u.name || u.email}`}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            value={selectedFallback}
            onChange={(_e, picked) => setForm({ ...form, fallback_user_id: picked?.id || null })}
            renderInput={(p) => (
              <TextField
                {...p}
                label={form.strategy === 'specific_user' ? 'Assign to (specific user) *' : 'Fallback user'}
                helperText={form.strategy === 'specific_user'
                  ? 'Every matching lead goes to this user.'
                  : 'Used if no candidate is available.'}
              />
            )}
          />

          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <FormControlLabel
              control={<Switch checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />}
              label={<span style={{ fontSize: 13 }}>Active</span>}
            />
          </Box>

          {error && <Alert severity="error" sx={{ fontSize: 13, whiteSpace: 'pre-line' }}>{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving} sx={{ background: '#E53935' }}>
            {saving ? 'Saving…' : (isEdit ? 'Save changes' : 'Create rule')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// Inline reference card: shows every strategy with description + example.
// Toggled via the "See examples" button; helpful for first-time admins picking
// which rule fits their org without opening the editor.
function ExamplesReference() {
  return (
    <Box
      sx={{
        background: '#f8f9fa', border: '1px solid #e8e8e8', borderRadius: 2,
        p: 2, mb: 3,
      }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1.5, color: '#444' }}>
        Strategy reference
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 1.5 }}>
        {Object.entries(STRATEGY_INFO).map(([key, val]) => (
          <Box
            key={key}
            sx={{
              background: '#fff', borderRadius: 1.5, p: 1.5,
              borderLeft: `4px solid ${val.color}`,
            }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 0.5 }}>{val.label}</Typography>
            <Typography sx={{ fontSize: 12, color: '#444', mb: 0.5 }}>{val.description}</Typography>
            <Typography sx={{ fontSize: 11, color: '#888', fontStyle: 'italic' }}>
              <b>Example:</b> {val.example}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
