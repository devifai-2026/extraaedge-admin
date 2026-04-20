import React, { useState } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Checkbox,
  FormControlLabel,
  TextField,
  Button,
  Fab
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import EmailIcon from "@mui/icons-material/Email";
import AddIcon from "@mui/icons-material/Add";
import { colors } from '../../theme/colors'

const EmailDrawer = ({ open, onClose, lead }) => {

  // NOTHING OPEN INITIALLY ✅
  const [sections, setSections] = useState({
    sender: false,
    cc: false,
    bcc: false
  });

  const toggleSection = (key) => {
    setSections((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box
        sx={{
          width: 360,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: colors.white,
          position: "relative"
        }}
      >

        {/* HEADER */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 16px",
            borderBottom: "2px solid colors.primary"
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <EmailIcon />
            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
              Send Email to {lead?.name}
            </Typography>
          </Box>

          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* BODY */}
        <Box sx={{ p: 2, flex: 1, overflowY: "auto" }}>

          {/* CHECKBOXES */}
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: "12px 24px" }}>
            <FormControlLabel control={<Checkbox defaultChecked />} label="Email Id" />
            <FormControlLabel control={<Checkbox />} label="Father's Email" />
            <FormControlLabel control={<Checkbox />} label="Mother's Email" />
            <FormControlLabel control={<Checkbox />} label="Alternate Email Id" />
          </Box>

          {/* TEMPLATE + TOGGLES */}
          <Box sx={{ mt: 2 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <Typography sx={{ fontSize: 12 }}>
                Select Email Template
              </Typography>

              <Box sx={{ fontSize: 13 }}>
                <span
                  onClick={() => toggleSection("sender")}
                  style={{
                    cursor: "pointer",
                    color: sections.sender ? colors.primary : "#555",
                    fontWeight: sections.sender ? 600 : 400
                  }}
                >
                  Sender
                </span>

                {" | "}

                <span
                  onClick={() => toggleSection("cc")}
                  style={{
                    cursor: "pointer",
                    color: sections.cc ? colors.primary : "#555"
                  }}
                >
                  Cc
                </span>

                {" | "}

                <span
                  onClick={() => toggleSection("bcc")}
                  style={{
                    cursor: "pointer",
                    color: sections.bcc ? "#E53935" : "#555"
                  }}
                >
                  Bcc
                </span>
              </Box>
            </Box>

            {/* TEMPLATE INPUT */}
            <TextField
              fullWidth
              size="small"
              placeholder="Select Email Template"
              sx={{ mt: 1, background: "#f3f4f6" }}
            />
          </Box>

          {/* ---------------- SENDER ---------------- */}
          {sections.sender && (
            <>
              <Typography sx={{ fontSize: 12, mt: 2 }}>
                Select Sender Name
              </Typography>

              <TextField
                fullWidth
                size="small"
                value="Divya Nair"
                sx={{ mt: 1, background: "#f3f4f6" }}
              />

              <Typography sx={{ fontSize: 12, mt: 2 }}>
                Select From Email Address
              </Typography>

              <TextField
                fullWidth
                size="small"
                value="counsellor4@speedupinfotech.com"
                sx={{ mt: 1, background: "#f3f4f6" }}
              />

              <Typography sx={{ fontSize: 12, mt: 2 }}>
                Select Reply To Email Address
              </Typography>

              <TextField
                fullWidth
                size="small"
                value="counsellor4@speedupinfotech.com"
                sx={{ mt: 1, background: "#f3f4f6" }}
              />
            </>
          )}

          {/* ---------------- CC ---------------- */}
          {sections.cc && (
            <>
              <Typography sx={{ fontSize: 12, mt: 2 }}>
                Cc
              </Typography>

              <TextField
                fullWidth
                size="small"
                placeholder="Enter Email Ids To Keep In Cc"
                sx={{ mt: 1, background: "#f3f4f6" }}
              />
            </>
          )}

          {/* ---------------- BCC ---------------- */}
          {sections.bcc && (
            <>
              <Typography sx={{ fontSize: 12, mt: 2 }}>
                Bcc
              </Typography>

              <TextField
                fullWidth
                size="small"
                placeholder="Enter Email Ids To Keep In Bcc"
                sx={{ mt: 1, background: "#f3f4f6" }}
              />
            </>
          )}

          {/* SUBJECT */}
          <Box sx={{ mt: 2 }}>
            <Typography sx={{ fontSize: 12 }}>
              Subject<span style={{ color: "red" }}>*</span>
            </Typography>

            <TextField
              fullWidth
              size="small"
              placeholder="Subject"
              sx={{ mt: 1, background: "#f3f4f6" }}
            />
          </Box>

          {/* FLOAT BUTTON */}
          <Fab
            sx={{
              position: "absolute",
              right: 20,
              bottom: 120,
              background: colors.primary,
              color: "#fff"
            }}
          >
            <AddIcon />
          </Fab>
        </Box>

        {/* FOOTER */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            p: 2,
            borderTop: "1px solid #eee"
          }}
        >
          <Button variant="outlined" onClick={onClose}>
            Cancel
          </Button>

          <Button
            variant="contained"
            sx={{
              background: colors.primary,
              "&:hover": { background: colors.primaryDark }
            }}
          >
            Send Email
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default EmailDrawer;