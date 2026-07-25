import React from "react";
import {
    Dialog,
    DialogContent,
    DialogActions,
    IconButton,
    Button,
    TextField,
    FormControl,
    Select,
    MenuItem,
    InputLabel,
    Alert
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { colors } from "../../theme/colors";
import { campaignsDripApi, emailApi, smsApi } from "../../lib/endpoints";

// Dual-purpose editor:
//  - Step mode  (props: dripId + rule)  → PUT /campaigns/drip/:id/rules/:rid
//  - Campaign mode (props: drip)        → PUT /campaigns/drip/:id
// WhatsApp is NOT an automated channel — email + SMS only.
export default function EditRuleModal({
    open,
    dripId,
    rule,
    drip,
    onClose,
    onSaved,
    onToast
}) {
    const isStepMode = Boolean(rule);

    // ---- Step-mode state ----
    const [channel, setChannel] = React.useState("email");
    const [dayOffset, setDayOffset] = React.useState(0);
    const [templateId, setTemplateId] = React.useState("");
    const [emailTemplates, setEmailTemplates] = React.useState([]);
    const [smsTemplates, setSmsTemplates] = React.useState([]);
    const [loadingTemplates, setLoadingTemplates] = React.useState(false);

    // ---- Campaign-mode state ----
    const [name, setName] = React.useState("");
    const [description, setDescription] = React.useState("");

    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState("");

    React.useEffect(() => {
        if (!open) return;
        setError("");
        setSaving(false);
        if (isStepMode) {
            setChannel(rule?.channel === "sms" ? "sms" : "email");
            setDayOffset(rule?.day_offset ?? 0);
            setTemplateId(rule?.template_id || "");
            setLoadingTemplates(true);
            Promise.all([
                emailApi.templates.list().catch(() => ({ data: [] })),
                smsApi.templates.list().catch(() => ({ data: [] }))
            ])
                .then(([e, s]) => {
                    setEmailTemplates(e?.data || []);
                    setSmsTemplates(s?.data || []);
                })
                .finally(() => setLoadingTemplates(false));
        } else {
            setName(drip?.name || "");
            setDescription(drip?.description || "");
        }
    }, [open, isStepMode, rule, drip]);

    const templates = channel === "email" ? emailTemplates : smsTemplates;

    const handleSaveStep = async () => {
        if (!dripId || !rule?.id) {
            setError("No step selected.");
            return;
        }
        if (!templateId) {
            setError("Select a template for this step.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            await campaignsDripApi.updateRule(dripId, rule.id, {
                day_offset: Number(dayOffset) || 0,
                channel,
                template_id: templateId
            });
            onSaved?.();
        } catch (e) {
            setError(e?.message || "Failed to update step");
            onToast?.(e?.message || "Failed to update step", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveCampaign = async () => {
        if (!drip?.id) {
            setError("No campaign selected.");
            return;
        }
        if (!name.trim()) {
            setError("Campaign name is required.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            await campaignsDripApi.update(drip.id, {
                name: name.trim(),
                description: description.trim() || undefined
            });
            onSaved?.();
        } catch (e) {
            setError(e?.message || "Failed to update campaign");
            onToast?.(e?.message || "Failed to update campaign", "error");
        } finally {
            setSaving(false);
        }
    };

    const title = isStepMode ? `Edit Step ${rule?.step_order ?? ""}` : "Edit Campaign";

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <div
                style={{
                    background: colors.primaryLight,
                    padding: "14px 18px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                }}
            >
                <span style={{ fontWeight: 600, color: colors.textDark }}>{title}</span>
                <IconButton size="small" onClick={onClose}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </div>

            <DialogContent style={{ padding: "20px 24px", background: colors.white }}>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
                        {error}
                    </Alert>
                )}

                {isStepMode ? (
                    <>
                        <TextField
                            fullWidth
                            size="small"
                            type="number"
                            label="Day Offset (days after lead created)"
                            value={dayOffset}
                            onChange={(e) => setDayOffset(e.target.value)}
                            inputProps={{ min: 0 }}
                            sx={{ mb: 2 }}
                        />

                        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                            <InputLabel>Channel</InputLabel>
                            <Select
                                label="Channel"
                                value={channel}
                                onChange={(e) => {
                                    setChannel(e.target.value);
                                    setTemplateId("");
                                }}
                            >
                                <MenuItem value="email">Email</MenuItem>
                                <MenuItem value="sms">SMS</MenuItem>
                                <MenuItem value="whatsapp" disabled>
                                    WhatsApp (manual only — not automated)
                                </MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl fullWidth size="small">
                            <InputLabel>Template</InputLabel>
                            <Select
                                label="Template"
                                value={templateId}
                                onChange={(e) => setTemplateId(e.target.value)}
                                disabled={loadingTemplates}
                            >
                                {loadingTemplates && (
                                    <MenuItem value="" disabled>
                                        Loading templates…
                                    </MenuItem>
                                )}
                                {!loadingTemplates && templates.length === 0 && (
                                    <MenuItem value="" disabled>
                                        No {channel} templates found
                                    </MenuItem>
                                )}
                                {templates.map((t) => (
                                    <MenuItem key={t.id} value={t.id}>
                                        {t.name || t.title || t.label || t.id}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </>
                ) : (
                    <>
                        <TextField
                            fullWidth
                            size="small"
                            label="Campaign Name"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            sx={{ mb: 2 }}
                        />
                        <TextField
                            fullWidth
                            size="small"
                            label="Description"
                            multiline
                            minRows={2}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </>
                )}
            </DialogContent>

            <DialogActions style={{ padding: "16px 24px", background: colors.white }}>
                <Button variant="outlined" onClick={onClose} sx={{ textTransform: "none" }}>
                    CANCEL
                </Button>
                <Button
                    variant="contained"
                    onClick={isStepMode ? handleSaveStep : handleSaveCampaign}
                    disabled={saving}
                    sx={{
                        textTransform: "none",
                        backgroundColor: colors.primary,
                        "&:hover": { backgroundColor: colors.primaryDark }
                    }}
                >
                    {saving ? "Saving…" : "Update"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
