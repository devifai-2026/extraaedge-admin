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
import AttachFileIcon from "@mui/icons-material/AttachFile";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import SearchIcon from "@mui/icons-material/Search";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import CloseIcon from "@mui/icons-material/Close";
import QRCode from "qrcode";
import "./WhatAppsList.css";
import { whatsappApi, leadsApi, uploadsApi } from "../../lib/endpoints";
import { onNotification, connectSocket, isSocketConnected } from "../../lib/socket";
import AddNewLead from "../../components/AddNewLead/AddNewLead";

const MAX_ATTACH_BYTES = 16 * 1024 * 1024; // WhatsApp media cap is ~16 MB

const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true }) : "";

// Two initials for the contact avatar.
const initialsOf = (name) =>
  (name || "?").split(" ").map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

// Deterministic avatar tint from a string, so each contact keeps a stable color.
const AVATAR_COLORS = ["#0088cc", "#e17076", "#7bc862", "#a695e7", "#ee9e58", "#6ec9cb", "#faa774", "#5ca6e0"];
const colorFor = (key) => {
  let h = 0;
  for (let i = 0; i < (key || "").length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

// Lazily resolves an r2_key to a short-lived signed URL and renders the media.
// Images show inline; anything else shows as a download chip. Used for both
// outbound (message_log.media_r2_key) and inbound (message_reply.media_urls[]).
function MediaAttachment({ mediaKey, mediaType }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    if (!mediaKey) return;
    uploadsApi
      .signedUrl(mediaKey)
      .then((r) => { if (alive) setUrl(r?.data?.url || r?.url || null); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [mediaKey]);

  const isImage = mediaType ? mediaType.startsWith("image/") : /\.(png|jpe?g|gif|webp)$/i.test(mediaKey || "");
  const name = (mediaKey || "attachment").split("/").pop();

  if (failed) return <div className="wa-media-fallback">📎 Attachment unavailable</div>;
  if (!url) return <div className="wa-media-loading"><CircularProgress size={16} /></div>;
  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="wa-media-img-link">
        <img src={url} alt="attachment" className="wa-media-img" />
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="wa-media-file">
      <InsertDriveFileIcon fontSize="small" />
      <span className="wa-media-file-name">{name}</span>
    </a>
  );
}

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
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);
  // True once a QR has arrived since the last connect attempt (see handleConnect
  // retry loop + the whatsapp_qr notification handler).
  const qrArrivedRef = useRef(false);

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
      const d = r?.data || {};
      // Trust the live gateway status when present (it reflects the socket that
      // actually holds the WhatsApp session); fall back to the DB row.
      const effective = d.live_status || d.status || "disconnected";
      setStatus(effective);
      setPhone(d.phone || null);

      if (effective === "connected") {
        // Pairing finished — flip the UI to the chat view even if the
        // whatsapp_ready socket push never arrived (pull beats push).
        setQrOpen(false);
        setQr(null);
      } else if ((d.live_status === "pending_qr" || d.status === "pending_qr") && d.qr) {
        // Gateway is holding a QR — show it (reliable fallback to the push).
        qrArrivedRef.current = true;
        setQr(d.qr);
        setQrOpen(true);
      }
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
          qrArrivedRef.current = true;
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

  // While pending_qr, poll /status every 4s so (a) the shown QR stays fresh (it
  // rotates ~every 20s) and (b) we detect the flip to "connected" even if the
  // whatsapp_ready socket push is missed. Runs whenever we're waiting to link,
  // not just while the dialog is open, so the UI still flips to connected if the
  // user leaves the dialog open in the background.
  useEffect(() => {
    if (status !== "pending_qr") return undefined;
    const t = setInterval(() => { loadStatus(); }, 4000);
    return () => clearInterval(t);
  }, [status, loadStatus]);

  // Auto-scroll thread to bottom on new messages.
  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages]);

  const handleConnect = async () => {
    setBusy(true);
    qrArrivedRef.current = false;
    try {
      // Make sure the socket is connected BEFORE we ask for a QR, so we don't
      // miss the first emission (the classic socket-join race). Give it a
      // moment to actually establish.
      if (!isSocketConnected()) {
        connectSocket();
        await new Promise((r) => setTimeout(r, 800));
      }
      await whatsappApi.connection.connect();
      setStatus("pending_qr");
      setQrOpen(true);

      // Fallback: if no QR shows up shortly (socket push missed, or a cold
      // gateway was still waking), poll /status — which now returns the QR the
      // gateway is holding — and re-poke connect. Pull beats push here.
      for (let i = 0; i < 6 && !qrArrivedRef.current; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        if (qrArrivedRef.current) break;
        await loadStatus();                        // pulls the QR if the gateway has one
        if (qrArrivedRef.current) break;
        try { await whatsappApi.connection.connect(); } catch { /* keep waiting */ }
      }
    } catch (e) {
      alert(e.message || "Failed to start WhatsApp connection");
    } finally {
      setBusy(false);
    }
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

  // Text send (optionally carrying an already-uploaded attachment key).
  const sendMessage = async ({ body, mediaKey }) => {
    if (!activeLeadId) return;
    setSending(true);
    try {
      await whatsappApi.connection.send({
        lead_id: activeLeadId,
        ...(body ? { body } : {}),
        ...(mediaKey ? { media_r2_key: mediaKey } : {}),
      });
      setDraftConvo((d) => (d && d.lead_id === activeLeadId ? null : d)); // real row replaces the draft
      await loadMessages(activeLeadId);
      loadConversations();
      return true;
    } catch (e) {
      alert(e.message || "Failed to send");
      return false;
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || !activeLeadId) return;
    setDraft("");
    const ok = await sendMessage({ body });
    if (!ok) setDraft(body); // restore on failure so the user doesn't lose it
  };

  // Attach: upload the file via the shared presign → PUT to GCS → confirm
  // pipeline (same as AvatarUploader), then send it as a WhatsApp message with
  // whatever text is currently in the composer as the caption.
  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file || !activeLeadId) return;
    if (file.size > MAX_ATTACH_BYTES) { alert("File is over 16 MB. Pick a smaller one."); return; }

    const caption = draft.trim();
    setSending(true);
    try {
      const presign = await uploadsApi.presign({
        purpose: "whatsapp",
        content_type: file.type || "application/octet-stream",
        size_bytes: file.size,
        filename: file.name,
      });
      const { upload_url, method, headers, r2_key } = presign?.data ?? presign;
      const putRes = await fetch(upload_url, {
        method: method || "PUT",
        headers: headers || { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`);
      await uploadsApi.confirm({ purpose: "whatsapp", r2_key });

      setDraft("");
      const ok = await sendMessage({ body: caption, mediaKey: r2_key });
      if (!ok) setDraft(caption);
    } catch (err) {
      alert(err?.message || "Failed to attach file");
    } finally {
      setSending(false);
    }
  };

  // Merge any draft conversation into the list (at the top) so the new chat is
  // visible and selectable before the first message lands.
  const allConversations = draftConvo && !conversations.some((c) => c.lead_id === draftConvo.lead_id)
    ? [draftConvo, ...conversations]
    : conversations;
  const q = search.trim().toLowerCase();
  const shownConversations = q
    ? allConversations.filter((c) =>
        `${c.lead_name || ""} ${c.phone || ""} ${c.whatsapp_number || ""}`.toLowerCase().includes(q))
    : allConversations;
  const activeConvo = allConversations.find((c) => c.lead_id === activeLeadId);

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
            <div className="wa-convo-search">
              <SearchIcon fontSize="small" className="wa-convo-search-icon" />
              <input
                className="wa-convo-search-input"
                placeholder="Search chats"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {loadingConvos && <div style={{ padding: 16, textAlign: "center" }}><CircularProgress size={20} /></div>}
            {!loadingConvos && shownConversations.length === 0 && (
              <div className="wa-empty-note">
                {q ? "No chats match your search." : "No conversations yet. Start one with “New chat”, or replies will appear here."}
              </div>
            )}
            {shownConversations.map((c) => {
              const label = c.lead_name || c.phone || c.whatsapp_number || "Unknown";
              return (
                <div
                  key={c.lead_id}
                  className={`wa-convo-item ${c.lead_id === activeLeadId ? "active" : ""}`}
                  onClick={() => openConversation(c.lead_id)}
                >
                  <div className="wa-avatar" style={{ background: colorFor(c.lead_id || label) }}>
                    {initialsOf(label)}
                  </div>
                  <div className="wa-convo-body">
                    <div className="wa-convo-top">
                      <span className="wa-convo-name">{label}</span>
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
            {activeLeadId ? (
              <>
                <div className="wa-thread-header">
                  <div className="wa-thread-head-left">
                    {(() => {
                      const label = activeConvo?.lead_name || activeConvo?.phone || "Conversation";
                      return (
                        <>
                          <div className="wa-avatar wa-avatar-sm" style={{ background: colorFor(activeLeadId || label) }}>
                            {initialsOf(label)}
                          </div>
                          <div>
                            <div className="wa-thread-name">{label}</div>
                            {activeConvo?.whatsapp_number || activeConvo?.phone ? (
                              <div className="wa-thread-sub">{activeConvo.whatsapp_number || activeConvo.phone}</div>
                            ) : null}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  {activeConvo?.lead_id && (
                    <Tooltip title="Open lead">
                      <IconButton size="small" onClick={() => { setSelectedLead({ id: activeConvo.lead_id }); setEditLeadOpen(true); }}>
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
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
                          {m.direction === "out" && m.status && (
                            <DoneAllIcon className={`wa-tick ${seen ? "seen" : ""}`} style={{ fontSize: 14 }} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {messages.length === 0 && <div className="wa-empty-note">No messages yet — say hello.</div>}
                </div>
                <div className="wa-composer">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf,audio/*,video/*,.doc,.docx,.xls,.xlsx,.csv"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                  <Tooltip title="Attach file">
                    <span>
                      <IconButton onClick={handlePickFile} disabled={sending}>
                        <AttachFileIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <TextField
                    fullWidth size="small" placeholder="Type a message…"
                    value={draft} onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    multiline maxRows={4}
                    disabled={sending}
                  />
                  <IconButton color="primary" onClick={handleSend} disabled={!draft.trim() || sending}>
                    {sending ? <CircularProgress size={20} /> : <SendIcon />}
                  </IconButton>
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
