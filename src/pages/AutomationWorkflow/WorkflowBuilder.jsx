import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Snackbar,
  Alert
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import BoltOutlinedIcon from "@mui/icons-material/BoltOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import "./WorkflowBuilder.css";
import {
  workflowsApi,
  emailApi,
  smsApi,
  usersApi,
  tagsApi,
  dropdownsApi
} from "../../lib/endpoints";
import { SEND_CHANNELS, buildGraph, parseGraph } from "./workflowGraph";

const THEN_DESCRIPTIONS = {
  attributes: "Add actions to update fields or create tasks.",
  immediate: "Add the actions to perform or communications you would like to send.",
  "time-based": "",
  "action-based": ""
};

const SHOW_RECHECK = {
  attributes: true,
  immediate: false,
  "time-based": true,
  "action-based": false
};

// Action types offered in the THEN panel. Aligns with the executor's supported
// switch cases. WhatsApp send is deliberately not selectable (disabled in the
// backend executor); send_message only offers email/sms.
const ACTION_TYPES = [
  { value: "send_message", label: "Send message (Email / SMS)" },
  { value: "assign", label: "Assign lead" },
  { value: "add_tag", label: "Add tag" },
  { value: "add_score", label: "Add lead score" },
  { value: "schedule_follow_up", label: "Schedule follow-up" }
];

const TRIGGER_EVENTS = [
  { value: "lead.created", label: "Lead Created" },
  { value: "lead.updated", label: "Lead Updated" },
  { value: "lead.stage_changed", label: "Stage Changed" }
];

