import React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Switch,
    IconButton,
    Button,
    Fab,
    Popover,
    Typography,
    Select,
    MenuItem,
    FormControl,
    Menu,
    Dialog,
    DialogContent,
    DialogActions,
    CircularProgress,
    Alert,
    Snackbar
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import "./DripMarketingCampaign.css";
import { colors } from "../../theme/colors";
import { campaignsDripApi, usersApi } from "../../lib/endpoints";
import { auth } from "../../lib/api";
import EditRuleModal from "./EditRuleModal";
import CreateDripModal from "./CreateDripModal";
import DripRulesDrawer from "./DripRulesDrawer";

const ROLES_ALLOWED = ["super_admin", "branch_manager", "sales_manager"];

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
        : "-";

const DripCampaignRules = () => {
    const currentRole = auth.getUser()?.role;
    const canManage = ROLES_ALLOWED.includes(currentRole);

    const [rows, setRows] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");

    const [filterAnchorEl, setFilterAnchorEl] = React.useState(null);
    const [selectedCounselor, setSelectedCounselor] = React.useState("");
    const [appliedCounselor, setAppliedCounselor] = React.useState("");
    const [counselors, setCounselors] = React.useState([]);

    const [menuAnchorEl, setMenuAnchorEl] = React.useState(null);
    const [activeRowIndex, setActiveRowIndex] = React.useState(null);

    const [openStopModal, setOpenStopModal] = React.useState(false);
    const [openToggleModal, setOpenToggleModal] = React.useState(false);
    const [toggleRowIndex, setToggleRowIndex] = React.useState(null);

    const [openEditConfirmModal, setOpenEditConfirmModal] = React.useState(false);
    const [openEditRuleModal, setOpenEditRuleModal] = React.useState(false);
    const [editRowIndex, setEditRowIndex] = React.useState(null);

    const [openCreateDrip, setOpenCreateDrip] = React.useState(false);

    const [rulesDrawerDrip, setRulesDrawerDrip] = React.useState(null);

    const [busy, setBusy] = React.useState(false);
    const [toast, setToast] = React.useState(null); // { severity, message }

    const showToast = (message, severity = "success") => setToast({ message, severity });

    const load = React.useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const res = await campaignsDripApi.list();
            setRows(res?.data || []);
        } catch (e) {
            setError(e?.message || "Failed to load drip campaigns");
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        load();
    }, [load]);

    // Counselor filter options (created_by owners). Best-effort; hide filter if it fails.
    React.useEffect(() => {
        usersApi
            .list()
            .then((r) => setCounselors((r?.data || []).filter((u) => u?.is_active !== false)))
            .catch(() => setCounselors([]));
    }, []);

    const userNameById = React.useMemo(() => {
        const m = {};
        counselors.forEach((u) => {
            m[u.id] = u.name;
        });
        return m;
    }, [counselors]);

    const visibleRows = React.useMemo(() => {
        if (!appliedCounselor) return rows;
        return rows.filter((r) => r.created_by === appliedCounselor);
    }, [rows, appliedCounselor]);

    const handleMenuOpen = (event, index) => {
        setMenuAnchorEl(event.currentTarget);
        setActiveRowIndex(index);
    };

    const handleMenuClose = () => {
        setMenuAnchorEl(null);
    };

    const handleEdit = () => {
        setEditRowIndex(activeRowIndex);
        setOpenEditConfirmModal(true);
        setMenuAnchorEl(null);
    };

    const handleConfirmEdit = () => {
        setOpenEditConfirmModal(false);
        setOpenEditRuleModal(true);
    };

    const handleCancelEditConfirm = () => {
        setOpenEditConfirmModal(false);
        setEditRowIndex(null);
    };

    const handleCloseEditRule = () => {
        setOpenEditRuleModal(false);
        setEditRowIndex(null);
    };

    const handleManageRules = () => {
        setMenuAnchorEl(null);
        if (activeRowIndex !== null) setRulesDrawerDrip(visibleRows[activeRowIndex]);
    };

    const handleDeleteClick = () => {
        setOpenStopModal(true);
        setMenuAnchorEl(null);
    };

    const handleConfirmDelete = async () => {
        const target = activeRowIndex !== null ? visibleRows[activeRowIndex] : null;
        if (!target) {
            setOpenStopModal(false);
            return;
        }
        setBusy(true);
        try {
            await campaignsDripApi.delete(target.id);
            showToast("Drip campaign deleted");
            await load();
        } catch (e) {
            showToast(e?.message || "Failed to delete campaign", "error");
        } finally {
            setBusy(false);
            setOpenStopModal(false);
            setActiveRowIndex(null);
        }
    };

    const handleToggle = (index) => {
        setToggleRowIndex(index);
        setOpenToggleModal(true);
    };

    const handleConfirmToggle = async () => {
        const target = toggleRowIndex !== null ? visibleRows[toggleRowIndex] : null;
        if (!target) {
            setOpenToggleModal(false);
            return;
        }
        setBusy(true);
        try {
            await campaignsDripApi.toggle(target.id);
            showToast(target.active ? "Campaign deactivated" : "Campaign activated");
            await load();
        } catch (e) {
            showToast(e?.message || "Failed to update campaign", "error");
        } finally {
            setBusy(false);
            setOpenToggleModal(false);
            setToggleRowIndex(null);
        }
    };

    const handleCancelToggle = () => {
        setOpenToggleModal(false);
        setToggleRowIndex(null);
    };

    const handleFilterOpen = (event) => {
        setFilterAnchorEl(event.currentTarget);
    };

    const handleFilterClose = () => {
        setFilterAnchorEl(null);
    };

    const handleClearFilter = () => {
        setSelectedCounselor("");
        setAppliedCounselor("");
    };

    const handleApplyFilter = () => {
        setAppliedCounselor(selectedCounselor);
        handleFilterClose();
    };

    const isFilterOpen = Boolean(filterAnchorEl);
    const editRow = editRowIndex !== null ? visibleRows[editRowIndex] : null;

    return (
        <div className="drip-container">
            {/* Header */}
            <div className="drip-header">
                <div className="drip-tab-active">Drip Marketing Campaign Rules</div>
                <Button
                    variant="outlined"
                    startIcon={<FilterAltIcon />}
                    className="filter-btn"
                    onClick={handleFilterOpen}
                >
                    Filter
                </Button>

                <Popover
                    open={isFilterOpen}
                    anchorEl={filterAnchorEl}
                    onClose={handleFilterClose}
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    transformOrigin={{ vertical: "top", horizontal: "right" }}
                    slotProps={{ paper: { className: "counselor-filter-popover" } }}
                >
                    <div className="counselor-filter-header">
                        <Typography className="counselor-filter-title">Counselors</Typography>
                        <IconButton size="small" onClick={handleFilterClose}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </div>

                    <FormControl fullWidth size="small" className="counselor-filter-select">
                        <Select
                            displayEmpty
                            value={selectedCounselor}
                            onChange={(e) => setSelectedCounselor(e.target.value)}
                            renderValue={(selected) =>
                                selected ? (
                                    userNameById[selected] || "Selected"
                                ) : (
                                    <span className="counselor-placeholder">Select...</span>
                                )
                            }
                        >
                            {counselors.map((u) => (
                                <MenuItem key={u.id} value={u.id}>
                                    {u.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <div className="counselor-filter-actions">
                        <Button
                            variant="outlined"
                            className="clear-filter-btn"
                            onClick={handleClearFilter}
                        >
                            Clear Filter
                        </Button>
                        <Button
                            variant="contained"
                            className="apply-filter-btn"
                            onClick={handleApplyFilter}
                        >
                            Apply
                        </Button>
                    </div>
                </Popover>
            </div>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
                    {error}
                </Alert>
            )}

            {/* Table */}
            {loading ? (
                <div style={{ textAlign: "center", padding: "48px 0" }}>
                    <CircularProgress />
                </div>
            ) : visibleRows.length === 0 ? (
                <Paper
                    style={{
                        padding: "48px 24px",
                        textAlign: "center",
                        color: colors.textSecondary
                    }}
                >
                    <Typography style={{ fontSize: "16px", marginBottom: "6px" }}>
                        No drip campaigns yet
                    </Typography>
                    <Typography style={{ fontSize: "13px", color: colors.textMuted }}>
                        {appliedCounselor
                            ? "No campaigns match the selected counselor."
                            : canManage
                            ? "Create your first drip campaign using the + button."
                            : "Drip campaigns will appear here once created."}
                    </Typography>
                </Paper>
            ) : (
                <TableContainer component={Paper} className="table-container">
                    <Table>
                        <TableHead>
                            <TableRow className="table-head">
                                <TableCell>DESCRIPTION</TableCell>
                                <TableCell>CREATED BY</TableCell>
                                <TableCell>CREATED ON</TableCell>
                                <TableCell>START TIME</TableCell>
                                <TableCell>ACTIVE</TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visibleRows.map((row, index) => (
                                <TableRow key={row.id} className="table-row">
                                    <TableCell
                                        style={{ cursor: "pointer", color: colors.primary }}
                                        onClick={() => setRulesDrawerDrip(row)}
                                    >
                                        {row.name || row.description || "Untitled"}
                                    </TableCell>
                                    <TableCell>
                                        {userNameById[row.created_by] || "-"}
                                    </TableCell>
                                    <TableCell>{fmtDateTime(row.created_at)}</TableCell>
                                    <TableCell>{fmtDateTime(row.start_time)}</TableCell>
                                    <TableCell>
                                        <Switch
                                            checked={!!row.active}
                                            onChange={() => handleToggle(index)}
                                            size="small"
                                            disabled={!canManage || busy}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <IconButton
                                            size="small"
                                            onClick={(e) => handleMenuOpen(e, index)}
                                        >
                                            <MoreVertIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Floating Button — create a new drip campaign (role-gated) */}
            {canManage && (
                <Fab className="fab-btn" onClick={() => setOpenCreateDrip(true)}>
                    <AddIcon sx={{ color: colors.white }} />
                </Fab>
            )}

            <CreateDripModal
                open={openCreateDrip}
                onClose={() => setOpenCreateDrip(false)}
                onCreated={(created) => {
                    setOpenCreateDrip(false);
                    showToast("Drip campaign created");
                    load().then(() => {
                        if (created) setRulesDrawerDrip(created);
                    });
                }}
            />

            <DripRulesDrawer
                drip={rulesDrawerDrip}
                open={Boolean(rulesDrawerDrip)}
                canManage={canManage}
                onClose={() => setRulesDrawerDrip(null)}
                onChanged={load}
                onToast={showToast}
            />

            <Menu
                anchorEl={menuAnchorEl}
                open={Boolean(menuAnchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
                <MenuItem onClick={handleManageRules}>Manage Steps</MenuItem>
                <MenuItem onClick={handleEdit} disabled={!canManage}>
                    Edit
                </MenuItem>
                <MenuItem onClick={handleDeleteClick} disabled={!canManage}>
                    Delete
                </MenuItem>
            </Menu>

            <Dialog
                open={openStopModal}
                onClose={() => setOpenStopModal(false)}
                maxWidth="md"
                fullWidth
            >
                <div
                    style={{
                        background: colors.primary,
                        padding: "12px 16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        color: colors.white
                    }}
                >
                    <span style={{ fontWeight: 600 }}>Delete Campaign</span>
                    <IconButton size="small" onClick={() => setOpenStopModal(false)}>
                        <CloseIcon sx={{ color: colors.white }} />
                    </IconButton>
                </div>

                <DialogContent style={{ padding: "24px" }}>
                    <p style={{ fontSize: "25px", color: colors.textDark }}>
                        Do you want to delete the Campaign?
                    </p>
                </DialogContent>

                <DialogActions style={{ padding: "16px 24px" }}>
                    <Button
                        variant="outlined"
                        onClick={() => setOpenStopModal(false)}
                        sx={{ textTransform: "none" }}
                    >
                        No
                    </Button>

                    <Button
                        variant="contained"
                        onClick={handleConfirmDelete}
                        disabled={busy}
                        sx={{
                            textTransform: "none",
                            backgroundColor: colors.primary,
                            "&:hover": { backgroundColor: colors.primaryDark }
                        }}
                    >
                        {busy ? "Deleting…" : "Yes"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Confirmation Dialog */}
            <Dialog
                open={openEditConfirmModal}
                onClose={handleCancelEditConfirm}
                maxWidth="sm"
                fullWidth
            >
                <div
                    style={{
                        background: colors.primaryLight,
                        padding: "14px 18px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                    }}
                >
                    <span style={{ fontWeight: 600, color: colors.textDark }}>
                        Edit Drip Marketing Rule
                    </span>
                    <IconButton size="small" onClick={handleCancelEditConfirm}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </div>

                <DialogContent style={{ padding: "24px" }}>
                    <p style={{ fontSize: "18px", color: colors.textDark, margin: 0, fontWeight: 500 }}>
                        Do you want to update the campaign?
                    </p>
                    <p style={{ fontSize: "14px", color: colors.textSecondary, marginTop: "8px" }}>
                        After editing, active leads may not receive further communication until re-processed.
                    </p>
                </DialogContent>

                <DialogActions style={{ padding: "16px 24px" }}>
                    <Button
                        variant="outlined"
                        onClick={handleCancelEditConfirm}
                        sx={{ textTransform: "none" }}
                    >
                        No
                    </Button>

                    <Button
                        variant="contained"
                        onClick={handleConfirmEdit}
                        sx={{
                            textTransform: "none",
                            backgroundColor: colors.primary,
                            "&:hover": { backgroundColor: colors.primaryDark }
                        }}
                    >
                        Yes
                    </Button>
                </DialogActions>
            </Dialog>

            <EditRuleModal
                open={openEditRuleModal}
                onClose={handleCloseEditRule}
                drip={editRow}
                onSaved={() => {
                    handleCloseEditRule();
                    showToast("Campaign updated");
                    load();
                }}
                onToast={showToast}
            />

            <Dialog
                open={openToggleModal}
                onClose={handleCancelToggle}
                maxWidth="sm"
                fullWidth
            >
                <div
                    style={{
                        background: colors.primary,
                        padding: "12px 16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        color: colors.white
                    }}
                >
                    <span style={{ fontWeight: 600 }}>
                        {toggleRowIndex !== null && visibleRows[toggleRowIndex]?.active
                            ? "Deactivate Campaign"
                            : "Activate Campaign"}
                    </span>
                    <IconButton size="small" onClick={handleCancelToggle}>
                        <CloseIcon sx={{ color: colors.white }} />
                    </IconButton>
                </div>

                <DialogContent style={{ padding: "24px" }}>
                    <p style={{ fontSize: "20px", color: colors.textDark, margin: 0 }}>
                        {toggleRowIndex !== null && visibleRows[toggleRowIndex]?.active
                            ? "Do you want to deactivate the campaign?"
                            : "Do you want to activate the campaign?"}
                    </p>
                    <p style={{ fontSize: "14px", color: colors.textDark, marginTop: "8px" }}>
                        {toggleRowIndex !== null && visibleRows[toggleRowIndex]?.active
                            ? "Once inactive all communication will stop"
                            : "Once active all communication will start going again"}
                    </p>
                </DialogContent>

                <DialogActions style={{ padding: "16px 24px" }}>
                    <Button
                        variant="outlined"
                        onClick={handleCancelToggle}
                        sx={{ textTransform: "none" }}
                    >
                        No
                    </Button>

                    <Button
                        variant="contained"
                        onClick={handleConfirmToggle}
                        disabled={busy}
                        sx={{
                            textTransform: "none",
                            backgroundColor: colors.primary,
                            "&:hover": { backgroundColor: colors.primaryDark }
                        }}
                    >
                        {busy ? "Saving…" : "Yes"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={Boolean(toast)}
                autoHideDuration={4000}
                onClose={() => setToast(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                {toast ? (
                    <Alert
                        onClose={() => setToast(null)}
                        severity={toast.severity}
                        sx={{ width: "100%" }}
                    >
                        {toast.message}
                    </Alert>
                ) : undefined}
            </Snackbar>
        </div>
    );
};

export default DripCampaignRules;
