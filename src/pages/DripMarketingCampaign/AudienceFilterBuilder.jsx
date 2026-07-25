import React from "react";
import {
    FormControl,
    Select,
    MenuItem,
    Checkbox,
    ListItemText,
    TextField,
    OutlinedInput,
    InputLabel
} from "@mui/material";
import { colors } from "../../theme/colors";
import { dropdownsApi, programsApi, usersApi } from "../../lib/endpoints";

// Builds an audience_filter_json object using the shared resolver keys:
// { stage_ids, program_ids, assigned_to, sources, created_from, created_to }
// All optional, ANDed server-side. Controlled component: value + onChange.
export default function AudienceFilterBuilder({ value, onChange }) {
    const v = value || {};
    const [stages, setStages] = React.useState([]);
    const [programs, setPrograms] = React.useState([]);
    const [users, setUsers] = React.useState([]);
    const [sources, setSources] = React.useState([]);

    React.useEffect(() => {
        dropdownsApi
            .stages()
            .then((r) => setStages(r?.data || []))
            .catch(() => setStages([]));
        programsApi
            .list()
            .then((r) => setPrograms(r?.data || []))
            .catch(() => setPrograms([]));
        usersApi
            .list()
            .then((r) => setUsers((r?.data || []).filter((u) => u?.is_active !== false)))
            .catch(() => setUsers([]));
        dropdownsApi
            .sources()
            .then((r) => setSources(r?.data || []))
            .catch(() => setSources([]));
    }, []);

    const set = (key, next) => {
        const merged = { ...v, [key]: next };
        // Drop empty arrays / blank strings so we send a clean object.
        Object.keys(merged).forEach((k) => {
            const val = merged[k];
            if (
                val === undefined ||
                val === null ||
                val === "" ||
                (Array.isArray(val) && val.length === 0)
            ) {
                delete merged[k];
            }
        });
        onChange(merged);
    };

    const labelFor = (list, id, keys = ["name", "label", "value"]) => {
        const item = list.find((x) => x.id === id || x.value === id);
        if (!item) return id;
        for (const k of keys) if (item[k]) return item[k];
        return id;
    };

    const multiRender = (list, ids) =>
        (ids || []).map((id) => labelFor(list, id)).join(", ") || "";

    const cellStyle = { marginBottom: "14px" };

    return (
        <div>
            <p
                style={{
                    margin: "0 0 12px",
                    fontSize: "13px",
                    color: colors.textSecondary
                }}
            >
                Choose which leads enter this drip. All selected filters are combined (AND).
                Leave everything blank to target all leads.
            </p>

            {/* Stages */}
            <FormControl fullWidth size="small" style={cellStyle}>
                <InputLabel>Stages</InputLabel>
                <Select
                    multiple
                    input={<OutlinedInput label="Stages" />}
                    value={v.stage_ids || []}
                    onChange={(e) => set("stage_ids", e.target.value)}
                    renderValue={() => multiRender(stages, v.stage_ids)}
                >
                    {stages.map((s) => (
                        <MenuItem key={s.id} value={s.id}>
                            <Checkbox checked={(v.stage_ids || []).indexOf(s.id) > -1} />
                            <ListItemText primary={s.name || s.label || s.value} />
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {/* Programs */}
            <FormControl fullWidth size="small" style={cellStyle}>
                <InputLabel>Programs</InputLabel>
                <Select
                    multiple
                    input={<OutlinedInput label="Programs" />}
                    value={v.program_ids || []}
                    onChange={(e) => set("program_ids", e.target.value)}
                    renderValue={() => multiRender(programs, v.program_ids)}
                >
                    {programs.map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                            <Checkbox checked={(v.program_ids || []).indexOf(p.id) > -1} />
                            <ListItemText primary={p.name || p.label} />
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {/* Assigned to (counsellors) */}
            <FormControl fullWidth size="small" style={cellStyle}>
                <InputLabel>Assigned To</InputLabel>
                <Select
                    multiple
                    input={<OutlinedInput label="Assigned To" />}
                    value={v.assigned_to || []}
                    onChange={(e) => set("assigned_to", e.target.value)}
                    renderValue={() => multiRender(users, v.assigned_to)}
                >
                    {users.map((u) => (
                        <MenuItem key={u.id} value={u.id}>
                            <Checkbox checked={(v.assigned_to || []).indexOf(u.id) > -1} />
                            <ListItemText primary={u.name} />
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {/* Sources (text values) */}
            <FormControl fullWidth size="small" style={cellStyle}>
                <InputLabel>Sources</InputLabel>
                <Select
                    multiple
                    input={<OutlinedInput label="Sources" />}
                    value={v.sources || []}
                    onChange={(e) => set("sources", e.target.value)}
                    renderValue={(selected) => (selected || []).join(", ")}
                >
                    {sources.map((s) => {
                        const val = s.value || s.name || s.label;
                        return (
                            <MenuItem key={s.id || val} value={val}>
                                <Checkbox checked={(v.sources || []).indexOf(val) > -1} />
                                <ListItemText primary={val} />
                            </MenuItem>
                        );
                    })}
                </Select>
            </FormControl>

            {/* Created date range */}
            <div style={{ display: "flex", gap: "12px" }}>
                <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="Created From"
                    InputLabelProps={{ shrink: true }}
                    value={v.created_from || ""}
                    onChange={(e) => set("created_from", e.target.value)}
                />
                <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="Created To"
                    InputLabelProps={{ shrink: true }}
                    value={v.created_to || ""}
                    onChange={(e) => set("created_to", e.target.value)}
                />
            </div>
        </div>
    );
}
