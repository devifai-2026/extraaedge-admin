import React, { useState } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EventNoteIcon from "@mui/icons-material/EventNote";
import { followUpsApi } from "../../lib/endpoints";

const AddFollowUpDrawer = ({ open, onClose, lead, onSaved }) => {
  const today = new Date().toISOString().split("T")[0];
  const initialTime = (() => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  })();

  const [nextActionDate, setNextActionDate] = useState(today);
  const [time, setTime] = useState(initialTime);
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const resetForm = () => {
    setNextActionDate(today);
    setTime(initialTime);
    setRemarks("");
    setErr("");
  };

  const handleClose = () => {
    resetForm();
    onClose?.();
  };

  const handleAdd = async () => {
    if (!lead?.id) { setErr('No lead selected'); return; }
    if (!nextActionDate || !time) { setErr('Date and time are required'); return; }
    setBusy(true);
    setErr("");
    try {
      const dt = new Date(`${nextActionDate}T${time}:00`);
      if (isNaN(dt.getTime())) throw new Error('Invalid date/time');
      await followUpsApi.create({
        lead_id: lead.id,
        next_action_datetime: dt.toISOString(),
        comment: remarks || undefined,
      });
      resetForm();
      onSaved?.();
      onClose?.();
    } catch (e) {
      setErr(e.message || 'Failed to add follow-up');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer anchor="right" open={open} onClose={handleClose}>
      <Box
        sx={{
          width: 360,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#fff",
        }}
      >
        {/* HEADER */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            py: 1.5,
            borderBottom: "2px solid #E87B2F",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <EventNoteIcon
              sx={{
                color: "#555",
                border: "1.5px solid #555",
                borderRadius: "50%",
                fontSize: 28,
                p: 0.3,
              }}
            />
            <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
              Add Follow Up for {lead?.name}
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* BODY */}
        <Box
          sx={{
            flex: 1,
            px: 2,
            py: 2,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {/* Next Action Date & Time */}
          <Box sx={{ display: "flex", gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>
                Next Action Date <span style={{ color: "red" }}>*</span>
              </Typography>
              <TextField
                type="date"
                fullWidth
                size="small"
                value={nextActionDate}
                onChange={(e) => setNextActionDate(e.target.value)}
                sx={{ "& .MuiInputBase-input": { fontSize: 13 } }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>
                Time<span style={{ color: "red" }}>*</span>
              </Typography>
              <TextField
                type="time"
                fullWidth
                size="small"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                sx={{ "& .MuiInputBase-input": { fontSize: 13 } }}
              />
            </Box>
          </Box>

          {/* Followup Remarks */}
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>
              Followup Remarks
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={8}
              placeholder="Enter followup remarks..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              sx={{ "& .MuiInputBase-input": { fontSize: 13 } }}
            />
          </Box>
          {err && <Alert severity="error" sx={{ fontSize: 13 }}>{err}</Alert>}
        </Box>

        {/* FOOTER */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 1.5,
            px: 2,
            py: 1.5,
            borderTop: "1px solid #eee",
          }}
        >
          <Button
            variant="outlined"
            onClick={handleClose}
            disabled={busy}
            sx={{
              textTransform: "none",
              color: "#555",
              borderColor: "#ccc",
              fontSize: 13,
              borderRadius: 2,
            }}
          >
            Close
          </Button>
          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={!nextActionDate || !time || busy}
            sx={{
              textTransform: "none",
              backgroundColor: "#E87B2F",
              fontSize: 13,
              borderRadius: 2,
              "&:hover": { backgroundColor: "#d06a20" },
            }}
          >
            {busy ? 'Adding…' : 'Add'}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default AddFollowUpDrawer;
