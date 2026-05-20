import React, { useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    Box,
    Divider,
    Alert,
} from "@mui/material";

// Review modal shown on submit when there are filled follow-up rows.
// For each filled row across every stage, prompts the user to pick a
// sub-stage (filtered to the row's stage). User can leave it blank;
// blank → sub_stage_id stays null on the API payload.
//
// Props:
//   open: boolean
//   rows: [{ stage_id, stage_name, slot_index, next_action_datetime, comment, sub_stage_id }]
//   subStages: full sub-stages list from useDropdown('sub-stages')
//   onCancel: () => void  (close without applying)
//   onConfirm: (rows) => void  (rows now carry chosen sub_stage_id)
// Inner body is keyed on `rows` from the parent so each modal-open
// (which re-passes a fresh rows array) gets a fresh draft state. Avoids
// useEffect-based re-seeding lint errors.
const SubStageReviewModal = ({ open, rows, subStages, onCancel, onConfirm }) => {
    if (!open) return null;
    return (
        <SubStageReviewModalInner
            rows={rows}
            subStages={subStages}
            onCancel={onCancel}
            onConfirm={onConfirm}
        />
    );
};

const SubStageReviewModalInner = ({ rows, subStages, onCancel, onConfirm }) => {
    const [draft, setDraft] = useState(rows || []);

    const setSubStage = (idx, sub_stage_id) => {
        setDraft((prev) => prev.map((r, i) => (i === idx ? { ...r, sub_stage_id } : r)));
    };

    return (
        <Dialog open onClose={onCancel} maxWidth="md" fullWidth>
            <DialogTitle>Assign Sub-Stage to Each Follow-up</DialogTitle>
            <DialogContent dividers>
                <Alert severity="info" sx={{ mb: 2 }}>
                    Pick a sub-stage for each follow-up row. Leave blank if no sub-stage applies.
                </Alert>
                {draft.length === 0 ? (
                    <Typography color="text.secondary">No follow-up rows to review.</Typography>
                ) : (
                    draft.map((r, idx) => {
                        const stageSubs = (subStages || []).filter(
                            (s) => s.stage_id === r.stage_id && s.is_active !== false,
                        );
                        return (
                            <Box key={`${r.stage_id}-${r.slot_index}`} sx={{ mb: 2 }}>
                                <Typography variant="caption" color="text.secondary">
                                    {r.stage_name} · Slot {r.slot_index}
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                    {new Date(r.next_action_datetime).toLocaleString()}
                                    {r.comment ? ` — ${r.comment}` : ''}
                                </Typography>
                                <FormControl size="small" fullWidth>
                                    <InputLabel>Sub-Stage</InputLabel>
                                    <Select
                                        label="Sub-Stage"
                                        value={r.sub_stage_id || ''}
                                        onChange={(e) => setSubStage(idx, e.target.value || null)}
                                    >
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        {stageSubs.map((s) => (
                                            <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                {idx < draft.length - 1 && <Divider sx={{ mt: 2 }} />}
                            </Box>
                        );
                    })
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>Back</Button>
                <Button variant="contained" onClick={() => onConfirm(draft)}>
                    Confirm &amp; Save
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default SubStageReviewModal;
