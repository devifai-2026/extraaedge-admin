import React, { useState } from "react";
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
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import { colors } from '../../theme/colors'

const ReferLeadsDrawer = ({ open, onClose, lead }) => {
  const [referTo, setReferTo] = useState("");
  const [remarks, setRemarks] = useState("");

  const handleRefer = () => {
    // TODO: API call to refer lead
    console.log("Referring lead:", { leadId: lead?.id, referTo, remarks });
    setReferTo("");
    setRemarks("");
    onClose();
  };

  const handleCancel = () => {
    setReferTo("");
    setRemarks("");
    onClose();
  };

  return (
    <Drawer anchor="right" open={open} onClose={handleCancel}>
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
            borderBottom: "2px solid colors.primary",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <SwapHorizIcon
              sx={{
                color: "#555",
                border: "1.5px solid #555",
                borderRadius: "50%",
                fontSize: 28,
                p: 0.3,
              }}
            />
            <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
              Refer Leads/Application {lead?.name}
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleCancel}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* BODY */}
        <Box sx={{ flex: 1, px: 2, py: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Refer To */}
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
                  if (!selected) {
                    return (
                      <span style={{ color: "#aaa" }}>Select Referred To</span>
                    );
                  }
                  return selected;
                }}
                sx={{ fontSize: 13 }}
              >
                <MenuItem value="User 1">User 1</MenuItem>
                <MenuItem value="User 2">User 2</MenuItem>
                <MenuItem value="User 3">User 3</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Referral Remarks */}
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>
              Referral Remarks
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={6}
              placeholder="Comment"
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
            onClick={handleCancel}
            sx={{
              textTransform: "none",
              color: "#555",
              borderColor: "#ccc",
              fontSize: 13,
              borderRadius: 2,
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleRefer}
            disabled={!referTo}
            sx={{
              textTransform: "none",
              backgroundColor: colors.primary,
              fontSize: 13,
              borderRadius: 2,
              "&:hover": { backgroundColor: colors.primaryDark },
            }}
          >
            Refer
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default ReferLeadsDrawer;
