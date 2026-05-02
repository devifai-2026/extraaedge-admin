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
import NoteAltOutlinedIcon from "@mui/icons-material/NoteAltOutlined";
import { leadNotesApi } from "../../lib/endpoints";

const AddNoteDrawer = ({ open, onClose, lead, onSaved }) => {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const resetForm = () => {
    setNote("");
    setErr("");
  };

  const handleClose = () => {
    resetForm();
    onClose?.();
  };

  const handleAdd = async () => {
    if (!lead?.id) { setErr('No lead selected'); return; }
    if (!note.trim()) { setErr('Note cannot be empty'); return; }
    setBusy(true);
    setErr("");
    try {
      await leadNotesApi.create(lead.id, { body: note.trim(), visibility: 'internal' });
      resetForm();
      onSaved?.();
      onClose?.();
    } catch (e) {
      setErr(e.message || 'Failed to add note');
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
            <NoteAltOutlinedIcon
              sx={{
                color: "#555",
                border: "1.5px solid #555",
                borderRadius: "50%",
                fontSize: 28,
                p: 0.3,
              }}
            />
            <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
              Add Note for {lead?.name}
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
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>
              Add Note
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={10}
              placeholder="Enter your note..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
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
            disabled={!note.trim() || busy}
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

export default AddNoteDrawer;
