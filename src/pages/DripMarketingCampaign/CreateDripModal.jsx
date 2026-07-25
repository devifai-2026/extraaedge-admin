import React from "react";
import {
    Dialog,
    DialogContent,
    DialogActions,
    IconButton,
    Button,
    TextField,
    FormControlLabel,
    Switch,
    Alert,
    Divider,
    Typography
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { colors } from "../../theme/colors";
import { campaignsDripApi } from "../../lib/endpoints";
import AudienceFilterBuilder from "./AudienceFilterBuilder";
import { audienceToCondition } from "./audienceCondition";

// Create a new drip campaign. The backend create body accepts
// { name, description, category, start_time, active }. There is no audience
// column on the drip — the audience builder produces a rule-engine condition
// that is carried back to the caller so it can seed each step's condition_json.
export default function CreateDripModal({ open, onClose, onCreated }) {
    const [name, setName] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [active, setActive] = React.useState(false);
    const [audience, setAudience] = React.useState({});
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState("");

    React.useEffect(() => {
        if (open) {
            setName("");
            setDescription("");
            setActive(false);
            setAudience({});
            setError("");
            setSaving(false);
        }
    }, [open]);

    const handleSave = async () => {
        if (!name.trim()) {
            setError("Campaign name is required.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            const res = await campaignsDripApi.create({
                name: name.trim(),
                description: description.trim() || undefined,
                active
            });
            const created = res?.data || null;
            const audienceCondition = audienceToCondition(audience);
            if (created) {
                // Stash the audience condition on the returned object so the
                // rules drawer can default new steps to this audience gate.
                created.__audienceCondition = audienceCondition;
            }
            onCreated?.(created);
        } catch (e) {
            setError(e?.message || "Failed to create drip campaign");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <div
                style={{
                    background: colors.primaryLight,
                    padding: "14px 18px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                }}
            >
                <span style={{ fontWeight: 600, color: colors.textDark }}>
                    Create Drip Campaign
                </span>
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
                    sx={{ mb: 2 }}
                />
                <FormControlLabel
                    control={
                        <Switch
                            checked={active}
                            onChange={(e) => setActive(e.target.checked)}
                            sx={{
                                "& .Mui-checked": { color: colors.primary },
                                "& .Mui-checked + .MuiSwitch-track": {
                                    backgroundColor: colors.primary
                                }
                            }}
                        />
                    }
                    label="Active (start sending as soon as steps are configured)"
                />

                <Divider sx={{ my: 2 }} />

                <Typography
                    style={{
                        fontWeight: 600,
                        fontSize: "14px",
                        color: colors.textDark,
                        marginBottom: "12px"
                    }}
                >
                    Audience
                </Typography>
                <AudienceFilterBuilder value={audience} onChange={setAudience} />
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
                    {saving ? "Creating…" : "Create"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
