import React, { useState } from "react";
import { IconButton, Collapse, CircularProgress, Snackbar, Alert, Tooltip } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import GroupIcon from "@mui/icons-material/Group";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutlineOutlined";
import StopCircleOutlinedIcon from "@mui/icons-material/StopCircleOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { colors } from "../../theme/colors";
import "./CampaignCard.css";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { campaignsBulkApi } from "../../lib/endpoints";

// Backend stage → colored dot. STOPPED is blue, everything else green.
const dotClass = (stage) => (stage === "STOPPED" ? "blue" : "green");

// Format an ISO timestamp like the mock ("Apr 13, 2026 3:35 PM").
const fmtDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
};

// Short human summary of the audience filter for the RULE column.
const ruleSummary = (filter) => {
  if (!filter || typeof filter !== "object") return "All leads";
  const parts = [];
  if (filter.stage_ids?.length) parts.push(`${filter.stage_ids.length} stage(s)`);
  if (filter.program_ids?.length) parts.push(`${filter.program_ids.length} program(s)`);
  if (filter.assigned_to?.length) parts.push(`${filter.assigned_to.length} owner(s)`);
  if (filter.sources?.length) parts.push(`source: ${filter.sources.join(", ")}`);
  if (filter.created_from || filter.created_to) parts.push("date range");
  if (!parts.length) return "All leads";
  return parts.join(", ");
};

