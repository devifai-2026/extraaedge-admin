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
// MUI v9 ships the outline-style icon as `DeleteOutlineOutlined`. The
// older short name `DeleteOutline` isn't in this package's exports map,
// so importing it explodes at Vite resolve time.
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import FileDownloadIcon from "@mui/icons-material/FileDownloadOutlined";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import HistoryToggleOffIcon from "@mui/icons-material/HistoryToggleOff";
import { Tooltip, CircularProgress, InputBase, TextField, MenuItem as MuiMenuItem } from "@mui/material";
import { isRole, ROLES, LEAD_OWNER_ROLES_PARAM, isLeadOwnerRole, LEAD_OWNER_ROLES } from '../../lib/rbac';
import { leadsApi, usersApi } from "../../lib/endpoints";
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import FacebookIcon from '@mui/icons-material/Facebook';
import StorefrontIcon from '@mui/icons-material/Storefront';
import LanguageIcon from '@mui/icons-material/Language';
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

// One shared shape for every quick origin-filter pill (WhatsApp / Facebook /
// JustDial / Website / Not-updated) so they read as a single cohesive
// segmented group instead of five buttons each styled slightly differently.
// Pill radius + fixed height + the same hover/active treatment everywhere;
// only the brand color changes per-button.
const pillFilterSx = (active, brand) => ({
    textTransform: 'none',
    fontSize: 12.5,
    fontWeight: 600,
    height: 32,
    borderRadius: '999px',
    px: 1.5,
    boxShadow: active ? `0 1px 4px ${brand}55` : 'none',
    transition: 'background-color .15s, border-color .15s, box-shadow .15s',
    ...(active
        ? { background: brand, color: '#fff', border: `1px solid ${brand}`, '&:hover': { background: brand, filter: 'brightness(0.94)' } }
        : { color: brand, border: `1px solid ${brand}40`, background: `${brand}0d`, '&:hover': { border: `1px solid ${brand}`, background: `${brand}1a` } }),
});

// Same treatment for the round icon-only actions in the second cluster —
// a soft tinted circle on hover instead of the bare, ungrouped icons.
const iconBtnSx = {
    width: 34, height: 34, borderRadius: '10px',
    transition: 'background-color .15s',
    '&:hover': { background: 'rgba(0,0,0,0.045)' },
};

