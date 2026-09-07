import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import { deviceRecordingsApi, auth } from "../../lib/endpoints";
import { ROLES } from "../../lib/rbac";
import AddNewLead from "../../components/AddNewLead/AddNewLead";

const PAGE_SIZE = 50;

// Only manager-tier roles may delete an uploaded recording. Mirrors the
// backend's requireRole on DELETE /device-recordings/:id — the server is the
// real enforcer, this just hides the button from counsellors.
const DELETE_ROLES = [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.SALES_MANAGER];

// Review status for a matched call. Scored calls show the percentage, colour-
// banded so a weak call stands out in a long list; unscored ones read as
// "Not reviewed" so the gap is obvious at a glance.
//
// Reviewing happens on the Call Reviews page (QA queue) — this column only
// reports state, it doesn't score. The percentage's tooltip names the reviewer
// and when they did it.
const scoreColor = (pct) => {
  if (pct == null) return { bg: "#f1f5f9", fg: "#475569" };
  if (pct >= 80) return { bg: "#dcfce7", fg: "#15803d" };
  if (pct >= 60) return { bg: "#fef9c3", fg: "#a16207" };
  return { bg: "#fee2e2", fg: "#b91c1c" };
};

function ReviewStatus({ row }) {
  if (!row.review_id) {
    return <Chip label="Not reviewed" size="small" sx={{ height: 22, fontSize: 11, background: "#f1f5f9", color: "#64748b" }} />;
  }
  const pct = row.overall_percent == null ? null : Number(row.overall_percent);
  const c = scoreColor(pct);
  const who = row.reviewed_by_name ? `by ${row.reviewed_by_name}` : "";
  return (
    <Tooltip title={`Reviewed ${who} ${row.reviewed_at ? fmt(row.reviewed_at) : ""}`.replace(/\s+/g, " ").trim()}>
      <Chip
        label={pct == null ? "Reviewed" : `${pct}%`}
        size="small"
        sx={{ height: 22, fontSize: 11, fontWeight: 700, background: c.bg, color: c.fg }}
      />
    </Tooltip>
  );
}

const fmt = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
};

// Loads a signed URL on demand, then renders a native <audio> player. Mirrors
// the RecordingPlayer pattern used in ViewTimelineModal.
function RecordingPlayer({ recordingId }) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    if (url) return;
    setLoading(true); setError("");
    try {
      const r = await deviceRecordingsApi.playUrl(recordingId);
      const u = r?.data?.url;
      if (!u) throw new Error("No playback URL");
      setUrl(u);
    } catch (e) {
      setError(e?.message || "Could not load recording");
    } finally {
      setLoading(false);
    }
  };

  if (url) return <audio controls src={url} preload="none" style={{ height: 34, maxWidth: 240 }} />;
  return (
    <>
      <Button variant="text" size="small" onClick={load} disabled={loading}
        startIcon={loading ? <CircularProgress size={14} /> : <GraphicEqIcon fontSize="small" />}>
        {loading ? "Loading…" : "Listen"}
      </Button>
      {error && <span style={{ fontSize: 11, color: "#d32f2f", marginLeft: 6 }}>{error}</span>}
    </>
  );
}

