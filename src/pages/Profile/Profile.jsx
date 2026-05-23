import React, { useEffect, useMemo, useState } from "react";
import { Box, Typography, Button, TextField, CircularProgress, Alert, Tooltip, Chip } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { auth } from "../../lib/api";
import { authApi, usersApi } from "../../lib/endpoints";
import { applyTheme } from "../../theme/applyTheme";
import AvatarUploader from "../../components/AvatarUploader/AvatarUploader";

// Broadcast that the cached user blob changed (avatar, name, etc.) so any
// component watching this event can re-read auth.getUser() without a full
// page reload. Header listens for this to swap the navbar avatar live.
const broadcastUserUpdate = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ee:user-updated'));
  }
};

// Six curated presets + a Custom slot. The product-owner spec said preset
// + custom hex; these are the presets — keep them tasteful and accessible
// against the existing white background. The first entry IS the system
// default (the existing brand red), kept here so users can "reset to default"
// by re-selecting it.
const PRESETS = [
  { id: "default",  label: "Default Red", primary: "#E53935", primaryDark: "#C62828", primaryLight: "#FFEBEE" },
  { id: "indigo",   label: "Indigo",      primary: "#3F51B5", primaryDark: "#283593", primaryLight: "#E8EAF6" },
  { id: "teal",     label: "Teal",        primary: "#00897B", primaryDark: "#00695C", primaryLight: "#E0F2F1" },
  { id: "emerald",  label: "Emerald",     primary: "#2E7D32", primaryDark: "#1B5E20", primaryLight: "#E8F5E9" },
  { id: "amber",    label: "Amber",       primary: "#F57C00", primaryDark: "#E65100", primaryLight: "#FFF3E0" },
  { id: "violet",   label: "Violet",      primary: "#7B1FA2", primaryDark: "#4A148C", primaryLight: "#F3E5F5" },
];

const HEX_RE = /^#[0-9a-fA-F]{6}$/u;

