import React, { useEffect, useState, useCallback, useMemo } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import IconButton from "@mui/material/IconButton";
import Checkbox from "@mui/material/Checkbox";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Tooltip from "@mui/material/Tooltip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import "./FailedLeads.css";
import { colors } from "../../theme/colors";
import { failedLeadsApi } from "../../lib/endpoints";

const PAGE_SIZE = 50;

const fmt = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
};

// Pull a friendly value out of a duplicate's `raw_row_json`. The bulk import
// stores rows verbatim from the spreadsheet so column names match the
// template (first_name, email, phone, whatsapp_number).
const rowField = (row, ...keys) => {
  if (!row) return "";
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v);
  }
  return "";
};

const RESOLUTION_LABEL = {
  pending: "Pending",
  skipped: "Skipped",
  merged: "Merged into existing",
  created_anyway: "Created as new lead",
};
const RESOLUTION_COLOR = {
  pending: "#6b4a3a",
  skipped: "#9e9e9e",
  merged: "#0277bd",
  created_anyway: "#2e7d32",
};

function FailedLeads() {
  const [tab, setTab] = useState(0); // 0 = validation failures, 1 = duplicates
  const [failures, setFailures] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [summary, setSummary] = useState({ failures: 0, duplicates: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);
  // Per-tab row selection. Keyed by tab so switching tabs preserves each
  // tab's selection independently.
  const [selected, setSelected] = useState({ 0: new Set(), 1: new Set() });
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, f, d] = await Promise.all([
        failedLeadsApi.summary(),
        failedLeadsApi.list({ page, limit: PAGE_SIZE }),
        failedLeadsApi.duplicates({ page, limit: PAGE_SIZE }),
      ]);
      setSummary(s?.data ?? { failures: 0, duplicates: 0 });
      setFailures(f?.data ?? []);
      setDuplicates(d?.data ?? []);
      // Clear selections after a reload so deleted ids don't linger as
      // "selected" against stale state.
      setSelected({ 0: new Set(), 1: new Set() });
    } catch (e) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleteRow) return;
    try {
      // The same dialog confirms both kinds — the row carries the kind so
      // we hit the correct DELETE endpoint.
      if (deleteRow.kind === "duplicate") {
        await failedLeadsApi.deleteDuplicate(deleteRow.id);
      } else {
        await failedLeadsApi.delete(deleteRow.id);
      }
      setDeleteRow(null);
      await load();
    } catch (e) {
      alert(e?.message || "Delete failed");
      setDeleteRow(null);
    }
  };

  const currentRows = tab === 0 ? failures : duplicates;
  const currentSelection = selected[tab];
  const allSelectedOnPage = currentRows.length > 0 && currentRows.every((r) => currentSelection.has(r.id));
  const someSelectedOnPage = currentRows.some((r) => currentSelection.has(r.id));

  const toggleRow = (id) => {
    setSelected((prev) => {
      const next = new Set(prev[tab]);
      if (next.has(id)) next.delete(id); else next.add(id);
      return { ...prev, [tab]: next };
    });
  };
  const toggleAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev[tab]);
      if (allSelectedOnPage) {
        // unselect everything on this page
        for (const r of currentRows) next.delete(r.id);
      } else {
        for (const r of currentRows) next.add(r.id);
      }
      return { ...prev, [tab]: next };
    });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(currentSelection);
    if (!ids.length) return;
    setBulkDeleting(true);
    try {
      const fn = tab === 0 ? failedLeadsApi.bulkDelete : failedLeadsApi.bulkDeleteDuplicates;
      const r = await fn(ids);
      const { deleted = 0, requested = ids.length } = r?.data || {};
      if (deleted < requested) {
        alert(`Deleted ${deleted} of ${requested}. ${requested - deleted} row${requested - deleted === 1 ? '' : 's'} belonged to other users and were skipped.`);
      }
      setBulkConfirmOpen(false);
      await load();
    } catch (e) {
      alert(e?.message || "Bulk delete failed");
    } finally {
      setBulkDeleting(false);
    }
  };

  const selectedCount = useMemo(() => currentSelection.size, [currentSelection]);

  return (
    <div className="failed-leads-container">
      <span className="failed-leads-title">Failed Lead List</span>
      <hr className="failed-leads-title-underline" />

      <Tabs
        value={tab}
        onChange={(_, v) => { setTab(v); setPage(1); }}
        sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
      >
        <Tab label={`Validation Errors (${summary.failures})`} />
        <Tab label={`Duplicates (${summary.duplicates})`} />
      </Tabs>

      {/* Bulk-action toolbar — visible only when at least one row on the
          active tab is selected. All tenant roles can use it; the BE
          silently skips rows the viewer isn't allowed to delete. */}
      {selectedCount > 0 && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 12px",
          marginBottom: 12,
          background: "#fef3c7",
          border: "1px solid #fde68a",
          borderRadius: 6,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#92400e" }}>
            {selectedCount} row{selectedCount === 1 ? '' : 's'} selected
          </span>
          <Button
            size="small"
            variant="contained"
            color="error"
            startIcon={<DeleteSweepIcon />}
            onClick={() => setBulkConfirmOpen(true)}
            disabled={bulkDeleting}
          >
            Delete selected
          </Button>
          <Button
            size="small"
            onClick={() => setSelected((prev) => ({ ...prev, [tab]: new Set() }))}
            disabled={bulkDeleting}
          >
            Clear selection
          </Button>
        </div>
      )}

      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <CircularProgress size={32} />
        </div>
      )}
      {error && !loading && (
        <div style={{ color: "#c62828", padding: 16, textAlign: "center" }}>{error}</div>
      )}

      {!loading && !error && tab === 0 && (
        <ValidationFailuresTable
          rows={failures}
          onDelete={(row) => setDeleteRow({ ...row, kind: "failure" })}
          selected={currentSelection}
          onToggleRow={toggleRow}
          onToggleAll={toggleAllOnPage}
          allSelectedOnPage={allSelectedOnPage}
          someSelectedOnPage={someSelectedOnPage}
        />
      )}

      {!loading && !error && tab === 1 && (
        <DuplicatesTable
          rows={duplicates}
          onDelete={(row) => setDeleteRow({ ...row, kind: "duplicate" })}
          selected={currentSelection}
          onToggleRow={toggleRow}
          onToggleAll={toggleAllOnPage}
          allSelectedOnPage={allSelectedOnPage}
          someSelectedOnPage={someSelectedOnPage}
        />
      )}

      <Dialog open={deleteRow !== null} onClose={() => setDeleteRow(null)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deleteRow?.kind === "duplicate"
              ? "Remove this duplicate record? The matched lead in your CRM will not be touched. This cannot be undone."
              : "Remove this row from the failed-leads list? The original lead data will not be re-imported. This cannot be undone."}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteRow(null)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={bulkConfirmOpen} onClose={() => !bulkDeleting && setBulkConfirmOpen(false)}>
        <DialogTitle>Delete {selectedCount} {tab === 0 ? 'failed row' : 'duplicate'}{selectedCount === 1 ? '' : 's'}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {tab === 0
              ? "The selected rows will be removed from the validation-errors list. Original lead data will not be re-imported. This cannot be undone."
              : "The selected duplicates will be removed. Matched leads in your CRM will not be touched. This cannot be undone."}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkConfirmOpen(false)} disabled={bulkDeleting}>Cancel</Button>
          <Button
            onClick={handleBulkDelete}
            color="error"
            variant="contained"
            disabled={bulkDeleting}
            startIcon={bulkDeleting ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <DeleteSweepIcon />}
          >
            {bulkDeleting ? 'Deleting…' : `Delete ${selectedCount}`}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