export default function UnmatchedRecordings() {
  const [tab, setTab] = useState("matched"); // matched | unmatched
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  // Create-lead modal state: holds the recording we're creating a lead for.
  const [createFor, setCreateFor] = useState(null);
  // Delete-confirm state: holds the recording pending deletion.
  const [deleteFor, setDeleteFor] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const canDelete = DELETE_ROLES.includes(auth.getUser()?.role);
  const isMatched = tab === "matched";

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await deviceRecordingsApi.list({ match_status: tab, page, limit: PAGE_SIZE });
      setRows(Array.isArray(r?.data) ? r.data : []);
      setTotal(Number(r?.meta?.total) || 0);
    } catch (e) {
      setError(e?.message || "Failed to load recordings");
    } finally {
      setLoading(false);
    }
  }, [tab, page]);

  useEffect(() => { load(); }, [load]);

  const switchTab = (_e, next) => { setTab(next); setPage(1); };

  // After a lead is created from a recording, link the recording to it and
  // drop it from the unmatched list.
  const handleCreated = async (newLead) => {
    const rec = createFor;
    setCreateFor(null);
    if (rec && newLead?.id) {
      try {
        await deviceRecordingsApi.attach(rec.id, newLead.id);
      } catch {
        // Non-fatal: the lead exists; the recording just stays unmatched and
        // can be attached manually. Reload reflects current state either way.
      }
    }
    load();
  };

  const handleDelete = async () => {
    if (!deleteFor) return;
    setDeleting(true); setError("");
    try {
      await deviceRecordingsApi.delete(deleteFor.id);
      setDeleteFor(null);
      load();
    } catch (e) {
      setError(e?.message || "Failed to delete recording");
      setDeleteFor(null);
    } finally {
      setDeleting(false);
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // +1 on the matched tab for the Review-status column (unmatched calls are
  // not reviewable — no lead, often no identified caller).
  const columns = isMatched ? 7 : 5;

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <GraphicEqIcon />
        <h2 style={{ margin: 0 }}>Call Recordings</h2>
      </div>
      <p style={{ color: "#666", marginTop: 4 }}>
        Recordings uploaded from the mobile app. Matched recordings are attached to the lead whose
        number appears in the file name; unmatched ones are waiting for review.
      </p>

      <Tabs value={tab} onChange={switchTab} sx={{ mb: 1, minHeight: 40 }}>
        <Tab value="matched" label="Matched" sx={{ minHeight: 40 }} />
        <Tab value="unmatched" label="Unmatched" sx={{ minHeight: 40 }} />
      </Tabs>

      {error && <div style={{ color: "#d32f2f", marginBottom: 12 }}>{error}</div>}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #eee" }}>
              <th style={{ padding: "10px 8px" }}>Phone number</th>
              {isMatched && <th style={{ padding: "10px 8px" }}>Lead</th>}
              <th style={{ padding: "10px 8px" }}>Uploaded by</th>
              <th style={{ padding: "10px 8px" }}>Uploaded</th>
              <th style={{ padding: "10px 8px" }}>Recording</th>
              {isMatched && <th style={{ padding: "10px 8px" }}>Review</th>}
              <th style={{ padding: "10px 8px" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns} style={{ padding: 24, textAlign: "center" }}><CircularProgress size={22} /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={columns} style={{ padding: 24, textAlign: "center", color: "#888" }}>
                {isMatched ? "No matched recordings yet." : "No unmatched recordings."}
              </td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #f2f2f2" }}>
                <td style={{ padding: "10px 8px", fontWeight: 600 }}>{r.phone_raw || "-"}</td>
                {isMatched && (
                  <td style={{ padding: "10px 8px" }}>
                    {r.lead_id ? (
                      <Link to={`/leadlist?focus=${r.lead_id}`} style={{ textDecoration: "none" }}>
                        {r.lead_name || "View lead"}
                      </Link>
                    ) : "-"}
                    {r.multi_match && (
                      <Tooltip title="This number matched more than one lead; the recording is attached to all of them.">
                        <Chip label="multi" size="small" sx={{ ml: 0.5, height: 18, fontSize: 10 }} />
                      </Tooltip>
                    )}
                  </td>
                )}
                <td style={{ padding: "10px 8px", color: "#666" }}>{r.uploaded_by_name || "-"}</td>
                <td style={{ padding: "10px 8px", color: "#666" }}>{fmt(r.uploaded_at)}</td>
                <td style={{ padding: "10px 8px" }}><RecordingPlayer recordingId={r.id} /></td>
                {isMatched && (
                  <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>
                    <ReviewStatus row={r} />
                  </td>
                )}
                <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>
                  {!isMatched && (
                    <Tooltip title="Create a lead from this number">
                      <Button variant="outlined" size="small" startIcon={<PersonAddIcon />}
                        onClick={() => setCreateFor(r)}>
                        Create Lead
                      </Button>
                    </Tooltip>
                  )}
                  {canDelete && (
                    <Tooltip title="Delete recording">
                      <IconButton size="small" color="error" sx={{ ml: 1 }}
                        onClick={() => setDeleteFor(r)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
        <span style={{ color: "#888", fontSize: 13 }}>
          {total} recording{total === 1 ? "" : "s"}
        </span>
        {pageCount > 1 && (
          <span>
            <Button size="small" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span style={{ margin: "0 8px", fontSize: 13, color: "#666" }}>Page {page} of {pageCount}</span>
            <Button size="small" disabled={page >= pageCount || loading} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </span>
        )}
      </div>

      {createFor && (
        <AddNewLead
          open={Boolean(createFor)}
          phonePrefill={createFor.phone_raw || ""}
          onClose={() => setCreateFor(null)}
          onCreated={handleCreated}
        />
      )}

      <Dialog open={Boolean(deleteFor)} onClose={() => !deleting && setDeleteFor(null)}>
        <DialogTitle>Delete this recording?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            The recording from <b>{deleteFor?.phone_raw || "this number"}</b> will be removed
            permanently and can’t be recovered.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteFor(null)} disabled={deleting}>Cancel</Button>
          <Button color="error" variant="contained" disableElevation onClick={handleDelete}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={14} color="inherit" /> : <DeleteOutlineIcon />}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
