import React, { useEffect, useState, useCallback } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import ReplayIcon from "@mui/icons-material/Replay";
import IconButton from "@mui/material/IconButton";
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
    } catch (e) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleRetry = async (id) => {
    try {
      await failedLeadsApi.retry(id);
      await load();
    } catch (e) {
      alert(e?.message || "Retry failed");
    }
  };

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
          onRetry={handleRetry}
          onDelete={(row) => setDeleteRow({ ...row, kind: "failure" })}
        />
      )}

      {!loading && !error && tab === 1 && (
        <DuplicatesTable
          rows={duplicates}
          onDelete={(row) => setDeleteRow({ ...row, kind: "duplicate" })}
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
    </div>
  );
}

function ValidationFailuresTable({ rows, onRetry, onDelete }) {
  if (!rows.length) {
    return <EmptyState message="No validation errors. Bulk uploads are clean." />;
  }
  return (
    <table className="failed-leads-table">
      <thead>
        <tr>
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
          <tr key={row.id}>
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
              <Tooltip title={row.retried_at ? `Retried ${fmt(row.retried_at)}` : "Retry this row"}>
                <span>
                  <IconButton size="small" onClick={() => onRetry(row.id)} disabled={!!row.retried_at}>
                    <ReplayIcon sx={{ color: row.retried_at ? "#bbb" : colors.primary }} />
                  </IconButton>
                </span>
              </Tooltip>
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

function DuplicatesTable({ rows, onDelete }) {
  if (!rows.length) {
    return <EmptyState message="No duplicates from bulk uploads." />;
  }
  return (
    <table className="failed-leads-table">
      <thead>
        <tr>
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
          <tr key={row.id}>
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
