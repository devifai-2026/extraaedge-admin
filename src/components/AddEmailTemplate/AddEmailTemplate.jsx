// AddEmailTemplate.jsx
import React from "react";
import { Box, TextField, Button, Chip, IconButton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import SmartButtonIcon from "@mui/icons-material/SmartButton";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import TitleIcon from "@mui/icons-material/Title";
import NotesIcon from "@mui/icons-material/Notes";
import ImageIcon from "@mui/icons-material/Image";
import GroupsIcon from "@mui/icons-material/Groups";
import MenuIcon from "@mui/icons-material/Menu";
import CodeIcon from "@mui/icons-material/Code";
import TableChartIcon from "@mui/icons-material/TableChart";
import WidgetsIcon from "@mui/icons-material/Widgets";
import ViewQuiltIcon from "@mui/icons-material/ViewQuilt";
import CropOriginalIcon from "@mui/icons-material/CropOriginal";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DesktopWindowsIcon from "@mui/icons-material/DesktopWindows";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import KeyboardDoubleArrowRightIcon from "@mui/icons-material/KeyboardDoubleArrowRight";
import "./AddEmailTemplate.css";

const contentBlocks = [
  { label: "COLUMNS", icon: <ViewColumnIcon /> },
  { label: "BUTTON", icon: <SmartButtonIcon /> },
  { label: "DIVIDER", icon: <HorizontalRuleIcon /> },
  { label: "HEADING", icon: <TitleIcon /> },
  { label: "PARAGRAPH", icon: <NotesIcon /> },
  { label: "IMAGE", icon: <ImageIcon /> },
  { label: "SOCIAL", icon: <GroupsIcon /> },
  { label: "MENU", icon: <MenuIcon /> },
  { label: "HTML", icon: <CodeIcon /> },
  { label: "TABLE", icon: <TableChartIcon /> }
];

const AddEmailTemplate = ({ onBack }) => {
  return (
    <Box className="add-email-template-page">
      {/* Top Bar */}
      <Box className="aet-topbar">
        <Box className="aet-back" onClick={onBack}>
          <ArrowBackIcon fontSize="small" />
          <span>Back</span>
          <span className="aet-title">Add New Email Template</span>
        </Box>
        <Button className="aet-draft-btn" variant="outlined">
          Save As Draft
        </Button>
      </Box>

      {/* Form Section */}
      <Box className="aet-form">
        <Box className="aet-form-row">
          <Box className="aet-field">
            <label className="aet-label">
              Template Name<span className="aet-required">*</span>
            </label>
            <TextField
              size="small"
              fullWidth
              placeholder="Enter Template Name"
              className="aet-input"
            />
          </Box>

          <Box className="aet-field">
            <label className="aet-label">
              Subject<span className="aet-required">*</span>
            </label>
            <TextField
              size="small"
              fullWidth
              placeholder="Subject"
              className="aet-input"
            />
          </Box>
        </Box>

        <Box className="aet-field aet-visible-field">
          <label className="aet-label">Visible For</label>
          <Box className="aet-visible-input">
            <Chip
              label="All Counselors"
              onDelete={() => {}}
              size="small"
              className="aet-chip"
            />
            <span className="aet-dropdown-arrow">×  ▾</span>
          </Box>
        </Box>

        <label className="aet-label aet-compose-label">
          Compose Email Template<span className="aet-required">*</span>
        </label>

        {/* Builder Area */}
        <Box className="aet-builder">
          <Box className="aet-canvas">
            <Box className="aet-drop-zone">
              No content here. Drag content from right.
            </Box>

            {/* Bottom toolbar */}
            <Box className="aet-canvas-toolbar">
              <IconButton size="small" className="aet-toolbar-btn">
                <UndoIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" className="aet-toolbar-btn">
                <RedoIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" className="aet-toolbar-btn">
                <VisibilityIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" className="aet-toolbar-btn">
                <DesktopWindowsIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" className="aet-toolbar-btn">
                <SmartphoneIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {/* Content Block Panel */}
          <Box className="aet-blocks-panel">
            <Box className="aet-blocks-grid">
              {contentBlocks.map((b, i) => (
                <Box key={i} className="aet-block-item">
                  <Box className="aet-block-icon">{b.icon}</Box>
                  <span className="aet-block-label">{b.label}</span>
                </Box>
              ))}
            </Box>
            <Box className="aet-collapse-btn">
              <KeyboardDoubleArrowRightIcon fontSize="small" />
            </Box>
          </Box>

          {/* Right Sidebar Tabs */}
          <Box className="aet-side-tabs">
            <Box className="aet-side-tab active">
              <WidgetsIcon fontSize="small" />
              <span>Content</span>
            </Box>
            <Box className="aet-side-tab">
              <ViewQuiltIcon fontSize="small" />
              <span>Blocks</span>
            </Box>
            <Box className="aet-side-tab">
              <CropOriginalIcon fontSize="small" />
              <span>Body</span>
            </Box>
            <Box className="aet-side-tab">
              <PhotoLibraryIcon fontSize="small" />
              <span>Images</span>
            </Box>
          </Box>
        </Box>

        {/* Attachment Section */}
        <Box className="aet-attach-section">
          <p className="aet-attach-text">Attach any relevant Documents.</p>
          <Button variant="outlined" className="aet-browse-btn">
            Browse
          </Button>
        </Box>

        {/* Footer Buttons */}
        <Box className="aet-footer">
          <Button variant="outlined" className="aet-publish-btn">
            Publish
          </Button>
          <Button variant="contained" className="aet-test-btn">
            Test Template
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default AddEmailTemplate;
