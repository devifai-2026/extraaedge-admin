// Remarketing — Facebook Custom Audiences (OUTBOUND).
// Push CRM lead segments to Facebook as Custom Audiences for ad targeting.
// Two sections:
//   1) Connected FB ad accounts — list + "Connect ad account" form. The backend
//      connect endpoint (POST /remarketing/accounts/connect) is still being
//      implemented and may return 501 until FB app credentials are configured;
//      we handle that gracefully with a "coming soon / needs FB token" message.
//   2) Custom Audiences — list (with sync_status), create (name/description +
//      pick a connected ad account + audience filter builder), and a
//      "Sync to Facebook" action per audience.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button, IconButton, CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Tooltip, MenuItem, Alert, Chip, Autocomplete,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import LinkIcon from "@mui/icons-material/Link";
import SyncIcon from "@mui/icons-material/Sync";
import GroupsIcon from "@mui/icons-material/Groups";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import FacebookIcon from "@mui/icons-material/Facebook";
import {
  remarketingApi, dropdownsApi, programsApi, tagsApi, usersApi,
} from "../../lib/endpoints";
import { auth } from "../../lib/api";
import { colors } from "../../theme/colors";
import "./Remarketing.css";

const MANAGE_ROLES = ["super_admin", "branch_manager", "sales_manager"];

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

const SYNC_META = {
  pending: { label: "Pending", color: colors.warning },
  synced: { label: "Synced", color: colors.success },
  failed: { label: "Failed", color: colors.error },
};

const SyncStatusChip = ({ status }) => {
  const meta = SYNC_META[status] || { label: status || "—", color: colors.textGrey };
  return (
    <Chip
      size="small"
      label={meta.label}
      sx={{
        fontWeight: 600,
        color: colors.white,
        backgroundColor: meta.color,
        textTransform: "capitalize",
      }}
    />
  );
};

// Count the non-empty filter keys so the audience card can show "N filters".
const countFilters = (f) =>
  Object.values(f || {}).filter((v) => (Array.isArray(v) ? v.length > 0 : !!v)).length;

