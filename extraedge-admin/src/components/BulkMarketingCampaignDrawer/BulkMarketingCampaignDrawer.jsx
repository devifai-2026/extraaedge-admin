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
import CampaignIcon from "@mui/icons-material/Campaign";
import { colors } from "../../theme/colors";

const BulkMarketingCampaignDrawer = ({ open, onClose, leadsCount = 0 }) => {
  const [campaign, setCampaign] = useState("");
  const [rule, setRule] = useState("");
  const [communicationCount, setCommunicationCount] = useState("");

  const resetForm = () => {
    setCampaign("");
    setRule("");
    setCommunicationCount("");
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = () => {
    console.log("Adding bulk marketing campaign:", {
      campaign,
      rule,
      communicationCount,
      leadsCount,
    });
    resetForm();
    onClose();
  };

  const isValid = campaign && rule && communicationCount;

  return (
    <Drawer anchor="right" open={open} onClose={handleCancel}>
      <Box
        sx={{
          width: 380,
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
            <CampaignIcon
              sx={{
                color: "#555",
                border: "1.5px solid #555",
                borderRadius: "50%",
                fontSize: 28,
                p: 0.3,
              }}
            />
            <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
              Add Bulk Marketing Campaign to {leadsCount} Leads
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleCancel}>
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
          <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
            Step 1: Enter Campaign Details
            <span style={{ color: "red" }}>*</span>
          </Typography>

          {/* Campaign */}
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>
              Campaign<span style={{ color: "red" }}>*</span>
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Enter Campaign"
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              sx={{ "& .MuiInputBase-input": { fontSize: 13 } }}
            />
          </Box>

          {/* Select Rule */}
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>
              Select Rule<span style={{ color: "red" }}>*</span>
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                value={rule}
                onChange={(e) => setRule(e.target.value)}
                displayEmpty
                renderValue={(selected) => {
                  if (!selected) {
                    return <span style={{ color: "#aaa" }}>Select Rule</span>;
                  }
                  return selected;
                }}
                sx={{ fontSize: 13 }}
              >
                <MenuItem value="Rule 1">Rule 1</MenuItem>
                <MenuItem value="Rule 2">Rule 2</MenuItem>
                <MenuItem value="Rule 3">Rule 3</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* No. of Times of Communication */}
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>
              No. of Times of Communication
              <span style={{ color: "red" }}>*</span>
            </Typography>
            <TextField
              fullWidth
              size="small"
              type="number"
              placeholder="Enter No."
              value={communicationCount}
              onChange={(e) => setCommunicationCount(e.target.value)}
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
            onClick={handleSubmit}
            disabled={!isValid}
            sx={{
              textTransform: "none",
              backgroundColor: colors.primary,
              fontSize: 13,
              borderRadius: 2,
              "&:hover": { backgroundColor: colors.primaryDark },
            }}
          >
            Add Bulk Marketing Campaign
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default BulkMarketingCampaignDrawer;
