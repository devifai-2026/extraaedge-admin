// JustDial Lead Assignment — super_admin / branch_manager picks which
// counsellors receive JustDial (Gmail) leads. Inbound JD leads are round-robin'd
// (load-balanced) ONLY among the selected counsellors — never anyone else.
import { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Alert, CircularProgress, Paper, Checkbox,
  FormControlLabel, TextField, InputAdornment, Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { integrationsApi, usersApi } from '../../lib/endpoints';
import { isRole, ROLES, LEAD_OWNER_ROLES_PARAM } from '../../lib/rbac';

export default function JustDialAssignment() {
  const canManage = isRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [counsellors, setCounsellors] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!canManage) { setLoading(false); return; }
    Promise.allSettled([
      usersApi.list({ role: LEAD_OWNER_ROLES_PARAM, limit: 200 }),
      integrationsApi.getJustDialPool(),
    ]).then(([u, p]) => {
      const list = (u.value?.data || []).filter((x) => x.is_active !== false);
      setCounsellors(list);
      const pool = p.value?.data?.pool || [];
      setSelected(new Set(pool));
    }).finally(() => setLoading(false));
  }, [canManage]);

  const toggle = (id) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const save = async () => {
    setMsg(null); setBusy(true);
    try {
      const r = await integrationsApi.saveJustDialPool(Array.from(selected));
      // Backend drops any non-counsellor ids; reflect what it saved.
      setSelected(new Set(r?.data?.pool || Array.from(selected)));
      setMsg({ severity: 'success', text: 'Saved — JustDial leads will round-robin among the selected counsellors.' });
    } catch (e) {
      setMsg({ severity: 'error', text: e?.message || 'Save failed' });
    } finally { setBusy(false); }
  };

  if (!canManage) return <Box sx={{ p: 3 }}><Alert severity="warning">Only a super admin or branch manager can configure JustDial lead assignment.</Alert></Box>;
  if (loading) return <Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress /></Box>;

  const filtered = counsellors.filter((c) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return (c.name || '').toLowerCase().includes(s) || (c.email || '').toLowerCase().includes(s);
  });

  return (
    <Box sx={{ p: 3, maxWidth: 720 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <StorefrontIcon sx={{ color: '#F26722' }} />
        <Typography variant="h5" sx={{ fontWeight: 700 }}>JustDial Lead Assignment</Typography>
      </Box>
      <Typography color="text.secondary" sx={{ mb: 2, fontSize: 14 }}>
        Choose which counsellors should receive <b>JustDial</b> leads. Every JD lead that comes in
        (via the Gmail bridge) is automatically assigned — <b>round-robin, load-balanced</b> — among
        only these counsellors. No one outside this list will get JD leads.
      </Typography>

      {msg && <Alert severity={msg.severity} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
          <Typography sx={{ fontWeight: 600 }}>
            Counsellors {selected.size > 0 && <span style={{ color: '#F26722' }}>· {selected.size} selected</span>}
          </Typography>
          <TextField
            size="small" placeholder="Search counsellor…" value={q} onChange={(e) => setQ(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            sx={{ width: 240 }}
          />
        </Box>
        <Divider sx={{ mb: 1 }} />
        {counsellors.length === 0 && <Typography color="text.secondary" sx={{ p: 2 }}>No active counsellors found.</Typography>}
        <Box sx={{ maxHeight: 380, overflowY: 'auto' }}>
          {filtered.map((c) => (
            <FormControlLabel
              key={c.id}
              sx={{ display: 'flex', width: '100%', m: 0, py: 0.25, borderBottom: '1px solid #f3f3f3' }}
              control={<Checkbox checked={selected.has(c.id)} onChange={() => toggle(c.id)} sx={{ '&.Mui-checked': { color: '#F26722' } }} />}
              label={<span>{c.name || c.email}{c.email && c.name ? <span style={{ color: '#888', fontSize: 12 }}> · {c.email}</span> : null}</span>}
            />
          ))}
        </Box>
      </Paper>

      <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
        <Button variant="contained" onClick={save} disabled={busy}
          sx={{ background: '#F26722', '&:hover': { background: '#d4551a' }, textTransform: 'none' }}>
          {busy ? 'Saving…' : 'Save assignment'}
        </Button>
        {selected.size === 0 && <Typography color="text.secondary" sx={{ fontSize: 13 }}>Tip: with none selected, JD leads stay unassigned for manual routing.</Typography>}
      </Box>
    </Box>
  );
}
