// WhatsApp (personal number) — real, per-user connection via the
// whatsapp-web.js gateway. Each user links their OWN WhatsApp by scanning a QR;
// the page then shows their conversations and lets them send free text. QR,
// ready, inbound message and delivery-ack events arrive over socket.io
// ('notification' events with a whatsapp_* type).
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  IconButton, Button, CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, Chip, TextField, Tooltip, Autocomplete,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import LogoutIcon from "@mui/icons-material/Logout";
import SendIcon from "@mui/icons-material/Send";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import AddCommentIcon from "@mui/icons-material/AddComment";
import QRCode from "qrcode";
import "./WhatAppsList.css";
import { whatsappApi, leadsApi } from "../../lib/endpoints";
import { onNotification } from "../../lib/socket";
import { useNavigate } from "react-router-dom";
import AddNewLead from "../../components/AddNewLead/AddNewLead";

const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true }) : "";

// ---- Connection banner (status + connect/logout) ----
function ConnectionBar({ status, phone, onConnect, onLogout, busy }) {
  const isConnected = status === "connected";
  return (
    <div className="wa-conn-bar">
      <div className="wa-conn-left">
        <WhatsAppIcon style={{ color: isConnected ? "#25D366" : "#9e9e9e" }} />
        <div>
          <div className="wa-conn-status">
            {isConnected ? "Connected" : status === "pending_qr" ? "Waiting for QR scan…" : "Not connected"}
          </div>
          <div className="wa-conn-phone">{isConnected && phone ? `+${phone}` : "Link your WhatsApp to send & receive"}</div>
        </div>
      </div>
      <div className="wa-conn-actions">
        {isConnected ? (
          <Button size="small" variant="outlined" color="error" startIcon={<LogoutIcon />} onClick={onLogout} disabled={busy}>
            Disconnect
          </Button>
        ) : (
          <Button size="small" variant="contained" startIcon={<WhatsAppIcon />} onClick={onConnect} disabled={busy}>
            Connect WhatsApp
          </Button>
        )}
      </div>
    </div>
  );
}

