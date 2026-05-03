import React, { useState } from 'react';
import { colors } from '../../theme/colors';
import './FiltersOptions.css';
import SwapVertIcon from "@mui/icons-material/SwapVert";
import GroupIcon from "@mui/icons-material/Group";
import RefreshIcon from "@mui/icons-material/Refresh";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import { Tooltip, CircularProgress } from "@mui/material";
import { isRole, ROLES } from "../../lib/rbac";
import { leadsApi } from "../../lib/endpoints";
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import WhatsappModal from "../WhatsApp/WhatsApp"
import SavedList from "../SavedList/SavedList";

import {
    Box,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Divider,
    Checkbox,
    FormControlLabel,
    Radio,
} from "@mui/material";
import { Popover, MenuItem, ListItemIcon, ListItemText, } from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import { Menu } from "@mui/material";
import FilterLeadsModal from "../Filter/Filter";

const SORT_OPTIONS = [
    { key: 'created_desc',       label: 'Added On (newest first)' },
    { key: 'created_asc',        label: 'Added On (oldest first)' },
    { key: 'updated_desc',       label: 'Last Updated On' },
    { key: 'last_activity_desc', label: 'Last Activity' },
    { key: 'score_desc',         label: 'Lead Score' },
];

const FiltersOptions = ({ onRefresh, selectedCount = 0, totalInFilter = 0, onReassignSelected, onReassignAll, sort, onSortChange, advancedFilter, onApplyFilter, onResetFilter, viewMode = 'card', onViewModeChange, unassignedCount = 0 }) => {
    // Auto-assign button is for super-admin and sales-manager only —
    // counsellors don't manage assignments themselves.
    const canAutoAssign = isRole(ROLES.SUPER_ADMIN, ROLES.SALES_MANAGER);
    const [autoAssigning, setAutoAssigning] = useState(false);
    const handleAutoAssign = async () => {
        if (autoAssigning) return;
        if (unassignedCount > 0) {
            const ok = window.confirm(
                `Run round-robin auto-assignment on ${unassignedCount} unassigned lead${unassignedCount === 1 ? '' : 's'}?`,
            );
            if (!ok) return;
        }
        setAutoAssigning(true);
        try {
            const r = await leadsApi.autoAssignUnassigned();
            const d = r?.data || {};
            const msg = d.assigned > 0
                ? `Auto-assigned ${d.assigned} lead${d.assigned === 1 ? '' : 's'}` +
                  (d.skipped > 0 ? ` · ${d.skipped} skipped (no rule matched)` : '')
                : d.found === 0
                    ? 'No unassigned leads to process.'
                    : `Found ${d.found} but assigned 0 — check that an active assignment rule exists.`;
            alert(msg);
            onRefresh?.();
        } catch (e) {
            alert(e?.message || 'Auto-assign failed');
        } finally {
            setAutoAssigning(false);
        }
    };
    const [openAssign, setOpenAssign] = useState(false);
    const [openWhatsapp, setOpenWhatsapp] = useState(false);
    const [openSort, setOpenSort] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [openListDrawer, setOpenListDrawer] = useState(false);
    const [openFilter, setOpenFilter] = useState(false);

    const activeSort = SORT_OPTIONS.find((s) => s.key === sort) || SORT_OPTIONS[0];

    const handleRefresh = () => {
        if (onRefresh) onRefresh();
        else window.location.reload();
    };

    const handlePickSort = (key) => {
        setOpenSort(false);
        onSortChange?.(key);
    };

    return (
        <>
            <div className="raw-data-manager-bottomcontainer">
                <div className="raw-data-manager-bottomcontainer-content">

                    <IconButton
                        size="small"
                        onClick={(e) => {
                            setAnchorEl(e.currentTarget);
                            setOpenSort(true);
                        }}
                    >
                        <SwapVertIcon sx={{ color: colors.primary, cursor: "pointer" }} />
                    </IconButton>

                    <Box sx={{ display: "flex", gap: 1 }}>

                        {/* GROUP MODAL */}
                        <IconButton size="small" onClick={() => setOpenAssign(true)}>
                            <GroupIcon sx={{ color: colors.primary }} />
                        </IconButton>

                        {/* WHATSAPP MODAL */}
                        <IconButton size="small" onClick={() => setOpenWhatsapp(true)}>
                            <WhatsAppIcon sx={{ color: colors.primary }} />
                        </IconButton>

                        <IconButton size="small" onClick={handleRefresh}>
                            <RefreshIcon sx={{ color: colors.primary }} />
                        </IconButton>

                        {canAutoAssign && (
                            <Tooltip title={
                                unassignedCount > 0
                                    ? `Run round-robin on ${unassignedCount} unassigned lead${unassignedCount === 1 ? '' : 's'}`
                                    : 'No unassigned leads to process'
                            }>
                                <span>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={autoAssigning
                                            ? <CircularProgress size={14} sx={{ color: colors.primary }} />
                                            : <AutoFixHighIcon fontSize="small" />}
                                        onClick={handleAutoAssign}
                                        disabled={autoAssigning || unassignedCount === 0}
                                        sx={{
                                            textTransform: 'none', fontSize: 12,
                                            color: colors.primary, borderColor: colors.primary,
                                            ml: 0.5,
                                            '&:hover': { borderColor: colors.primary, background: '#fff7f7' },
                                        }}
                                    >
                                        {autoAssigning ? 'Assigning…' : 'Auto-assign'}
                                        {unassignedCount > 0 && !autoAssigning ? ` (${unassignedCount})` : ''}
                                    </Button>
                                </span>
                            </Tooltip>
                        )}

                        <Tooltip title={viewMode === 'table' ? 'Switch to card view' : 'Switch to table view'}>
                            <IconButton
                                size="small"
                                onClick={() => onViewModeChange?.(viewMode === 'table' ? 'card' : 'table')}
                                sx={{ background: viewMode === 'table' ? '#fdecea' : 'transparent' }}
                            >
                                {viewMode === 'table'
                                    ? <ViewModuleIcon sx={{ color: colors.primary }} />
                                    : <ViewListIcon sx={{ color: colors.primary }} />
                                }
                            </IconButton>
                        </Tooltip>

                        <IconButton size="small" onClick={() => setOpenFilter(true)}>
                            <FilterAltIcon sx={{ color: colors.primary }} />
                        </IconButton>
                    </Box>
                </div>
            </div>

            {/* ================= ASSIGN MODAL ================= */}
            <Dialog open={openAssign} onClose={() => setOpenAssign(false)} maxWidth="xs" fullWidth>
                <DialogTitle className='assignmodel-filter' >
                    Refer Leads/Applications
                </DialogTitle>

                <DialogContent>
                    <Typography fontWeight={600}>
                        Choose what to reassign:
                    </Typography>
                    <Typography color="gray" fontSize={14} sx={{ mt: 1 }}>
                        {selectedCount > 0
                            ? `${selectedCount} selected lead${selectedCount === 1 ? '' : 's'} on this page`
                            : 'No leads selected — pick "All in current view" instead.'}
                    </Typography>
                </DialogContent>

                <DialogActions>
                    <Button onClick={() => setOpenAssign(false)}>Cancel</Button>
                    <Button
                        onClick={() => { setOpenAssign(false); onReassignSelected?.(); }}
                        variant="outlined"
                        disabled={selectedCount === 0}
                    >
                        Assign {selectedCount} selected
                    </Button>
                    <Button
                        onClick={() => { setOpenAssign(false); onReassignAll?.(); }}
                        variant="contained"
                        className='assign-btn-filter'
                    >
                        Assign all {totalInFilter} in view
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ================= WHATSAPP MODAL ================= */}
            <WhatsappModal
                open={openWhatsapp}
                onClose={() => setOpenWhatsapp(false)}
            />


            {/* ================= SORT POPOVER ================= */}

            <Menu
                open={openSort}
                anchorEl={anchorEl}
                onClose={() => setOpenSort(false)}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            >
                <div className="sort-modal">
                    <p className="sort-title">Sorted by: {activeSort.label}</p>
                    <div className="sort-header">Select a field to sort by</div>
                    <div className="sort-list">
                        {SORT_OPTIONS.map((opt) => (
                            <MenuItem
                                key={opt.key}
                                className="sort-item"
                                selected={opt.key === activeSort.key}
                                onClick={() => handlePickSort(opt.key)}
                            >
                                <ListItemIcon>
                                    <CalendarTodayIcon fontSize="small" />
                                </ListItemIcon>
                                <ListItemText primary={opt.label} />
                            </MenuItem>
                        ))}
                    </div>
                </div>
            </Menu>

            {/* ================= SAVED LIST DRAWER ================= */}
            <SavedList
                open={openListDrawer}
                onClose={() => setOpenListDrawer(false)}
            />
            <FilterLeadsModal
                open={openFilter}
                onClose={() => setOpenFilter(false)}
                value={advancedFilter}
                onApply={(f) => { onApplyFilter?.(f); setOpenFilter(false); }}
                onReset={() => { onResetFilter?.(); }}
            />
        </>
    );
};

export default FiltersOptions;