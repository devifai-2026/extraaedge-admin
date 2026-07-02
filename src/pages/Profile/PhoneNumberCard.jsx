import { useState } from "react";
import { Box, Typography, TextField, Button, Alert, Chip } from "@mui/material";
import { usersApi } from "../../lib/endpoints";
import { auth } from "../../lib/api";

// Self-contained "Change phone number" card for the Profile page. Changing an
// existing phone requires proving control of the NEW number via a WhatsApp OTP
// (backend: POST /users/me/phone/send-otp then /verify-otp). The number set
// here must match what the counsellor enters in the mobile call-recorder app.
export default function PhoneNumberCard() {
  const cached = auth.getUser() || {};
  const [currentPhone, setCurrentPhone] = useState(cached.phone || "");
  const [newPhone, setNewPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("idle"); // idle -> otp_sent
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const extractErr = (err) => {
    const detail = err?.data?.error?.details;
    if (Array.isArray(detail)) return detail.map((d) => d.message || d).join("; ");
    if (detail && typeof detail === "object") return Object.entries(detail).map(([k, v]) => `${k}: ${v}`).join("; ");
    return err?.data?.error?.message || err?.message || "Something went wrong";
  };

  const sendOtp = async (e) => {
    e?.preventDefault?.();
    const p = newPhone.trim();
    if (p.length < 4) { setError("Enter a valid phone number"); return; }
    setBusy(true); setError(""); setInfo("");
    try {
      await usersApi.sendPhoneOtp(p);
      setStep("otp_sent");
      setInfo(`We sent a WhatsApp OTP to ${p}. Enter it below to confirm.`);
    } catch (err) {
      setError(extractErr(err));
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async (e) => {
    e?.preventDefault?.();
    if (code.trim().length < 4) { setError("Enter the OTP code"); return; }
    setBusy(true); setError(""); setInfo("");
    try {
      const res = await usersApi.verifyPhoneOtp(newPhone.trim(), code.trim());
      const saved = res?.data?.phone ?? newPhone.trim();
      // Cache the new phone so the mandatory-phone gate + navbar stay in sync.
      auth.setSession({ user: { ...(auth.getUser() || {}), phone: saved } });
      try { window.dispatchEvent(new CustomEvent("ee:user-updated")); } catch { /* no-op */ }
      setCurrentPhone(saved);
      setNewPhone(""); setCode(""); setStep("idle");
      setInfo("Phone number updated.");
    } catch (err) {
      setError(extractErr(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 2, p: 3, mb: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5, flexWrap: "wrap" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Phone Number</Typography>
        <Chip size="small" label={currentPhone ? `Current: ${currentPhone}` : "Not set"} />
      </Box>
      <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
        This number links your mobile call recordings to you. Changing it requires OTP verification on the new number.
      </Typography>

      <form onSubmit={step === "idle" ? sendOtp : verifyOtp}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 360 }}>
          <TextField
            size="small" label="New phone number" fullWidth
            value={newPhone} disabled={step === "otp_sent" || busy}
            onChange={(e) => setNewPhone(e.target.value)}
            slotProps={{ htmlInput: { inputMode: "numeric", pattern: "[0-9]*", maxLength: 15 } }}
          />
          {step === "otp_sent" && (
            <TextField
              size="small" label="Enter OTP" autoFocus fullWidth
              value={code} disabled={busy}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
              slotProps={{ htmlInput: { inputMode: "numeric", pattern: "[0-9]*", maxLength: 8 } }}
            />
          )}
          {info && <Alert severity={step === "idle" ? "success" : "info"} sx={{ fontSize: 13 }}>{info}</Alert>}
          {error && <Alert severity="error" sx={{ fontSize: 13, whiteSpace: "pre-line" }}>{error}</Alert>}
          <Box sx={{ display: "flex", gap: 1 }}>
            {step === "idle" ? (
              <Button type="submit" variant="contained" disabled={busy}>
                {busy ? "Sending…" : "Send OTP"}
              </Button>
            ) : (
              <>
                <Button type="submit" variant="contained" disabled={busy}>
                  {busy ? "Verifying…" : "Verify & save"}
                </Button>
                <Button variant="text" disabled={busy} onClick={() => { setStep("idle"); setCode(""); setError(""); setInfo(""); }}>
                  Cancel
                </Button>
              </>
            )}
          </Box>
        </Box>
      </form>
    </Box>
  );
}
