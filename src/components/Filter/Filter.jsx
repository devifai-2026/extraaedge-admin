// FilterLeadsModal — full filter dialog wired to /leads list endpoint.
// Emits a query-param object via onApply; LeadList merges it into its filterParams.
import React, { useEffect, useMemo, useState } from "react";
import {
    Dialog,
    Box,
    Typography,
    IconButton,
    Button,
    TextField,
    InputBase,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import SearchIcon from "@mui/icons-material/Search";
import { colors } from "../../theme/colors";
import { useDropdown } from "../../lib/useDropdowns";
import { usersApi } from "../../lib/endpoints";

const inputStyle = {
    "& .MuiInputBase-root": { background: "#f1f3f5", borderRadius: "6px" },
};

const SECTIONS = [
    "Lead Details",
    "Personal Details",
    "Communication Details",
    "Date Filters",
    "Range Filters",
];

// Empty filter shape — keys map directly onto leads list query params.
// Anything left as '' is stripped before sending.
const blankFilter = {
    // Lead details
    is_touched: '',           // '' | 'true' | 'false'
    // Assignment state: '' | 'unassigned' | 'assigned' — maps to flag=unassigned
    // (or we drop the filter when 'assigned' is picked since the default lead
    // list already shows assigned leads scoped to the actor).
    assignment: '',
    assigned_to: '',
    stage_id: '',
    sub_stage_id: '',
    program_id: '',
    channel_id: '',
    source_id: '',
    campaign_id: '',
    medium_id: '',
    // Personal
    q: '',
    email: '',
    whatsapp_number: '',
    phone: '',
    country_id: '',
    state_id: '',
    city: '',
    // Date
    date_from: '',
    date_to: '',
    followup_from: '',
    followup_to: '',
    // Range
    lead_age_from: '',
    lead_age_to: '',
    lead_score_from: '',
    lead_score_to: '',
};

const FilterLeadsModal = ({ open, onClose, value, onApply, onReset }) => {
    const [activeSection, setActiveSection] = useState("Lead Details");
    const [filter, setFilter] = useState(blankFilter);
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');

    // Hydrate from external value when opened
    useEffect(() => {
        if (!open) return;
        const merged = { ...blankFilter, ...(value || {}) };
        // Coerce boolean → string for the select
        if (typeof merged.is_touched === 'boolean') merged.is_touched = String(merged.is_touched);
        // Decode `flag=unassigned` → assignment='unassigned' so the dropdown reflects state.
        if (value?.flag === 'unassigned') merged.assignment = 'unassigned';
        setFilter(merged);
    }, [open, value]);

    // Dropdowns
    const stages    = useDropdown('stages',    { enabled: open });
    const subStages = useDropdown('sub-stages',{ enabled: open });
    const programs  = useDropdown('programs',  { enabled: open });
    const channels  = useDropdown('channels',  { enabled: open });
    const sources   = useDropdown('sources',   { enabled: open });
    const campaigns = useDropdown('campaigns', { enabled: open });
    const mediums   = useDropdown('mediums',   { enabled: open });
    const countries = useDropdown('countries', { enabled: open });
    const states    = useDropdown('states',    { enabled: open });

    useEffect(() => {
        if (!open) return;
        usersApi.list({ limit: 200 })
            .then((r) => setUsers(r?.data || []))
            .catch(() => setUsers([]));
    }, [open]);

    const filteredSubStages = useMemo(
        () => (subStages.data || []).filter((s) => !filter.stage_id || s.stage_id === filter.stage_id),
        [subStages.data, filter.stage_id],
    );
    const filteredStates = useMemo(
        () => (states.data || []).filter((s) => !filter.country_id || s.country_id === filter.country_id),
        [states.data, filter.country_id],
    );

    // Active filter count for chips on the header
    const activeCount = useMemo(() => Object.entries(filter).reduce((n, [, v]) => n + (v === '' || v == null ? 0 : 1), 0), [filter]);

    const setF = (key) => (e) => {
        const v = e.target.value;
        setFilter((prev) => {
            const next = { ...prev, [key]: v };
            if (key === 'stage_id') {
                const ss = (subStages.data || []).find((x) => x.id === prev.sub_stage_id);
                if (!ss || ss.stage_id !== v) next.sub_stage_id = '';
            }
            if (key === 'country_id') {
                const st = (states.data || []).find((x) => x.id === prev.state_id);
                if (!st || st.country_id !== v) next.state_id = '';
            }
            return next;
        });
    };

    const handleReset = () => {
        setFilter(blankFilter);
        onReset?.();
    };

    const handleApply = () => {
        // Build query-param dict, dropping empties.
        const out = {};
        for (const [k, v] of Object.entries(filter)) {
            if (v === '' || v == null) continue;
            if (k === 'is_touched') {
                out.is_touched = v === 'true';
            } else if (k === 'assignment') {
                // Only 'unassigned' has a backend flag; 'assigned' is the implicit default.
                if (v === 'unassigned') out.flag = 'unassigned';
            } else if (['lead_age_from', 'lead_age_to', 'lead_score_from', 'lead_score_to'].includes(k)) {
                const n = Number(v);
                if (!Number.isNaN(n)) out[k] = n;
            } else {
                out[k] = v;
            }
        }
        onApply?.(out);
    };

    const sectionMatches = (name) => name.toLowerCase().includes(search.toLowerCase());

    const idSelect = (label, key, dropdown, opts = {}) => (
        <FormControl size="small" fullWidth sx={inputStyle}>
            <InputLabel>{label}</InputLabel>
            <Select label={label} value={filter[key] || ''} onChange={setF(key)} disabled={dropdown?.loading || opts.disabled}>
                <MenuItem value=""><em>Any</em></MenuItem>
                {(dropdown?.data || opts.items || []).filter((o) => o.is_active !== false).map((o) => (
                    <MenuItem key={o.id} value={o.id}>{o.name || o.label || o.id}</MenuItem>
                ))}
            </Select>
        </FormControl>
    );

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
            {/* HEADER */}
            <Box
                className="FilterLeadsModal-Header"
                sx={{ backgroundColor: "var(--primary)", color: "var(--white)", px: 2, py: 1.5, display: "flex", justifyContent: "space-between" }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <FilterAltIcon />
                    <Typography fontWeight={600}>Filter Leads {activeCount > 0 && `(${activeCount} active)`}</Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 2 }}>
                    <InputBase placeholder="Saved filters (coming soon)" disabled sx={{ background: "#f3ebe6", px: 2, borderRadius: "6px", width: 260 }} />
                    <IconButton onClick={onClose} sx={{ color: '#fff' }}><CloseIcon /></IconButton>
                </Box>
            </Box>

            {/* BODY */}
            <Box sx={{ display: "flex", height: "65vh" }}>
                {/* LEFT */}
                <Box sx={{ width: 240, borderRight: "1px solid #eee", p: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                        <SearchIcon fontSize="small" />
                        <InputBase placeholder="Search Section" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </Box>
                    {SECTIONS.filter(sectionMatches).map((item) => (
                        <Box
                            key={item}
                            onClick={() => setActiveSection(item)}
                            sx={{ display: "flex", gap: 1, p: 1, cursor: "pointer", borderRadius: 1, background: activeSection === item ? "rgba(232,123,47,0.12)" : "" }}
                        >
                            <Typography fontSize={14}>{item}</Typography>
                        </Box>
                    ))}
                </Box>

                {/* RIGHT */}
                <Box sx={{ flex: 1, p: 3, overflowY: "auto" }}>

                    {activeSection === "Lead Details" && (
                        <>
                            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                                <FormControl size="small" fullWidth sx={inputStyle}>
                                    <InputLabel>Assignment</InputLabel>
                                    <Select label="Assignment" value={filter.assignment} onChange={setF('assignment')}>
                                        <MenuItem value=""><em>Any</em></MenuItem>
                                        <MenuItem value="unassigned">Unassigned (Quick Add)</MenuItem>
                                        <MenuItem value="assigned">Assigned (any owner)</MenuItem>
                                    </Select>
                                </FormControl>
                                <FormControl size="small" fullWidth sx={inputStyle}>
                                    <InputLabel>Touched / Untouched</InputLabel>
                                    <Select label="Touched / Untouched" value={filter.is_touched} onChange={setF('is_touched')}>
                                        <MenuItem value=""><em>Any</em></MenuItem>
                                        <MenuItem value="true">Touched (has activity)</MenuItem>
                                        <MenuItem value="false">Untouched</MenuItem>
                                    </Select>
                                </FormControl>
                                <FormControl size="small" fullWidth sx={inputStyle}>
                                    <InputLabel>Counsellor / Owner</InputLabel>
                                    <Select label="Counsellor / Owner" value={filter.assigned_to} onChange={setF('assigned_to')}>
                                        <MenuItem value=""><em>Any</em></MenuItem>
                                        {users.filter((u) => u.is_active !== false).map((u) => (
                                            <MenuItem key={u.id} value={u.id}>{u.name || u.email}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Box>

                            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                                {idSelect('Stage', 'stage_id', stages)}
                                <FormControl size="small" fullWidth sx={inputStyle}>
                                    <InputLabel>Sub-Stage</InputLabel>
                                    <Select label="Sub-Stage" value={filter.sub_stage_id} onChange={setF('sub_stage_id')} disabled={!filter.stage_id}>
                                        <MenuItem value=""><em>Any</em></MenuItem>
                                        {filteredSubStages.filter((s) => s.is_active !== false).map((s) => (
                                            <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Box>

                            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                                {idSelect('Program', 'program_id', programs)}
                                {idSelect('Campaign', 'campaign_id', campaigns)}
                            </Box>

                            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                                {idSelect('Channel', 'channel_id', channels)}
                                {idSelect('Source', 'source_id', sources)}
                                {idSelect('Medium', 'medium_id', mediums)}
                            </Box>
                        </>
                    )}

                    {activeSection === "Personal Details" && (
                        <>
                            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                                <TextField fullWidth size="small" label="Search by name / email / phone" placeholder="Type to filter…" value={filter.q} onChange={setF('q')} sx={inputStyle} />
                            </Box>
                            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                                <TextField fullWidth size="small" label="Email" value={filter.email} onChange={setF('email')} sx={inputStyle} />
                                <TextField fullWidth size="small" label="WhatsApp Number" value={filter.whatsapp_number} onChange={setF('whatsapp_number')} sx={inputStyle} />
                                <TextField fullWidth size="small" label="Phone" value={filter.phone} onChange={setF('phone')} sx={inputStyle} />
                            </Box>
                            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                                {idSelect('Country', 'country_id', countries)}
                                <FormControl size="small" fullWidth sx={inputStyle}>
                                    <InputLabel>State</InputLabel>
                                    <Select label="State" value={filter.state_id} onChange={setF('state_id')}>
                                        <MenuItem value=""><em>Any</em></MenuItem>
                                        {filteredStates.filter((s) => s.is_active !== false).map((s) => (
                                            <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <TextField fullWidth size="small" label="City" value={filter.city} onChange={setF('city')} sx={inputStyle} />
                            </Box>
                        </>
                    )}

                    {activeSection === "Communication Details" && (
                        <Box sx={{ color: '#888', fontSize: 13, py: 4, textAlign: 'center' }}>
                            Communication-channel filters can be added here once email/SMS/WhatsApp tracking is wired.
                            Use Range Filters → Lead Score for behaviour-based filtering today.
                        </Box>
                    )}

                    {activeSection === "Date Filters" && (
                        <>
                            <Typography fontSize={13} fontWeight={600} sx={{ mb: 1 }}>Added On</Typography>
                            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                                <TextField type="date" fullWidth size="small" label="From" InputLabelProps={{ shrink: true }} value={filter.date_from?.slice(0, 10) || ''} onChange={setF('date_from')} sx={inputStyle} />
                                <TextField type="date" fullWidth size="small" label="To" InputLabelProps={{ shrink: true }} value={filter.date_to?.slice(0, 10) || ''} onChange={setF('date_to')} sx={inputStyle} />
                            </Box>
                            <Typography fontSize={13} fontWeight={600} sx={{ mb: 1, mt: 2 }}>Followup Scheduled On</Typography>
                            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                                <TextField type="date" fullWidth size="small" label="From" InputLabelProps={{ shrink: true }} value={filter.followup_from?.slice(0, 10) || ''} onChange={setF('followup_from')} sx={inputStyle} />
                                <TextField type="date" fullWidth size="small" label="To" InputLabelProps={{ shrink: true }} value={filter.followup_to?.slice(0, 10) || ''} onChange={setF('followup_to')} sx={inputStyle} />
                            </Box>
                        </>
                    )}

                    {activeSection === "Range Filters" && (
                        <>
                            <Typography fontSize={13} fontWeight={600} sx={{ mb: 1 }}>Lead Age (days)</Typography>
                            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                                <TextField type="number" fullWidth size="small" label="From" value={filter.lead_age_from} onChange={setF('lead_age_from')} sx={inputStyle} />
                                <TextField type="number" fullWidth size="small" label="To" value={filter.lead_age_to} onChange={setF('lead_age_to')} sx={inputStyle} />
                            </Box>
                            <Typography fontSize={13} fontWeight={600} sx={{ mb: 1, mt: 2 }}>Lead Score</Typography>
                            <Box sx={{ display: "flex", gap: 2 }}>
                                <TextField type="number" fullWidth size="small" label="From" value={filter.lead_score_from} onChange={setF('lead_score_from')} sx={inputStyle} />
                                <TextField type="number" fullWidth size="small" label="To" value={filter.lead_score_to} onChange={setF('lead_score_to')} sx={inputStyle} />
                            </Box>
                        </>
                    )}
                </Box>
            </Box>

            {/* FOOTER */}
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, p: 2, borderTop: "1px solid #eee" }}>
                <Button variant="outlined" onClick={handleReset}>Reset</Button>
                <Button variant="contained" onClick={handleApply} sx={{ background: colors.primary, '&:hover': { background: '#c66019' } }}>
                    Apply Filter {activeCount > 0 && `(${activeCount})`}
                </Button>
            </Box>
        </Dialog>
    );
};

export default FilterLeadsModal;