const FiltersOptions = ({ onRefresh, selectedCount = 0, totalInFilter = 0, onReassignSelected, onReassignAll, onBulkDelete, sort, onSortChange, advancedFilter, onApplyFilter, onResetFilter, viewMode = 'card', onViewModeChange, unassignedCount = 0, searchQuery = '', onSearchQueryChange, exportFilter }) => {
    // Auto-assign button is for super-admin and sales-manager only —
    // counsellors don't manage assignments themselves.
    const canAutoAssign = isRole(ROLES.SUPER_ADMIN, ROLES.SALES_MANAGER);
    // Bulk delete is super-admin ONLY. The button doesn't render for other
    // roles, and the BE refuses non-super-admin callers anyway (defence in
    // depth — the FE check is just to hide the affordance).
    const canBulkDelete = isRole(ROLES.SUPER_ADMIN);
    // Download-all-as-CSV is super-admin ONLY (same gate as the BE route).
    const canExport = isRole(ROLES.SUPER_ADMIN);
    const [exporting, setExporting] = useState(false);
    const handleExport = async () => {
        if (exporting) return;
        setExporting(true);
        try {
            // Pass the current filter view so the CSV matches what's on screen.
            // The endpoint strips page/limit and returns every matching row.
            await leadsApi.exportCsv(exportFilter || {});
        } catch (e) {
            alert(e?.message || 'CSV export failed');
        } finally {
            setExporting(false);
        }
    };
    const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const handleConfirmBulkDelete = async () => {
        if (deleting) return;
        setDeleting(true);
        try {
            await onBulkDelete?.();
            setOpenDeleteConfirm(false);
        } finally {
            setDeleting(false);
        }
    };
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

    // "Not updated" (stale) report dialog — super_admin / managers only.
    // Stale/"Not updated" report is available to every lead-working role. The
    // backend already scopes results by role (a counsellor only sees their own
    // leads), so counsellors get a personal stale list; managers/admins can also
    // scope by a specific counsellor via the picker below.
    const canStaleReport = isRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.SALES_MANAGER, ROLES.TELECALLER_LEAD, ...LEAD_OWNER_ROLES);
    // Only managers/admins can scope the stale report to a specific counsellor.
    const canPickCounsellor = !isLeadOwnerRole();
    const [openStale, setOpenStale] = useState(false);
    // "Not touched since" cutoff — leads whose last activity/update is OLDER than
    // this date (gone quiet). Sent to the backend as no_activity_from.
    const [staleSince, setStaleSince] = useState('');
    const [staleCounsellor, setStaleCounsellor] = useState(''); // '' = all (global)
    const [counsellors, setCounsellors] = useState([]);
    React.useEffect(() => {
        if (!openStale || counsellors.length || !canPickCounsellor) return;
        usersApi.list({ role: LEAD_OWNER_ROLES_PARAM, limit: 200 })
            .then((r) => setCounsellors((r?.data || []).filter((u) => u.is_active !== false)))
            .catch(() => setCounsellors([]));
    }, [openStale, counsellors.length, canPickCounsellor]);
    const applyStale = () => {
        // Stale = last touch before the cutoff date + optional counsellor scope.
        // Layers onto the current advanced filter.
        const next = { ...(advancedFilter || {}) };
        if (staleSince) next.no_activity_from = `${staleSince}T00:00:00`; else delete next.no_activity_from;
        delete next.no_activity_to; // single-cutoff semantics
        if (staleCounsellor) next.assigned_to = staleCounsellor; else delete next.assigned_to;
        onApplyFilter?.(next);
        setOpenStale(false);
    };

    const activeSort = SORT_OPTIONS.find((s) => s.key === sort) || SORT_OPTIONS[0];

    const handleRefresh = () => {
        if (onRefresh) onRefresh();
        else window.location.reload();
    };

    const handlePickSort = (key) => {
        setOpenSort(false);
        onSortChange?.(key);
    };

    // Origin pills share one config-driven list so adding a future channel
    // (or reordering these) is a one-line change instead of copy-pasting a
    // whole Tooltip+Button block again.
    const originFilters = [
        { key: 'whatsapp', label: 'WhatsApp', icon: <WhatsAppIcon fontSize="small" />, brand: '#25D366' },
        { key: 'facebook', label: 'Facebook', icon: <FacebookIcon fontSize="small" />, brand: '#1877F2' },
        { key: 'justdial', label: 'JustDial', icon: <StorefrontIcon fontSize="small" />, brand: '#F26722' },
        { key: 'website',  label: 'Website',  icon: <LanguageIcon fontSize="small" />,  brand: '#5C6BC0' },
    ];

    return (
        <>
            <div className="raw-data-manager-bottomcontainer filters-toolbar">
                <div className="raw-data-manager-bottomcontainer-content">

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', flex: 1 }}>
                        <IconButton
                            size="small"
                            sx={iconBtnSx}
                            onClick={(e) => {
                                setAnchorEl(e.currentTarget);
                                setOpenSort(true);
                            }}
                        >
                            <SwapVertIcon sx={{ color: colors.primary, cursor: "pointer" }} fontSize="small" />
                        </IconButton>

                        {/* In-table search bar — narrows the current stage
                            tab + advanced filter by name / email / phone /
                            WhatsApp. Wires up via onSearchQueryChange so the
                            parent owns the debouncing + API call. Only shows
                            when the parent passes a handler so other
                            consumers of FiltersOptions (RawData, FailedLeads)
                            keep their current shape. */}
                        {typeof onSearchQueryChange === 'function' && (
                            <Box
                                sx={{
                                    display: 'flex', alignItems: 'center', gap: 0.5,
                                    border: `1px solid ${colors.borderGrey}`,
                                    borderRadius: '10px',
                                    px: 1.25, height: 34,
                                    background: '#fff',
                                    minWidth: 220,
                                    transition: 'border-color .15s, box-shadow .15s',
                                    '&:focus-within': { borderColor: colors.primary, boxShadow: `0 0 0 3px ${colors.primary}1a` },
                                }}
                            >
                                <SearchIcon sx={{ fontSize: 18, color: colors.midGrey }} />
                                <InputBase
                                    value={searchQuery}
                                    onChange={(e) => onSearchQueryChange(e.target.value)}
                                    placeholder="Search by name, email, phone…"
                                    sx={{ fontSize: 13, flex: 1, ml: 0.5 }}
                                    inputProps={{ 'aria-label': 'Search leads in current view' }}
                                />
                                {searchQuery && (
                                    <IconButton
                                        size="small"
                                        onClick={() => onSearchQueryChange('')}
                                        aria-label="Clear search"
                                        sx={{ p: 0.25 }}
                                    >
                                        <CloseIcon sx={{ fontSize: 16, color: colors.midGrey }} />
                                    </IconButton>
                                )}
                            </Box>
                        )}

                        {/* Quick origin filters — one-click toggles that write
                            lead_origin into the advanced filter so they layer
                            with the stage tab + search. Only shown when the
                            parent wires onApplyFilter (LeadList does). Styled
                            as one segmented pill-group (pillFilterSx) instead
                            of four independently-styled buttons. */}
                        {typeof onApplyFilter === 'function' && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                                {originFilters.map(({ key, label, icon, brand }) => {
                                    const active = advancedFilter?.lead_origin === key;
                                    return (
                                        <Tooltip
                                            key={key}
                                            title={active ? `Showing only ${label} leads — click to clear` : `Show only leads that came in via ${label}`}
                                        >
                                            <Button
                                                size="small"
                                                startIcon={icon}
                                                onClick={() => {
                                                    const next = { ...(advancedFilter || {}) };
                                                    if (next.lead_origin === key) delete next.lead_origin;
                                                    else next.lead_origin = key;
                                                    onApplyFilter(next);
                                                }}
                                                sx={pillFilterSx(active, brand)}
                                            >
                                                {label}
                                            </Button>
                                        </Tooltip>
                                    );
                                })}
                            </Box>
                        )}

                        {/* "Not updated" (stale) report — super_admin/managers.
                            Opens a dialog for a date window + counsellor scope and
                            filters to leads with no activity/follow-up in it. */}
                        {canStaleReport && typeof onApplyFilter === 'function' && (
                            <Tooltip title="Find stale leads — not touched (no activity/update) since a chosen date">
                                <Button
                                    size="small"
                                    startIcon={<HistoryToggleOffIcon fontSize="small" />}
                                    onClick={() => {
                                        // Seed dialog from any active stale filter.
                                        setStaleSince((advancedFilter?.no_activity_from || '').slice(0, 10));
                                        setStaleCounsellor(advancedFilter?.assigned_to || '');
                                        setOpenStale(true);
                                    }}
                                    sx={pillFilterSx(Boolean(advancedFilter?.no_activity_from), colors.primary)}
                                >
                                    Not updated
                                </Button>
                            </Tooltip>
                        )}
                    </Box>

                    <Box sx={{ display: "flex", alignItems: 'center', gap: 0.5 }}>

                        {/* GROUP / bulk-reassign opener — hidden for counsellors
                            who cannot reassign leads. Server enforces the same
                            scope on POST /lead-assignments. */}
                        {!isLeadOwnerRole() && (
                            <Tooltip title="Reassign leads">
                                <IconButton size="small" sx={iconBtnSx} onClick={() => setOpenAssign(true)}>
                                    <GroupIcon fontSize="small" sx={{ color: colors.primary }} />
                                </IconButton>
                            </Tooltip>
                        )}

                        {/* WHATSAPP MODAL */}
                        <Tooltip title="Send a WhatsApp message">
                            <IconButton size="small" sx={iconBtnSx} onClick={() => setOpenWhatsapp(true)}>
                                <WhatsAppIcon fontSize="small" sx={{ color: colors.primary }} />
                            </IconButton>
                        </Tooltip>

                        <Tooltip title="Refresh">
                            <IconButton size="small" sx={iconBtnSx} onClick={handleRefresh}>
                                <RefreshIcon fontSize="small" sx={{ color: colors.primary }} />
                            </IconButton>
                        </Tooltip>

                        {(canAutoAssign || canBulkDelete || canExport) && (
                            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.75, borderColor: colors.borderGrey }} />
                        )}

                        {canAutoAssign && (
                            <Tooltip title={
                                unassignedCount > 0
                                    ? `Run round-robin on ${unassignedCount} unassigned lead${unassignedCount === 1 ? '' : 's'}`
                                    : 'No unassigned leads to process'
                            }>
                                <span>
                                    <Button
                                        size="small"
                                        startIcon={autoAssigning
                                            ? <CircularProgress size={14} sx={{ color: colors.primary }} />
                                            : <AutoFixHighIcon fontSize="small" />}
                                        onClick={handleAutoAssign}
                                        disabled={autoAssigning || unassignedCount === 0}
                                        sx={pillFilterSx(false, colors.primary)}
                                    >
                                        {autoAssigning ? 'Assigning…' : 'Auto-assign'}
                                        {unassignedCount > 0 && !autoAssigning ? ` (${unassignedCount})` : ''}
                                    </Button>
                                </span>
                            </Tooltip>
                        )}

                        {canBulkDelete && (
                            <Tooltip title={
                                selectedCount > 0
                                    ? `Permanently delete ${selectedCount} selected lead${selectedCount === 1 ? '' : 's'} (cannot be undone)`
                                    : 'Select one or more leads to enable delete'
                            }>
                                <span>
                                    <Button
                                        size="small"
                                        startIcon={<DeleteOutlineIcon fontSize="small" />}
                                        onClick={() => setOpenDeleteConfirm(true)}
                                        disabled={selectedCount === 0 || deleting}
                                        sx={pillFilterSx(false, '#d32f2f')}
                                    >
                                        Delete{selectedCount > 0 ? ` (${selectedCount})` : ''}
                                    </Button>
                                </span>
                            </Tooltip>
                        )}

                        {canExport && (
                            <Tooltip title="Download the entire filtered lead list as a CSV (all rows, no pagination)">
                                <span>
                                    <Button
                                        size="small"
                                        startIcon={exporting
                                            ? <CircularProgress size={14} sx={{ color: colors.primary }} />
                                            : <FileDownloadIcon fontSize="small" />}
                                        onClick={handleExport}
                                        disabled={exporting}
                                        sx={pillFilterSx(false, colors.primary)}
                                    >
                                        {exporting ? 'Exporting…' : 'Download CSV'}
                                    </Button>
                                </span>
                            </Tooltip>
                        )}

                        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.75, borderColor: colors.borderGrey }} />

                        <Tooltip title={viewMode === 'table' ? 'Switch to card view' : 'Switch to table view'}>
                            <IconButton
                                size="small"
                                onClick={() => onViewModeChange?.(viewMode === 'table' ? 'card' : 'table')}
                                sx={{ ...iconBtnSx, background: viewMode === 'table' ? `${colors.primary}14` : 'transparent' }}
                            >
                                {viewMode === 'table'
                                    ? <ViewModuleIcon fontSize="small" sx={{ color: colors.primary }} />
                                    : <ViewListIcon fontSize="small" sx={{ color: colors.primary }} />
                                }
                            </IconButton>
                        </Tooltip>

                        <Tooltip title="More filters">
                            <IconButton size="small" sx={iconBtnSx} onClick={() => setOpenFilter(true)}>
                                <FilterAltIcon fontSize="small" sx={{ color: colors.primary }} />
                            </IconButton>
                        </Tooltip>
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

            {/* ================= BULK DELETE CONFIRMATION ================= */}
            {/* Destructive op — explicit double-confirmation so a misclick can't
                wipe leads. The body spells out exactly what gets removed because
                FK CASCADEs make this irreversible across many related tables. */}
            <Dialog open={openDeleteConfirm} onClose={() => !deleting && setOpenDeleteConfirm(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ color: '#d32f2f', fontWeight: 700 }}>
                    Delete {selectedCount} lead{selectedCount === 1 ? '' : 's'}?
                </DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: 1.5 }}>
                        This will permanently delete <b>{selectedCount}</b> lead{selectedCount === 1 ? '' : 's'} and every related record.
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        For each lead, the following will also be removed from the database:
                    </Typography>
                    <Typography component="ul" variant="body2" color="text.secondary" sx={{ pl: 2.5, mb: 1.5, '& li': { mb: 0.25 } }}>
                        <li>All follow-ups (upcoming and past)</li>
                        <li>All notes and activities (timeline history)</li>
                        <li>Ownership history (assignments and reassignments)</li>
                        <li>Parent / family details</li>
                        <li>Source attribution (channel / source / campaign / medium)</li>
                        <li>Custom-field values and tags</li>
                        <li>Call logs, recordings, and message log entries</li>
                        <li>Payments, payment links, and referral edges</li>
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#d32f2f', fontWeight: 600 }}>
                        This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDeleteConfirm(false)} disabled={deleting}>Cancel</Button>
                    <Button
                        onClick={handleConfirmBulkDelete}
                        variant="contained"
                        color="error"
                        disabled={deleting || selectedCount === 0}
                        startIcon={deleting ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <DeleteOutlineIcon fontSize="small" />}
                    >
                        {deleting ? 'Deleting…' : `Yes, delete ${selectedCount} lead${selectedCount === 1 ? '' : 's'}`}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ================= NOT-UPDATED (STALE) REPORT ================= */}
            <Dialog open={openStale} onClose={() => setOpenStale(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>Leads not updated (stale)</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Shows <b>stale leads</b> — no activity or update since the date below
                        (their “Last Updated” is older than this). A lead touched more recently
                        is excluded.{canPickCounsellor
                            ? ' Pick a counsellor to scope it, or leave as “All counsellors”.'
                            : ' Shows your own leads.'}
                    </Typography>
                    <TextField
                        label="Not touched since" type="date" size="small" fullWidth sx={{ mb: 2 }}
                        InputLabelProps={{ shrink: true }}
                        value={staleSince} onChange={(e) => setStaleSince(e.target.value)}
                    />
                    {canPickCounsellor && (
                        <TextField
                            label="Counsellor" select size="small" fullWidth
                            value={staleCounsellor} onChange={(e) => setStaleCounsellor(e.target.value)}
                        >
                            <MuiMenuItem value=""><em>All counsellors (global)</em></MuiMenuItem>
                            {counsellors.map((u) => (
                                <MuiMenuItem key={u.id} value={u.id}>{u.name || u.email}</MuiMenuItem>
                            ))}
                        </TextField>
                    )}
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                        e.g. pick <b>1 Jul</b> to see every lead not worked on since 1 Jul.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        // Clear the stale filter entirely.
                        const next = { ...(advancedFilter || {}) };
                        delete next.no_activity_from; delete next.no_activity_to;
                        setStaleSince(''); setStaleCounsellor('');
                        onApplyFilter?.(next); setOpenStale(false);
                    }}>Clear</Button>
                    <Button onClick={() => setOpenStale(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={applyStale}
                        disabled={!staleSince}
                        className="assign-btn-filter"
                    >
                        Show leads
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