import React from "react";
import {
    Dialog,
    DialogContent,
    DialogActions,
    IconButton,
    Button,
    TextField,
    InputAdornment,
    FormControl,
    Select,
    MenuItem,
    Checkbox,
    FormControlLabel,
    Radio,
    RadioGroup,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { colors } from "../../theme/colors";

const countStageRows = [
    { label: "Monthly Business Initiated Messages...", used: 51, available: 8949, total: 9000 },
    { label: "Daily Business Initiated Messages(B...", used: 0, available: 300, total: 300 },
    { label: "Monthly Session Messages", used: 0, available: 18000, total: 18000 },
    { label: "Daily Session Messages", used: 0, available: 600, total: 600 }
];

const communications = [
    { label: "1st Communication", template: "Untouched1", delay: "1hr" },
    { label: "2nd Communication", template: "Warm_followup", delay: "3day" },
    { label: "3rd Communication", template: "Followup_msg", delay: "5day" },
    { label: "4th Communication", template: "Untouched_trust_msg", delay: "6day" }
];

const EditRuleModal = ({ open, onClose, ruleName = "" }) => {
    const [editTab, setEditTab] = React.useState("IF");
    const [conditionOperator, setConditionOperator] = React.useState("And");
    const [conditions, setConditions] = React.useState([
        { field: "Last Updated On", operator: "Greater Than Or Equal", value: "1hrs" },
        { field: "Stage", operator: "Equals", value: "06-Prospect" }
    ]);

    const [thenAttribute, setThenAttribute] = React.useState("");
    const [occurrenceField, setOccurrenceField] = React.useState("No. Of Occurences");
    const [noOfCommunication, setNoOfCommunication] = React.useState(4);
    const [channel, setChannel] = React.useState("WhatsApp");
    const [responseUser, setResponseUser] = React.useState("Current Lead Owner");
    const [mobileTargets, setMobileTargets] = React.useState({
        primary: true,
        father: false,
        mother: false,
        alternate: false
    });

    React.useEffect(() => {
        if (open) {
            setEditTab("IF");
            setConditionOperator("And");
        }
    }, [open]);

    const handleAddCondition = () => {
        setConditions([...conditions, { field: "", operator: "", value: "" }]);
    };

    const handleRemoveCondition = (idx) => {
        setConditions(conditions.filter((_, i) => i !== idx));
    };

    const handleConditionChange = (idx, key, value) => {
        const updated = [...conditions];
        updated[idx] = { ...updated[idx], [key]: value };
        setConditions(updated);
    };

    const renderTabs = () => (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: `1px solid ${colors.borderGrey}`
            }}
        >
            <div style={{ display: "flex" }}>
                <div
                    onClick={() => setEditTab("IF")}
                    style={{
                        padding: "10px 24px",
                        background: editTab === "IF" ? colors.primary : "transparent",
                        color: editTab === "IF" ? colors.white : colors.textMuted,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontSize: "14px"
                    }}
                >
                    IF
                </div>
                <div
                    onClick={() => setEditTab("THEN")}
                    style={{
                        padding: "10px 24px",
                        background: editTab === "THEN" ? colors.primary : "transparent",
                        color: editTab === "THEN" ? colors.white : colors.textMuted,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontSize: "14px"
                    }}
                >
                    THEN
                </div>
            </div>
            <span
                style={{
                    color: colors.primary,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontSize: "14px"
                }}
            >
                Preview
            </span>
        </div>
    );

    const renderIfTab = () => (
        <>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", margin: "18px 0" }}>
                <span
                    onClick={handleAddCondition}
                    style={{
                        color: colors.primary,
                        fontWeight: 500,
                        cursor: "pointer",
                        fontSize: "14px"
                    }}
                >
                    + Add Condition
                </span>

                <div
                    style={{
                        display: "inline-flex",
                        border: `1px solid ${colors.borderGrey}`,
                        borderRadius: "4px",
                        overflow: "hidden"
                    }}
                >
                    <div
                        onClick={() => setConditionOperator("And")}
                        style={{
                            padding: "4px 14px",
                            background: conditionOperator === "And" ? colors.primary : colors.white,
                            color: conditionOperator === "And" ? colors.white : colors.textDark,
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: 500
                        }}
                    >
                        And
                    </div>
                    <div
                        onClick={() => setConditionOperator("Or")}
                        style={{
                            padding: "4px 14px",
                            background: conditionOperator === "Or" ? colors.primary : colors.white,
                            color: conditionOperator === "Or" ? colors.white : colors.textDark,
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: 500
                        }}
                    >
                        Or
                    </div>
                </div>
            </div>

            {conditions.map((cond, idx) => (
                <React.Fragment key={idx}>
                    {idx > 0 && (
                        <div
                            style={{
                                display: "inline-block",
                                padding: "3px 12px",
                                background: colors.primary,
                                color: colors.white,
                                borderRadius: "3px",
                                fontSize: "12px",
                                fontWeight: 500,
                                margin: "8px 0"
                            }}
                        >
                            {conditionOperator}
                        </div>
                    )}
                    <div
                        style={{
                            display: "flex",
                            gap: "12px",
                            alignItems: "center",
                            background: colors.white,
                            padding: "12px",
                            borderRadius: "4px",
                            border: `1px solid ${colors.borderGrey}`,
                            marginBottom: "8px"
                        }}
                    >
                        <FormControl fullWidth size="small">
                            <Select
                                value={cond.field}
                                onChange={(e) => handleConditionChange(idx, "field", e.target.value)}
                                displayEmpty
                            >
                                <MenuItem value="Last Updated On">Last Updated On</MenuItem>
                                <MenuItem value="Stage">Stage</MenuItem>
                                <MenuItem value="Created On">Created On</MenuItem>
                                <MenuItem value="Source">Source</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl fullWidth size="small">
                            <Select
                                value={cond.operator}
                                onChange={(e) => handleConditionChange(idx, "operator", e.target.value)}
                                displayEmpty
                            >
                                <MenuItem value="Equals">Equals</MenuItem>
                                <MenuItem value="Not Equals">Not Equals</MenuItem>
                                <MenuItem value="Greater Than Or Equal">Greater Than Or Equal</MenuItem>
                                <MenuItem value="Less Than Or Equal">Less Than Or Equal</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl fullWidth size="small">
                            <Select
                                value={cond.value}
                                onChange={(e) => handleConditionChange(idx, "value", e.target.value)}
                                displayEmpty
                            >
                                <MenuItem value="1hrs">1hrs</MenuItem>
                                <MenuItem value="2hrs">2hrs</MenuItem>
                                <MenuItem value="06-Prospect">06-Prospect</MenuItem>
                                <MenuItem value="07-Qualified">07-Qualified</MenuItem>
                            </Select>
                        </FormControl>
                        <IconButton
                            size="small"
                            onClick={handleAddCondition}
                            sx={{ color: colors.textMuted }}
                        >
                            <AddIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                            size="small"
                            onClick={() => handleRemoveCondition(idx)}
                            sx={{ color: colors.textMuted }}
                        >
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </div>
                </React.Fragment>
            ))}
        </>
    );

    const renderThenTab = () => (
        <>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    background: colors.white,
                    padding: "12px",
                    borderRadius: "4px",
                    border: `1px solid ${colors.borderGrey}`,
                    margin: "16px 0"
                }}
            >
                <FormControl fullWidth size="small">
                    <Select
                        value={thenAttribute}
                        onChange={(e) => setThenAttribute(e.target.value)}
                        displayEmpty
                        renderValue={(selected) =>
                            selected ? selected : <span style={{ color: colors.midGrey }}>Select Attribute</span>
                        }
                    >
                        <MenuItem value="No. Of Occurences">No. Of Occurences</MenuItem>
                        <MenuItem value="Status">Status</MenuItem>
                        <MenuItem value="Message">Message</MenuItem>
                    </Select>
                </FormControl>
                <IconButton size="small" sx={{ color: colors.textMuted }}>
                    <AddIcon fontSize="small" />
                </IconButton>
            </div>

            <div
                style={{
                    display: "inline-block",
                    padding: "3px 12px",
                    background: colors.primary,
                    color: colors.white,
                    borderRadius: "3px",
                    fontSize: "12px",
                    fontWeight: 500,
                    marginBottom: "8px"
                }}
            >
                And
            </div>

            <div
                style={{
                    background: colors.white,
                    padding: "14px",
                    borderRadius: "4px",
                    border: `1px solid ${colors.borderGrey}`,
                    marginBottom: "18px"
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "14px" }}>
                    <FormControl size="small" sx={{ minWidth: "220px" }}>
                        <Select
                            value={occurrenceField}
                            onChange={(e) => setOccurrenceField(e.target.value)}
                        >
                            <MenuItem value="No. Of Occurences">No. Of Occurences</MenuItem>
                            <MenuItem value="Frequency">Frequency</MenuItem>
                        </Select>
                    </FormControl>
                    <span style={{ fontSize: "13px", color: colors.textDark }}>
                        No. of<br />Communication
                    </span>
                    <TextField
                        size="small"
                        value={noOfCommunication}
                        onChange={(e) => setNoOfCommunication(e.target.value)}
                        sx={{ width: "120px", background: colors.inputGrey }}
                    />
                    <FormControl size="small" sx={{ minWidth: "180px" }}>
                        <Select
                            value={channel}
                            onChange={(e) => setChannel(e.target.value)}
                        >
                            <MenuItem value="WhatsApp">WhatsApp</MenuItem>
                            <MenuItem value="Email">Email</MenuItem>
                            <MenuItem value="SMS">SMS</MenuItem>
                        </Select>
                    </FormControl>
                </div>

                <h4 style={{ margin: "18px 0 10px", fontSize: "15px", color: colors.textDark }}>
                    Select WhatsApp Message
                </h4>
                <p style={{ margin: "0 0 10px", fontSize: "13px", color: colors.textDark, fontWeight: 500 }}>
                    Count Stage
                </p>

                <Table size="small" sx={{ border: `1px solid ${colors.borderGrey}`, marginBottom: "10px" }}>
                    <TableHead>
                        <TableRow sx={{ background: colors.primaryLight }}>
                            <TableCell></TableCell>
                            <TableCell>Used</TableCell>
                            <TableCell>Available</TableCell>
                            <TableCell>Total</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {countStageRows.map((row, idx) => (
                            <TableRow
                                key={idx}
                                sx={{ background: idx % 2 === 0 ? colors.primaryLight : colors.white }}
                            >
                                <TableCell>{row.label}</TableCell>
                                <TableCell>{row.used}</TableCell>
                                <TableCell>{row.available}</TableCell>
                                <TableCell>{row.total}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <p style={{ fontSize: "12px", color: colors.textSecondary, marginBottom: "14px" }}>
                    Once 24 hour Business Initiated Messages (BIM) limit is exhausted, the automation will be paused and automatically resume after 24 hours.
                </p>

                <p style={{ margin: "0 0 6px", fontSize: "14px", color: colors.textDark, fontWeight: 500 }}>
                    Select a user to receive students response
                </p>
                <RadioGroup
                    row
                    value={responseUser}
                    onChange={(e) => setResponseUser(e.target.value)}
                >
                    <FormControlLabel
                        value="Sender"
                        control={<Radio size="small" sx={{ "&.Mui-checked": { color: colors.primary } }} />}
                        label="Sender"
                    />
                    <FormControlLabel
                        value="Current Lead Owner"
                        control={<Radio size="small" sx={{ "&.Mui-checked": { color: colors.primary } }} />}
                        label="Current Lead Owner"
                    />
                </RadioGroup>

                <p style={{ margin: "14px 0 8px", fontSize: "14px", color: colors.textDark, fontWeight: 500 }}>
                    Select WhatsApp Templates
                </p>
                <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", marginBottom: "12px" }}>
                    {[
                        { key: "primary", label: "Primary Mobile" },
                        { key: "father", label: "Father's Mobile" },
                        { key: "mother", label: "Mother's Mobile" },
                        { key: "alternate", label: "Alternate Mobile" }
                    ].map((m) => (
                        <FormControlLabel
                            key={m.key}
                            control={
                                <Checkbox
                                    size="small"
                                    checked={mobileTargets[m.key]}
                                    onChange={(e) =>
                                        setMobileTargets({ ...mobileTargets, [m.key]: e.target.checked })
                                    }
                                    sx={{ "&.Mui-checked": { color: colors.primary } }}
                                />
                            }
                            label={m.label}
                        />
                    ))}
                </div>

                <p style={{ margin: "8px 0", fontSize: "13px", color: colors.textDark }}>
                    WhatsApp Retry Attempts<span style={{ color: colors.primary }}>*</span>
                </p>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="WhatsApp Retry Attempts"
                    sx={{ background: colors.inputGrey, marginBottom: "18px" }}
                />

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "18px"
                    }}
                >
                    {communications.map((c, idx) => (
                        <div key={idx}>
                            <p style={{ margin: "0 0 6px", fontSize: "13px", color: colors.textDark }}>
                                {c.label}
                            </p>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <FormControl size="small" fullWidth>
                                    <Select defaultValue={c.template}>
                                        <MenuItem value={c.template}>{c.template}</MenuItem>
                                    </Select>
                                </FormControl>
                                <FormControl size="small" sx={{ minWidth: "90px" }}>
                                    <Select defaultValue={c.delay}>
                                        <MenuItem value={c.delay}>{c.delay}</MenuItem>
                                    </Select>
                                </FormControl>
                                <span style={{ color: colors.primary, cursor: "pointer", fontSize: "13px" }}>
                                    View
                                </span>
                            </div>
                            <span
                                style={{
                                    color: colors.primary,
                                    fontSize: "13px",
                                    cursor: "pointer",
                                    display: "inline-block",
                                    marginTop: "6px"
                                }}
                            >
                                Add Dependent Action
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );

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
                    Edit Rule: {ruleName}
                </span>
                <IconButton size="small" onClick={onClose}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </div>

            <DialogContent style={{ padding: "20px 24px", background: "#fafafa" }}>
                <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                    <TextField
                        fullWidth
                        size="small"
                        defaultValue={ruleName}
                        sx={{ background: colors.inputGrey }}
                    />
                    <TextField
                        size="small"
                        defaultValue="2025-08-11"
                        sx={{ background: colors.inputGrey, minWidth: "200px" }}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <CalendarMonthIcon fontSize="small" sx={{ color: colors.textMuted }} />
                                </InputAdornment>
                            )
                        }}
                    />
                    <TextField
                        size="small"
                        defaultValue="8:07 PM"
                        sx={{ background: colors.inputGrey, minWidth: "130px" }}
                    />
                </div>

                {renderTabs()}
                {editTab === "IF" ? renderIfTab() : renderThenTab()}
            </DialogContent>

            <DialogActions style={{ padding: "16px 24px", background: "#fafafa" }}>
                <Button variant="outlined" onClick={onClose} sx={{ textTransform: "none" }}>
                    CANCEL
                </Button>
                <Button
                    variant="contained"
                    onClick={onClose}
                    sx={{
                        textTransform: "none",
                        backgroundColor: colors.primary,
                        "&:hover": { backgroundColor: colors.primaryDark }
                    }}
                >
                    Update
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default EditRuleModal;