// ---- Create-audience dialog (name/description + ad account + filter builder) ----
function CreateAudienceDialog({
  open, onClose, onCreate, accounts, options,
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [adAccountId, setAdAccountId] = useState("");
  const [stageIds, setStageIds] = useState([]);
  const [programIds, setProgramIds] = useState([]);
  const [assignedTo, setAssignedTo] = useState([]);
  const [sources, setSources] = useState([]);
  const [channels, setChannels] = useState([]);
  const [tagIds, setTagIds] = useState([]);
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) {
      setName(""); setDescription(""); setAdAccountId("");
      setStageIds([]); setProgramIds([]); setAssignedTo([]);
      setSources([]); setChannels([]); setTagIds([]);
      setCreatedFrom(""); setCreatedTo(""); setErr(""); setSaving(false);
    } else if (accounts.length === 1) {
      setAdAccountId(accounts[0].id);
    }
  }, [open, accounts]);

  // Build audience_filter_json from the picker state. uuid[] keys carry ids;
  // sources/channels carry the option *name* (text[], resolver ILIKEs them).
  const buildFilter = () => {
    const filter = {};
    if (stageIds.length) filter.stage_ids = stageIds.map((o) => o.id);
    if (programIds.length) filter.program_ids = programIds.map((o) => o.id);
    if (assignedTo.length) filter.assigned_to = assignedTo.map((o) => o.id);
    if (sources.length) filter.sources = sources.map((o) => o.name);
    if (channels.length) filter.channels = channels.map((o) => o.name);
    if (tagIds.length) filter.tag_ids = tagIds.map((o) => o.id);
    if (createdFrom) filter.created_from = createdFrom;
    if (createdTo) filter.created_to = createdTo;
    return filter;
  };

  const submit = async () => {
    setErr("");
    if (!name.trim()) { setErr("Give the audience a name."); return; }
    if (!adAccountId) { setErr("Pick a connected ad account."); return; }
    const audience_filter_json = buildFilter();
    if (Object.keys(audience_filter_json).length === 0) {
      setErr("Add at least one filter so the audience isn't your entire CRM.");
      return;
    }
    setSaving(true);
    try {
      await onCreate({
        fb_ad_account_id: adAccountId,
        name: name.trim(),
        description: description.trim() || undefined,
        audience_filter_json,
      });
      onClose();
    } catch (e) {
      setErr(e?.message || "Could not create audience.");
    } finally {
      setSaving(false);
    }
  };

  const multi = (label, value, setValue, opts, getLabel) => (
    <Autocomplete
      multiple size="small" options={opts} value={value}
      getOptionLabel={getLabel}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      onChange={(_e, v) => setValue(v)}
      renderTags={(vals, getTagProps) =>
        vals.map((option, index) => (
          <Chip size="small" label={getLabel(option)} {...getTagProps({ index })} key={option.id} />
        ))
      }
      renderInput={(params) => <TextField {...params} label={label} placeholder="Any" />}
    />
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create Custom Audience</DialogTitle>
      <DialogContent dividers>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <TextField
            label="Audience name" size="small" fullWidth autoFocus required
            value={name} onChange={(e) => setName(e.target.value)}
          />
          <TextField
            label="Description (optional)" size="small" fullWidth multiline minRows={2}
            value={description} onChange={(e) => setDescription(e.target.value)}
          />
          <TextField
            select label="Ad account" size="small" fullWidth required
            value={adAccountId} onChange={(e) => setAdAccountId(e.target.value)}
            helperText={accounts.length === 0 ? "Connect an ad account first." : ""}
          >
            {accounts.length === 0 && <MenuItem value="" disabled>No connected ad accounts</MenuItem>}
            {accounts.map((a) => (
              <MenuItem key={a.id} value={a.id}>{a.name} ({a.ad_account_id})</MenuItem>
            ))}
          </TextField>

          <div className="rm-filter-heading">Audience filter — matching leads become the audience</div>
          {multi("Stages", stageIds, setStageIds, options.stages, (o) => o.name)}
          {multi("Programs", programIds, setProgramIds, options.programs, (o) => o.name)}
          {multi("Assigned to", assignedTo, setAssignedTo, options.users, (o) => o.name)}
          {multi("Sources", sources, setSources, options.sources, (o) => o.name)}
          {multi("Channels", channels, setChannels, options.channels, (o) => o.name)}
          {multi("Tags", tagIds, setTagIds, options.tags, (o) => o.name)}
          <div style={{ display: "flex", gap: 12 }}>
            <TextField
              label="Created from" type="date" size="small" fullWidth
              InputLabelProps={{ shrink: true }}
              value={createdFrom} onChange={(e) => setCreatedFrom(e.target.value)}
            />
            <TextField
              label="Created to" type="date" size="small" fullWidth
              InputLabelProps={{ shrink: true }}
              value={createdTo} onChange={(e) => setCreatedTo(e.target.value)}
            />
          </div>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button
          variant="contained" onClick={submit} disabled={saving}
          sx={{ background: colors.primary, "&:hover": { background: colors.primaryDark } }}
        >
          {saving ? "Creating…" : "Create audience"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ---- Connect-ad-account dialog ----
// Per-tenant Facebook App credentials (App ID + Secret). Shows the exact OAuth
// redirect URI the user must add in their Meta app.
function FbAppSettingsDialog({ open, onClose, current, onSave }) {
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (open) { setAppId(current?.app_id || ""); setAppSecret(current?.app_secret || ""); setErr(""); }
  }, [open, current]);
  const redirectUri = `${(import.meta.env.VITE_API_BASE_URL || "https://admissioncrm.live/api/v1").replace(/\/api\/v1\/?$/, "")}/api/v1/remarketing/oauth/callback`;
  const submit = async () => {
    setSaving(true); setErr("");
    try { await onSave({ app_id: appId.trim(), app_secret: appSecret === "••••••••" ? undefined : appSecret.trim(), enabled: true }); }
    catch (e) { setErr(e?.message || "Save failed"); }
    finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Facebook App settings</DialogTitle>
      <DialogContent>
        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
          Enter your Meta app's ID and secret (from developers.facebook.com → App settings → Basic).
          Then in your Meta app → <b>Facebook Login for Business → Settings</b>, add this exact
          <b> Valid OAuth Redirect URI</b>:
        </div>
        <TextField size="small" fullWidth value={redirectUri} InputProps={{ readOnly: true }} onFocus={(e) => e.target.select()} sx={{ mb: 2 }} />
        <TextField size="small" fullWidth label="App ID" value={appId} onChange={(e) => setAppId(e.target.value)} sx={{ mb: 2 }} />
        <TextField size="small" fullWidth label="App Secret" type="password" value={appSecret} onChange={(e) => setAppSecret(e.target.value)} helperText="Leave the •••• to keep the saved secret." />
        {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={saving || !appId.trim()} onClick={submit}>{saving ? "Saving…" : "Save"}</Button>
      </DialogActions>
    </Dialog>
  );
}

function ConnectAccountDialog({ open, onClose, onConnect }) {
  const [adAccountId, setAdAccountId] = useState("");
  const [name, setName] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [notImplemented, setNotImplemented] = useState(false);

  useEffect(() => {
    if (!open) {
      setAdAccountId(""); setName(""); setAccessToken("");
      setErr(""); setNotImplemented(false); setSaving(false);
    }
  }, [open]);

  const submit = async () => {
    setErr(""); setNotImplemented(false);
    if (!adAccountId.trim() || !name.trim() || !accessToken.trim()) {
      setErr("Ad account ID, name and access token are all required.");
      return;
    }
    setSaving(true);
    try {
      await onConnect({
        ad_account_id: adAccountId.trim(),
        name: name.trim(),
        access_token: accessToken.trim(),
      });
      onClose();
    } catch (e) {
      // 501 = backend connect flow not wired yet (needs FB app credentials).
      if (e?.status === 501) setNotImplemented(true);
      else setErr(e?.message || "Could not connect the ad account.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Connect Facebook ad account</DialogTitle>
      <DialogContent dividers>
        {notImplemented ? (
          <Alert severity="info">
            Connecting Facebook ad accounts is coming soon. The server-side OAuth
            connect flow still needs Facebook app credentials and a valid FB access
            token before accounts can be linked.
          </Alert>
        ) : (
          <>
            {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 4 }}>
              <TextField
                label="Ad account ID" size="small" fullWidth autoFocus required
                placeholder="act_1234567890"
                value={adAccountId} onChange={(e) => setAdAccountId(e.target.value)}
              />
              <TextField
                label="Display name" size="small" fullWidth required
                value={name} onChange={(e) => setName(e.target.value)}
              />
              <TextField
                label="Access token" size="small" fullWidth required
                type="password"
                value={accessToken} onChange={(e) => setAccessToken(e.target.value)}
                helperText="A long-lived Facebook Marketing API token."
              />
            </div>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>{notImplemented ? "Close" : "Cancel"}</Button>
        {!notImplemented && (
          <Button
            variant="contained" onClick={submit} disabled={saving}
            sx={{ background: colors.primary, "&:hover": { background: colors.primaryDark } }}
          >
            {saving ? "Connecting…" : "Connect"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default function Remarketing() {
  const role = auth.getUser()?.role;
  const canManage = MANAGE_ROLES.includes(role);

  const [accounts, setAccounts] = useState([]);
  const [audiences, setAudiences] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingAudiences, setLoadingAudiences] = useState(true);
  const [accountsErr, setAccountsErr] = useState("");
  const [audiencesErr, setAudiencesErr] = useState("");

  const [connectOpen, setConnectOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  const [toast, setToast] = useState("");
  // Per-tenant Facebook app settings (App ID + Secret) — required before OAuth.
  const [fbSettings, setFbSettings] = useState(null);
  const [fbSettingsOpen, setFbSettingsOpen] = useState(false);
  const loadFbSettings = useCallback(async () => {
    if (!canManage) return;
    try { const r = await remarketingApi.fbSettings(); setFbSettings(r?.data || null); }
    catch { setFbSettings(null); }
  }, [canManage]);
  useEffect(() => { loadFbSettings(); }, [loadFbSettings]);

  // Filter-builder option sources.
  const [options, setOptions] = useState({
    stages: [], programs: [], users: [], sources: [], channels: [], tags: [],
  });

  const loadAccounts = useCallback(async () => {
    // The accounts list is role-gated server-side (manager+). For roles that
    // can't manage, skip the call and just show the empty/locked state.
    if (!canManage) { setLoadingAccounts(false); setAccounts([]); return; }
    setLoadingAccounts(true); setAccountsErr("");
    try {
      const r = await remarketingApi.accounts();
      setAccounts(r?.data || []);
    } catch (e) {
      setAccountsErr(e?.message || "Could not load ad accounts.");
      setAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  }, [canManage]);

  const loadAudiences = useCallback(async () => {
    setLoadingAudiences(true); setAudiencesErr("");
    try {
      const r = await remarketingApi.audiences();
      setAudiences(r?.data || []);
    } catch (e) {
      setAudiencesErr(e?.message || "Could not load audiences.");
      setAudiences([]);
    } finally {
      setLoadingAudiences(false);
    }
  }, []);

  useEffect(() => { loadAccounts(); loadAudiences(); }, [loadAccounts, loadAudiences]);

  // Load filter-builder options once (best-effort; failures leave empty pickers).
  useEffect(() => {
    if (!canManage) return;
    let alive = true;
    const pick = (r) => (alive ? r?.data || [] : []);
    Promise.allSettled([
      dropdownsApi.stages(), programsApi.list(), usersApi.list(),
      dropdownsApi.sources(), dropdownsApi.channels(), tagsApi.list(),
    ]).then(([st, pr, us, so, ch, tg]) => {
      if (!alive) return;
      setOptions({
        stages: st.status === "fulfilled" ? pick(st.value) : [],
        programs: pr.status === "fulfilled" ? pick(pr.value) : [],
        users: us.status === "fulfilled" ? (pick(us.value) || []).filter((u) => u?.is_active !== false) : [],
        sources: so.status === "fulfilled" ? pick(so.value) : [],
        channels: ch.status === "fulfilled" ? pick(ch.value) : [],
        tags: tg.status === "fulfilled" ? pick(tg.value) : [],
      });
    });
    return () => { alive = false; };
  }, [canManage]);

  const accountName = useMemo(() => {
    const m = {};
    accounts.forEach((a) => { m[a.id] = a.name; });
    return m;
  }, [accounts]);

  const handleConnect = async (body) => {
    await remarketingApi.connectAccount(body);
    setToast("Ad account connected.");
    await loadAccounts();
  };

  // "Connect with Facebook" — open the OAuth dialog in a popup. The backend
  // callback stores the user's ad accounts + pages and postMessages back.
  const [oauthBusy, setOauthBusy] = useState(false);
  const connectWithFacebook = async () => {
    setOauthBusy(true);
    try {
      const r = await remarketingApi.oauthStart();
      const url = r?.data?.url;
      if (!url) throw new Error("Facebook is not configured on the server.");
      const popup = window.open(url, "fb-oauth", "width=600,height=720");
      const onMsg = async (e) => {
        if (e?.data?.source !== "fb-oauth") return;
        window.removeEventListener("message", onMsg);
        try { popup && popup.close(); } catch { /* ignore */ }
        if (e.data.ok) { setToast("Facebook connected."); await loadAccounts(); await loadAudiences(); }
        else setToast("Facebook connection was cancelled or failed.");
      };
      window.addEventListener("message", onMsg);
    } catch (err) {
      setToast(err?.message || "Could not start Facebook connect.");
    } finally { setOauthBusy(false); }
  };

  const handleCreate = async (body) => {
    await remarketingApi.createAudience(body);
    setToast("Custom audience created.");
    await loadAudiences();
  };

  const handleSaveFbSettings = async (body) => {
    await remarketingApi.saveFbSettings(body);
    setToast("Facebook app settings saved.");
    setFbSettingsOpen(false);
    await loadFbSettings();
  };

  const handleSync = async (id) => {
    setSyncingId(id);
    try {
      await remarketingApi.syncAudience(id);
      setToast("Sync to Facebook queued.");
      await loadAudiences();
    } catch (e) {
      setToast(e?.message || "Could not queue sync.");
    } finally {
      setSyncingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this custom audience? This does not remove it from Facebook.")) return;
    try {
      await remarketingApi.deleteAudience(id);
      setToast("Audience deleted.");
      await loadAudiences();
    } catch (e) {
      setToast(e?.message || "Could not delete audience.");
    }
  };

  return (
    <div className="fb-container rm-container">
      {/* Header */}
      <div className="fb-header">
        <div className="fb-tab">
          <FacebookIcon fontSize="small" style={{ verticalAlign: "middle", marginRight: 6 }} />
          Facebook Audiences
        </div>
        <IconButton
          size="small"
          onClick={() => { loadAccounts(); loadAudiences(); }}
          title="Refresh"
        >
          <RefreshIcon />
        </IconButton>
      </div>

      {toast && (
        <Alert severity="info" onClose={() => setToast("")} sx={{ mb: 2 }}>{toast}</Alert>
      )}

      <div className="fb-content rm-content">
        {/* ---------- Connected ad accounts ---------- */}
        <section className="rm-section">
          <div className="rm-section-head">
            <div className="rm-section-title">
              <LinkIcon fontSize="small" /> Connected ad accounts
            </div>
            {canManage && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Tooltip title={fbSettings?.configured ? "" : "Add your Facebook App ID + Secret first"}>
                  <span>
                    <Button
                      size="small" variant="contained" disabled={oauthBusy || !fbSettings?.configured}
                      onClick={connectWithFacebook}
                      sx={{ textTransform: "none", bgcolor: "#1877F2", "&:hover": { bgcolor: "#166FE0" } }}
                    >
                      {oauthBusy ? "Connecting…" : "Connect with Facebook"}
                    </Button>
                  </span>
                </Tooltip>
                <Button
                  size="small" variant="outlined"
                  onClick={() => setFbSettingsOpen(true)}
                  sx={{ textTransform: "none" }}
                >
                  {fbSettings?.configured ? "Facebook App ✓" : "Set up Facebook App"}
                </Button>
                {/* Advanced/manual fallback (paste a token) */}
                <Button
                  size="small" variant="text" startIcon={<AddIcon />}
                  onClick={() => setConnectOpen(true)}
                  sx={{ textTransform: "none", color: "#6b7280" }}
                >
                  Enter token manually
                </Button>
              </div>
            )}
          </div>

          {!canManage ? (
            <div className="rm-empty">
              You don’t have permission to manage Facebook ad accounts.
            </div>
          ) : loadingAccounts ? (
            <div className="rm-loading"><CircularProgress size={22} /></div>
          ) : accountsErr ? (
            <Alert severity="error" action={<Button size="small" onClick={loadAccounts}>Retry</Button>}>
              {accountsErr}
            </Alert>
          ) : accounts.length === 0 ? (
            <div className="rm-empty">
              No ad accounts connected yet. Connect a Facebook ad account to push
              your CRM segments as Custom Audiences.
            </div>
          ) : (
            <div className="rm-account-grid">
              {accounts.map((a) => (
                <div key={a.id} className="rm-account-card">
                  <div className="rm-account-name">
                    <FacebookIcon fontSize="small" style={{ color: "#1877F2" }} /> {a.name}
                  </div>
                  <div className="rm-account-meta">ID: {a.ad_account_id}</div>
                  <div className="rm-account-meta">Connected {fmtDate(a.connected_at)}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ---------- Custom audiences ---------- */}
        <section className="rm-section">
          <div className="rm-section-head">
            <div className="rm-section-title">
              <GroupsIcon fontSize="small" /> Custom Audiences
            </div>
            {canManage && (
              <Button
                size="small" variant="contained" startIcon={<AddIcon />}
                onClick={() => setCreateOpen(true)}
                disabled={accounts.length === 0}
                title={accounts.length === 0 ? "Connect an ad account first" : ""}
                sx={{ textTransform: "none", background: colors.primary, "&:hover": { background: colors.primaryDark } }}
              >
                Create audience
              </Button>
            )}
          </div>

          {loadingAudiences ? (
            <div className="rm-loading"><CircularProgress size={22} /></div>
          ) : audiencesErr ? (
            <Alert severity="error" action={<Button size="small" onClick={loadAudiences}>Retry</Button>}>
              {audiencesErr}
            </Alert>
          ) : audiences.length === 0 ? (
            <div className="rm-empty">
              No custom audiences yet.{canManage ? " Create one to push a CRM segment to Facebook." : ""}
            </div>
          ) : (
            <div className="rm-aud-grid">
              {audiences.map((aud) => (
                <div key={aud.id} className="rm-aud-card">
                  <div className="rm-aud-top">
                    <div className="rm-aud-name">{aud.name}</div>
                    <SyncStatusChip status={aud.sync_status} />
                  </div>
                  {aud.description && <div className="rm-aud-desc">{aud.description}</div>}
                  <div className="rm-aud-meta">
                    <span>{accountName[aud.fb_ad_account_id] || "—"}</span>
                    <span>·</span>
                    <span>{countFilters(aud.audience_filter_json)} filter(s)</span>
                    {typeof aud.lead_count === "number" && (
                      <>
                        <span>·</span>
                        <span>{aud.lead_count} leads</span>
                      </>
                    )}
                  </div>
                  <div className="rm-aud-meta">
                    Created {fmtDate(aud.created_at)}
                    {aud.last_synced_at ? ` · Synced ${fmtDate(aud.last_synced_at)}` : ""}
                  </div>
                  {canManage && (
                    <div className="rm-aud-actions">
                      <Button
                        size="small" variant="outlined"
                        startIcon={syncingId === aud.id ? <CircularProgress size={14} /> : <SyncIcon fontSize="small" />}
                        disabled={syncingId === aud.id}
                        onClick={() => handleSync(aud.id)}
                        sx={{ textTransform: "none" }}
                      >
                        {syncingId === aud.id ? "Queuing…" : "Sync to Facebook"}
                      </Button>
                      <Tooltip title="Delete audience">
                        <IconButton size="small" onClick={() => handleDelete(aud.id)} sx={{ color: colors.error }}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <FbAppSettingsDialog
        open={fbSettingsOpen}
        onClose={() => setFbSettingsOpen(false)}
        current={fbSettings}
        onSave={handleSaveFbSettings}
      />
      <ConnectAccountDialog
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        onConnect={handleConnect}
      />
      <CreateAudienceDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
        accounts={accounts}
        options={options}
      />
    </div>
  );
}
