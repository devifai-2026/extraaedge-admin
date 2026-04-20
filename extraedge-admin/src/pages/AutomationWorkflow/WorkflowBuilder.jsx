import React, { useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  Checkbox,
  FormControlLabel
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import BoltOutlinedIcon from "@mui/icons-material/BoltOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import "./WorkflowBuilder.css";
import { colors } from '../../theme/colors'

const THEN_DESCRIPTIONS = {
  attributes: "Add actions to update fields or create tasks.",
  immediate: "Add the actions to perform or communications you would like to send.",
  "time-based": "",
  "action-based": ""
};

const SHOW_RECHECK = {
  attributes: true,
  immediate: false,
  "time-based": true,
  "action-based": false
};

const WorkflowBuilder = ({ category, onBack, onCancel, onSave }) => {
  const [activeSection, setActiveSection] = useState("IF");
  const [recheck, setRecheck] = useState(false);

  if (!category) return null;

  const thenDescription = THEN_DESCRIPTIONS[category.preview] ?? "";
  const showRecheck = SHOW_RECHECK[category.preview];

  return (
    <Box className="workflow-builder-wrapper">
      <Box className="workflow-builder-title">
        <IconButton size="small" onClick={onBack}>
          <ArrowBackIcon />
        </IconButton>
        <Typography className="workflow-builder-title-text">
          {category.title}
        </Typography>
      </Box>

      <Box className="workflow-builder-meta">
        <Box className="workflow-builder-field">
          <Typography className="workflow-builder-label">
            Automation Name<span className="workflow-builder-req">*</span>
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Automation Name"
          />
        </Box>

        <Box className="workflow-builder-field">
          <Typography className="workflow-builder-label">
            Start Date<span className="workflow-builder-req">*</span>
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Start Date"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <CalendarMonthOutlinedIcon
                    fontSize="small"
                    sx={{ color: "#777" }}
                  />
                </InputAdornment>
              )
            }}
          />
        </Box>

        <Box className="workflow-builder-field">
          <Typography className="workflow-builder-label">
            Start Time<span className="workflow-builder-req">*</span>
          </Typography>
          <TextField fullWidth size="small" placeholder="Start Time" />
        </Box>
      </Box>

      <Box className="workflow-builder-body">
        <Box className="workflow-builder-left">
          <Box
            className={`workflow-builder-card if-card ${
              activeSection === "IF" ? "active" : ""
            }`}
            onClick={() => setActiveSection("IF")}
          >
            <Box className="workflow-builder-card-head">
              <FilterAltOutlinedIcon
                fontSize="small"
                sx={{ color: colors.primary }}
              />
              <span>IF</span>
            </Box>
            <Typography className="workflow-builder-card-sub">
              Choose a filter on leads/applications and apply conditions as
              required.
            </Typography>
          </Box>

          <Box className="workflow-builder-arrow">↓</Box>

          <Box
            className={`workflow-builder-card then-card ${
              activeSection === "THEN" ? "active" : ""
            }`}
            onClick={() => setActiveSection("THEN")}
          >
            <Box className="workflow-builder-card-head">
              <BoltOutlinedIcon fontSize="small" sx={{ color: colors.primary }} />
              <span>THEN</span>
            </Box>
            {thenDescription && (
              <Typography className="workflow-builder-card-sub">
                {thenDescription}
              </Typography>
            )}
          </Box>
        </Box>

        <Box className="workflow-builder-right">
          <Box className="workflow-builder-condition">
            <Typography className="workflow-builder-condition-title">
              Condition 1
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                displayEmpty
                defaultValue=""
                renderValue={(val) =>
                  val ? val : <span className="placeholder">Select Trigger</span>
                }
              >
                <MenuItem value="">Select Trigger</MenuItem>
                <MenuItem value="lead-created">Lead Created</MenuItem>
                <MenuItem value="lead-updated">Lead Updated</MenuItem>
                <MenuItem value="stage-changed">Stage Changed</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {showRecheck && (
            <FormControlLabel
              className="workflow-builder-recheck"
              control={
                <Checkbox
                  size="small"
                  checked={recheck}
                  onChange={(e) => setRecheck(e.target.checked)}
                />
              }
              label={
                <span>
                  Do not recheck the{" "}
                  <b>IF conditions when time delay option is selected in THEN section</b>
                </span>
              }
            />
          )}
        </Box>
      </Box>

      <Box className="workflow-builder-footer">
        <Button
          variant="outlined"
          className="workflow-builder-cancel"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          className="workflow-builder-save"
          onClick={onSave}
        >
          Save
        </Button>
      </Box>
    </Box>
  );
};

export default WorkflowBuilder;
