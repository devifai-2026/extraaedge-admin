import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Snackbar,
  Alert
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import SmsOutlinedIcon from "@mui/icons-material/SmsOutlined";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import "./CreateWorkflowCategory.css";
import { workflowsApi } from "../../lib/endpoints";
import { auth } from "../../lib/api";

const MANAGE_ROLES = ["super_admin", "branch_manager"];

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
            <EmailOutlinedIcon sx={{ fontSize: 12, color: "#d97706" }} /> Email
          </div>
          <div className="workflow-preview-sub">
            <SmsOutlinedIcon sx={{ fontSize: 12, color: "#d97706" }} /> SMS
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
            <SmsOutlinedIcon sx={{ fontSize: 12, color: "#d97706" }} /> SMS
          </div>
          <div className="workflow-preview-sub" style={{ paddingLeft: 14 }}>
            Template 1 · 1 hr
          </div>
          <div className="workflow-preview-sub" style={{ paddingLeft: 14 }}>
            Template 2 · 2 hr
          </div>
          <div className="workflow-preview-sub">
            <EmailOutlinedIcon sx={{ fontSize: 12, color: "#d97706" }} /> Email
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
            <SmsOutlinedIcon sx={{ fontSize: 12, color: "#d97706" }} /> SMS
          </span>
          <AddCircleIcon sx={{ fontSize: 12, color: "#f39c12" }} />
        </div>
        <div className="workflow-preview-sub" style={{ paddingLeft: 14 }}>
          Delivered
        </div>
        <div className="workflow-preview-sub" style={{ paddingLeft: 20 }}>
          <EmailOutlinedIcon sx={{ fontSize: 12, color: "#d97706" }} /> Email
        </div>
        <div className="workflow-preview-sub" style={{ paddingLeft: 28 }}>
          Clicked
        </div>
      </Box>
    </Box>
  );
};

const CreateWorkflowCategory = ({ onBack, onSelect }) => {
  const [dbCategories, setDbCategories] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, msg: "", severity: "success" });

  const canManage = MANAGE_ROLES.includes(auth.getUser()?.role);
  const notify = (msg, severity = "success") =>
    setToast({ open: true, msg, severity });

  const loadCategories = () => {
    workflowsApi
      .categories()
      .then((r) => setDbCategories(r?.data || []))
      .catch(() => setDbCategories([]));
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreateCategory = async () => {
    if (!newName.trim()) {
      notify("Please enter a category name.", "warning");
      return;
    }
    setSaving(true);
    try {
      await workflowsApi.createCategory({
        name: newName.trim(),
        description: newDesc.trim() || undefined
      });
      notify("Category created.");
      setCreateOpen(false);
      setNewName("");
      setNewDesc("");
      loadCategories();
    } catch (e) {
      notify(e?.message || "Could not create category.", "error");
    } finally {
      setSaving(false);
    }
  };

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

      {dbCategories.length > 0 && (
        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 2 }}>
          <Typography variant="body2" sx={{ color: "#777", mr: 1 }}>
            Your categories:
          </Typography>
          {dbCategories.map((c) => (
            <Chip key={c.id} label={c.name} size="small" />
          ))}
          {canManage && (
            <Button
              size="small"
              startIcon={<AddCircleIcon fontSize="small" />}
              onClick={() => setCreateOpen(true)}
              sx={{ textTransform: "none" }}
            >
              New category
            </Button>
          )}
        </Box>
      )}
      {dbCategories.length === 0 && canManage && (
        <Box sx={{ mb: 2 }}>
          <Button
            size="small"
            startIcon={<AddCircleIcon fontSize="small" />}
            onClick={() => setCreateOpen(true)}
            sx={{ textTransform: "none" }}
          >
            New category
          </Button>
        </Box>
      )}

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

      {/* Create workflow category */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>New workflow category</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Category name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            fullWidth
            size="small"
            label="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleCreateCategory} disabled={saving}>
            {saving ? "Saving…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={toast.severity}
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          sx={{ width: "100%" }}
        >
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CreateWorkflowCategory;