const BulkCampaignCard = ({ item, onChanged, canManage = false, canDelete = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("processing");
  const [openStopModal, setOpenStopModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  // Live stats loaded lazily when the card is expanded.
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [audienceCount, setAudienceCount] = useState(null);

  const stage = item.stage;
  const isDraft = stage === "DRAFT";
  const isInProgress = stage === "IN_PROGRESS";

  const notify = (severity, text) => setToast({ severity, text });

  // Expand → lazy-load stats + a fresh audience count for this campaign.
  const handleToggle = async () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next && stats === null && !statsLoading) {
      setStatsLoading(true);
      try {
        const [s, p] = await Promise.all([
          campaignsBulkApi.stats(item.id).catch(() => ({ data: null })),
          campaignsBulkApi.preview(item.id).catch(() => ({ data: null })),
        ]);
        setStats(s?.data || {});
        if (p?.data?.audience_count != null) setAudienceCount(p.data.audience_count);
      } finally {
        setStatsLoading(false);
      }
    }
  };

  const runAction = async (fn, successMsg) => {
    setBusy(true);
    try {
      await fn();
      if (successMsg) notify("success", successMsg);
      onChanged?.();
    } catch (e) {
      notify("error", e?.message || "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const handleLaunch = () => runAction(() => campaignsBulkApi.launch(item.id), "Campaign launched.");
  const handleStop = () => {
    setOpenStopModal(false);
    runAction(() => campaignsBulkApi.stop(item.id), "Campaign stopped.");
  };
  const handleClone = () => runAction(() => campaignsBulkApi.clone(item.id), "Campaign cloned.");
  const handleDelete = () => {
    setOpenDeleteModal(false);
    runAction(() => campaignsBulkApi.delete(item.id), "Campaign deleted.");
  };

  // Prefer freshly-loaded stats; fall back to the summary fields on the list row.
  const s = stats || {};
  const val = (k, fallbackKey) =>
    s[k] ?? (fallbackKey ? item[fallbackKey] : undefined) ?? 0;

  return (
    <div className="bulk-campaign-card">

      {/* ── HEADER ROW ── */}
      <div className="bulk-campaign-row">
        <div className="bulk-col">
          <p className="bulk-label">CAMPAIGN</p>
          <p className="bulk-value">{item.name}</p>
        </div>

        <div className="bulk-col">
          <p className="bulk-label">STAGE</p>
          <p className="bulk-status">
            <span className={`bulk-dot ${dotClass(stage)}`} />
            {stage}
          </p>
        </div>

        <div className="bulk-col">
          <p className="bulk-label">CREATED ON</p>
          <p className="bulk-value">{fmtDateTime(item.created_at)}</p>
        </div>

        <div className="bulk-col">
          <p className="bulk-label">CHANNEL</p>
          <p className="bulk-value" style={{ textTransform: "uppercase" }}>{item.channel || "—"}</p>
        </div>

        <div className="bulk-col">
          <p className="bulk-label">UPDATED ON</p>
          <p className="bulk-value">{fmtDateTime(item.updated_at)}</p>
        </div>

        <div className="bulk-col">
          <p className="bulk-label">RULE</p>
          <p className="bulk-value">{ruleSummary(item.audience_filter_json)}</p>
        </div>

        <div className="bulk-col-actions">
          <p className="bulk-label">ACTIONS</p>
          <div className="bulk-row-actions">
            {busy && <CircularProgress size={16} sx={{ color: colors.primary }} />}

            {/* Launch — only for DRAFT + manager roles */}
            {isDraft && canManage && (
              <Tooltip title="Launch">
                <PlayCircleOutlineIcon
                  sx={{ color: colors.success, fontSize: 22, cursor: busy ? "default" : "pointer", opacity: busy ? 0.5 : 1 }}
                  onClick={busy ? undefined : handleLaunch}
                />
              </Tooltip>
            )}

            {/* Stop — only while IN_PROGRESS + manager roles */}
            {isInProgress && canManage && (
              <Tooltip title="Stop">
                <StopCircleOutlinedIcon
                  sx={{ color: colors.primary, fontSize: 22, cursor: busy ? "default" : "pointer", opacity: busy ? 0.5 : 1 }}
                  onClick={busy ? undefined : () => setOpenStopModal(true)}
                />
              </Tooltip>
            )}

            {/* Clone — manager roles */}
            {canManage && (
              <Tooltip title="Clone">
                <ContentCopyOutlinedIcon
                  sx={{ color: colors.primary, fontSize: 20, cursor: busy ? "default" : "pointer", opacity: busy ? 0.5 : 1 }}
                  onClick={busy ? undefined : handleClone}
                />
              </Tooltip>
            )}

            {/* Delete — super_admin / branch_manager only */}
            {canDelete && (
              <Tooltip title="Delete">
                <DeleteOutlinedIcon
                  sx={{ color: colors.error, fontSize: 20, cursor: busy ? "default" : "pointer", opacity: busy ? 0.5 : 1 }}
                  onClick={busy ? undefined : () => setOpenDeleteModal(true)}
                />
              </Tooltip>
            )}

            <IconButton size="small" onClick={handleToggle}>
              {isOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          </div>
        </div>
      </div>

      {/* ── EXPANDED SECTION ── */}
      <Collapse in={isOpen}>
        <div className="bulk-expand-section">
          {statsLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
              <CircularProgress size={26} sx={{ color: colors.primary }} />
            </div>
          ) : (
            <>
              {/* Stats summary */}
              <div className="bulk-stats-row">
                <div className="bulk-stat-item">
                  <span className="bulk-stat-label">LEAD/APPLICANT COUNT</span>
                  <p className="bulk-stat-value">{val("leads_count", "leads_count")}</p>
                </div>
                <div className="bulk-stat-item">
                  <span className="bulk-stat-label">EMAIL DELIVERED</span>
                  <p className="bulk-stat-value">{val("email_delivered", "email_delivered")}</p>
                </div>
                <div className="bulk-stat-item">
                  <span className="bulk-stat-label">SMS DELIVERED</span>
                  <p className="bulk-stat-value">{val("sms_delivered", "sms_delivered")}</p>
                </div>
                <div className="bulk-stat-item">
                  <span className="bulk-stat-label">CURRENT AUDIENCE</span>
                  <p className="bulk-stat-value orange">{audienceCount ?? "—"}</p>
                </div>
              </div>

              <div className="bulk-divider" />

              {/* Tabs */}
              <div className="bulk-tabs">
                {["processing", "response"].map((tab) => (
                  <span
                    key={tab}
                    className={`bulk-tab-item ${activeTab === tab ? "active" : ""}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab === "processing" ? "PROCESSING STATUS" : "USER RESPONSE STATUS"}
                  </span>
                ))}
              </div>

              {/* User Response Status tab content */}
              {activeTab === "response" && (
                <div className="bulk-processing-section">
                  <p className="bulk-note">
                    <InfoOutlinedIcon sx={{ fontSize: 16, marginRight: "4px", verticalAlign: "middle" }} />
                    Email responses need more time to process. These figures continue to update as students open and click.
                  </p>

                  <div className="bulk-delivery-row bulk-delivery-row--four">
                    <div className="bulk-delivery-item">
                      <span className="bulk-stat-label">EMAIL OPENED</span>
                      <p className="bulk-stat-value">{val("email_opened")}</p>
                    </div>
                    <div className="bulk-delivery-item">
                      <span className="bulk-stat-label">EMAIL CLICKED</span>
                      <p className="bulk-stat-value">{val("email_clicked")}</p>
                    </div>
                    <div className="bulk-delivery-item">
                      <span className="bulk-stat-label">EMAIL DROPPED</span>
                      <p className="bulk-stat-value">{val("email_dropped")}</p>
                    </div>
                    <div className="bulk-delivery-item">
                      <span className="bulk-stat-label">EMAIL BOUNCED</span>
                      <p className="bulk-stat-value">{val("email_bounced")}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Processing tab content */}
              {activeTab === "processing" && (
                <div className="bulk-processing-section">
                  <p className="bulk-note">
                    <InfoOutlinedIcon sx={{ fontSize: 16, marginRight: "4px", verticalAlign: "middle" }} />
                    A quick summary of the delivery rate for this campaign.
                  </p>

                  {/* Email */}
                  <div className="bulk-delivery-row">
                    <div className="bulk-delivery-item">
                      <span className="bulk-stat-label">EMAIL TRIGGERED</span>
                      <p className="bulk-stat-value">{val("email_triggered")}</p>
                    </div>
                    <div className="bulk-delivery-item">
                      <span className="bulk-stat-label">EMAIL DELIVERED</span>
                      <p className="bulk-stat-value">{val("email_delivered", "email_delivered")}</p>
                    </div>
                    <div className="bulk-delivery-item">
                      <span className="bulk-stat-label">EMAIL NOT DELIVERED</span>
                      <p className="bulk-stat-value">{val("email_failed")}</p>
                    </div>
                  </div>

                  <div className="bulk-delivery-divider" />

                  {/* SMS */}
                  <div className="bulk-delivery-row">
                    <div className="bulk-delivery-item">
                      <span className="bulk-stat-label">SMS TRIGGERED</span>
                      <p className="bulk-stat-value">{val("sms_triggered")}</p>
                    </div>
                    <div className="bulk-delivery-item">
                      <span className="bulk-stat-label">SMS DELIVERED</span>
                      <p className="bulk-stat-value">{val("sms_delivered", "sms_delivered")}</p>
                    </div>
                    <div className="bulk-delivery-item">
                      <span className="bulk-stat-label">SMS NOT DELIVERED</span>
                      <p className="bulk-stat-value">{val("sms_failed")}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Collapse>

      {/* Stop confirmation */}
      <Dialog open={openStopModal} onClose={() => setOpenStopModal(false)} maxWidth="sm" fullWidth>
        <div style={{ background: colors.primary, color: colors.white, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 600 }}>Stop Campaign</span>
          <IconButton size="small" onClick={() => setOpenStopModal(false)} sx={{ color: colors.white }}>
            <CloseIcon />
          </IconButton>
        </div>
        <DialogContent style={{ padding: "24px" }}>
          <p style={{ fontSize: "18px", color: colors.textDark }}>
            Do you want to stop “{item.name}”?
          </p>
        </DialogContent>
        <DialogActions style={{ padding: "16px 24px" }}>
          <Button variant="outlined" onClick={() => setOpenStopModal(false)} sx={{ textTransform: "none" }}>
            No
          </Button>
          <Button
            variant="contained"
            onClick={handleStop}
            sx={{ textTransform: "none", backgroundColor: colors.primary, "&:hover": { backgroundColor: colors.primaryDark } }}
          >
            Yes, Stop
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={openDeleteModal} onClose={() => setOpenDeleteModal(false)} maxWidth="sm" fullWidth>
        <div style={{ background: colors.primary, color: colors.white, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 600 }}>Delete Campaign</span>
          <IconButton size="small" onClick={() => setOpenDeleteModal(false)} sx={{ color: colors.white }}>
            <CloseIcon />
          </IconButton>
        </div>
        <DialogContent style={{ padding: "24px" }}>
          <p style={{ fontSize: "18px", color: colors.textDark }}>
            Delete “{item.name}”? This cannot be undone.
          </p>
        </DialogContent>
        <DialogActions style={{ padding: "16px 24px" }}>
          <Button variant="outlined" onClick={() => setOpenDeleteModal(false)} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleDelete}
            sx={{ textTransform: "none", backgroundColor: colors.error, "&:hover": { backgroundColor: colors.primaryDark } }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {toast ? <Alert severity={toast.severity}>{toast.text}</Alert> : undefined}
      </Snackbar>

    </div>
  );
};

export default BulkCampaignCard;
