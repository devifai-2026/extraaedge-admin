import React from "react";
import { Box, Typography, IconButton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import SmsOutlinedIcon from "@mui/icons-material/SmsOutlined";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import "./CreateWorkflowCategory.css";
import { colors } from '../../theme/colors'

const categories = [
  {
    id: "attributes",
    title: "Update attributes, fields or add milestones",
    points: [
      "Update attributes or fields like priority, lead owner etc without any communication",
      "Add time delay or update immediately"
    ],
    preview: "attributes"
  },
  {
    id: "immediate",
    title: "Send immediate communication",
    points: [
      "Send a single communication to be actioned immediately",
      "No dependent actions can be added"
    ],
    preview: "immediate"
  },
  {
    id: "time-based",
    title: "Nurture with time based workflow",
    points: [
      "Send multiple communications. with time delay between them",
      "Add dependent actions based on outcomes",
      "Update attributes or fields like priority, lead owner, etc"
    ],
    preview: "time-based"
  },
  {
    id: "action-based",
    title: "Nurture with action or outcome based workflow",
    points: [
      "Send multiple communications and add dependent actions based on outcomes.",
      "Add time delay between outcomes and next actions",
      "Update attributes or fields like priority, lead owner, etc"
    ],
    preview: "action-based"
  }
];

const PreviewBlock = ({ type }) => {
  if (type === "attributes") {
    return (
      <Box className="workflow-category-preview">
        <Box className="workflow-preview-block">
          <span className="workflow-preview-label">⛃ IF</span>
          <div className="workflow-preview-sub">
            Conditions applied <span className="workflow-preview-dot" />
          </div>
        </Box>
        <Box className="workflow-preview-line" />
        <Box className="workflow-preview-block">
          <span className="workflow-preview-label">⚡ THEN</span>
          <div className="workflow-preview-sub">
            Attributes applied <span className="workflow-preview-dot" />
          </div>
        </Box>
      </Box>
    );
  }

  if (type === "immediate") {
    return (
      <Box className="workflow-category-preview">
        <Box className="workflow-preview-block">
          <span className="workflow-preview-label">⛃ IF</span>
          <div className="workflow-preview-sub">
            Conditions applied <span className="workflow-preview-dot" />
          </div>
        </Box>
        <Box className="workflow-preview-line" />
        <Box className="workflow-preview-block">
          <span className="workflow-preview-label">⚡ THEN</span>
          <div className="workflow-preview-sub">
            <WhatsAppIcon sx={{ fontSize: 12, color: "#25D366" }} /> Whatsapp
          </div>
          <div className="workflow-preview-sub">
            <EmailOutlinedIcon sx={{ fontSize: 12, color: colors.primary }} /> Email
          </div>
          <div className="workflow-preview-sub">
            <SmsOutlinedIcon sx={{ fontSize: 12, color: colors.primary }} /> SMS
          </div>
        </Box>
      </Box>
    );
  }

  if (type === "time-based") {
    return (
      <Box className="workflow-category-preview">
        <Box className="workflow-preview-block">
          <span className="workflow-preview-label">⛃ IF</span>
          <div className="workflow-preview-sub">
            Conditions applied <span className="workflow-preview-dot" />
          </div>
        </Box>
        <Box className="workflow-preview-line" />
        <Box className="workflow-preview-block">
          <span className="workflow-preview-label">⚡ THEN</span>
          <div className="workflow-preview-sub">
            <SmsOutlinedIcon sx={{ fontSize: 12, color: colors.primary }} /> SMS
          </div>
          <div className="workflow-preview-sub" style={{ paddingLeft: 14 }}>
            Template 1 · 1 hr
          </div>
          <div className="workflow-preview-sub" style={{ paddingLeft: 14 }}>
            Template 2 · 2 hr
          </div>
          <div className="workflow-preview-sub">
            <EmailOutlinedIcon sx={{ fontSize: 12, color: colors.primary }} /> Email
          </div>
        </Box>
      </Box>
    );
  }

  // action-based
  return (
    <Box className="workflow-category-preview">
      <Box className="workflow-preview-block">
        <span className="workflow-preview-label">⛃ IF</span>
        <div className="workflow-preview-sub">
          Conditions applied <span className="workflow-preview-dot" />
        </div>
      </Box>
      <Box className="workflow-preview-line" />
      <Box className="workflow-preview-block">
        <span className="workflow-preview-label">⚡ THEN</span>
        <div
          className="workflow-preview-sub"
          style={{ justifyContent: "space-between" }}
        >
          <span>
            <SmsOutlinedIcon sx={{ fontSize: 12, color: colors.primary }} /> SMS
          </span>
          <AddCircleIcon sx={{ fontSize: 12, color: "#f39c12" }} />
        </div>
        <div className="workflow-preview-sub" style={{ paddingLeft: 14 }}>
          Delivered
        </div>
        <div className="workflow-preview-sub" style={{ paddingLeft: 20 }}>
          <EmailOutlinedIcon sx={{ fontSize: 12, color: colors.primary }} /> Email
        </div>
        <div className="workflow-preview-sub" style={{ paddingLeft: 28 }}>
          Clicked
        </div>
      </Box>
    </Box>
  );
};

const CreateWorkflowCategory = ({ onBack, onSelect }) => {
  return (
    <Box className="create-workflow-wrapper">
      <Box className="create-workflow-title">
        <IconButton size="small" onClick={onBack}>
          <ArrowBackIcon />
        </IconButton>
        <Typography className="create-workflow-title-text">
          Create a new automation workflow
        </Typography>
      </Box>

      <Typography className="create-workflow-subtitle">
        Select the category best suited to create workflow of your choice:
      </Typography>

      <Box className="create-workflow-grid">
        {categories.map((cat) => (
          <Box
            key={cat.id}
            className="workflow-category-card"
            onClick={() => onSelect && onSelect(cat)}
          >
            <PreviewBlock type={cat.preview} />
            <Box className="workflow-category-content">
              <Typography className="workflow-category-heading">
                {cat.title}
              </Typography>
              <ul className="workflow-category-list">
                {cat.points.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default CreateWorkflowCategory;
