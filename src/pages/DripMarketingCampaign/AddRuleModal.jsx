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
    Alert,
    Typography
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { colors } from "../../theme/colors";
import { campaignsDripApi, emailApi, smsApi } from "../../lib/endpoints";

// A drip step (rule): { step_order, day_offset, channel, template_id, condition_json }.
// WhatsApp is NOT an automated channel — email + SMS only.
export default function AddRuleModal({
    open,
    dripId,
    stepOrder = 1,
    defaultCondition = {},
    onClose,
    onSaved,
    onToast
}) {
    const [channel, setChannel] = React.useState("email");
    const [dayOffset, setDayOffset] = React.useState(0);
    const [templateId, setTemplateId] = React.useState("");
    const [emailTemplates, setEmailTemplates] = React.useState([]);
    const [smsTemplates, setSmsTemplates] = React.useState([]);
    const [loadingTemplates, setLoadingTemplates] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState("");

    React.useEffect(() => {
        if (!open) return;
        setChannel("email");
        setDayOffset(0);
        setTemplateId("");
        setError("");
        setSaving(false);
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
    }, [open]);

    // Reset the template selection when the channel changes.
    React.useEffect(() => {
        setTemplateId("");
    }, [channel]);

    const templates = channel === "email" ? emailTemplates : smsTemplates;

    const handleSave = async () => {
        if (!dripId) {
            setError("No campaign selected.");
            return;
        }
        if (!templateId) {
            setError("Select a template for this step.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            const body = {
                step_order: stepOrder,
                day_offset: Number(dayOffset) || 0,
                channel,
                template_id: templateId
            };
            if (defaultCondition && Object.keys(defaultCondition).length) {
                body.condition_json = defaultCondition;
            }
            await campaignsDripApi.addRule(dripId, body);
            onSaved?.();
        } catch (e) {
            setError(e?.message || "Failed to add step");
            onToast?.(e?.message || "Failed to add step", "error");
        } finally {
            setSaving(false);
        }
    };

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
                <span style={{ fontWeight: 600, color: colors.textDark }}>Add Step</span>
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

                <p style={{ margin: "0 0 16px", fontSize: "13px", color: colors.textSecondary }}>
                    Define when to send (days after a lead becomes eligible), on which channel,
                    and which template to use. Step #{stepOrder}.
                </p>

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
                        onChange={(e) => setChannel(e.target.value)}
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

                {defaultCondition && Object.keys(defaultCondition).length > 0 && (
                    <Typography
                        style={{
                            marginTop: "12px",
                            fontSize: "12px",
                            color: colors.textMuted
                        }}
                    >
                        This step inherits the campaign audience filter.
                    </Typography>
                )}
            </DialogContent>

            <DialogActions style={{ padding: "16px 24px", background: colors.white }}>
                <Button variant="outlined" onClick={onClose} sx={{ textTransform: "none" }}>
                    CANCEL
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={saving}
                    sx={{
                        textTransform: "none",
                        backgroundColor: colors.primary,
                        "&:hover": { backgroundColor: colors.primaryDark }
                    }}
                >
                    {saving ? "Saving…" : "Save"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
