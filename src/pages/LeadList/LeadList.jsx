import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Fab, Pagination, CircularProgress, Snackbar, Alert, Checkbox, Button } from "@mui/material";
import './LeadList.css';
import AddIcon from '@mui/icons-material/Add';
import FileUploadIcon from '@mui/icons-material/FileUpload';

import LeadCard from "../../components/LeadCard/LeadCard";
import LeadsTable from "../../components/LeadsTable/LeadsTable";
import AddNewLead from "../../components/AddNewLead/AddNewLead";
import UploadLeads from "../../components/UploadLeads/UploadLeads";
import { colors } from "../../theme/colors";
import TabsSection from "../../components/TabsSection/TabsSection";
import FiltersOptions from "../../components/FiltersOptions/FiltersOptions";
import ReferLeadsDrawer from "../../components/ReferLeadsDrawer/ReferLeadsDrawer";
import { leadsApi } from "../../lib/endpoints";
import { onNotification } from "../../lib/socket";
import { useCopyGuard } from "../../components/DataProtection/useCopyGuard";

const PAGE_SIZE = 20;

const LeadList = () => {
    const copyGuard = useCopyGuard();
    const [addLeadOpen, setAddLeadOpen] = useState(false);
    const [uploadLeadOpen, setUploadLeadOpen] = useState(false);

    // ?focus=<lead_id> deep-link from notifications. We pop the AddNewLead
    // dialog in edit mode for that lead. Falls back silently if the id is
    // gone (deleted or out of scope). Depends on the focus value, not just
    // mount, so a second notification while already on /leadlist still
    // re-opens the dialog with the new lead.
    const [searchParams, setSearchParams] = useSearchParams();
    const [focusedLead, setFocusedLead] = useState(null);
    const focusId = searchParams.get('focus');
    useEffect(() => {
        if (!focusId) return;
        let alive = true;
        leadsApi.get(focusId)
            .then((r) => { if (alive && r?.data) setFocusedLead(r.data); })
            .catch(() => { /* ignore — id may be stale */ })
            .finally(() => {
                // Clear the param so a refresh doesn't re-pop the dialog.
                if (alive) {
                    setSearchParams((prev) => {
                        const next = new URLSearchParams(prev);
                        next.delete('focus');
                        return next;
                    }, { replace: true });
                }
            });
        return () => { alive = false; };
    }, [focusId, setSearchParams]);

    // Filtering state
    const [activeStageId, setActiveStageId] = useState(null); // null = All, 'fresh', 'untouched', or stage UUID
    const [page, setPage] = useState(1);
    const [sort, setSort] = useState('created_desc');
    const [advancedFilter, setAdvancedFilter] = useState({}); // from FilterLeadsModal
    // In-table search bar, layered ON TOP of the stage tab + advanced
    // filter so users can narrow within whatever they're currently
    // viewing (e.g. "Qualified" tab + search "tony"). `q` is the live
    // input value, `debouncedQ` is what actually hits the API after a
    // short delay — keeps the request rate sane while typing.
    const [tableSearchQ, setTableSearchQ] = useState('');
    const [debouncedTableSearchQ, setDebouncedTableSearchQ] = useState('');
    useEffect(() => {
        const t = setTimeout(() => setDebouncedTableSearchQ(tableSearchQ.trim()), 300);
        return () => clearTimeout(t);
    }, [tableSearchQ]);
    // Reset to page 1 whenever the search query changes so the user
    // doesn't end up on an empty page 4 of a now-shorter result set.
    useEffect(() => { setPage(1); }, [debouncedTableSearchQ]);
    // Per-column search boxes in the table header. These hit the server (whole
    // tenant DB), debounced so we don't fire a query on every keystroke. Keys
    // are server param names (stage_name, program_name, owner_name, city,
    // created_from/created_to, updated_from/updated_to, …).
    const [columnFilters, setColumnFilters] = useState({});
    const [debouncedColumnFilters, setDebouncedColumnFilters] = useState({});
    const columnFiltersKey = JSON.stringify(columnFilters);
    useEffect(() => {
        const t = setTimeout(() => setDebouncedColumnFilters(columnFilters), 300);
        return () => clearTimeout(t);
    }, [columnFiltersKey, columnFilters]);
    const debouncedColumnFiltersKey = JSON.stringify(debouncedColumnFilters);
    useEffect(() => { setPage(1); }, [debouncedColumnFiltersKey]);
    const [viewMode, setViewMode] = useState(() => {
        try { return localStorage.getItem('ee_lead_view_mode') || 'card'; } catch { return 'card'; }
    });
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        try { localStorage.setItem('ee_lead_view_mode', viewMode); } catch { /* ignore */ }
    }, [viewMode]);

    // Data
    const [leads, setLeads] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // Unassigned count (used to badge the Auto-assign button + show context).
    // Honors the active advanced filter so the badge reflects what the user
    // is actually looking at.
    const [unassignedCount, setUnassignedCount] = useState(0);
    useEffect(() => {
        leadsApi.stageCounts(advancedFilter)
            .then((r) => setUnassignedCount(r?.data?.unassigned ?? 0))
            .catch(() => setUnassignedCount(0));
    }, [reloadKey, advancedFilter]);

    // Selection (for bulk reassign)
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [referOpen, setReferOpen] = useState(false);
    const [referMode, setReferMode] = useState('selected'); // 'selected' | 'filter' | 'single'
    const [referLead, setReferLead] = useState(null);

    const [toast, setToast] = useState(null);

    const filterParams = useMemo(() => {
        // Start with whatever the advanced filter modal applied,
        // then layer the tab-driven filter on top so the tab choice wins.
        // Important: only override `flag` when the tab actually selects one,
        // otherwise the advanced filter's flag (e.g. set via the Filter modal's
        // "Assignment: Unassigned" option) would be silently dropped.
        const params = { ...advancedFilter, page, limit: PAGE_SIZE, sort };
        if (activeStageId === 'fresh' || activeStageId === 'untouched' || activeStageId === 'unassigned') {
            params.flag = activeStageId;
            delete params.stage_id;
        } else if (activeStageId) {
            params.stage_id = activeStageId;
            // Stage tab also clears any advanced-filter flag — they'd conflict.
            delete params.flag;
        }
        // else (All tab): keep params.flag from advancedFilter as-is
        // Layer the in-table search query on top — narrows the current
        // stage tab + advanced-filter view by name / email / phone.
        if (debouncedTableSearchQ) params.q = debouncedTableSearchQ;
        // Layer the per-column header searches on top (server-side, whole-DB).
        for (const [k, v] of Object.entries(debouncedColumnFilters)) {
            const val = typeof v === 'string' ? v.trim() : v;
            if (val) params[k] = val;
        }
        return params;
    }, [activeStageId, page, sort, advancedFilter, debouncedTableSearchQ, debouncedColumnFilters]);

    // Filter set the STAGE TABS use for their counts. It mirrors filterParams
    // (advanced filter + search box + per-column header filters incl. date
    // ranges) but deliberately DROPS the tab-selection bits — flag, stage_id,
    // page, limit, sort — because each tab counts its own bucket against the
    // *same* applied filters, independent of which tab is currently active.
    // Result: applying any filter (column search, date range, advanced) updates
    // every tab count, and clicking a tab then shows exactly that filtered set.
    const countsFilter = useMemo(() => {
        const f = { ...advancedFilter };
        if (debouncedTableSearchQ) f.q = debouncedTableSearchQ;
        for (const [k, v] of Object.entries(debouncedColumnFilters)) {
            const val = typeof v === 'string' ? v.trim() : v;
            if (val) f[k] = val;
        }
        // Tab-selection params must not constrain the per-bucket counts.
        delete f.flag; delete f.stage_id; delete f.page; delete f.limit; delete f.sort;
        return f;
    }, [advancedFilter, debouncedTableSearchQ, debouncedColumnFilters]);

    const reload = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await leadsApi.list(filterParams);
            const rows = res?.data || [];
            setLeads(rows);
            setTotal(res?.meta?.total ?? rows.length);
        } catch (e) {
            setError(e.message || 'Failed to load leads');
        } finally {
            setLoading(false);
        }
    }, [filterParams]);

    useEffect(() => { reload(); }, [reload, reloadKey]);

    useEffect(() => { setPage(1); setSelectedIds(new Set()); }, [activeStageId]);

    // Auto-refresh on bulk-import lifecycle events. Two signals matter:
    //   • bulk_import.progress with phase='completed' — worker finished the
    //     import pass; new leads are now in the DB.
    //   • bulk_import.completed — fanned out to super_admins when someone
    //     else's upload finishes (so admins watching the list see new leads
    //     appear in real time).
    // Both lead to the same action: bump reloadKey so the list refetches.
    // The 200ms debounce avoids stampeding the server when many events
    // arrive together (e.g. several uploads completing within a second).
    useEffect(() => {
        let scheduled = null;
        const triggerReload = () => {
            if (scheduled) return;
            scheduled = setTimeout(() => {
                scheduled = null;
                setReloadKey((k) => k + 1);
            }, 200);
        };
        const unsub = onNotification((evt) => {
            if (!evt) return;
            if (evt.type === 'bulk_import.completed') {
                triggerReload();
                return;
            }
            if (evt.type === 'bulk_import.progress' && evt.payload?.phase === 'completed') {
                triggerReload();
            }
        });
        // Quick Add (mounted in the header, on any page) dispatches this when a
        // lead is created, so the list refreshes live instead of only on reload.
        window.addEventListener('ee:lead-created', triggerReload);
        return () => {
            if (scheduled) clearTimeout(scheduled);
            unsub();
            window.removeEventListener('ee:lead-created', triggerReload);
        };
    }, []);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const toggleSelect = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSingleReassign = (lead) => {
        setReferLead(lead);
        setReferMode('single');
        setReferOpen(true);
    };

    const openBulkRefer = (mode) => {
        if (mode === 'selected' && selectedIds.size === 0) return;
        setReferMode(mode);
        setReferOpen(true);
    };

    const onReferDone = (msg) => {
        setReferOpen(false);
        setSelectedIds(new Set());
        setReloadKey((k) => k + 1);
        if (msg) setToast({ severity: 'success', text: msg });
    };

    // Bulk hard-delete the currently selected leads. Super-admin only — the
    // FiltersOptions toolbar hides the Delete button for everyone else, and
    // the BE refuses non-super-admin callers. On success we clear the
    // selection set and bump reloadKey so the list refetches without the
    // deleted rows. The confirmation dialog inside FiltersOptions has
    // already gathered explicit user consent before this fires.
    const handleBulkDelete = async () => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;
        try {
            const r = await leadsApi.bulkDelete(ids);
            const deleted = r?.data?.deleted ?? ids.length;
            setSelectedIds(new Set());
            setReloadKey((k) => k + 1);
            setToast({
                severity: 'success',
                text: `Deleted ${deleted} lead${deleted === 1 ? '' : 's'} and all related records.`,
            });
        } catch (e) {
            setToast({ severity: 'error', text: e?.message || 'Bulk delete failed' });
            throw e; // bubble so the confirm dialog's spinner stops on error
        }
    };

    return (
        <div className="lead-list-maincontainer">
            <TabsSection
                activeStageId={activeStageId}
                onChange={setActiveStageId}
                reloadKey={reloadKey}
                advancedFilter={countsFilter}
            />
            <FiltersOptions
                onRefresh={() => setReloadKey((k) => k + 1)}
                selectedCount={selectedIds.size}
                totalInFilter={total}
                onReassignSelected={() => openBulkRefer('selected')}
                onReassignAll={() => openBulkRefer('filter')}
                onBulkDelete={handleBulkDelete}
                sort={sort}
                onSortChange={(s) => { setSort(s); setPage(1); }}
                advancedFilter={advancedFilter}
                onApplyFilter={(f) => { setAdvancedFilter(f); setPage(1); }}
                onResetFilter={() => { setAdvancedFilter({}); setPage(1); }}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                unassignedCount={unassignedCount}
                searchQuery={tableSearchQ}
                onSearchQueryChange={setTableSearchQ}
                exportFilter={filterParams}
            />

            {Object.keys(advancedFilter).length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', background: '#fff7e6', borderTop: '1px solid #ffd591', borderBottom: '1px solid #ffd591', fontSize: 13 }}>
                    <span style={{ color: '#d46b08', fontWeight: 600 }}>
                        🔍 Filters active: {Object.keys(advancedFilter).length} field{Object.keys(advancedFilter).length === 1 ? '' : 's'}
                    </span>
                    <span style={{ color: '#888' }}>
                        Showing {total} matching lead{total === 1 ? '' : 's'}
                    </span>
                    <Button
                        size="small"
                        onClick={() => { setAdvancedFilter({}); setPage(1); }}
                        sx={{ marginLeft: 'auto', textTransform: 'none' }}
                    >
                        Clear all filters
                    </Button>
                </div>
            )}

            <div className="lead-card-scroll-area">
                {loading && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                        <CircularProgress />
                    </div>
                )}
                {!loading && error && (
                    <div style={{ color: '#d32f2f', padding: 16 }}>{error}</div>
                )}
                {!loading && !error && leads.length === 0 && (
                    <div style={{ color: '#888', textAlign: 'center', padding: 40 }}>
                        No leads in this view.
                    </div>
                )}
                {!loading && leads.length > 0 && viewMode === 'card' && (
                    <div
                        className="lead-cards-container"
                        onCopy={copyGuard.onCopy}
                        onCut={copyGuard.onCopy}
                        onContextMenu={copyGuard.onContextMenu}
                        style={copyGuard.style}
                    >
                        {leads.map((lead) => (
                            <LeadCard
                                key={lead.id}
                                lead={lead}
                                selected={selectedIds.has(lead.id)}
                                onToggleSelect={() => toggleSelect(lead.id)}
                                onReassign={() => handleSingleReassign(lead)}
                                onChanged={() => setReloadKey((k) => k + 1)}
                            />
                        ))}
                    </div>
                )}

                {!loading && leads.length > 0 && viewMode === 'table' && (
                    <LeadsTable
                        leads={leads}
                        selectedIds={selectedIds}
                        onToggleSelect={(id) => toggleSelect(id)}
                        onToggleSelectAll={(checked) => {
                            if (checked) setSelectedIds(new Set(leads.map((l) => l.id)));
                            else setSelectedIds(new Set());
                        }}
                        onReassign={(lead) => handleSingleReassign(lead)}
                        onChanged={() => setReloadKey((k) => k + 1)}
                        sort={sort}
                        onSortChange={(s) => { setSort(s); setPage(1); }}
                        columnFilters={columnFilters}
                        onColumnFilterChange={(key, val) => setColumnFilters((p) => ({ ...p, [key]: val }))}
                    />
                )}

                {!loading && total > PAGE_SIZE && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0 24px' }}>
                        <Pagination
                            count={totalPages}
                            page={page}
                            onChange={(_e, p) => setPage(p)}
                            color="primary"
                            shape="rounded"
                        />
                    </div>
                )}
            </div>

            {/* Floating Action Buttons */}
            <div className="fab-container">
                <Fab
                    size="medium"
                    onClick={() => setAddLeadOpen(true)}
                    sx={{ backgroundColor: colors.primary, color: colors.white, "&:hover": { backgroundColor: colors.primaryDark } }}
                >
                    <AddIcon />
                </Fab>
                <Fab
                    size="medium"
                    onClick={() => setUploadLeadOpen(true)}
                    sx={{ backgroundColor: colors.primary, color: colors.white, "&:hover": { backgroundColor: colors.primaryDark } }}
                >
                    <FileUploadIcon />
                </Fab>
            </div>

            <AddNewLead
                open={addLeadOpen}
                onClose={() => setAddLeadOpen(false)}
                onCreated={() => { setAddLeadOpen(false); setReloadKey((k) => k + 1); setToast({ severity: 'success', text: 'Lead created' }); }}
            />
            {/* Deep-link edit dialog opened from a notification click (?focus=<id>) */}
            <AddNewLead
                open={!!focusedLead}
                leadData={focusedLead}
                onClose={() => setFocusedLead(null)}
                onSaved={() => { setFocusedLead(null); setReloadKey((k) => k + 1); }}
            />
            <UploadLeads
                open={uploadLeadOpen}
                onClose={() => setUploadLeadOpen(false)}
                onUploaded={() => {
                    // onUploaded fires twice per upload: once right after the
                    // commit response (so the list is fresh by the time the
                    // user clicks Done) and again on dialog close. Always
                    // refetch — but only toast when the dialog is actually
                    // closed, otherwise the bottom Snackbar would float over
                    // the dialog's action buttons and steal clicks for a few
                    // seconds, making Next / Cancel feel broken.
                    setReloadKey((k) => k + 1);
                    if (!uploadLeadOpen) {
                        setToast({ severity: 'success', text: 'Bulk upload complete — leads list refreshed.' });
                    }
                }}
            />
            <ReferLeadsDrawer
                open={referOpen}
                onClose={() => setReferOpen(false)}
                mode={referMode}
                lead={referLead}
                selectedIds={Array.from(selectedIds)}
                filterParams={filterParams}
                totalInFilter={total}
                onDone={onReferDone}
            />

            {/* Anchor the toast at the top-right so it never overlaps with the
                DialogActions row of an open modal (which sits bottom-center).
                Previously a Snackbar fired while UploadLeads was still open
                covered the Next / Cancel buttons; the user reported the
                buttons "didn't work for a few seconds" until autoHide cleared
                the toast. */}
            <Snackbar
                open={!!toast}
                autoHideDuration={3000}
                onClose={() => setToast(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                {toast && <Alert severity={toast.severity}>{toast.text}</Alert>}
            </Snackbar>
        </div>
    );
}

export default LeadList;
