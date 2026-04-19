import React, { useState } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const VISIBILITY_OPTIONS = ["All Counselors", "Admins", "Managers"];
const VARIABLE_OPTIONS = [
  "%Lead.FullName%",
  "%Lead.FirstName%",
  "%Lead.LastName%",
  "%Lead.Email%",
  "%Lead.ContactNumber%",
  "%Counselor.FullName%",
];

const AddSMSTemplateDrawer = ({ open, onClose }) => {
  const [templateName, setTemplateName] = useState("");
  const [visibleFor, setVisibleFor] = useState(["All Counselors"]);
  const [dltTemplateId, setDltTemplateId] = useState("");
  const [variable, setVariable] = useState("");
  const [message, setMessage] = useState("");

  const resetForm = () => {
    setTemplateName("");
    setVisibleFor(["All Counselors"]);
    setDltTemplateId("");
    setVariable("");
    setMessage("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handlePublish = () => {
    console.log("Publishing SMS template:", {
      templateName,
      visibleFor,
      dltTemplateId,
      variable,
      message,
    });
    resetForm();
    onClose();
  };

  const handleRemoveVisible = (value) => {
    setVisibleFor((prev) => prev.filter((v) => v !== value));
  };

  const labelSx = { fontSize: 13, fontWeight: 600, mb: 0.5, color: "#333" };
  const fieldSx = {
    "& .MuiOutlinedInput-root": {
      backgroundColor: "#f3f4f6",
      fontSize: 13,
      borderRadius: 1,
    },
    "& .MuiOutlinedInput-notchedOutline": { border: "none" },
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
            borderBottom: "1px solid #eee",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: "1.5px solid #999",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#555",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
              </svg>
            </Box>
            <Typography sx={{ fontWeight: 600, fontSize: 15 }}>
              Add New SMS Template
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
            overflowY: "auto",
          }}
        >
          <Box>
            <Typography sx={labelSx}>
              Template Name
              <Box component="span" sx={{ color: "#E87B2F", ml: 0.25 }}>
                *
              </Box>
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Enter Template Name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              sx={fieldSx}
            />
          </Box>

          <Box>
            <Typography sx={labelSx}>
              Visible For
              <Box component="span" sx={{ color: "#E87B2F", ml: 0.25 }}>
                *
              </Box>
            </Typography>
            <Select
              fullWidth
              multiple
              size="small"
              displayEmpty
              value={visibleFor}
              onChange={(e) => setVisibleFor(e.target.value)}
              input={<OutlinedInput />}
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip
                      key={value}
                      label={value}
                      size="small"
                      onDelete={() => handleRemoveVisible(value)}
                      onMouseDown={(e) => e.stopPropagation()}
                      sx={{
                        backgroundColor: "#e0e0e0",
                        fontSize: 12,
                        borderRadius: 0.5,
                      }}
                    />
                  ))}
                </Box>
              )}
              sx={{
                backgroundColor: "#f3f4f6",
                fontSize: 13,
                borderRadius: 1,
                "& .MuiOutlinedInput-notchedOutline": { border: "none" },
              }}
            >
              {VISIBILITY_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt} sx={{ fontSize: 13 }}>
                  {opt}
                </MenuItem>
              ))}
            </Select>
          </Box>

          <Box>
            <Typography sx={labelSx}>DLT Template ID</Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Enter DLT Template ID"
              value={dltTemplateId}
              onChange={(e) => setDltTemplateId(e.target.value)}
              sx={fieldSx}
            />
          </Box>

          <Box>
            <Typography sx={labelSx}>Variable</Typography>
            <Select
              fullWidth
              size="small"
              displayEmpty
              value={variable}
              onChange={(e) => setVariable(e.target.value)}
              sx={{
                backgroundColor: "#f3f4f6",
                fontSize: 13,
                borderRadius: 1,
                "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                color: variable ? "inherit" : "#9ca3af",
              }}
            >
              <MenuItem value="" disabled sx={{ fontSize: 13 }}>
                Select Variable
              </MenuItem>
              {VARIABLE_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt} sx={{ fontSize: 13 }}>
                  {opt}
                </MenuItem>
              ))}
            </Select>
          </Box>

          <Box>
            <TextField
              fullWidth
              multiline
              minRows={8}
              placeholder="Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              sx={fieldSx}
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
              color: "#E87B2F",
              borderColor: "#E87B2F",
              fontSize: 13,
              borderRadius: 1.5,
              px: 2.5,
              "&:hover": { borderColor: "#d06a20", backgroundColor: "#fff" },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handlePublish}
            disabled={!templateName.trim() || visibleFor.length === 0}
            sx={{
              textTransform: "none",
              backgroundColor: "#E87B2F",
              fontSize: 13,
              borderRadius: 1.5,
              px: 2.5,
              boxShadow: "none",
              "&:hover": { backgroundColor: "#d06a20", boxShadow: "none" },
            }}
          >
            Publish
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default AddSMSTemplateDrawer;
