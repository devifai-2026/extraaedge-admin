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
    MenuItem
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { colors } from "../../theme/colors";

const ATTRIBUTE_OPTIONS = [
    "Activity Type",
    "Added On",
    "Campaign",
    "Channel",
    "City",
    "Current Lead Owner"
];

const OPERATOR_OPTIONS = ["Greater than or Equal", "Less than or Equal"];

const VALUE_OPTIONS = ["1hrs", "2hrs", "3hrs", "4hrs", "5hrs", "6hrs"];

const THEN_ATTRIBUTE_OPTIONS = [
    "Campaign",
    "Channel",
    "City",
    "Current Lead Owner",
    "Medium",
    "PG Graduation year"
];

const COMMUNICATION_ACTION_OPTIONS = ["Immediate", "No. Of Occurences"];

const AddRuleModal = ({ open, onClose, onSave }) => {
    const [activeTab, setActiveTab] = React.useState("IF");
    const [conditionOperator, setConditionOperator] = React.useState("And");
    const [ruleName, setRuleName] = React.useState("");
    const [startDate, setStartDate] = React.useState("");
    const [startTime, setStartTime] = React.useState("");
    const [conditions, setConditions] = React.useState([
        { field: "", operator: "", value: "" }
    ]);
    const [thenAttribute, setThenAttribute] = React.useState("");
    const [communicationAction, setCommunicationAction] = React.useState("");

    React.useEffect(() => {
        if (open) {
            setActiveTab("IF");
            setConditionOperator("And");
            setRuleName("");
            setStartDate("");
            setStartTime("");
            setConditions([{ field: "", operator: "", value: "" }]);
            setThenAttribute("");
            setCommunicationAction("");
        }
    }, [open]);

    const handleAddCondition = () => {
        setConditions([...conditions, { field: "", operator: "", value: "" }]);
    };

    const handleRemoveCondition = (idx) => {
        if (conditions.length === 1) {
            setConditions([{ field: "", operator: "", value: "" }]);
            return;
        }
        setConditions(conditions.filter((_, i) => i !== idx));
    };

    const handleConditionChange = (idx, key, value) => {
        const updated = [...conditions];
        updated[idx] = { ...updated[idx], [key]: value };
        setConditions(updated);
    };

    const handleSave = () => {
        if (onSave) {
            onSave({
                ruleName,
                startDate,
                startTime,
                conditionOperator,
                conditions,
                thenAttribute,
                communicationAction
            });
        }
        onClose();
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
                    onClick={() => setActiveTab("IF")}
                    style={{
                        padding: "10px 24px",
                        background: activeTab === "IF" ? colors.primary : "transparent",
                        color: activeTab === "IF" ? colors.white : colors.textMuted,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontSize: "14px"
                    }}
                >
                    IF
                </div>
                <div
                    onClick={() => setActiveTab("THEN")}
                    style={{
                        padding: "10px 24px",
                        background: activeTab === "THEN" ? colors.primary : "transparent",
                        color: activeTab === "THEN" ? colors.white : colors.textMuted,
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
                                renderValue={(selected) =>
                                    selected ? (
                                        selected
                                    ) : (
                                        <span style={{ color: colors.midGrey }}>Select Attribute</span>
                                    )
                                }
                            >
                                {ATTRIBUTE_OPTIONS.map((opt) => (
                                    <MenuItem key={opt} value={opt}>
                                        {opt}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth size="small">
                            <Select
                                value={cond.operator}
                                onChange={(e) => handleConditionChange(idx, "operator", e.target.value)}
                                displayEmpty
                                renderValue={(selected) =>
                                    selected ? (
                                        selected
                                    ) : (
                                        <span style={{ color: colors.midGrey }}>Select Operator</span>
                                    )
                                }
                            >
                                {OPERATOR_OPTIONS.map((opt) => (
                                    <MenuItem key={opt} value={opt}>
                                        {opt}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth size="small">
                            <Select
                                value={cond.value}
                                onChange={(e) => handleConditionChange(idx, "value", e.target.value)}
                                displayEmpty
                                renderValue={(selected) =>
                                    selected ? (
                                        selected
                                    ) : (
                                        <span style={{ color: colors.midGrey }}>Select Value</span>
                                    )
                                }
                            >
                                {VALUE_OPTIONS.map((opt) => (
                                    <MenuItem key={opt} value={opt}>
                                        {opt}
                                    </MenuItem>
                                ))}
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
                            selected ? (
                                selected
                            ) : (
                                <span style={{ color: colors.midGrey }}>Select Attribute</span>
                            )
                        }
                    >
                        {THEN_ATTRIBUTE_OPTIONS.map((opt) => (
                            <MenuItem key={opt} value={opt}>
                                {opt}
                            </MenuItem>
                        ))}
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
                    padding: "12px",
                    borderRadius: "4px",
                    border: `1px solid ${colors.borderGrey}`
                }}
            >
                <FormControl fullWidth size="small">
                    <Select
                        value={communicationAction}
                        onChange={(e) => setCommunicationAction(e.target.value)}
                        displayEmpty
                        renderValue={(selected) =>
                            selected ? (
                                selected
                            ) : (
                                <span style={{ color: colors.midGrey }}>Select Communication Action</span>
                            )
                        }
                    >
                        {COMMUNICATION_ACTION_OPTIONS.map((opt) => (
                            <MenuItem key={opt} value={opt}>
                                {opt}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
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
                <span style={{ fontWeight: 600, color: colors.textDark }}>Add Rule</span>
                <IconButton size="small" onClick={onClose}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </div>

            <DialogContent style={{ padding: "20px 24px", background: colors.white }}>
                <p style={{ margin: "0 0 16px", fontSize: "13px", color: colors.textSecondary }}>
                    A new rule can be added using this dialog, you need to select rules and actions to be performed based on the rules
                </p>

                <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Name of the Rule"
                        value={ruleName}
                        onChange={(e) => setRuleName(e.target.value)}
                        sx={{ background: colors.inputGrey }}
                    />
                    <TextField
                        size="small"
                        placeholder="Start Date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
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
                        placeholder="Start Time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        sx={{ background: colors.inputGrey, minWidth: "160px" }}
                    />
                </div>

                {renderTabs()}
                {activeTab === "IF" ? renderIfTab() : renderThenTab()}
            </DialogContent>

            <DialogActions style={{ padding: "16px 24px", background: colors.white }}>
                <Button variant="outlined" onClick={onClose} sx={{ textTransform: "none" }}>
                    CANCEL
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSave}
                    sx={{
                        textTransform: "none",
                        backgroundColor: colors.primary,
                        "&:hover": { backgroundColor: colors.primaryDark }
                    }}
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AddRuleModal;
