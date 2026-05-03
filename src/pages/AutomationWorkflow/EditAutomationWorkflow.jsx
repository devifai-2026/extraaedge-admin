import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  FormControl,
  Select,
  MenuItem,
  Chip,
  Paper
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import BoltIcon from "@mui/icons-material/Bolt";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { colors } from "../../theme/colors";
import "./EditAutomationWorkflow.css";

const defaultStages = [
  "01-New",
  "02-Ringing / Not Reachable",
  "03-Followup",
  "05-Engaged Leads",
  "04-Demo Scheduled",
  "07-Demo Attended",
  "09-Visited",
  "06-Prospect",
  "08-Visit Scheduled",
  "12-Cold",
  "11-Junk",
  "Scheduled Visits"
];

const EditAutomationWorkflow = ({ workflow, onBack, onSave, onCancel }) => {
  const [automationName, setAutomationName] = useState(workflow?.name || "");
  const [startDate, setStartDate] = useState("2026-03-07");
  const [startTime, setStartTime] = useState("10:50 AM");
  const [activeSection, setActiveSection] = useState("IF");
  const [conditionField, setConditionField] = useState("Stage");
  const [conditionOperator, setConditionOperator] = useState("includes");
  const [selectedStages, setSelectedStages] = useState(defaultStages);

  const handleRemoveStage = (stage) => {
    setSelectedStages(selectedStages.filter((s) => s !== stage));
  };

  const title = workflow?.category
    ? `Edit ${workflow.category}`
    : "Edit Send immediate communication";

  return (
    <Box className="edit-automation-wrapper">
      {/* Page header */}
      <Box className="edit-automation-title">
        <IconButton size="small" onClick={onBack}>
          <ArrowBackIcon />
        </IconButton>
        <Typography className="edit-automation-title-text">
          {title}
        </Typography>
      </Box>

      {/* Top form fields */}
      <Box className="edit-automation-top-row">
        <Box className="edit-field">
          <Typography className="edit-label">
            Automation Name<span className="req">*</span>
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={automationName}
            onChange={(e) => setAutomationName(e.target.value)}
            className="edit-input"
          />
        </Box>

        <Box className="edit-field">
          <Typography className="edit-label">
            Start Date<span className="req">*</span>
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="edit-input"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <CalendarMonthIcon
                    fontSize="small"
                    sx={{ color: colors.primary }}
                  />
                </InputAdornment>
              )
            }}
          />
        </Box>

        <Box className="edit-field">
          <Typography className="edit-label">
            Start Time<span className="req">*</span>
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="edit-input"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <AccessTimeIcon
                    fontSize="small"
                    sx={{ color: colors.textMuted }}
                  />
                </InputAdornment>
              )
            }}
          />
        </Box>
      </Box>

      {/* Main content */}
      <Box className="edit-automation-body">
        {/* LEFT: IF / THEN stack */}
        <Box className="edit-automation-left">
          <Paper
            elevation={0}
            className={`edit-step-card ${
              activeSection === "IF" ? "active" : ""
            }`}
            onClick={() => setActiveSection("IF")}
          >
            <Box className="edit-step-header">
              <FilterAltOutlinedIcon
                fontSize="small"
                sx={{ color: colors.primary }}
              />
              <Typography className="edit-step-title">IF</Typography>
            </Box>
            <Typography className="edit-step-desc">
              Choose a filter on leads/applications and apply conditions as
              required.
            </Typography>
            <Box className="edit-step-footer">
              <Typography className="edit-step-applied">
                Conditions applied
              </Typography>
              <span className="edit-step-count">1</span>
            </Box>
          </Paper>

          <Box className="edit-step-arrow">
            <KeyboardArrowDownIcon />
          </Box>

          <Paper
            elevation={0}
            className={`edit-step-card ${
              activeSection === "THEN" ? "active" : ""
            }`}
            onClick={() => setActiveSection("THEN")}
          >
            <Box className="edit-step-header">
              <BoltIcon fontSize="small" sx={{ color: colors.primary }} />
              <Typography className="edit-step-title">THEN</Typography>
            </Box>
            <Typography className="edit-step-desc">
              Add the actions to perform or communications you would like to
              send.
            </Typography>
            <Box className="edit-step-channel">
              <WhatsAppIcon
                fontSize="small"
                sx={{ color: "#25D366" }}
              />
              <Typography className="edit-step-channel-text">
                WhatsApp
              </Typography>
            </Box>
          </Paper>
        </Box>

        {/* RIGHT: Conditions panel */}
        <Paper elevation={0} className="edit-conditions-panel">
          <Typography className="edit-condition-heading">
            Condition 1
          </Typography>

          <Box className="edit-condition-row">
            <FormControl fullWidth size="small">
              <Select
                value={conditionField}
                onChange={(e) => setConditionField(e.target.value)}
              >
                <MenuItem value="Stage">Stage</MenuItem>
                <MenuItem value="Source">Source</MenuItem>
                <MenuItem value="Created On">Created On</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <Select
                value={conditionOperator}
                onChange={(e) => setConditionOperator(e.target.value)}
              >
                <MenuItem value="includes">includes</MenuItem>
                <MenuItem value="excludes">excludes</MenuItem>
                <MenuItem value="equals">equals</MenuItem>
              </Select>
            </FormControl>

            <Box className="edit-chip-box">
              {selectedStages.map((stage) => (
                <Chip
                  key={stage}
                  label={stage}
                  size="small"
                  onDelete={() => handleRemoveStage(stage)}
                  deleteIcon={<CloseIcon fontSize="small" />}
                  className="edit-stage-chip"
                />
              ))}
              <IconButton size="small" className="edit-chip-more">
                <KeyboardArrowDownIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          <Button
            className="edit-subgroup-btn"
            startIcon={
              <AddIcon
                fontSize="small"
                sx={{
                  background: colors.primary,
                  color: colors.white,
                  borderRadius: "50%"
                }}
              />
            }
          >
            Add subgroup
          </Button>
        </Paper>
      </Box>

      {/* New condition */}
      <Box className="edit-new-condition-wrap">
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          className="edit-new-condition-btn"
        >
          New condition
        </Button>
      </Box>

      {/* Footer actions */}
      <Box className="edit-automation-footer">
        <Button
          variant="outlined"
          onClick={onCancel || onBack}
          className="edit-cancel-btn"
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onSave}
          className="edit-save-btn"
        >
          Save
        </Button>
      </Box>
    </Box>
  );
};

export default EditAutomationWorkflow;
