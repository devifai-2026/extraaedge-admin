// AddBasicEmailTemplate.jsx
import React from "react";
import {
  Box,
  TextField,
  Button,
  Chip,
  IconButton,
  Select,
  MenuItem
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";
import FormatColorTextIcon from "@mui/icons-material/FormatColorText";
import FormatColorFillIcon from "@mui/icons-material/FormatColorFill";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import FormatIndentIncreaseIcon from "@mui/icons-material/FormatIndentIncrease";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import LinkIcon from "@mui/icons-material/Link";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import FormatAlignLeftIcon from "@mui/icons-material/FormatAlignLeft";
import FormatAlignCenterIcon from "@mui/icons-material/FormatAlignCenter";
import FormatAlignRightIcon from "@mui/icons-material/FormatAlignRight";
import FormatAlignJustifyIcon from "@mui/icons-material/FormatAlignJustify";
import ImageIcon from "@mui/icons-material/Image";
import TableChartIcon from "@mui/icons-material/TableChart";
import FormatClearIcon from "@mui/icons-material/FormatClear";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import CodeIcon from "@mui/icons-material/Code";
import SettingsIcon from "@mui/icons-material/Settings";
import VisibilityIcon from "@mui/icons-material/Visibility";
import "./AddBasicEmailTemplate.css";

const AddBasicEmailTemplate = ({ onBack }) => {
  return (
    <Box className="add-basic-email-page">
      {/* Top Bar */}
      <Box className="abet-topbar">
        <Box className="abet-back" onClick={onBack}>
          <ArrowBackIcon fontSize="small" />
          <span>Back</span>
          <span className="abet-title">Add New Email Template</span>
        </Box>
        <Button className="abet-draft-btn" variant="outlined">
          Save As Draft
        </Button>
      </Box>

      {/* Form */}
      <Box className="abet-form">
        <Box className="abet-form-row">
          <Box className="abet-field">
            <label className="abet-label">
              Template Name<span className="abet-required">*</span>
            </label>
            <TextField
              size="small"
              fullWidth
              placeholder="Enter Template Name"
              className="abet-input"
            />
          </Box>

          <Box className="abet-field">
            <label className="abet-label">
              Subject<span className="abet-required">*</span>
            </label>
            <TextField
              size="small"
              fullWidth
              placeholder="Subject"
              className="abet-input"
            />
          </Box>

          <Box className="abet-field">
            <label className="abet-label">Variable</label>
            <Select
              size="small"
              fullWidth
              defaultValue=""
              displayEmpty
              className="abet-input abet-select"
            >
              <MenuItem value="" disabled>
                Select Variable
              </MenuItem>
              <MenuItem value="lead_name">Lead.FullName</MenuItem>
              <MenuItem value="counselor_name">Counselor.FullName</MenuItem>
              <MenuItem value="email">Lead.Email</MenuItem>
            </Select>
          </Box>
        </Box>

        <Box className="abet-field abet-visible-field">
          <label className="abet-label">Visible For</label>
          <Box className="abet-visible-input">
            <Chip
              label="All Counselors"
              onDelete={() => {}}
              size="small"
              className="abet-chip"
            />
            <span className="abet-dropdown-arrow">×  ▾</span>
          </Box>
        </Box>

        <label className="abet-label abet-compose-label">
          Compose Email Template<span className="abet-required">*</span>
        </label>

        {/* Editor */}
        <Box className="abet-editor">
          <Box className="abet-menu-bar">
            <span className="abet-menu-item">File ▾</span>
            <span className="abet-menu-item">View ▾</span>
          </Box>

          <Box className="abet-toolbar">
            <Select
              size="small"
              defaultValue="Paragraph"
              className="abet-toolbar-select"
            >
              <MenuItem value="Paragraph">Paragraph</MenuItem>
              <MenuItem value="Heading 1">Heading 1</MenuItem>
              <MenuItem value="Heading 2">Heading 2</MenuItem>
            </Select>

            <Box className="abet-toolbar-group">
              <IconButton size="small"><FormatBoldIcon fontSize="small" /></IconButton>
              <IconButton size="small"><FormatItalicIcon fontSize="small" /></IconButton>
              <IconButton size="small"><FormatUnderlinedIcon fontSize="small" /></IconButton>
              <IconButton size="small"><FormatColorTextIcon fontSize="small" /></IconButton>
              <IconButton size="small"><FormatColorFillIcon fontSize="small" /></IconButton>
            </Box>

            <Box className="abet-toolbar-group">
              <IconButton size="small"><FormatListBulletedIcon fontSize="small" /></IconButton>
              <IconButton size="small"><FormatListNumberedIcon fontSize="small" /></IconButton>
              <IconButton size="small"><FormatIndentIncreaseIcon fontSize="small" /></IconButton>
              <IconButton size="small"><HorizontalRuleIcon fontSize="small" /></IconButton>
              <IconButton size="small"><LinkIcon fontSize="small" /></IconButton>
              <IconButton size="small"><BookmarkBorderIcon fontSize="small" /></IconButton>
            </Box>

            <Box className="abet-toolbar-group">
              <IconButton size="small"><FormatAlignLeftIcon fontSize="small" /></IconButton>
              <IconButton size="small"><FormatAlignCenterIcon fontSize="small" /></IconButton>
              <IconButton size="small"><FormatAlignRightIcon fontSize="small" /></IconButton>
              <IconButton size="small"><FormatAlignJustifyIcon fontSize="small" /></IconButton>
            </Box>

            <Box className="abet-toolbar-group">
              <IconButton size="small"><ImageIcon fontSize="small" /></IconButton>
              <IconButton size="small"><TableChartIcon fontSize="small" /></IconButton>
              <IconButton size="small"><FormatClearIcon fontSize="small" /></IconButton>
              <IconButton size="small"><UndoIcon fontSize="small" /></IconButton>
              <IconButton size="small"><RedoIcon fontSize="small" /></IconButton>
              <IconButton size="small"><CodeIcon fontSize="small" /></IconButton>
              <IconButton size="small"><SettingsIcon fontSize="small" /></IconButton>
              <IconButton size="small"><VisibilityIcon fontSize="small" /></IconButton>
            </Box>
          </Box>

          <Box className="abet-editor-area" contentEditable suppressContentEditableWarning />

          <Box className="abet-editor-footer">
            <span>POWERED BY TINY</span>
          </Box>
        </Box>

        {/* Attachment */}
        <Box className="abet-attach-section">
          <p className="abet-attach-text">Attach any relevant Documents.</p>
          <Box className="abet-attach-row">
            <Button variant="outlined" className="abet-browse-btn">
              Browse
            </Button>
            <Box className="abet-footer-buttons">
              <Button variant="outlined" className="abet-publish-btn">
                Publish
              </Button>
              <Button variant="contained" className="abet-test-btn">
                Test Template
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default AddBasicEmailTemplate;
