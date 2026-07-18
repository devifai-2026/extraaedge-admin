// WhatsApp Chat — a shared per-tenant business inbox (WABridge send + Meta
// webhook receive). No QR/linking: the business number is configured server-side.
// Chats are keyed by phone; each shows a "Lead" badge when it matches a CRM lead.
// Incoming messages arrive via the Meta webhook and appear here (socket + 6s poll).
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  IconButton, Button, CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Tooltip, MenuItem, Alert,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import SendIcon from "@mui/icons-material/Send";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import AddCommentIcon from "@mui/icons-material/AddComment";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import SearchIcon from "@mui/icons-material/Search";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import DescriptionIcon from "@mui/icons-material/Description";
import "./WhatAppsList.css";
import { whatsappApi, leadsApi, uploadsApi } from "../../lib/endpoints";
import { onNotification } from "../../lib/socket";
import AddNewLead from "../../components/AddNewLead/AddNewLead";

const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true }) : "";

const initialsOf = (name) =>
  (name || "?").split(" ").map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

const AVATAR_COLORS = ["#0088cc", "#e17076", "#7bc862", "#a695e7", "#ee9e58", "#6ec9cb", "#faa774", "#5ca6e0"];
const colorFor = (key) => {
  let h = 0;
  for (let i = 0; i < (key || "").length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

const normPhone = (raw) => {
  const d = String(raw || "").replace(/\D/g, "");
  return d.length === 10 ? `91${d}` : d;
};

// Lazily resolve an r2_key to a signed URL and render inline (image) or as a
// download chip (other). Used for inbound media.
function MediaAttachment({ mediaKey, mediaType }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    if (!mediaKey) return;
    uploadsApi.signedUrl(mediaKey)
      .then((r) => { if (alive) setUrl(r?.data?.url || r?.url || null); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [mediaKey]);
  const isImage = mediaType ? mediaType.startsWith("image/") : /\.(png|jpe?g|gif|webp)$/i.test(mediaKey || "");
  const name = (mediaKey || "attachment").split("/").pop();
  if (failed) return <div className="wa-media-fallback">📎 Attachment unavailable</div>;
  if (!url) return <div className="wa-media-loading"><CircularProgress size={16} /></div>;
  if (isImage) {
    return <a href={url} target="_blank" rel="noreferrer" className="wa-media-img-link"><img src={url} alt="attachment" className="wa-media-img" /></a>;
  }
  return <a href={url} target="_blank" rel="noreferrer" className="wa-media-file"><InsertDriveFileIcon fontSize="small" /><span className="wa-media-file-name">{name}</span></a>;
}

// "Start new chat" — pick a lead (with a number) to open/seed a conversation.
function NewChatDialog({ open, onClose, onPick }) {
  const [q, setQ] = useState("");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (!open) { setQ(""); setOptions([]); } }, [open]);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await leadsApi.list({ q: q.trim() || undefined, limit: 20, sort: "updated_desc" });
        setOptions((r?.data || []).filter((l) => l.whatsapp_number || l.phone));
      } catch { setOptions([]); } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [q, open]);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Start new chat</DialogTitle>
      <DialogContent>
        <TextField autoFocus fullWidth size="small" placeholder="Search leads by name or phone" value={q} onChange={(e) => setQ(e.target.value)} sx={{ mt: 1 }} />
        <div style={{ maxHeight: 320, overflowY: "auto", marginTop: 8 }}>
          {loading && <div style={{ textAlign: "center", padding: 12 }}><CircularProgress size={20} /></div>}
          {!loading && options.length === 0 && <div className="wa-empty-note">{q ? "No leads with a number" : "Type to search leads"}</div>}
          {options.map((o) => (
            <div key={o.id} className="wa-newchat-item" onClick={() => onPick(o)}>
              <div className="wa-avatar wa-avatar-sm" style={{ background: colorFor(o.id) }}>{initialsOf(o.name)}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{o.name || "Unnamed"}</div>
                <div style={{ fontSize: 12, color: "#777" }}>{o.whatsapp_number || o.phone}</div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Cancel</Button></DialogActions>
    </Dialog>
  );
}

// Template picker — send a WABridge-approved template (needed outside the 24h
// free-text window). Collects a value per {{N}} variable.
function TemplateDialog({ open, onClose, onSend }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [vars, setVars] = useState([]);
  const [sending, setSending] = useState(false);
  useEffect(() => {
    if (!open) { setSelected(null); setVars([]); return; }
    setLoading(true);
    whatsappApi.inbox.templates()
      .then((r) => setTemplates(r?.data || []))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, [open]);
  const pick = (t) => { setSelected(t); setVars(Array.from({ length: t.variableCount || 0 }, () => "")); };
  const preview = selected ? (selected.bodyText || "").replace(/\{\{(\d+)\}\}/g, (_, n) => vars[Number(n) - 1] || `{{${n}}}`) : "";
  const send = async () => {
    if (!selected) return;
    setSending(true);
    try { await onSend(selected.id, vars); onClose(); }
    finally { setSending(false); }
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Send a template</DialogTitle>
      <DialogContent>
        {loading ? <div style={{ textAlign: "center", padding: 24 }}><CircularProgress size={22} /></div> : (
          <>
            <TextField select fullWidth size="small" label="Template" value={selected?.id || ""}
              onChange={(e) => pick(templates.find((t) => t.id === e.target.value))} sx={{ mt: 1 }}>
              {templates.length === 0 && <MenuItem value="" disabled>No approved templates</MenuItem>}
              {templates.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
            </TextField>
            {selected && (
              <>
                {vars.map((v, i) => (
                  <TextField key={i} fullWidth size="small" label={`Variable {{${i + 1}}}`} value={v}
                    onChange={(e) => setVars((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))} sx={{ mt: 1.5 }} />
                ))}
                <div className="wa-tmpl-preview">{preview}</div>
              </>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!selected || sending} onClick={send}>{sending ? "Sending…" : "Send"}</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function WhatsAppList() {
  const [configured, setConfigured] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [activePhone, setActivePhone] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loadingConvos, setLoadingConvos] = useState(false);
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [tmplOpen, setTmplOpen] = useState(false);
  const [editLeadOpen, setEditLeadOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [draftConvo, setDraftConvo] = useState(null);
  const threadRef = useRef(null);

  const loadStatus = useCallback(async () => {
    try { const r = await whatsappApi.inbox.status(); setConfigured(r?.data?.configured !== false); }
    catch { /* keep default */ }
  }, []);

  const loadConversations = useCallback(async ({ background = false } = {}) => {
    if (!background) setLoadingConvos(true);
    try {
      const r = await whatsappApi.inbox.chats();
      const next = r?.data || [];
      setConversations((prev) => {
        if (prev.length === next.length &&
            prev.every((p, i) => p.id === next[i].id && p.last_at === next[i].last_at && p.unread === next[i].unread)) return prev;
        return next;
      });
    } catch { if (!background) setConversations([]); }
    finally { if (!background) setLoadingConvos(false); }
  }, []);

  const loadMessages = useCallback(async (phone, { background = false } = {}) => {
    if (!phone) return;
    try {
      const r = await whatsappApi.inbox.messages(phone);
      const next = r?.data || [];
      setMessages((prev) => {
        if (background && prev.length === next.length && prev.every((p, i) => p.id === next[i].id && p.status === next[i].status)) return prev;
        return next;
      });
    } catch { if (!background) setMessages([]); }
  }, []);

  useEffect(() => { loadStatus(); loadConversations(); }, [loadStatus, loadConversations]);

  // Realtime: inbound message / delivery status.
  useEffect(() => {
    const off = onNotification((evt) => {
      switch (evt?.type) {
        case "whatsapp_message":
          loadConversations({ background: true });
          if (activePhone && normPhone(evt.phone) === normPhone(activePhone)) loadMessages(activePhone, { background: true });
          break;
        case "whatsapp_status":
          setMessages((prev) => prev.map((m) => (m.provider_message_id === evt.wa_message_id ? { ...m, status: evt.status } : m)));
          break;
        default: break;
      }
    });
    return off;
  }, [activePhone, loadConversations, loadMessages]);

  // Pull-based realtime fallback (webhook push can be missed on free hosting).
  useEffect(() => {
    const t = setInterval(() => {
      loadConversations({ background: true });
      if (activePhone) loadMessages(activePhone, { background: true });
    }, 6000);
    return () => clearInterval(t);
  }, [activePhone, loadConversations, loadMessages]);

  useEffect(() => { if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight; }, [messages]);

  const openConversation = (phone) => { setActivePhone(phone); setDraftConvo(null); loadMessages(phone); whatsappApi.inbox.markRead(phone).catch(() => {}); };

  const openLeadChat = (lead) => {
    setNewChatOpen(false);
    if (!lead) return;
    const phone = normPhone(lead.whatsapp_number || lead.phone);
    const existing = conversations.find((c) => normPhone(c.phone) === phone);
    if (existing) { openConversation(existing.phone); return; }
    setDraftConvo({ id: null, phone, name: lead.name, lead_id: lead.id, lead_name: lead.name, last_body: "", last_at: null, unread: 0 });
    setActivePhone(phone);
    setMessages([]);
  };

  const doSend = async (payload) => {
    if (!activePhone) return false;
    setSending(true);
    try {
      await whatsappApi.inbox.send(activePhone, payload);
      setDraftConvo(null);
      await loadMessages(activePhone);
      loadConversations({ background: true });
      return true;
    } catch (e) { alert(e.message || "Failed to send"); return false; }
    finally { setSending(false); }
  };

  const handleSend = async () => {
    const message = draft.trim();
    if (!message || !activePhone) return;
    setDraft("");
    const ok = await doSend({ type: "text", message });
    if (!ok) setDraft(message);
  };

  const handleSendTemplate = async (templateId, variables) => {
    await doSend({ type: "template", templateId, variables });
  };

  const allConversations = draftConvo ? [draftConvo, ...conversations] : conversations;
  const q = search.trim().toLowerCase();
  const shown = q ? allConversations.filter((c) => `${c.name || ""} ${c.lead_name || ""} ${c.phone || ""}`.toLowerCase().includes(q)) : allConversations;
  const activeConvo = allConversations.find((c) => normPhone(c.phone) === normPhone(activePhone));

  return (
    <div className="wa-container">
      <div className="wa-header">
        <h2 className="wa-title">WhatsApp Chat</h2>
        <div className="wa-header-icons">
          <IconButton size="small" className="wa-header-icon" onClick={() => { loadConversations(); if (activePhone) loadMessages(activePhone); }}>
            <RefreshIcon />
          </IconButton>
        </div>
      </div>

      {!configured && (
        <Alert severity="warning" sx={{ mb: 1.5 }}>WhatsApp sending isn’t configured. Set the WABridge keys on the server to send messages.</Alert>
      )}

      <div className="wa-chat-layout">
        {/* Conversation list */}
        <div className="wa-convo-list">
          <div className="wa-convo-list-head">
            <span>Chats</span>
            <Button size="small" startIcon={<AddCommentIcon fontSize="small" />} onClick={() => setNewChatOpen(true)}>New chat</Button>
          </div>
          <div className="wa-convo-search">
            <SearchIcon fontSize="small" className="wa-convo-search-icon" />
            <input className="wa-convo-search-input" placeholder="Search chats" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {loadingConvos && <div style={{ padding: 16, textAlign: "center" }}><CircularProgress size={20} /></div>}
          {!loadingConvos && shown.length === 0 && (
            <div className="wa-empty-note">{q ? "No chats match your search." : "No conversations yet. Incoming WhatsApp messages will appear here, or start one with “New chat”."}</div>
          )}
          {shown.map((c) => {
            const label = c.name || c.lead_name || c.phone || "Unknown";
            const key = c.phone;
            return (
              <div key={key} className={`wa-convo-item ${normPhone(c.phone) === normPhone(activePhone) ? "active" : ""}`} onClick={() => (c.id === null && !c.phone ? null : openConversation(c.phone))}>
                <div className="wa-avatar" style={{ background: colorFor(key + label) }}>{initialsOf(label)}</div>
                <div className="wa-convo-body">
                  <div className="wa-convo-top">
                    <span className="wa-convo-name">{label}{c.lead_id && <span className="wa-lead-badge">Lead</span>}</span>
                    <span className="wa-convo-time">{fmtTime(c.last_at)}</span>
                  </div>
                  <div className="wa-convo-bottom">
                    <span className="wa-convo-preview">{c.last_body || ""}</span>
                    {c.unread > 0 && <span className="wa-convo-unread">{c.unread}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Thread */}
        <div className="wa-thread-pane">
          {activePhone ? (
            <>
              <div className="wa-thread-header">
                <div className="wa-thread-head-left">
                  {(() => {
                    const label = activeConvo?.name || activeConvo?.lead_name || activeConvo?.phone || "Conversation";
                    return (
                      <>
                        <div className="wa-avatar wa-avatar-sm" style={{ background: colorFor(activePhone + label) }}>{initialsOf(label)}</div>
                        <div>
                          <div className="wa-thread-name">{label}{activeConvo?.lead_id && <span className="wa-lead-badge">Lead</span>}</div>
                          {activeConvo?.phone ? <div className="wa-thread-sub">+{activeConvo.phone}</div> : null}
                        </div>
                      </>
                    );
                  })()}
                </div>
                {activeConvo?.lead_id && (
                  <Tooltip title="Open lead">
                    <IconButton size="small" onClick={() => { setSelectedLead({ id: activeConvo.lead_id }); setEditLeadOpen(true); }}><OpenInNewIcon fontSize="small" /></IconButton>
                  </Tooltip>
                )}
              </div>
              <div className="wa-thread-body" ref={threadRef}>
                {messages.map((m) => {
                  const mediaKey = Array.isArray(m.media_keys) ? m.media_keys[0] : null;
                  const seen = m.status === "seen" || m.status === "read";
                  return (
                    <div key={`${m.direction}-${m.id}`} className={`wa-bubble ${m.direction === "out" ? "out" : "in"}`}>
                      {mediaKey && <MediaAttachment mediaKey={mediaKey} mediaType={m.media_type} />}
                      {m.body ? <div className="wa-bubble-text">{m.body}</div> : null}
                      <div className="wa-bubble-meta">
                        <span>{fmtTime(m.at)}</span>
                        {m.direction === "out" && m.status && <DoneAllIcon className={`wa-tick ${seen ? "seen" : ""}`} style={{ fontSize: 14 }} />}
                      </div>
                    </div>
                  );
                })}
                {messages.length === 0 && <div className="wa-empty-note">No messages yet — say hello.</div>}
              </div>
              <div className="wa-composer">
                <Tooltip title="Send a template (needed outside the 24h window)">
                  <span><IconButton onClick={() => setTmplOpen(true)} disabled={sending}><DescriptionIcon /></IconButton></span>
                </Tooltip>
                <TextField fullWidth size="small" placeholder="Type a message…" value={draft} onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} multiline maxRows={4} disabled={sending} />
                <IconButton color="primary" onClick={handleSend} disabled={!draft.trim() || sending}>{sending ? <CircularProgress size={20} /> : <SendIcon />}</IconButton>
              </div>
              <div className="wa-composer-note">Free text only delivers within 24h of the customer’s last message. Otherwise use a template.</div>
            </>
          ) : (
            <div className="wa-empty-note" style={{ margin: "auto" }}>Select a conversation</div>
          )}
        </div>
      </div>

      <NewChatDialog open={newChatOpen} onClose={() => setNewChatOpen(false)} onPick={openLeadChat} />
      <TemplateDialog open={tmplOpen} onClose={() => setTmplOpen(false)} onSend={handleSendTemplate} />
      <AddNewLead open={editLeadOpen} onClose={() => setEditLeadOpen(false)} leadData={selectedLead} />
    </div>
  );
}
