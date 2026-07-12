import React, { useCallback, useEffect, useState } from "react";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import { deviceRecordingsApi } from "../../lib/endpoints";
import AddNewLead from "../../components/AddNewLead/AddNewLead";

const PAGE_SIZE = 50;

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
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  // Create-lead modal state: holds the recording we're creating a lead for.
  const [createFor, setCreateFor] = useState(null);
  // Delete-confirm state: holds the recording pending deletion.
  const [deleteFor, setDeleteFor] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await deviceRecordingsApi.list({ match_status: "unmatched", page, limit: PAGE_SIZE });
      setRows(Array.isArray(r?.data) ? r.data : []);
    } catch (e) {
      setError(e?.message || "Failed to load recordings");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

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

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <GraphicEqIcon />
        <h2 style={{ margin: 0 }}>Unmatched Recordings</h2>
      </div>
      <p style={{ color: "#666", marginTop: 0 }}>
        Call recordings uploaded from the mobile app whose number didn’t match any lead.
        Play a recording, then create a lead from its number.
      </p>

      {error && <div style={{ color: "#d32f2f", marginBottom: 12 }}>{error}</div>}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #eee" }}>
              <th style={{ padding: "10px 8px" }}>Phone number</th>
              <th style={{ padding: "10px 8px" }}>Uploaded</th>
              <th style={{ padding: "10px 8px" }}>Recording</th>
              <th style={{ padding: "10px 8px" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ padding: 24, textAlign: "center" }}><CircularProgress size={22} /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: 24, textAlign: "center", color: "#888" }}>No unmatched recordings.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #f2f2f2" }}>
                <td style={{ padding: "10px 8px", fontWeight: 600 }}>{r.phone_raw || "-"}</td>
                <td style={{ padding: "10px 8px", color: "#666" }}>{fmt(r.uploaded_at)}</td>
                <td style={{ padding: "10px 8px" }}><RecordingPlayer recordingId={r.id} /></td>
                <td style={{ padding: "10px 8px" }}>
                  <Tooltip title="Create a lead from this number">
                    <Button variant="outlined" size="small" startIcon={<PersonAddIcon />}
                      onClick={() => setCreateFor(r)}>
                      Create Lead
                    </Button>
                  </Tooltip>
                  <Tooltip title="Delete recording">
                    <IconButton size="small" color="error" sx={{ ml: 1 }}
                      onClick={() => setDeleteFor(r)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
