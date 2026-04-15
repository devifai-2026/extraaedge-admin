import React, { useState } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EventNoteIcon from "@mui/icons-material/EventNote";

const AddFollowUpDrawer = ({ open, onClose, lead }) => {
  const today = new Date().toISOString().split("T")[0];
  const currentTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const [nextActionDate, setNextActionDate] = useState(today);
  const [time, setTime] = useState(currentTime);
  const [remarks, setRemarks] = useState("");

  const handleAdd = () => {
    console.log("Adding follow up:", {
      leadId: lead?.id,
      nextActionDate,
      time,
      remarks,
    });
    resetForm();
    onClose();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setNextActionDate(today);
    setTime(currentTime);
    setRemarks("");
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
              Followup Remarks<span style={{ color: "red" }}>*</span>
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
            disabled={!nextActionDate || !time || !remarks}
            sx={{
              textTransform: "none",
              backgroundColor: "#E87B2F",
              fontSize: 13,
              borderRadius: 2,
              "&:hover": { backgroundColor: "#d06a20" },
            }}
          >
            Add
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default AddFollowUpDrawer;