// Convert an <input type="datetime-local">-ish pair to an ISO string, or null.
const toIso = (dateStr, timeStr) => {
  if (!dateStr) return null;
  const composed = timeStr ? `${dateStr}T${timeStr}` : dateStr;
  const d = new Date(composed);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const WorkflowBuilder = ({ category, onBack, onCancel, onSave, workflowId }) => {
  const [activeSection, setActiveSection] = useState("IF");
  const [recheck, setRecheck] = useState(false);

  // Core workflow fields
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");

  // IF: trigger event + optional stage-change target
  const [triggerEvent, setTriggerEvent] = useState("");
  const [stageId, setStageId] = useState("");

  // THEN: single action
  const [actionType, setActionType] = useState("send_message");
  const [channel, setChannel] = useState("email");
  const [emailTemplateId, setEmailTemplateId] = useState("");
  const [smsTemplateId, setSmsTemplateId] = useState("");
  const [assignUserId, setAssignUserId] = useState("");
  const [tagId, setTagId] = useState("");
  const [scorePoints, setScorePoints] = useState("");
  const [followUpHours, setFollowUpHours] = useState("");

  // Option lists
  const [categories, setCategories] = useState([]);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [smsTemplates, setSmsTemplates] = useState([]);
  const [users, setUsers] = useState([]);
  const [tags, setTags] = useState([]);
  const [stages, setStages] = useState([]);

  const [loading, setLoading] = useState(!!workflowId);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, msg: "", severity: "success" });

  const notify = (msg, severity = "success") =>
    setToast({ open: true, msg, severity });

  // Load option lists once.
  useEffect(() => {
    let alive = true;
    (async () => {
      const [cats, emails, smses, us, tg, st] = await Promise.allSettled([
        workflowsApi.categories(),
        emailApi.templates.list(),
        smsApi.templates.list(),
        usersApi.list(),
        tagsApi.list(),
        dropdownsApi.stages()
      ]);
      if (!alive) return;
      if (cats.status === "fulfilled") setCategories(cats.value?.data || []);
      if (emails.status === "fulfilled") setEmailTemplates(emails.value?.data || []);
      if (smses.status === "fulfilled") setSmsTemplates(smses.value?.data || []);
      if (us.status === "fulfilled") setUsers((us.value?.data || []).filter((u) => u?.is_active !== false));
      if (tg.status === "fulfilled") setTags(tg.value?.data || []);
      if (st.status === "fulfilled") setStages(st.value?.data || []);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // On edit, load the existing workflow's graph and hydrate the form.
  useEffect(() => {
    if (!workflowId) return;
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const res = await workflowsApi.get(workflowId);
        const wf = res?.data || {};
        if (!alive) return;
        setName(wf.name || "");
        if (wf.start_time) {
          const d = new Date(wf.start_time);
          if (!Number.isNaN(d.getTime())) {
            setStartDate(d.toISOString().slice(0, 10));
            setStartTime(d.toISOString().slice(11, 16));
          }
        }
        setTriggerEvent((wf.trigger_event_types && wf.trigger_event_types[0]) || "");
        const { condition, action } = parseGraph(wf.nodes || []);
        if (condition?.stage_id) setStageId(condition.stage_id);
        if (action) hydrateAction(action);
      } catch (e) {
        notify(e?.message || "Could not load workflow.", "error");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [workflowId]);

  const hydrateAction = (action) => {
    setActionType(action.type || "send_message");
    if (action.type === "send_message") {
      setChannel(action.channel === "sms" ? "sms" : "email");
      if (action.channel === "sms") setSmsTemplateId(action.template_id || "");
      else setEmailTemplateId(action.template_id || "");
    } else if (action.type === "assign") {
      setAssignUserId(action.user_id || "");
    } else if (action.type === "add_tag") {
      setTagId(action.tag_id || "");
    } else if (action.type === "add_score") {
      setScorePoints(String(action.points ?? ""));
    } else if (action.type === "schedule_follow_up") {
      setFollowUpHours(String(action.offset_hours ?? ""));
    }
  };

  if (!category && !workflowId) return null;

  const thenDescription = category ? THEN_DESCRIPTIONS[category.preview] ?? "" : "";
  const showRecheck = category ? SHOW_RECHECK[category.preview] : false;

  // Assemble the single action object from the form for the current actionType.
  const buildAction = () => {
    switch (actionType) {
      case "send_message":
        return {
          type: "send_message",
          channel,
          template_id: channel === "sms" ? smsTemplateId : emailTemplateId
        };
      case "assign":
        return { type: "assign", user_id: assignUserId };
      case "add_tag":
        return { type: "add_tag", tag_id: tagId };
      case "add_score":
        return { type: "add_score", points: Number(scorePoints) || 0 };
      case "schedule_follow_up":
        return {
          type: "schedule_follow_up",
          offset_hours: Number(followUpHours) || 0
        };
      default:
        return null;
    }
  };

  const validate = () => {
    if (!name.trim()) return "Please enter an automation name.";
    if (actionType === "send_message") {
      const tpl = channel === "sms" ? smsTemplateId : emailTemplateId;
      if (!tpl) return `Please select a ${channel.toUpperCase()} template.`;
    }
    if (actionType === "assign" && !assignUserId) return "Please select a user to assign.";
    if (actionType === "add_tag" && !tagId) return "Please select a tag.";
    if (actionType === "add_score" && !scorePoints) return "Please enter score points.";
    if (actionType === "schedule_follow_up" && !followUpHours)
      return "Please enter the follow-up delay in hours.";
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      notify(err, "warning");
      return;
    }
    setSaving(true);
    try {
      const condition = {};
      if (triggerEvent) condition.event = triggerEvent;
      if (stageId) condition.stage_id = stageId;
      const { nodes, edges } = buildGraph({ condition, action: buildAction() });

      // Match the picked template kind to a real DB category by name where
      // possible; otherwise leave category_id unset (nullable on the workflow).
      const catMatch = category
        ? categories.find(
            (c) =>
              c.name?.toLowerCase() === category.title?.toLowerCase()
          )
        : null;

      const body = {
        name: name.trim(),
        ...(catMatch ? { category_id: catMatch.id } : {}),
        ...(triggerEvent ? { trigger_event_types: [triggerEvent] } : {}),
        start_time: toIso(startDate, startTime) || undefined,
        nodes,
        edges
      };

      if (workflowId) await workflowsApi.update(workflowId, body);
      else await workflowsApi.create(body);

      notify("Workflow saved.");
      setTimeout(() => onSave && onSave(), 500);
    } catch (e) {
      notify(e?.message || "Could not save workflow.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box
        className="workflow-builder-wrapper"
        sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="workflow-builder-wrapper">
      <Box className="workflow-builder-title">
        <IconButton size="small" onClick={onBack}>
          <ArrowBackIcon />
        </IconButton>
        <Typography className="workflow-builder-title-text">
          {category?.title || "Edit workflow"}
        </Typography>
      </Box>

      <Box className="workflow-builder-meta">
        <Box className="workflow-builder-field">
          <Typography className="workflow-builder-label">
            Automation Name<span className="workflow-builder-req">*</span>
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Automation Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Box>

        <Box className="workflow-builder-field">
          <Typography className="workflow-builder-label">
            Start Date
          </Typography>
          <TextField
            fullWidth
            size="small"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <CalendarMonthOutlinedIcon
                    fontSize="small"
                    sx={{ color: "#777" }}
                  />
                </InputAdornment>
              )
            }}
          />
        </Box>

        <Box className="workflow-builder-field">
          <Typography className="workflow-builder-label">
            Start Time
          </Typography>
          <TextField
            fullWidth
            size="small"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Box>
      </Box>

      <Box className="workflow-builder-body">
        <Box className="workflow-builder-left">
          <Box
            className={`workflow-builder-card if-card ${
              activeSection === "IF" ? "active" : ""
            }`}
            onClick={() => setActiveSection("IF")}
          >
            <Box className="workflow-builder-card-head">
              <FilterAltOutlinedIcon
                fontSize="small"
                sx={{ color: "#d97706" }}
              />
              <span>IF</span>
            </Box>
            <Typography className="workflow-builder-card-sub">
              Choose a filter on leads/applications and apply conditions as
              required.
            </Typography>
          </Box>

          <Box className="workflow-builder-arrow">↓</Box>

          <Box
            className={`workflow-builder-card then-card ${
              activeSection === "THEN" ? "active" : ""
            }`}
            onClick={() => setActiveSection("THEN")}
          >
            <Box className="workflow-builder-card-head">
              <BoltOutlinedIcon fontSize="small" sx={{ color: "#d97706" }} />
              <span>THEN</span>
            </Box>
            {thenDescription && (
              <Typography className="workflow-builder-card-sub">
                {thenDescription}
              </Typography>
            )}
          </Box>
        </Box>

        <Box className="workflow-builder-right">
          {activeSection === "IF" ? (
            <>
              <Box className="workflow-builder-condition">
                <Typography className="workflow-builder-condition-title">
                  Condition 1
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    displayEmpty
                    value={triggerEvent}
                    onChange={(e) => setTriggerEvent(e.target.value)}
                    renderValue={(val) => {
                      const t = TRIGGER_EVENTS.find((x) => x.value === val);
                      return t ? t.label : <span className="placeholder">Select Trigger</span>;
                    }}
                  >
                    <MenuItem value="">Select Trigger</MenuItem>
                    {TRIGGER_EVENTS.map((t) => (
                      <MenuItem key={t.value} value={t.value}>
                        {t.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {triggerEvent === "lead.stage_changed" && (
                <Box className="workflow-builder-condition" sx={{ mt: 1.5 }}>
                  <Typography className="workflow-builder-condition-title">
                    Stage
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      displayEmpty
                      value={stageId}
                      onChange={(e) => setStageId(e.target.value)}
                    >
                      <MenuItem value="">Any stage</MenuItem>
                      {stages.map((s) => (
                        <MenuItem key={s.id} value={s.id}>
                          {s.name || s.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              )}

              {showRecheck && (
                <FormControlLabel
                  className="workflow-builder-recheck"
                  control={
                    <Checkbox
                      size="small"
                      checked={recheck}
                      onChange={(e) => setRecheck(e.target.checked)}
                    />
                  }
                  label={
                    <span>
                      Do not recheck the{" "}
                      <b>IF conditions when time delay option is selected in THEN section</b>
                    </span>
                  }
                />
              )}
            </>
          ) : (
            <Box className="workflow-builder-condition">
              <Typography className="workflow-builder-condition-title">
                Action
              </Typography>
              <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
                <Select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                >
                  {ACTION_TYPES.map((a) => (
                    <MenuItem key={a.value} value={a.value}>
                      {a.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {actionType === "send_message" && (
                <>
                  <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
                    <Select value={channel} onChange={(e) => setChannel(e.target.value)}>
                      {SEND_CHANNELS.map((c) => (
                        <MenuItem key={c.value} value={c.value}>
                          {c.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {channel === "email" ? (
                    <FormControl fullWidth size="small">
                      <Select
                        displayEmpty
                        value={emailTemplateId}
                        onChange={(e) => setEmailTemplateId(e.target.value)}
                      >
                        <MenuItem value="">Select email template</MenuItem>
                        {emailTemplates.map((t) => (
                          <MenuItem key={t.id} value={t.id}>
                            {t.name || t.subject || t.id}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : (
                    <FormControl fullWidth size="small">
                      <Select
                        displayEmpty
                        value={smsTemplateId}
                        onChange={(e) => setSmsTemplateId(e.target.value)}
                      >
                        <MenuItem value="">Select SMS template</MenuItem>
                        {smsTemplates.map((t) => (
                          <MenuItem key={t.id} value={t.id}>
                            {t.name || t.id}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                  <Typography variant="caption" sx={{ color: "#999", mt: 1, display: "block" }}>
                    WhatsApp automation is unavailable — use Email or SMS.
                  </Typography>
                </>
              )}

              {actionType === "assign" && (
                <FormControl fullWidth size="small">
                  <Select
                    displayEmpty
                    value={assignUserId}
                    onChange={(e) => setAssignUserId(e.target.value)}
                  >
                    <MenuItem value="">Select user</MenuItem>
                    {users.map((u) => (
                      <MenuItem key={u.id} value={u.id}>
                        {u.name}
                        {u.role ? ` (${String(u.role).replace("_", " ")})` : ""}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {actionType === "add_tag" && (
                <FormControl fullWidth size="small">
                  <Select
                    displayEmpty
                    value={tagId}
                    onChange={(e) => setTagId(e.target.value)}
                  >
                    <MenuItem value="">Select tag</MenuItem>
                    {tags.map((t) => (
                      <MenuItem key={t.id} value={t.id}>
                        {t.name || t.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {actionType === "add_score" && (
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  placeholder="Points to add"
                  value={scorePoints}
                  onChange={(e) => setScorePoints(e.target.value)}
                />
              )}

              {actionType === "schedule_follow_up" && (
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  placeholder="Delay in hours"
                  value={followUpHours}
                  onChange={(e) => setFollowUpHours(e.target.value)}
                />
              )}
            </Box>
          )}
        </Box>
      </Box>

      <Box className="workflow-builder-footer">
        <Button
          variant="outlined"
          className="workflow-builder-cancel"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          className="workflow-builder-save"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </Box>

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

export default WorkflowBuilder;