function ValidationFailuresTable({ rows, onDelete, selected, onToggleRow, onToggleAll, allSelectedOnPage, someSelectedOnPage }) {
  if (!rows.length) {
    return <EmptyState message="No validation errors. Bulk uploads are clean." />;
  }
  return (
    <table className="failed-leads-table">
      <thead>
        <tr>
          <th style={{ width: 36 }}>
            <Checkbox
              size="small"
              checked={allSelectedOnPage}
              indeterminate={!allSelectedOnPage && someSelectedOnPage}
              onChange={onToggleAll}
            />
          </th>
          <th>Row</th>
          <th>First Name</th>
          <th>Email</th>
          <th>Phone</th>
          <th>WhatsApp</th>
          <th>Error</th>
          <th>Imported</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className={selected.has(row.id) ? 'row-selected' : ''}>
            <td>
              <Checkbox
                size="small"
                checked={selected.has(row.id)}
                onChange={() => onToggleRow(row.id)}
              />
            </td>
            <td>{row.row_number}</td>
            <td>{rowField(row.raw_row_json, "first_name", "name")}</td>
            <td>{rowField(row.raw_row_json, "email")}</td>
            <td>{rowField(row.raw_row_json, "phone")}</td>
            <td>{rowField(row.raw_row_json, "whatsapp_number")}</td>
            <td>
              <span className="failed-leads-error">{row.error_message}</span>
              {row.error_code && (
                <span style={{ color: "#888", fontSize: 11, marginLeft: 6 }}>· {row.error_code}</span>
              )}
            </td>
            <td>{fmt(row.import_created_at)}</td>
            <td style={{ whiteSpace: "nowrap" }}>
              <Tooltip title="Delete row from failed list">
                <IconButton size="small" onClick={() => onDelete(row)}>
                  <DeleteIcon sx={{ color: colors.primary }} />
                </IconButton>
              </Tooltip>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DuplicatesTable({ rows, onDelete, selected, onToggleRow, onToggleAll, allSelectedOnPage, someSelectedOnPage }) {
  if (!rows.length) {
    return <EmptyState message="No duplicates from bulk uploads." />;
  }
  return (
    <table className="failed-leads-table">
      <thead>
        <tr>
          <th style={{ width: 36 }}>
            <Checkbox
              size="small"
              checked={allSelectedOnPage}
              indeterminate={!allSelectedOnPage && someSelectedOnPage}
              onChange={onToggleAll}
            />
          </th>
          <th>Row</th>
          <th>Uploaded</th>
          <th>Matched Existing Lead</th>
          <th>Match On</th>
          <th>Resolution</th>
          <th>Imported</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className={selected.has(row.id) ? 'row-selected' : ''}>
            <td>
              <Checkbox
                size="small"
                checked={selected.has(row.id)}
                onChange={() => onToggleRow(row.id)}
              />
            </td>
            <td>{row.row_number}</td>
            <td>
              <div style={{ fontWeight: 600 }}>
                {rowField(row.raw_row_json, "first_name", "name") || "—"}
              </div>
              <div style={{ fontSize: 11, color: "#666" }}>
                {rowField(row.raw_row_json, "email") && (
                  <span>{rowField(row.raw_row_json, "email")}</span>
                )}
                {rowField(row.raw_row_json, "phone") && (
                  <span>{" · "}{rowField(row.raw_row_json, "phone")}</span>
                )}
              </div>
            </td>
            <td>
              <div style={{ fontWeight: 600 }}>{row.matched_lead_name || "—"}</div>
              <div style={{ fontSize: 11, color: "#666" }}>
                {row.matched_lead_email && <span>{row.matched_lead_email}</span>}
                {row.matched_lead_phone && <span>{" · "}{row.matched_lead_phone}</span>}
              </div>
            </td>
            <td>
              <span style={{
                display: "inline-block",
                padding: "2px 8px",
                borderRadius: 12,
                background: "#fff7e6",
                color: "#d46b08",
                border: "1px solid #ffd591",
                fontSize: 11,
                fontWeight: 600,
              }}>
                {row.match_field}
              </span>
              <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{row.match_value}</div>
            </td>
            <td>
              <span style={{
                display: "inline-block",
                padding: "2px 8px",
                borderRadius: 12,
                background: RESOLUTION_COLOR[row.resolution] || "#9e9e9e",
                color: "#fff",
                fontSize: 11,
                fontWeight: 600,
              }}>
                {RESOLUTION_LABEL[row.resolution] || row.resolution}
              </span>
            </td>
            <td>{fmt(row.import_created_at)}</td>
            <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
              <Tooltip title="Delete this duplicate record">
                <IconButton size="small" onClick={() => onDelete?.(row)}>
                  <DeleteIcon sx={{ color: colors.primary }} />
                </IconButton>
              </Tooltip>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EmptyState({ message }) {
  return (
    <div style={{ padding: 40, textAlign: "center", color: "#888" }}>
      {message}
    </div>
  );
}

export default FailedLeads;
