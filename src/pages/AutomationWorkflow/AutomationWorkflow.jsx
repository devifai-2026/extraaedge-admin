import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Switch,
  IconButton,
  Menu,
  MenuItem,
  Fab,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Snackbar,
  Tooltip
} from "@mui/material";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import AddIcon from "@mui/icons-material/Add";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { colors } from "../../theme/colors";
import "./AutomationWorkflow.css";
import {
  Popover,
  FormControl,
  Select
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditConfirmModal from "./EditConfirmModal";
import EditAutomationWorkflow from "./EditAutomationWorkflow";
import CreateWorkflowCategory from "./CreateWorkflowCategory";
import WorkflowBuilder from "./WorkflowBuilder";
import { workflowsApi } from "../../lib/endpoints";
import { auth } from "../../lib/api";

const fmtDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      })
    : "—";

// Roles that may create / toggle / execute workflows (mirrors the BE rbac on
// the workflow routes: super_admin, branch_manager, sales_manager).
const MANAGE_ROLES = ["super_admin", "branch_manager", "sales_manager"];

const AutomationWorkflows = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);
  const [anchorElFilter, setAnchorElFilter] = useState(null);
  const [confirmIndex, setConfirmIndex] = useState(null);
  const [menuIndex, setMenuIndex] = useState(null);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [editConfirmIndex, setEditConfirmIndex] = useState(null);
  const [editWorkflow, setEditWorkflow] = useState(null);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState({ open: false, msg: "", severity: "success" });

  const currentRole = auth.getUser()?.role;
  const canManage = MANAGE_ROLES.includes(currentRole);

  const notify = (msg, severity = "success") =>
    setToast({ open: true, msg, severity });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await workflowsApi.list();
      setRows(res?.data || []);
    } catch (e) {
      setError(e?.message || "Failed to load workflows");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleFilterClick = (event) => {
    setAnchorElFilter(event.currentTarget);
  };

  const handleFilterClose = () => {
    setAnchorElFilter(null);
  };

  const openFilter = Boolean(anchorElFilter);

  const handleToggleClick = (index) => {
    if (!canManage) {
      notify("You don't have permission to change workflow status.", "warning");
      return;
    }
    setConfirmIndex(index);
  };

  const handleConfirmClose = () => {
    setConfirmIndex(null);
  };

  const handleConfirmYes = async () => {
    if (confirmIndex === null) return;
    const row = rows[confirmIndex];
    setBusy(true);
    try {
      const res = await workflowsApi.toggle(row.id);
      const updated = [...rows];
      updated[confirmIndex] = { ...row, ...(res?.data || {}) };
      setRows(updated);
      notify(res?.data?.is_active ? "Workflow activated." : "Workflow deactivated.");
    } catch (e) {
      notify(e?.message || "Could not update workflow.", "error");
    } finally {
      setBusy(false);
      setConfirmIndex(null);
    }
  };

  const handleExecute = async (row) => {
    if (!canManage) {
      notify("You don't have permission to run workflows.", "warning");
      return;
    }
    setBusy(true);
    try {
      await workflowsApi.execute(row.id, {});
      notify("Workflow run queued.");
    } catch (e) {
      notify(e?.message || "Could not run workflow.", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleMenuOpen = (event, index) => {
    setAnchorEl(event.currentTarget);
    setMenuIndex(index);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuIndex(null);
  };

  const handleDeleteClick = () => {
    setDeleteIndex(menuIndex);
    setAnchorEl(null);
  };

  const handleEditClick = () => {
    setEditConfirmIndex(menuIndex);
    setAnchorEl(null);
  };

  const handleEditConfirmClose = () => {
    setEditConfirmIndex(null);
    setMenuIndex(null);
  };

  const handleEditConfirmYes = () => {
    setEditWorkflow(rows[editConfirmIndex] || null);
    setEditConfirmIndex(null);
    setMenuIndex(null);
  };

  const handleEditBack = () => {
    setEditWorkflow(null);
  };

  const handleDeleteClose = () => {
    setDeleteIndex(null);
    setMenuIndex(null);
  };

  const handleDeleteConfirm = async () => {
    if (deleteIndex === null) return;
    const row = rows[deleteIndex];
    setBusy(true);
    try {
      await workflowsApi.delete(row.id);
      setRows(rows.filter((_, i) => i !== deleteIndex));
      notify("Workflow deleted.");
    } catch (e) {
      notify(e?.message || "Could not delete workflow.", "error");
    } finally {
      setBusy(false);
      setDeleteIndex(null);
      setMenuIndex(null);
    }
  };

  if (editWorkflow) {
    return (
      <EditAutomationWorkflow
        workflow={editWorkflow}
        onBack={handleEditBack}
        onCancel={handleEditBack}
        onSave={() => {
          handleEditBack();
          load();
        }}
      />
    );
  }

  if (selectedCategory) {
    return (
      <WorkflowBuilder
        category={selectedCategory}
        onBack={() => setSelectedCategory(null)}
        onCancel={() => {
          setSelectedCategory(null);
          setShowCreateCategory(false);
        }}
        onSave={() => {
          setSelectedCategory(null);
          setShowCreateCategory(false);
          load();
        }}
      />
    );
  }

  if (showCreateCategory) {
    return (
      <CreateWorkflowCategory
        onBack={() => setShowCreateCategory(false)}
        onSelect={(cat) => setSelectedCategory(cat)}
      />
    );
  }

  return (
    <Box sx={{ p: 3, background: "#f6f6f6", minHeight: "100vh" }}>
      {/* Header */}
      <Box className="automation-header">
        <div className="automation-tab-active">Automation Workflows</div>

        <Button
          variant="outlined"
          className="filter-btn"
          startIcon={<FilterAltOutlinedIcon />}
          onClick={handleFilterClick}
          sx={{
            textTransform: "none",
            borderRadius: "8px",
            color: colors.primary,
            borderColor: colors.primary,
            "&:hover": {
              backgroundColor: colors.primaryDark,
              borderColor: colors.primaryDark
            }
          }}
        >
          Filter
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Table */}
      <Paper elevation={0} sx={{ borderRadius: "10px", overflow: "hidden" }}>
        <Table>
          <TableHead>
            <TableRow sx={{ background: colors.primary, color: colors.white }}>
              <TableCell><b>WORKFLOW NAME</b></TableCell>
              <TableCell><b>WORKFLOW CATEGORY</b></TableCell>
              <TableCell><b>CREATED ON</b></TableCell>
              <TableCell><b>START TIME</b></TableCell>
              <TableCell align="center"><b>ACTIVE</b></TableCell>
              <TableCell />
            </TableRow>
          </TableHead>

          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            )}

            {!loading && rows.length === 0 && !error && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6, color: "#777" }}>
                  No automation workflows yet.
                  {canManage
                    ? " Use the + button to create your first one."
                    : ""}
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              rows.map((row, index) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.category_name || "—"}</TableCell>
                  <TableCell>{fmtDateTime(row.created_at)}</TableCell>
                  <TableCell>{fmtDateTime(row.start_time)}</TableCell>

                  <TableCell align="center">
                    <Switch
                      checked={!!row.is_active}
                      disabled={!canManage || busy}
                      onChange={() => handleToggleClick(index)}
                    />
                  </TableCell>

                  <TableCell align="right">
                    {canManage && (
                      <Tooltip title="Run now">
                        <span>
                          <IconButton
                            size="small"
                            disabled={busy}
                            onClick={() => handleExecute(row)}
                          >
                            <PlayArrowIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                    <IconButton onClick={(e) => handleMenuOpen(e, index)}>
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditClick}>Edit</MenuItem>
        {canManage && <MenuItem onClick={handleDeleteClick}>Delete</MenuItem>}
      </Menu>

      {/* Floating Add Button */}
      {canManage && (
        <Fab
          color="warning"
          onClick={() => setShowCreateCategory(true)}
          sx={{
            position: "fixed",
            bottom: 30,
            right: 30,
            backgroundColor: colors.primary,
            "&:hover": { backgroundColor: colors.primaryDark }
          }}
        >
          <AddIcon />
        </Fab>
      )}
      <Popover
        open={openFilter}
        anchorEl={anchorElFilter}
        onClose={handleFilterClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right"
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right"
        }}
      >
        <Box className="filter-popover">

          {/* Header */}
          <Box className="filter-header">
            <Box display="flex" alignItems="center" gap={1}>
              <FilterAltOutlinedIcon fontSize="small" />
              <Typography fontWeight={600}>Filter</Typography>
            </Box>

            <IconButton size="small" onClick={handleFilterClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Body */}
          <Box className="filter-body">

            <Typography className="filter-label">Counselors</Typography>
            <FormControl fullWidth size="small">
              <Select displayEmpty>
                <MenuItem value="">Select...</MenuItem>
              </Select>
            </FormControl>

            <Typography className="filter-label">Workflow Name</Typography>
            <FormControl fullWidth size="small">
              <Select displayEmpty>
                <MenuItem value="">Select...</MenuItem>
              </Select>
            </FormControl>

            <Typography className="filter-label">Workflow Category</Typography>
            <FormControl fullWidth size="small">
              <Select displayEmpty>
                <MenuItem value="">Select...</MenuItem>
              </Select>
            </FormControl>

            <Typography className="filter-label">Workflow Status</Typography>
            <FormControl fullWidth size="small">
              <Select displayEmpty>
                <MenuItem value="">Select...</MenuItem>
              </Select>
            </FormControl>

          </Box>

          {/* Footer */}
          <Box className="filter-footer">
            <Button variant="outlined" className="reset-btn">
              Reset
            </Button>
            <Button variant="contained" className="apply-btn">
              Apply Filter
            </Button>
          </Box>

        </Box>
      </Popover>

      {/* Activate / Deactivate Confirmation */}
      <Dialog
        open={confirmIndex !== null}
        onClose={handleConfirmClose}
        PaperProps={{ sx: { borderRadius: "10px", width: 480 } }}
      >
        <DialogTitle
          sx={{
            background: "#fbe9da",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: 600,
            py: 1.5
          }}
        >
          {confirmIndex !== null && rows[confirmIndex]?.is_active
            ? "Deactivate Workflow"
            : "Activate Workflow"}
          <IconButton size="small" onClick={handleConfirmClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          <Typography fontWeight={600} sx={{ mb: 1, mt: 1 }}>
            {confirmIndex !== null && rows[confirmIndex]?.is_active
              ? "Do you want to deactivate the rule?"
              : "Do you want to activate the rule?"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {confirmIndex !== null && rows[confirmIndex]?.is_active
              ? "Once the rule is inactive all the communication will stop."
              : "Once the rule is active all the communication will start going again"}
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleConfirmClose}
            variant="outlined"
            disabled={busy}
            sx={{
              textTransform: "none",
              borderRadius: "6px",
              color: colors.primary,
              borderColor: colors.primary
            }}
          >
            No
          </Button>
          <Button
            onClick={handleConfirmYes}
            variant="contained"
            disabled={busy}
            sx={{
              textTransform: "none",
              borderRadius: "6px",
              backgroundColor: colors.primary,
              "&:hover": { backgroundColor: colors.primaryDark }
            }}
          >
            Yes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Confirmation */}
      <EditConfirmModal
        open={editConfirmIndex !== null}
        onClose={handleEditConfirmClose}
        onConfirm={handleEditConfirmYes}
      />

      {/* Delete Confirmation */}
      <Dialog
        open={deleteIndex !== null}
        onClose={handleDeleteClose}
        maxWidth={false}
        PaperProps={{ sx: { borderRadius: "10px", width: 680 } }}
      >
        <DialogTitle
          sx={{
            background: "#fbe9da",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: 600,
            py: 1.5
          }}
        >
          Delete Automation Workflow
          <IconButton size="small" onClick={handleDeleteClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          <Typography fontWeight={600} sx={{ mb: 1, mt: 1 }}>
            Do you want to delete the rule?
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleDeleteClose}
            variant="outlined"
            disabled={busy}
            sx={{
              textTransform: "none",
              borderRadius: "6px",
              color: colors.primary,
              borderColor: colors.primary
            }}
          >
            No
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            disabled={busy}
            sx={{
              textTransform: "none",
              borderRadius: "6px",
              backgroundColor: colors.primary,
              "&:hover": { backgroundColor: colors.primaryDark }
            }}
          >
            Yes
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

export default AutomationWorkflows;
