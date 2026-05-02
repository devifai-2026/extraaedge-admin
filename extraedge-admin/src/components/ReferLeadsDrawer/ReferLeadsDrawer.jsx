import React, { useEffect, useMemo, useState } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  MenuItem,
  Select,
  FormControl,
  Alert,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import { leadsApi, usersApi } from "../../lib/endpoints";

// mode: 'single' | 'selected' | 'filter'
//   - single   → reassign one lead (`lead` prop)
//   - selected → reassign all `selectedIds`
//   - filter   → reassign every lead matching `filterParams`
const ReferLeadsDrawer = ({ open, onClose, mode = 'single', lead, selectedIds = [], filterParams = {}, totalInFilter = 0, onDone }) => {
  const [referTo, setReferTo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoadingUsers(true);
    setErr("");
    usersApi.list({ limit: 200 })
      .then((r) => setUsers(r?.data || []))
      .catch((e) => setErr(e.message || 'Failed to load users'))
      .finally(() => setLoadingUsers(false));
  }, [open]);

  const headerLabel = useMemo(() => {
    if (mode === 'single') return `Refer Lead: ${lead?.name || lead?.phone || ''}`;
    if (mode === 'selected') return `Refer ${selectedIds.length} selected lead${selectedIds.length === 1 ? '' : 's'}`;
    if (mode === 'filter') return `Refer all ${totalInFilter} leads in current view`;
    return 'Refer Leads';
  }, [mode, lead, selectedIds, totalInFilter]);

  const reset = () => {
    setReferTo("");
    setRemarks("");
    setErr("");
  };

  const handleCancel = () => {
    reset();
    onClose?.();
  };

  const handleRefer = async () => {
    setErr("");
    if (!referTo) { setErr('Please pick a user'); return; }
    setBusy(true);
    try {
      if (mode === 'single') {
        if (!lead?.id) { setErr('No lead selected'); return; }
        await leadsApi.reassign({ lead_id: lead.id, assigned_to: referTo, assignment_type: 'reassign', reason: remarks || undefined });
      } else if (mode === 'selected') {
        if (selectedIds.length === 0) { setErr('No leads selected'); return; }
        await leadsApi.bulkAssign({ lead_ids: selectedIds, assigned_to: referTo, reason: remarks || undefined });
      } else if (mode === 'filter') {
        const filter = {};
        if (filterParams.stage_id) filter.stage_id = filterParams.stage_id;
        if (filterParams.sub_stage_id) filter.sub_stage_id = filterParams.sub_stage_id;
        if (filterParams.program_id) filter.program_id = filterParams.program_id;
        if (filterParams.assigned_to) filter.assigned_to = filterParams.assigned_to;
        if (filterParams.team_id) filter.team_id = filterParams.team_id;
        if (filterParams.q) filter.q = filterParams.q;
        await leadsApi.bulkAssign({ filter, assigned_to: referTo, reason: remarks || undefined });
      }
      reset();
      onDone?.('Reassignment complete');
    } catch (e) {
      setErr(e.message || 'Failed to reassign');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer anchor="right" open={open} onClose={handleCancel}>
      <Box sx={{ width: 380, height: "100%", display: "flex", flexDirection: "column", background: "#fff" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, borderBottom: "2px solid #E87B2F" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <SwapHorizIcon sx={{ color: "#555", border: "1.5px solid #555", borderRadius: "50%", fontSize: 28, p: 0.3 }} />
            <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{headerLabel}</Typography>
          </Box>
          <IconButton size="small" onClick={handleCancel}><CloseIcon fontSize="small" /></IconButton>
        </Box>

        <Box sx={{ flex: 1, px: 2, py: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          {mode === 'filter' && totalInFilter > 0 && (
            <Alert severity="warning" sx={{ fontSize: 13 }}>
              You are about to reassign <b>{totalInFilter}</b> leads matching the current view. This cannot be undone.
            </Alert>
          )}

          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>
              Refer To<span style={{ color: "red" }}>*</span>
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                value={referTo}
                onChange={(e) => setReferTo(e.target.value)}
                displayEmpty
                renderValue={(selected) => {
                  if (!selected) return <span style={{ color: "#aaa" }}>Select user</span>;
                  const u = users.find((x) => x.id === selected);
                  return u?.name || u?.email || selected;
                }}
                sx={{ fontSize: 13 }}
                disabled={loadingUsers}
              >
                {loadingUsers && <MenuItem disabled><CircularProgress size={16} /></MenuItem>}
                {!loadingUsers && users.length === 0 && <MenuItem disabled>No users found</MenuItem>}
                {users.filter((u) => u.is_active !== false).map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.name || u.email} {u.role ? `(${u.role})` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>Referral Remarks</Typography>
            <TextField
              fullWidth
              multiline
              minRows={5}
              placeholder="Reason for reassignment (optional)"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              sx={{ "& .MuiInputBase-input": { fontSize: 13 } }}
            />
          </Box>

          {err && <Alert severity="error" sx={{ fontSize: 13 }}>{err}</Alert>}
        </Box>

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5, px: 2, py: 1.5, borderTop: "1px solid #eee" }}>
          <Button
            variant="outlined"
            onClick={handleCancel}
            disabled={busy}
            sx={{ textTransform: "none", color: "#555", borderColor: "#ccc", fontSize: 13, borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleRefer}
            disabled={!referTo || busy}
            sx={{ textTransform: "none", backgroundColor: "#E87B2F", fontSize: 13, borderRadius: 2, "&:hover": { backgroundColor: "#d06a20" } }}
          >
            {busy ? 'Reassigning…' : 'Refer'}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default ReferLeadsDrawer;