// ---- QR dialog ----
function QrDialog({ open, qr, onClose }) {
  const [dataUrl, setDataUrl] = useState("");
  useEffect(() => {
    let alive = true;
    if (qr) QRCode.toDataURL(qr, { width: 280, margin: 1 }).then((u) => { if (alive) setDataUrl(u); }).catch(() => {});
    return () => { alive = false; };
  }, [qr]);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs">
      <DialogTitle>Link WhatsApp</DialogTitle>
      <DialogContent style={{ textAlign: "center", paddingBottom: 24 }}>
        <p style={{ fontSize: 13, color: "#555", marginTop: 0 }}>
          Open WhatsApp on your phone → <strong>Linked devices</strong> → <strong>Link a device</strong>, then scan:
        </p>
        {dataUrl ? (
          <img src={dataUrl} alt="WhatsApp QR" style={{ width: 280, height: 280 }} />
        ) : (
          <div style={{ padding: 40 }}><CircularProgress /></div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---- "Start new chat" lead picker ----
// Debounced search over /leads (q matches name/email/phone). Only leads that
// actually have a WhatsApp/phone number are selectable — you can't message a
// lead with no number.
function NewChatDialog({ open, onClose, onPick }) {
  const [q, setQ] = useState("");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState(null);

  useEffect(() => {
    if (!open) { setQ(""); setOptions([]); setPicked(null); return; }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await leadsApi.list({ q: q.trim() || undefined, limit: 20, sort: "updated_desc" });
        // Only leads we can actually message.
        setOptions((r?.data || []).filter((l) => l.whatsapp_number || l.phone));
      } catch { setOptions([]); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [q, open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Start new chat</DialogTitle>
      <DialogContent>
        <Autocomplete
          autoFocus
          options={options}
          loading={loading}
          filterOptions={(x) => x}            /* server-side search; don't re-filter */
          getOptionLabel={(o) => o.name || o.phone || o.whatsapp_number || "Unnamed"}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          value={picked}
          onChange={(_e, v) => setPicked(v)}
          onInputChange={(_e, v) => setQ(v)}
          noOptionsText={q ? "No leads with a number" : "Type to search leads"}
          renderOption={(props, o) => (
            <li {...props} key={o.id}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{o.name || "Unnamed"}</span>
                <span style={{ fontSize: 12, color: "#777" }}>{o.whatsapp_number || o.phone}</span>
              </div>
            </li>
          )}
          renderInput={(params) => (
            <TextField {...params} placeholder="Search by name, email or phone" size="small" sx={{ mt: 1 }} />
          )}
          sx={{ minWidth: 320 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!picked} onClick={() => { onPick(picked); setPicked(null); }}>
          Open chat
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function WhatsAppList() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // loading|disconnected|pending_qr|connected|logged_out
  const [phone, setPhone] = useState(null);
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState(null);
  const [qrOpen, setQrOpen] = useState(false);

  const [conversations, setConversations] = useState([]);
  const [activeLeadId, setActiveLeadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loadingConvos, setLoadingConvos] = useState(false);

  const [editLeadOpen, setEditLeadOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  // A "draft" conversation for a lead with no WhatsApp history yet. It's shown
  // in the list and as the open thread until the first message lands, at which
  // point loadConversations() returns the real row and this is dropped.
  const [draftConvo, setDraftConvo] = useState(null);
  const threadRef = useRef(null);

  const loadStatus = useCallback(async () => {
    try {
      const r = await whatsappApi.connection.status();
      setStatus(r?.data?.status || "disconnected");
      setPhone(r?.data?.phone || null);
    } catch { setStatus("disconnected"); }
  }, []);

  const loadConversations = useCallback(async () => {
    setLoadingConvos(true);
    try {
      const r = await whatsappApi.connection.conversations();
      setConversations(r?.data || []);
    } catch { setConversations([]); }
    finally { setLoadingConvos(false); }
  }, []);

  const loadMessages = useCallback(async (leadId) => {
    if (!leadId) return;
    try {
      const r = await whatsappApi.connection.messages(leadId);
      setMessages(r?.data || []);
    } catch { setMessages([]); }
  }, []);

  // Initial status; load conversations once connected.
  useEffect(() => { loadStatus(); }, [loadStatus]);
  useEffect(() => { if (status === "connected") loadConversations(); }, [status, loadConversations]);

  // Realtime: QR / ready / disconnect / inbound message / ack.
  useEffect(() => {
    const off = onNotification((evt) => {
      switch (evt?.type) {
        case "whatsapp_qr":
          setQr(evt.qr); setStatus("pending_qr"); setQrOpen(true); break;
        case "whatsapp_ready":
          setStatus("connected"); setPhone(evt.phone || null); setQrOpen(false); setQr(null); loadConversations(); break;
        case "whatsapp_disconnected":
          setStatus("disconnected"); setPhone(null); break;
        case "whatsapp_message":
          loadConversations();
          if (evt.lead_id && evt.lead_id === activeLeadId) loadMessages(activeLeadId);
          break;
        case "whatsapp_status":
          setMessages((prev) => prev.map((m) =>
            m.provider_message_id === evt.provider_message_id ? { ...m, status: evt.status } : m));
          break;
        default: break;
      }
    });
    return off;
  }, [activeLeadId, loadConversations, loadMessages]);

  // Auto-scroll thread to bottom on new messages.
  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages]);

  const handleConnect = async () => {
    setBusy(true);
    try { await whatsappApi.connection.connect(); setStatus("pending_qr"); setQrOpen(true); }
    catch (e) { alert(e.message || "Failed to start WhatsApp connection"); }
    finally { setBusy(false); }
  };

  const handleLogout = async () => {
    setBusy(true);
    try { await whatsappApi.connection.logout(); setStatus("disconnected"); setPhone(null); setConversations([]); setMessages([]); setActiveLeadId(null); }
    catch (e) { alert(e.message || "Failed to disconnect"); }
    finally { setBusy(false); }
  };

  const openConversation = (leadId) => { setActiveLeadId(leadId); loadMessages(leadId); };

  // From the "Start new chat" picker: open an empty thread for the chosen lead.
  // If they already have history it just selects the existing conversation;
  // otherwise we seed a draft conversation so the thread renders immediately.
  const openLeadChat = (lead) => {
    setNewChatOpen(false);
    if (!lead) return;
    const existing = conversations.find((c) => c.lead_id === lead.id);
    if (!existing) {
      setDraftConvo({
        lead_id: lead.id,
        lead_name: lead.name,
        phone: lead.phone,
        whatsapp_number: lead.whatsapp_number,
        last_body: "",
        last_at: null,
        unread: 0,
      });
    }
    setActiveLeadId(lead.id);
    loadMessages(lead.id);
  };

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || !activeLeadId) return;
    setDraft("");
    try {
      await whatsappApi.connection.send({ lead_id: activeLeadId, body });
      setDraftConvo((d) => (d && d.lead_id === activeLeadId ? null : d)); // real row replaces the draft
      await loadMessages(activeLeadId);
      loadConversations();
    } catch (e) { alert(e.message || "Failed to send"); setDraft(body); }
  };

  // Merge any draft conversation into the list (at the top) so the new chat is
  // visible and selectable before the first message lands.
  const shownConversations = draftConvo && !conversations.some((c) => c.lead_id === draftConvo.lead_id)
    ? [draftConvo, ...conversations]
    : conversations;
  const activeConvo = shownConversations.find((c) => c.lead_id === activeLeadId);

  return (
    <div className="wa-container">
      <div className="wa-header">
        <h2 className="wa-title">WhatsApp Chat</h2>
        <div className="wa-header-icons">
          <IconButton size="small" className="wa-header-icon" onClick={() => { loadStatus(); loadConversations(); }}>
            <RefreshIcon />
          </IconButton>
        </div>
      </div>

      <ConnectionBar status={status} phone={phone} onConnect={handleConnect} onLogout={handleLogout} busy={busy} />

      {status === "connected" ? (
        <div className="wa-chat-layout">
          {/* Conversation list */}
          <div className="wa-convo-list">
            <div className="wa-convo-list-head">
              <span>Chats</span>
              <Button size="small" startIcon={<AddCommentIcon fontSize="small" />} onClick={() => setNewChatOpen(true)}>
                New chat
              </Button>
            </div>
            {loadingConvos && <div style={{ padding: 16, textAlign: "center" }}><CircularProgress size={20} /></div>}
            {!loadingConvos && shownConversations.length === 0 && (
              <div className="wa-empty-note">No conversations yet. Start one with “New chat”, or replies will appear here.</div>
            )}
            {shownConversations.map((c) => (
              <div
                key={c.lead_id}
                className={`wa-convo-item ${c.lead_id === activeLeadId ? "active" : ""}`}
                onClick={() => openConversation(c.lead_id)}
              >
                <div className="wa-convo-top">
                  <span className="wa-convo-name">{c.lead_name || c.phone || c.whatsapp_number || "Unknown"}</span>
                  {c.unread > 0 && <span className="wa-convo-unread">{c.unread}</span>}
                </div>
                <div className="wa-convo-preview">{c.last_body || ""}</div>
                <div className="wa-convo-time">{fmtTime(c.last_at)}</div>
              </div>
            ))}
          </div>

          {/* Thread */}
          <div className="wa-thread-pane">
            {activeLeadId ? (
              <>
                <div className="wa-thread-header">
                  <span className="wa-thread-name">{activeConvo?.lead_name || activeConvo?.phone || "Conversation"}</span>
                  {activeConvo?.lead_id && (
                    <Tooltip title="Open lead">
                      <IconButton size="small" onClick={() => { setSelectedLead({ id: activeConvo.lead_id }); setEditLeadOpen(true); }}>
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </div>
                <div className="wa-thread-body" ref={threadRef}>
                  {messages.map((m) => (
                    <div key={`${m.direction}-${m.id}`} className={`wa-bubble ${m.direction === "out" ? "out" : "in"}`}>
                      <div className="wa-bubble-text">{m.body}</div>
                      <div className="wa-bubble-meta">
                        {fmtTime(m.at)}{m.direction === "out" && m.status ? ` · ${m.status}` : ""}
                      </div>
                    </div>
                  ))}
                  {messages.length === 0 && <div className="wa-empty-note">No messages yet — say hello.</div>}
                </div>
                <div className="wa-composer">
                  <TextField
                    fullWidth size="small" placeholder="Type a message…"
                    value={draft} onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    multiline maxRows={4}
                  />
                  <IconButton color="primary" onClick={handleSend} disabled={!draft.trim()}><SendIcon /></IconButton>
                </div>
              </>
            ) : (
              <div className="wa-empty-note" style={{ margin: "auto" }}>Select a conversation</div>
            )}
          </div>
        </div>
      ) : (
        <div className="wa-disconnected-hint">
          <WhatsAppIcon style={{ fontSize: 48, color: "#25D366" }} />
          <p>Connect your WhatsApp to chat with leads from your own number.</p>
          <Chip size="small" label="Unofficial WhatsApp Web link — avoid bulk messaging to reduce ban risk" sx={{ fontSize: 11 }} />
        </div>
      )}

      <QrDialog open={qrOpen} qr={qr} onClose={() => setQrOpen(false)} />

      <NewChatDialog open={newChatOpen} onClose={() => setNewChatOpen(false)} onPick={openLeadChat} />

      <AddNewLead open={editLeadOpen} onClose={() => setEditLeadOpen(false)} leadData={selectedLead} />
    </div>
  );
}