export default function Profile() {
  // Cached user blob primes the UI so it renders instantly; we then refetch
  // the live theme from /auth/me to pick up any change made on another
  // browser. The "saved" copy below is the authoritative baseline.
  const cached = useMemo(() => auth.getUser() || {}, []);

  // The currently-saved theme (server truth). Drives the "Current" chip
  // and the hasChanges diff. Starts from cache, gets replaced after fetch.
  const [saved, setSaved] = useState({
    theme_preset: cached.theme_preset || "default",
    theme_primary: cached.theme_primary || PRESETS[0].primary,
    theme_primary_dark: cached.theme_primary_dark || PRESETS[0].primaryDark,
    theme_primary_light: cached.theme_primary_light || PRESETS[0].primaryLight,
  });

  // Editable working copy. Starts equal to `saved`; user edits diverge it.
  const [preset, setPreset] = useState(saved.theme_preset);
  const [primary, setPrimary] = useState(saved.theme_primary);
  const [primaryDark, setPrimaryDark] = useState(saved.theme_primary_dark);
  const [primaryLight, setPrimaryLight] = useState(saved.theme_primary_light);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedAt, setSavedAt] = useState(null);
  const [loadingSaved, setLoadingSaved] = useState(true);

  // Current avatar — `avatar_url` is the freshly-signed download URL the
  // server returns (5-min TTL). We keep both so a later "Save" can know
  // whether the key changed even when the URL refreshes.
  const [avatar, setAvatar] = useState({
    avatar_r2_key: cached.avatar_r2_key || null,
    avatar_url: cached.avatar_url || null,
  });

  // Fetch the live theme from the server on mount. If it differs from the
  // cached blob (e.g. user changed theme on another browser), it replaces
  // both the "saved" baseline and the editable working copy so the user
  // sees their actual current theme — not a stale one.
  useEffect(() => {
    let cancelled = false;
    authApi.me()
      .then((r) => {
        if (cancelled) return;
        const u = r?.data?.user;
        if (!u) return;
        const live = {
          theme_preset: u.theme_preset || "default",
          theme_primary: u.theme_primary || PRESETS[0].primary,
          theme_primary_dark: u.theme_primary_dark || PRESETS[0].primaryDark,
          theme_primary_light: u.theme_primary_light || PRESETS[0].primaryLight,
        };
        setSaved(live);
        setPreset(live.theme_preset);
        setPrimary(live.theme_primary);
        setPrimaryDark(live.theme_primary_dark);
        setPrimaryLight(live.theme_primary_light);
        setAvatar({
          avatar_r2_key: u.avatar_r2_key || null,
          avatar_url: u.avatar_url || null,
        });
        // Sync localStorage so other tabs / next reload start from truth.
        const stored = auth.getUser() || {};
        auth.setSession({
          user: {
            ...stored,
            ...live,
            avatar_r2_key: u.avatar_r2_key || null,
            avatar_url: u.avatar_url || null,
          },
        });
        broadcastUserUpdate();
      })
      .catch(() => { /* keep cached values on failure */ })
      .finally(() => { if (!cancelled) setLoadingSaved(false); });
    return () => { cancelled = true; };
  }, []);

  // Pretty-name the currently-saved preset for the header chip.
  const savedPresetLabel = useMemo(() => {
    if (saved.theme_preset === "custom") return "Custom";
    const match = PRESETS.find((p) => p.id === saved.theme_preset);
    return match?.label || "Default Red";
  }, [saved.theme_preset]);

  const isCustom = preset === "custom";
  const allHexValid = HEX_RE.test(primary) && HEX_RE.test(primaryDark) && HEX_RE.test(primaryLight);

  // Whenever the user changes any of the three colors locally, repaint the
  // page so they see what they're picking. Persist on Save.
  useEffect(() => {
    if (allHexValid) {
      applyTheme({ primary, primary_dark: primaryDark, primary_light: primaryLight });
    }
  }, [primary, primaryDark, primaryLight, allHexValid]);

  const pickPreset = (p) => {
    setPreset(p.id);
    setPrimary(p.primary);
    setPrimaryDark(p.primaryDark);
    setPrimaryLight(p.primaryLight);
    setSaveError("");
  };

  const goCustom = () => {
    setPreset("custom");
    setSaveError("");
  };

  const resetToDefault = () => {
    pickPreset(PRESETS[0]);
  };

  const save = async () => {
    if (!allHexValid) {
      setSaveError("All three colors must be a 7-character hex (e.g. #E53935).");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const body = {
        theme_preset: preset,
        theme_primary: primary,
        theme_primary_dark: primaryDark,
        theme_primary_light: primaryLight,
      };
      const r = await usersApi.updateMyTheme(body);
      const next = {
        theme_preset: r?.data?.theme_preset ?? body.theme_preset,
        theme_primary: r?.data?.theme_primary ?? body.theme_primary,
        theme_primary_dark: r?.data?.theme_primary_dark ?? body.theme_primary_dark,
        theme_primary_light: r?.data?.theme_primary_light ?? body.theme_primary_light,
      };
      // Refresh the "Current" baseline so the chip + hasChanges diff
      // both line up with what's now persisted.
      setSaved(next);
      // Update the cached user blob so the next page load (without a
      // round-trip to /auth/me) still picks up the new theme.
      const stored = auth.getUser() || {};
      auth.setSession({ user: { ...stored, ...next } });
      setSavedAt(new Date());
    } catch (e) {
      setSaveError(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = useMemo(() => (
    preset !== saved.theme_preset
    || primary !== saved.theme_primary
    || primaryDark !== saved.theme_primary_dark
    || primaryLight !== saved.theme_primary_light
  ), [preset, primary, primaryDark, primaryLight, saved]);

  return (
    <Box sx={{ p: 3, maxWidth: 720 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>My Profile</Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
        Personal preferences for your view of the CRM. Changes apply only to you.
      </Typography>

      <Box sx={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 2, p: 3, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>Profile Photo</Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
          Shown next to your name in the navbar and on lead activity. Square photos work best.
        </Typography>
        <AvatarUploader
          currentUrl={avatar.avatar_url}
          currentName={cached.name || cached.email}
          onUpdated={(next) => {
            setAvatar(next);
            const stored = auth.getUser() || {};
            auth.setSession({
              user: {
                ...stored,
                avatar_r2_key: next.avatar_r2_key,
                avatar_url: next.avatar_url,
              },
            });
            broadcastUserUpdate();
          }}
        />
      </Box>

      <Box sx={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 2, p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5, flexWrap: "wrap" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Theme</Typography>
          {/* Live indicator of the currently-persisted theme, so the user
              can see at a glance what's saved before they start tweaking. */}
          <Chip
            size="small"
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Typography sx={{ fontSize: 11, color: "#475569", fontWeight: 600 }}>
                  {loadingSaved ? "Loading…" : `Current: ${savedPresetLabel}`}
                </Typography>
                {!loadingSaved && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                    <Swatch color={saved.theme_primary} small />
                    <Swatch color={saved.theme_primary_dark} small />
                    <Swatch color={saved.theme_primary_light} small />
                  </Box>
                )}
              </Box>
            }
            sx={{ background: "#f1f5f9", height: 24, "& .MuiChip-label": { px: 1 } }}
          />
        </Box>
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
          Pick a color set or roll your own. Preview is live as you change values; click Save to keep it.
        </Typography>

        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Presets</Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 3 }}>
          {PRESETS.map((p) => (
            <Tooltip key={p.id} title={p.label}>
              <Box
                onClick={() => pickPreset(p)}
                sx={{
                  cursor: "pointer",
                  px: 1.5, py: 1,
                  borderRadius: 2,
                  border: preset === p.id ? `2px solid ${p.primary}` : "2px solid transparent",
                  display: "flex", alignItems: "center", gap: 1,
                  background: preset === p.id ? p.primaryLight : "#fff",
                  transition: "background 120ms",
                }}
              >
                <Swatch color={p.primary} />
                <Swatch color={p.primaryDark} small />
                <Swatch color={p.primaryLight} small />
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#222" }}>{p.label}</Typography>
              </Box>
            </Tooltip>
          ))}
          <Box
            onClick={goCustom}
            sx={{
              cursor: "pointer",
              px: 1.5, py: 1,
              borderRadius: 2,
              border: isCustom ? `2px dashed ${primary}` : "2px dashed #cbd5e1",
              display: "flex", alignItems: "center", gap: 1,
            }}
          >
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>+ Custom</Typography>
          </Box>
        </Box>

        {isCustom && (
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, mb: 2 }}>
            <HexField label="Primary"      value={primary}      onChange={setPrimary}      />
            <HexField label="Primary Dark" value={primaryDark}  onChange={setPrimaryDark}  />
            <HexField label="Primary Light" value={primaryLight} onChange={setPrimaryLight} />
          </Box>
        )}

        <Box sx={{ mt: 2, mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Preview</Typography>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
            <Button
              variant="contained"
              sx={{
                background: "var(--primary)",
                color: "#fff",
                "&:hover": { background: "var(--primary-dark)" },
              }}
            >
              Primary action
            </Button>
            <Button
              variant="outlined"
              sx={{
                color: "var(--primary)",
                borderColor: "var(--primary)",
                "&:hover": { borderColor: "var(--primary-dark)", background: "var(--primary-light)" },
              }}
            >
              Outlined
            </Button>
            <Box sx={{
              px: 1.5, py: 0.5, borderRadius: 12, fontSize: 12,
              background: "var(--primary-light)", color: "var(--primary-dark)", fontWeight: 600,
            }}>
              Tag chip
            </Box>
            <Box sx={{
              px: 1, py: 0.5, borderRadius: 1, fontSize: 12,
              background: "var(--primary)", color: "#fff", fontWeight: 600,
            }}>
              Badge
            </Box>
          </Box>
        </Box>

        {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}
        {!saveError && savedAt && !hasChanges && (
          <Alert severity="success" sx={{ mb: 2 }}>Theme saved.</Alert>
        )}

        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Button
            variant="contained"
            onClick={save}
            disabled={saving || !allHexValid || !hasChanges}
            startIcon={saving ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : null}
            sx={{
              background: "var(--primary)",
              color: "#fff",
              "&:hover": { background: "var(--primary-dark)" },
              "&.Mui-disabled": { background: "var(--primary)", opacity: 0.5, color: "#fff" },
            }}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button
            variant="text"
            onClick={resetToDefault}
            startIcon={<RefreshIcon />}
            sx={{ color: "var(--primary)", "&:hover": { background: "var(--primary-light)" } }}
          >
            Reset to default
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

function HexField({ label, value, onChange }) {
  const valid = HEX_RE.test(value);
  return (
    <Box>
      <Typography sx={{ fontSize: 12, color: "#475569", mb: 0.5 }}>{label}</Typography>
      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <input
          type="color"
          value={valid ? value : "#000000"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          style={{ width: 36, height: 36, border: "1px solid #e5e7eb", borderRadius: 6, padding: 0, cursor: "pointer", background: "#fff" }}
        />
        <TextField
          size="small"
          value={value}
          onChange={(e) => onChange(e.target.value.trim())}
          error={!valid}
          helperText={valid ? null : "Use #RRGGBB"}
          inputProps={{ maxLength: 7, style: { fontFamily: "monospace" } }}
          fullWidth
        />
      </Box>
    </Box>
  );
}

function Swatch({ color, small }) {
  return (
    <Box
      sx={{
        width: small ? 12 : 18,
        height: small ? 12 : 18,
        borderRadius: "50%",
        background: color,
        border: "1px solid rgba(0,0,0,0.1)",
      }}
    />
  );
}
