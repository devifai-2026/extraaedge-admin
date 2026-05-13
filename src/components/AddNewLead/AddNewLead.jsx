import React, { useEffect, useMemo, useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Tabs,
    Tab,
    TextField,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Switch,
    FormControlLabel,
    Button,
    Checkbox,
    ListItemText,
    Alert,
    CircularProgress,
    Autocomplete,
    Box,
    Tooltip,
    Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import "./AddNewLead.css";
import { leadsApi, usersApi, uploadsApi } from "../../lib/endpoints";
import { auth } from "../../lib/api";
import { useDropdown } from "../../lib/useDropdowns";
import QuickCreateDialog from "../QuickCreateDialog/QuickCreateDialog";
import { isRole, ROLES } from "../../lib/rbac";


// Build initial form. All ID fields default to '' (empty string) so the Select
// renders empty rather than uncontrolled.
const blankForm = {
    // Personal
    name: "",
    email: "",
    alternate_email: "",
    phone: "",
    whatsapp_number: "",
    alternate_contact: "",
    gender: "",
    // Education
    ug_degree_id: "",
    ug_specialization_id: "",
    ug_university_id: "",
    ug_graduation_year: "",
    pg_degree_id: "",
    pg_specialization_id: "",
    pg_university_id: "",
    pg_graduation_year: "",
    // Address
    country_id: "",
    state_id: "",
    district: "",
    city: "",
    address: "",
    pincode: "",
    // Stage / program
    program_id: "",
    stage_id: "",
    sub_stage_id: "",
    next_action_datetime: "",
    remarks: "",
    closure_remarks: "",
    // Family
    family: {
        father_name: "",
        father_mobile: "",
        father_email: "",
        mother_name: "",
        mother_mobile: "",
        mother_email: "",
    },
    // Source (single-row primary attribution)
    source: {
        channel_id: "",
        source_id: "",
        campaign_id: "",
        medium_id: "",
    },
    // Custom fields keyed by field.key
    custom_values: {},
};

const valueOf = (custom_values, key) => custom_values?.[key] ?? '';

const AddNewLead = ({ open, onClose, leadData, onCreated, onSaved }) => {
    const isEditMode = Boolean(leadData?.id);
    const [activeTab, setActiveTab] = useState(0);
    const [mandatoryOnly, setMandatoryOnly] = useState(false);
    const [formData, setFormData] = useState(blankForm);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [hydrating, setHydrating] = useState(false);

    // Once a lead has crossed into a success stage (converted_at !== null),
    // only super_admin can keep editing. The backend enforces the same rule
    // on PUT /leads/:id and POST /leads/:id/stage — this flag drives the UI.
    const isConverted = isEditMode && Boolean(leadData?.converted_at || leadData?.is_converted);
    const lockedConverted = isConverted && !isRole(ROLES.SUPER_ADMIN);

    // Inline "Add new …" mini-dialog state. `quickCreate.type` controls which
    // dropdown we're creating into (degrees / specializations / universities /
    // programs). `quickCreate.assignTo` holds the form-key to auto-fill on success.
    const [quickCreate, setQuickCreate] = useState({ type: null, assignTo: null });
    const openQuickCreate = (type, assignTo) => setQuickCreate({ type, assignTo });
    const closeQuickCreate = () => setQuickCreate({ type: null, assignTo: null });
    const handleQuickCreated = ({ id }) => {
        if (id && quickCreate.assignTo) {
            // Auto-select the new id on the host form. Supports nested keys
            // ("source.channel_id") via dotted path.
            setFormData((prev) => {
                const path = quickCreate.assignTo.split('.');
                if (path.length === 1) return { ...prev, [path[0]]: id };
                const [head, tail] = path;
                return { ...prev, [head]: { ...(prev[head] || {}), [tail]: id } };
            });
        }
        closeQuickCreate();
    };

    // -------- Reassign (admin / sales_manager only, edit mode only) --------
    // Reassign is open to all 3 tenant roles. Server-side scope (in
    // /lead-assignments POST) decides who can move which lead to whom:
    //   super_admin   → any active user
    //   sales_manager → users in their team hierarchy
    //   counsellor    → only own leads, only to teammates / their manager
    //
    // The candidate list shown to counsellors comes from /users/team —
    // returns the counsellor's own peers + managers — which matches what
    // the server will accept.
    const canReassign = isEditMode;
    const [reassignList, setReassignList] = useState([]);     // [{id,name,email,manager_id}]
    const [reassignTo, setReassignTo] = useState('');         // chosen user id
    const [reassignReason, setReassignReason] = useState(''); // free-text
    const [reassigning, setReassigning] = useState(false);
    const [reassignErr, setReassignErr] = useState('');

    useEffect(() => {
        if (!open || !canReassign) return;
        // Admins see every active counsellor; managers + counsellors get
        // their team-scoped list from the server.
        const loader = isRole(ROLES.SUPER_ADMIN)
            ? usersApi.list({ role: 'counsellor', limit: 500 })
            : usersApi.myTeam();
        loader
            .then((r) => {
                const me = leadData?.assigned_to;
                const rows = (r?.data || []).filter((u) =>
                    u.is_active !== false && u.id !== me,
                );
                setReassignList(rows);
            })
            .catch(() => setReassignList([]));
    }, [open, canReassign, leadData?.assigned_to]);

    const handleReassign = async () => {
        setReassignErr('');
        if (!reassignTo) { setReassignErr('Pick a counsellor'); return; }
        if (!leadData?.id) { setReassignErr('No lead loaded'); return; }
        setReassigning(true);
        try {
            await leadsApi.reassign({
                lead_id: leadData.id,
                assigned_to: reassignTo,
                assignment_type: 'reassign',
                reason: reassignReason.trim() || undefined,
            });
            // Close the dialog so the parent reloads — keeps the screen tidy.
            onSaved?.();
            onClose?.(null);
        } catch (e) {
            setReassignErr(e?.message || 'Reassign failed');
        } finally {
            setReassigning(false);
        }
    };

    // Pull all dropdown lists. Sub-stages and states get filtered client-side
    // by the chosen stage / country.
    const stages       = useDropdown('stages',          { enabled: open });
    const subStages    = useDropdown('sub-stages',      { enabled: open });
    const programs     = useDropdown('programs',        { enabled: open });
    const channels     = useDropdown('channels',        { enabled: open });
    const sources      = useDropdown('sources',         { enabled: open });
    const campaigns    = useDropdown('campaigns',       { enabled: open });
    const mediums      = useDropdown('mediums',         { enabled: open });
    const countries    = useDropdown('countries',       { enabled: open });
    const states       = useDropdown('states',          { enabled: open });
    const genders      = useDropdown('genders',         { enabled: open });
    const degrees      = useDropdown('degrees',         { enabled: open });
    const specs        = useDropdown('specializations', { enabled: open });
    const universities = useDropdown('universities',    { enabled: open });
    const customFields = useDropdown('custom-fields',   { enabled: open });

    const filteredSubStages = useMemo(
        () => (subStages.data || []).filter((s) => !formData.stage_id || s.stage_id === formData.stage_id),
        [subStages.data, formData.stage_id],
    );
    const filteredStates = useMemo(
        () => (states.data || []).filter((s) => !formData.country_id || s.country_id === formData.country_id),
        [states.data, formData.country_id],
    );

    // Hydrate form when opening in edit mode. The list endpoint returns flat
    // fields with names; we need IDs, so fetch full lead by id.
    useEffect(() => {
        if (!open) return;
        if (!isEditMode) {
            setFormData(blankForm);
            setActiveTab(0);
            setSubmitError('');
            return;
        }
        let alive = true;
        setHydrating(true);
        leadsApi.get(leadData.id)
            .then((r) => {
                if (!alive) return;
                const lead = r?.data || {};
                const family = lead.family || {};
                const primarySource = (lead.sources || [])[0] || {};
                setFormData({
                    ...blankForm,
                    name: lead.name || '',
                    email: lead.email || '',
                    alternate_email: lead.alternate_email || '',
                    phone: lead.phone || '',
                    whatsapp_number: lead.whatsapp_number || '',
                    alternate_contact: lead.alternate_contact || '',
                    gender: lead.gender || '',
                    ug_degree_id: lead.ug_degree_id || '',
                    ug_specialization_id: lead.ug_specialization_id || '',
                    ug_university_id: lead.ug_university_id || '',
                    ug_graduation_year: lead.ug_graduation_year || '',
                    pg_degree_id: lead.pg_degree_id || '',
                    pg_specialization_id: lead.pg_specialization_id || '',
                    pg_university_id: lead.pg_university_id || '',
                    pg_graduation_year: lead.pg_graduation_year || '',
                    country_id: lead.country_id || '',
                    state_id: lead.state_id || '',
                    district: lead.district || '',
                    city: lead.city || '',
                    address: lead.address || '',
                    pincode: lead.pincode || '',
                    program_id: lead.program_id || '',
                    stage_id: lead.stage_id || '',
                    sub_stage_id: lead.sub_stage_id || '',
                    remarks: lead.remarks || '',
                    closure_remarks: lead.closure_remarks || '',
                    family: {
                        father_name: family.father_name || '',
                        father_mobile: family.father_mobile || '',
                        father_email: family.father_email || '',
                        mother_name: family.mother_name || '',
                        mother_mobile: family.mother_mobile || '',
                        mother_email: family.mother_email || '',
                    },
                    source: {
                        channel_id: primarySource.channel_id || '',
                        source_id: primarySource.source_id || '',
                        campaign_id: primarySource.campaign_id || '',
                        medium_id: primarySource.medium_id || '',
                    },
                    custom_values: lead.custom_values || {},
                });
                setActiveTab(0);
                setSubmitError('');
            })
            .catch((e) => { if (alive) setSubmitError(e.message || 'Failed to load lead'); })
            .finally(() => { if (alive) setHydrating(false); });
        return () => { alive = false; };
    }, [open, isEditMode, leadData?.id]);

    // Fields that must contain digits only (phone numbers, pincode, etc.).
    const NUMERIC_FIELDS = new Set(['phone', 'whatsapp_number', 'alternate_contact', 'pincode']);
    const NUMERIC_FAMILY_FIELDS = new Set(['father_mobile', 'mother_mobile']);
    const sanitizeDigits = (v, max = 15) => String(v ?? '').replace(/\D+/g, '').slice(0, max);

    const setField = (field) => (e) => {
        let val = e.target.value;
        if (NUMERIC_FIELDS.has(field)) val = sanitizeDigits(val, field === 'pincode' ? 10 : 15);
        setFormData((prev) => {
            const next = { ...prev, [field]: val };
            // When stage changes, clear sub-stage if it belongs to a different parent
            if (field === 'stage_id') {
                const ss = (subStages.data || []).find((x) => x.id === prev.sub_stage_id);
                if (!ss || ss.stage_id !== val) next.sub_stage_id = '';
            }
            // When country changes, clear state
            if (field === 'country_id') {
                const st = (states.data || []).find((x) => x.id === prev.state_id);
                if (!st || st.country_id !== val) next.state_id = '';
            }
            return next;
        });
    };

    const setFamilyField = (field) => (e) => {
        let val = e.target.value;
        if (NUMERIC_FAMILY_FIELDS.has(field)) val = sanitizeDigits(val, 15);
        setFormData((prev) => ({ ...prev, family: { ...prev.family, [field]: val } }));
    };

    const setSourceField = (field) => (e) => {
        const val = e.target.value;
        setFormData((prev) => ({ ...prev, source: { ...prev.source, [field]: val } }));
    };

    const setCustomValue = (key) => (e) => {
        const val = e.target.value;
        setFormData((prev) => ({ ...prev, custom_values: { ...prev.custom_values, [key]: val } }));
    };

    // Strip empty strings before sending — backend zod fields are .optional() but
    // empty strings would fail uuid validation.
    const buildPayload = () => {
        const p = {};
        const scalars = [
            'name', 'email', 'alternate_email', 'phone', 'whatsapp_number', 'alternate_contact', 'gender',
            'ug_degree_id', 'ug_specialization_id', 'ug_university_id',
            'pg_degree_id', 'pg_specialization_id', 'pg_university_id',
            'country_id', 'state_id', 'district', 'city', 'address', 'pincode',
            'program_id', 'stage_id', 'sub_stage_id', 'remarks', 'closure_remarks',
        ];
        for (const k of scalars) {
            const v = formData[k];
            if (v !== undefined && v !== null && v !== '') p[k] = v;
        }
        if (formData.ug_graduation_year) p.ug_graduation_year = Number(formData.ug_graduation_year);
        if (formData.pg_graduation_year) p.pg_graduation_year = Number(formData.pg_graduation_year);

        // Family: only include if any field set
        const fam = formData.family;
        if (Object.values(fam).some((v) => v && v !== '')) p.family = { ...fam };

        // Source: include the primary source row only if any id present
        const src = formData.source;
        if (Object.values(src).some((v) => v && v !== '')) {
            p.sources = [{
                channel_id: src.channel_id || undefined,
                source_id: src.source_id || undefined,
                campaign_id: src.campaign_id || undefined,
                medium_id: src.medium_id || undefined,
                is_primary: true,
            }];
        }

        // Custom values: pass the dict (backend resolves keys → field IDs server-side)
        const cv = {};
        for (const [k, v] of Object.entries(formData.custom_values || {})) {
            if (v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)) cv[k] = v;
        }
        if (Object.keys(cv).length) p.custom_values = cv;

        return p;
    };

    const handleSubmit = async () => {
        setSubmitError('');
        // Required-fields gate. Only enforced on CREATE — edits can update
        // a single field at a time without re-asserting the full set.
        if (!isEditMode) {
            const missing = [];
            if (!formData.name?.trim()) missing.push('Name');
            if (!formData.whatsapp_number?.trim()) missing.push('WhatsApp number');
            if (!formData.program_id) missing.push('Program');
            if (!formData.remarks?.trim()) missing.push('Remarks');
            if (missing.length) {
                setSubmitError(`Required: ${missing.join(', ')}`);
                return;
            }
        }
        // Reject past-dated follow-ups before any network call. The picker
        // already enforces `min` natively but DevTools editing or browsers
        // that ignore `min` would otherwise let it through.
        if (
            formData.next_action_datetime &&
            new Date(formData.next_action_datetime).getTime() < Date.now()
        ) {
            setSubmitError('Follow-up date and time must be in the future');
            return;
        }
        setSubmitting(true);
        try {
            const payload = buildPayload();
            if (isEditMode) {
                await leadsApi.update(leadData.id, payload);
                // If stage was changed via this dialog, also call /stage so the timeline gets a stage_changed entry.
                if (payload.stage_id && payload.stage_id !== leadData.stage_id) {
                    await leadsApi.changeStage(leadData.id, {
                        stage_id: payload.stage_id,
                        sub_stage_id: payload.sub_stage_id,
                        remarks: payload.closure_remarks || payload.remarks,
                        // If the user filled in the follow-up datetime, ship
                        // it; backend creates the lead_followups row.
                        ...(formData.next_action_datetime
                            ? { next_action_datetime: new Date(formData.next_action_datetime).toISOString() }
                            : {}),
                    });
                }
                onSaved?.();
            } else {
                await leadsApi.create(payload);
                onCreated?.();
            }
            setFormData(blankForm);
            onClose?.(null);
        } catch (e) {
            setSubmitError(e.message || 'Save failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        setFormData(blankForm);
        setSubmitError('');
        onClose?.(null);
    };

    // Render helper for ID-based selects.
    //   addNew: { type, assignTo } — when set, appends a "+ Create new …" entry
    //   that opens the QuickCreateDialog. assignTo is the form key (or dotted
    //   path for nested fields like 'source.channel_id') to auto-fill on success.
    const idSelect = ({ label, value, onChange, options, loading, required, mandatoryHide, addNew }) => {
        if (mandatoryHide) return null;
        // Sentinel value used to detect a "+ Create new" click without losing the current value.
        const CREATE_SENTINEL = '__create__';
        const handleChange = (e) => {
            if (e.target.value === CREATE_SENTINEL) {
                openQuickCreate(addNew.type, addNew.assignTo);
                return; // don't propagate — keep prior selection
            }
            onChange(e);
        };
        return (
            <FormControl size="small" fullWidth required={!!required}>
                <InputLabel>{label}</InputLabel>
                <Select label={label} value={value || ''} onChange={handleChange} disabled={loading}>
                    <MenuItem value=""><em>None</em></MenuItem>
                    {(options || []).filter((o) => o.is_active !== false).map((o) => (
                        <MenuItem key={o.id} value={o.id}>{o.name || o.label || o.code}</MenuItem>
                    ))}
                    {addNew && (
                        <MenuItem
                            value={CREATE_SENTINEL}
                            sx={{ borderTop: '1px solid #eee', mt: 0.5, color: '#E53935', fontWeight: 600 }}
                        >
                            <AddCircleOutlineIcon fontSize="small" sx={{ mr: 1 }} />
                            Create new {label.toLowerCase()}
                        </MenuItem>
                    )}
                </Select>
            </FormControl>
        );
    };

    // Render a custom-field input. Supports text / number / date / select / multiselect / textarea.
    const renderCustomField = (field) => {
        const v = valueOf(formData.custom_values, field.key);
        const onChange = setCustomValue(field.key);
        switch (field.field_type) {
            case 'select':
                return (
                    <FormControl key={field.id} size="small" fullWidth>
                        <InputLabel>{field.label}</InputLabel>
                        <Select label={field.label} value={v || ''} onChange={onChange}>
                            <MenuItem value=""><em>None</em></MenuItem>
                            {(field.options_json || []).map((opt) => {
                                const val = typeof opt === 'string' ? opt : opt.value;
                                const lbl = typeof opt === 'string' ? opt : (opt.label ?? opt.value);
                                return <MenuItem key={val} value={val}>{lbl}</MenuItem>;
                            })}
                        </Select>
                    </FormControl>
                );
            case 'multiselect': {
                const arr = Array.isArray(v) ? v : [];
                return (
                    <FormControl key={field.id} size="small" fullWidth>
                        <InputLabel>{field.label}</InputLabel>
                        <Select
                            multiple
                            label={field.label}
                            value={arr}
                            onChange={(e) => setCustomValue(field.key)({ target: { value: e.target.value } })}
                            renderValue={(sel) => (sel || []).join(', ')}
                        >
                            {(field.options_json || []).map((opt) => {
                                const val = typeof opt === 'string' ? opt : opt.value;
                                const lbl = typeof opt === 'string' ? opt : (opt.label ?? opt.value);
                                return (
                                    <MenuItem key={val} value={val}>
                                        <Checkbox checked={arr.indexOf(val) > -1} size="small" />
                                        <ListItemText primary={lbl} />
                                    </MenuItem>
                                );
                            })}
                        </Select>
                    </FormControl>
                );
            }
            case 'number':
                return (
                    <TextField
                        key={field.id}
                        label={field.label}
                        size="small"
                        type="number"
                        value={v ?? ''}
                        onChange={onChange}
                        fullWidth
                    />
                );
            case 'date':
                return (
                    <TextField
                        key={field.id}
                        label={field.label}
                        size="small"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        value={v ?? ''}
                        onChange={onChange}
                        fullWidth
                    />
                );
            case 'textarea':
                return (
                    <TextField
                        key={field.id}
                        label={field.label}
                        size="small"
                        multiline
                        minRows={2}
                        value={v ?? ''}
                        onChange={onChange}
                        fullWidth
                    />
                );
            default:
                return (
                    <TextField
                        key={field.id}
                        label={field.label}
                        size="small"
                        value={v ?? ''}
                        onChange={onChange}
                        fullWidth
                    />
                );
        }
    };

    const visibleCustomFields = (customFields.data || []).filter((f) => f.is_active !== false);

    return (
        <Dialog
            open={open}
            onClose={handleCancel}
            maxWidth="md"
            fullWidth
            PaperProps={{ className: "add-lead-dialog" }}
        >
            <DialogTitle className="add-lead-title" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {isEditMode ? `Edit Lead ${leadData?.name || ''}` : 'Add New Lead'}
                    {isEditMode && (
                        <span
                            title="Lead score (auto-recomputed from stage / sub-stage scores when you save)"
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '4px 12px', borderRadius: 999,
                                background: '#fff7e6', border: '1px solid #ffd591',
                                color: '#d46b08', fontSize: 13, fontWeight: 600,
                            }}
                        >
                            ★ {leadData?.lead_score != null ? Number(leadData.lead_score).toFixed(0) : 0}
                        </span>
                    )}
                </span>
                <IconButton onClick={handleCancel} className="add-lead-close-btn">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <div className="add-lead-tabs-wrapper">
                <Tabs
                    value={activeTab}
                    onChange={(e, v) => setActiveTab(v)}
                    TabIndicatorProps={{ style: { display: "none" } }}
                >
                    <Tab label="Lead/Applicant & Stage Details" className={activeTab === 0 ? "add-lead-tab active" : "add-lead-tab"} />
                    <Tab label="Family & Address Details"      className={activeTab === 1 ? "add-lead-tab active" : "add-lead-tab"} />
                    <Tab label="Source Details"                className={activeTab === 2 ? "add-lead-tab active" : "add-lead-tab"} />
                    {visibleCustomFields.length > 0 && (
                        <Tab label="Additional Fields" className={activeTab === 3 ? "add-lead-tab active" : "add-lead-tab"} />
                    )}
                    {/* Call Recordings: edit-only — you can't attach to a
                        lead before it exists in the DB. The active index is
                        4 when Additional Fields is showing, otherwise 3. */}
                    {isEditMode && (
                        <Tab
                            label="Call Recordings"
                            className={activeTab === (visibleCustomFields.length > 0 ? 4 : 3) ? "add-lead-tab active" : "add-lead-tab"}
                        />
                    )}
                </Tabs>
            </div>

            <DialogContent className={`add-lead-content${lockedConverted ? ' locked-converted' : ''}`}>
                {hydrating && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                        <CircularProgress size={28} />
                    </div>
                )}
                {/* Once a lead is converted, every input on every tab becomes
                    read-only for non-admins. The Reassign + Change-Stage blocks
                    above are hidden outright; the .locked-converted CSS rule
                    on DialogContent disables input interaction for the rest. */}

                {!hydrating && activeTab === 0 && (
                    <>
                        <div className="add-lead-mandatory-toggle">
                            <FormControlLabel
                                control={<Switch checked={mandatoryOnly} onChange={(e) => setMandatoryOnly(e.target.checked)} size="small" />}
                                label="Mandatory only"
                                labelPlacement="start"
                            />
                        </div>

                        <div className="add-lead-section-title">Lead Details</div>
                        <div className="add-lead-form-grid">
                            <TextField label="Applicant Name" required size="small" value={formData.name} onChange={setField('name')} fullWidth />
                            {!mandatoryOnly && <TextField label="Email Id" size="small" value={formData.email} onChange={setField('email')} fullWidth />}
                            {!mandatoryOnly && <TextField label="Alternate Email Id" size="small" value={formData.alternate_email} onChange={setField('alternate_email')} fullWidth />}
                            <TextField label="WhatsApp Number" required size="small" value={formData.whatsapp_number} onChange={setField('whatsapp_number')} fullWidth inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 15 }} />
                            {!mandatoryOnly && <TextField label="Phone" size="small" value={formData.phone} onChange={setField('phone')} fullWidth inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 15 }} />}
                            {!mandatoryOnly && <TextField label="Alternate Contact Number" size="small" value={formData.alternate_contact} onChange={setField('alternate_contact')} fullWidth inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 15 }} />}

                            {!mandatoryOnly && idSelect({ label: 'Under Graduation Degree',  value: formData.ug_degree_id,         onChange: setField('ug_degree_id'),         options: degrees.data,      loading: degrees.loading,      addNew: { type: 'degrees',         assignTo: 'ug_degree_id' } })}
                            {!mandatoryOnly && idSelect({ label: 'UG Specialization',        value: formData.ug_specialization_id, onChange: setField('ug_specialization_id'), options: specs.data,        loading: specs.loading,        addNew: { type: 'specializations', assignTo: 'ug_specialization_id' } })}
                            {!mandatoryOnly && idSelect({ label: 'UG University',            value: formData.ug_university_id,     onChange: setField('ug_university_id'),     options: universities.data, loading: universities.loading, addNew: { type: 'universities',    assignTo: 'ug_university_id' } })}
                            {!mandatoryOnly && (
                                <TextField
                                    size="small"
                                    type="number"
                                    label="UG Graduation Year"
                                    placeholder="e.g. 2024"
                                    value={formData.ug_graduation_year || ''}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        // Only allow 4-digit years in the 1950–2100 range while typing.
                                        if (v === '' || /^\d{0,4}$/.test(v)) setField('ug_graduation_year')({ target: { value: v } });
                                    }}
                                    inputProps={{ min: 1950, max: 2100, step: 1 }}
                                    fullWidth
                                />
                            )}
                            {!mandatoryOnly && idSelect({ label: 'Post Graduation Degree', value: formData.pg_degree_id,         onChange: setField('pg_degree_id'),         options: degrees.data,      loading: degrees.loading,      addNew: { type: 'degrees',         assignTo: 'pg_degree_id' } })}
                            {!mandatoryOnly && idSelect({ label: 'PG Specialization',     value: formData.pg_specialization_id, onChange: setField('pg_specialization_id'), options: specs.data,        loading: specs.loading,        addNew: { type: 'specializations', assignTo: 'pg_specialization_id' } })}
                            {!mandatoryOnly && idSelect({ label: 'PG University',         value: formData.pg_university_id,     onChange: setField('pg_university_id'),     options: universities.data, loading: universities.loading, addNew: { type: 'universities',    assignTo: 'pg_university_id' } })}
                            {!mandatoryOnly && (
                                <TextField
                                    size="small"
                                    type="number"
                                    label="PG Graduation Year"
                                    placeholder="e.g. 2026"
                                    value={formData.pg_graduation_year || ''}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        if (v === '' || /^\d{0,4}$/.test(v)) setField('pg_graduation_year')({ target: { value: v } });
                                    }}
                                    inputProps={{ min: 1950, max: 2100, step: 1 }}
                                    fullWidth
                                />
                            )}

                            {idSelect({ label: 'Program', value: formData.program_id, onChange: setField('program_id'), options: programs.data, loading: programs.loading, required: true, addNew: { type: 'programs', assignTo: 'program_id' } })}
                            {!mandatoryOnly && idSelect({ label: 'Gender', value: formData.gender, onChange: setField('gender'), options: (genders.data || []).map((g) => ({ ...g, id: g.name })), loading: genders.loading })}
                        </div>

                        {/* Reassign section — admin / manager only, edit mode only.
                            Shows current owner + manager + a picker for the new counsellor.
                            Manager picker is auto-scoped to the actor's team via /users/team.
                            Manager_id auto-snaps to the picked counsellor's primary manager
                            (handled server-side: bulkAssign / reassign both update leads.manager_id). */}
                        {canReassign && !lockedConverted && (
                            <>
                                <div className="add-lead-section-title">Reassign Lead</div>
                                <div className="add-lead-form-grid" style={{ alignItems: 'center' }}>
                                    <TextField
                                        size="small" label="Current Counsellor" fullWidth
                                        value={leadData?.assigned_to_name || 'Unassigned'}
                                        InputProps={{ readOnly: true }}
                                    />
                                    <TextField
                                        size="small" label="Current Manager" fullWidth
                                        value={leadData?.manager_name || '—'}
                                        InputProps={{ readOnly: true }}
                                    />
                                </div>
                                <div className="add-lead-form-grid" style={{ alignItems: 'center' }}>
                                    <Autocomplete
                                        size="small"
                                        options={reassignList}
                                        getOptionLabel={(o) => o ? `${o.name || o.email}${o.email ? ` · ${o.email}` : ''}` : ''}
                                        isOptionEqualToValue={(a, b) => a?.id === b?.id}
                                        value={reassignList.find((u) => u.id === reassignTo) || null}
                                        onChange={(_e, opt) => setReassignTo(opt?.id || '')}
                                        renderInput={(p) => (
                                            <TextField
                                                {...p}
                                                label={isRole(ROLES.SALES_MANAGER) ? 'New counsellor (your team)' : 'New counsellor'}
                                                placeholder="Pick a counsellor…"
                                                helperText={
                                                    reassignList.length === 0
                                                        ? 'No eligible counsellors available.'
                                                        : 'The new owner\'s manager will be linked automatically.'
                                                }
                                            />
                                        )}
                                    />
                                    <TextField
                                        size="small"
                                        label="Reason (optional)"
                                        value={reassignReason}
                                        onChange={(e) => setReassignReason(e.target.value)}
                                        placeholder="Why this reassignment?"
                                        fullWidth
                                    />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                                    <Button
                                        variant="contained"
                                        color="warning"
                                        onClick={handleReassign}
                                        disabled={reassigning || !reassignTo || reassignTo === leadData?.assigned_to}
                                        sx={{ textTransform: 'none' }}
                                    >
                                        {reassigning ? 'Reassigning…' : 'Reassign now'}
                                    </Button>
                                    {reassignTo === leadData?.assigned_to && reassignTo && (
                                        <span style={{ fontSize: 12, color: '#888' }}>
                                            That's already the current owner.
                                        </span>
                                    )}
                                    {reassignErr && (
                                        <span style={{ fontSize: 12, color: '#d32f2f' }}>{reassignErr}</span>
                                    )}
                                </div>
                            </>
                        )}

                        {lockedConverted ? (
                            <>
                                <div className="add-lead-section-title">Lead / Application Stage</div>
                                <div className="add-lead-form-grid">
                                    <TextField
                                        size="small" label="Stage" fullWidth
                                        value={(stages.data || []).find((s) => s.id === formData.stage_id)?.name || '—'}
                                        InputProps={{ readOnly: true }}
                                    />
                                    <TextField
                                        size="small" label="Sub-Stage" fullWidth
                                        value={(subStages.data || []).find((s) => s.id === formData.sub_stage_id)?.name || '—'}
                                        InputProps={{ readOnly: true }}
                                    />
                                </div>
                                {formData.closure_remarks && (
                                    <div className="add-lead-form-grid">
                                        <TextField
                                            size="small" label="Closure Remarks" fullWidth multiline
                                            value={formData.closure_remarks}
                                            InputProps={{ readOnly: true }}
                                        />
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="add-lead-section-title">Change Lead /Application Stage</div>
                                <div className="add-lead-form-grid">
                                    <Autocomplete
                                        size="small"
                                        options={(stages.data || []).filter((s) => s.is_active !== false)}
                                        getOptionLabel={(o) => o?.name || ''}
                                        value={(stages.data || []).find((s) => s.id === formData.stage_id) || null}
                                        onChange={(_e, opt) => setField('stage_id')({ target: { value: opt?.id || '' } })}
                                        isOptionEqualToValue={(o, v) => o?.id === v?.id}
                                        loading={stages.loading}
                                        renderInput={(params) => <TextField {...params} label="Stage" placeholder="Type to search…" />}
                                    />
                                    <Autocomplete
                                        size="small"
                                        options={filteredSubStages.filter((s) => s.is_active !== false)}
                                        getOptionLabel={(o) => o?.name || ''}
                                        value={filteredSubStages.find((s) => s.id === formData.sub_stage_id) || null}
                                        onChange={(_e, opt) => setField('sub_stage_id')({ target: { value: opt?.id || '' } })}
                                        isOptionEqualToValue={(o, v) => o?.id === v?.id}
                                        loading={subStages.loading}
                                        disabled={!formData.stage_id}
                                        noOptionsText={
                                            !formData.stage_id
                                                ? 'Pick a stage first'
                                                : 'No sub-stages configured for this stage. Add some in Settings → Setup Dropdown Values → Sub-Stage.'
                                        }
                                        renderInput={(params) => <TextField {...params} label="Sub-Stage" placeholder={formData.stage_id ? 'Type to search…' : 'Pick a stage first'} />}
                                    />
                                </div>


                                {/* When the picked stage is a follow-up stage, offer an
                                    optional next-action datetime so the lead lands in the
                                    counsellor's Follow-up Manager view automatically. */}
                                {(() => {
                                    const picked = (stages.data || []).find((s) => s.id === formData.stage_id);
                                    const isFollowup = picked?.name && /follow/i.test(picked.name);
                                    if (!isFollowup) return null;
                                    const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
                                    const minStr = now.toISOString().slice(0, 16);
                                    const value = formData.next_action_datetime || '';
                                    const isPast = value && new Date(value).getTime() < Date.now();
                                    return (
                                        <div className="add-lead-form-grid">
                                            <TextField
                                                label="Follow-up at"
                                                size="small"
                                                type="datetime-local"
                                                value={value}
                                                onChange={setField('next_action_datetime')}
                                                InputLabelProps={{ shrink: true }}
                                                inputProps={{ min: minStr, style: { paddingTop: 8 } }}
                                                error={isPast}
                                                helperText={isPast
                                                    ? 'Pick a future date and time.'
                                                    : 'Optional. Schedules a planned follow-up so the lead shows up in Follow-up Manager.'}
                                                fullWidth
                                            />
                                        </div>
                                    );
                                })()}

                                <div className="add-lead-form-grid">
                                    {isEditMode && (
                                        <TextField label="Closure Remarks" required size="small" value={formData.closure_remarks} onChange={setField('closure_remarks')} fullWidth />
                                    )}
                                    <TextField label="Remarks" required={!isEditMode} size="small" multiline minRows={2} value={formData.remarks} onChange={setField('remarks')} fullWidth />
                                </div>
                            </>
                        )}
                    </>
                )}

                {!hydrating && activeTab === 1 && (
                    <>
                        <div className="add-lead-section-title">Parent's Details</div>
                        <div className="add-lead-form-grid">
                            <TextField label="Father's Full Name" size="small" value={formData.family.father_name} onChange={setFamilyField('father_name')} fullWidth />
                            <TextField label="Mother's Full Name" size="small" value={formData.family.mother_name} onChange={setFamilyField('mother_name')} fullWidth />
                            <TextField label="Father's Mobile No." size="small" value={formData.family.father_mobile} onChange={setFamilyField('father_mobile')} fullWidth inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 15 }} />
                            <TextField label="Mother's Mobile No." size="small" value={formData.family.mother_mobile} onChange={setFamilyField('mother_mobile')} fullWidth inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 15 }} />
                            <TextField label="Father's Email Id" size="small" value={formData.family.father_email} onChange={setFamilyField('father_email')} fullWidth />
                            <TextField label="Mother's Email Id" size="small" value={formData.family.mother_email} onChange={setFamilyField('mother_email')} fullWidth />
                        </div>

                        <div className="add-lead-section-title">Address Details</div>
                        <div className="add-lead-form-grid">
                            {idSelect({ label: 'Country', value: formData.country_id, onChange: setField('country_id'), options: countries.data, loading: countries.loading })}
                            <FormControl size="small" fullWidth>
                                <InputLabel>State</InputLabel>
                                <Select label="State" value={formData.state_id || ''} onChange={setField('state_id')} disabled={states.loading}>
                                    <MenuItem value=""><em>None</em></MenuItem>
                                    {filteredStates.filter((s) => s.is_active !== false).map((s) => (
                                        <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <TextField label="District" size="small" value={formData.district} onChange={setField('district')} fullWidth />
                            <TextField label="City" size="small" value={formData.city} onChange={setField('city')} fullWidth />
                            <TextField label="Address" size="small" value={formData.address} onChange={setField('address')} fullWidth />
                            <TextField label="Pincode" size="small" value={formData.pincode} onChange={setField('pincode')} fullWidth inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 10 }} />
                        </div>
                    </>
                )}

                {!hydrating && activeTab === 2 && (
                    <>
                        <div className="add-lead-form-grid">
                            {idSelect({ label: 'Channel', value: formData.source.channel_id, onChange: setSourceField('channel_id'), options: channels.data, loading: channels.loading })}
                            {idSelect({ label: 'Source', value: formData.source.source_id, onChange: setSourceField('source_id'), options: sources.data, loading: sources.loading })}
                            {idSelect({ label: 'Campaign', value: formData.source.campaign_id, onChange: setSourceField('campaign_id'), options: campaigns.data, loading: campaigns.loading })}
                            {idSelect({ label: 'Medium', value: formData.source.medium_id, onChange: setSourceField('medium_id'), options: mediums.data, loading: mediums.loading })}
                        </div>
                    </>
                )}

                {!hydrating && activeTab === 3 && visibleCustomFields.length > 0 && (
                    <>
                        <div className="add-lead-section-title">Additional Fields</div>
                        <div className="add-lead-form-grid">
                            {visibleCustomFields.map(renderCustomField)}
                        </div>
                    </>
                )}

                {/* Call Recordings tab — only the last index, only edit
                    mode, regardless of whether Additional Fields is showing.
                    Index is 4 when custom fields visible, otherwise 3. */}
                {!hydrating && isEditMode && activeTab === (visibleCustomFields.length > 0 ? 4 : 3) && (
                    <CallRecordingsTab leadId={leadData.id} />
                )}
            </DialogContent>

            <DialogActions className="add-lead-actions">
                {submitError && (
                    <Alert severity="error" sx={{ mr: 'auto', flex: 1, fontSize: 13, py: 0 }}>{submitError}</Alert>
                )}
                {!submitError && lockedConverted && (
                    <Alert severity="info" sx={{ mr: 'auto', flex: 1, fontSize: 13, py: 0 }}>
                        This lead has been converted. Only an administrator can edit it.
                    </Alert>
                )}
                <Button variant="outlined" onClick={handleCancel} disabled={submitting} className="add-lead-cancel-btn">
                    {lockedConverted ? 'Close' : 'Cancel'}
                </Button>
                <Tooltip
                    title={lockedConverted ? 'Converted leads can only be edited by an administrator' : ''}
                    disableHoverListener={!lockedConverted}
                >
                    <span>
                        <Button
                            variant="contained"
                            onClick={handleSubmit}
                            disabled={submitting || hydrating || lockedConverted}
                            className="add-lead-add-btn"
                        >
                            {submitting ? (isEditMode ? 'Updating…' : 'Adding…') : (isEditMode ? 'Update' : 'Add')}
                        </Button>
                    </span>
                </Tooltip>
            </DialogActions>

            {/* Inline create-new dialog. Renders on top of this Dialog with a higher
                z-index; closing it leaves the Add/Edit Lead form intact. */}
            <QuickCreateDialog
                open={!!quickCreate.type}
                type={quickCreate.type}
                onClose={closeQuickCreate}
                onCreated={handleQuickCreated}
            />
        </Dialog>
    );
};

export default AddNewLead;

// ============================================================================
// Call Recordings tab
// ----------------------------------------------------------------------------
// Edit-mode-only tab in the AddNewLead drawer. Lets any role with access to
// the lead attach an .mp3 recording (≤ 100 MB) and listen to existing ones.
// Stage / sub-stage are snapshotted server-side from the lead's current
// stage at attach time, so this UI doesn't need to send them.
// ============================================================================
const MAX_RECORDING_BYTES = 100 * 1024 * 1024;

const fmtRecTime = (v) => {
    if (!v) return '—';
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
};
const fmtRecSize = (n) => {
    if (!n) return '';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

function CallRecordingsTab({ leadId }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [uploadProgress, setUploadProgress] = useState('');
    const fileInputRef = React.useRef(null);

    // signed playback URLs keyed by recording id; loaded lazily on first
    // play. They expire after 5 min server-side; we don't try to refresh
    // unless the user actually clicks play again.
    const [playUrls, setPlayUrls] = useState({});
    const [playLoadingId, setPlayLoadingId] = useState(null);

    const me = auth.getUser() || {};
    const isAdmin = me.role === 'super_admin';

    const reload = async () => {
        setLoading(true); setLoadError('');
        try {
            const r = await leadsApi.recordings.list(leadId);
            setItems(r?.data ?? []);
        } catch (e) { setLoadError(e?.message || 'Failed to load recordings'); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (leadId) reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [leadId]);

    const handlePick = () => fileInputRef.current?.click();

    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = ''; // allow re-uploading the same file later
        setUploadError('');
        if (!/\.mp3$/i.test(file.name) && file.type !== 'audio/mpeg') {
            setUploadError('Only .mp3 files are accepted');
            return;
        }
        if (file.size > MAX_RECORDING_BYTES) {
            setUploadError(`File too large — limit is ${fmtRecSize(MAX_RECORDING_BYTES)}`);
            return;
        }

        setUploading(true);
        try {
            // 1. presign
            setUploadProgress('Requesting upload URL…');
            const ps = await uploadsApi.presign({
                purpose: 'recording',
                content_type: 'audio/mpeg',
                size_bytes: file.size,
                filename: file.name,
            });
            const presign = ps?.data;
            if (!presign?.upload_url || !presign?.r2_key) throw new Error('Presign returned no URL');

            // 2. PUT the file to GCS using the signed URL. Same Content-Type
            //    that was signed, otherwise GCS rejects the PUT.
            setUploadProgress('Uploading…');
            const putRes = await fetch(presign.upload_url, {
                method: 'PUT',
                headers: presign.headers || { 'Content-Type': 'audio/mpeg' },
                body: file,
            });
            if (!putRes.ok) throw new Error(`Upload to storage failed (${putRes.status})`);

            // 3. Optionally probe duration via an HTMLAudioElement so the
            //    server can store it. Best-effort; if it fails we skip.
            let duration_seconds;
            try {
                duration_seconds = await new Promise((resolve, reject) => {
                    const audio = document.createElement('audio');
                    audio.preload = 'metadata';
                    audio.onloadedmetadata = () => {
                        const d = Math.round(audio.duration);
                        URL.revokeObjectURL(audio.src);
                        resolve(Number.isFinite(d) ? d : undefined);
                    };
                    audio.onerror = () => { URL.revokeObjectURL(audio.src); reject(); };
                    audio.src = URL.createObjectURL(file);
                });
            } catch { /* metadata probe failed — fine */ }

            // 4. Record the metadata server-side. Server snapshots stage.
            setUploadProgress('Saving…');
            await leadsApi.recordings.create(leadId, {
                r2_key: presign.r2_key,
                file_name: file.name,
                size_bytes: file.size,
                duration_seconds,
            });

            await reload();
        } catch (err) {
            setUploadError(err?.message || 'Upload failed');
        } finally {
            setUploading(false);
            setUploadProgress('');
        }
    };

    const handlePlay = async (rec) => {
        if (playUrls[rec.id]) return;
        setPlayLoadingId(rec.id);
        try {
            const r = await leadsApi.recordings.playUrl(leadId, rec.id);
            const url = r?.data?.url;
            if (!url) throw new Error('No playback URL');
            setPlayUrls((prev) => ({ ...prev, [rec.id]: url }));
        } catch (e) {
            alert(e?.message || 'Could not load recording');
        } finally {
            setPlayLoadingId(null);
        }
    };

    const handleDelete = async (rec) => {
        if (!confirm(`Delete recording "${rec.file_name || 'this file'}"? This can't be undone.`)) return;
        try {
            await leadsApi.recordings.delete(leadId, rec.id);
            setPlayUrls((prev) => { const next = { ...prev }; delete next[rec.id]; return next; });
            await reload();
        } catch (e) {
            alert(e?.message || 'Delete failed');
        }
    };

    // Group recordings by stage so the user can see "Followup → 3 recordings".
    // Uploads with no stage_id snapshot bucket under "Untagged".
    const grouped = useMemo(() => {
        const map = new Map();
        for (const r of items) {
            const key = r.stage_id || 'untagged';
            const label = r.stage_name
                ? (r.sub_stage_name ? `${r.stage_name} · ${r.sub_stage_name}` : r.stage_name)
                : 'Untagged';
            if (!map.has(key)) map.set(key, { label, rows: [] });
            map.get(key).rows.push(r);
        }
        return Array.from(map.values());
    }, [items]);

    return (
        <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Call Recordings</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                        Attach .mp3 files (up to 100 MB). Each upload is tagged with the lead’s current stage.
                    </div>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".mp3,audio/mpeg"
                    style={{ display: 'none' }}
                    onChange={handleFile}
                />
                <Button
                    variant="outlined"
                    size="small"
                    onClick={handlePick}
                    disabled={uploading}
                    startIcon={uploading ? <CircularProgress size={14} /> : <GraphicEqIcon />}
                >
                    {uploading ? (uploadProgress || 'Working…') : 'Upload recording'}
                </Button>
            </div>

            {uploadError && <Alert severity="error" sx={{ mb: 1.5, fontSize: 13 }}>{uploadError}</Alert>}
            {loadError && <Alert severity="error" sx={{ mb: 1.5, fontSize: 13 }}>{loadError}</Alert>}

            {loading && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                    <CircularProgress size={22} />
                </div>
            )}

            {!loading && items.length === 0 && (
                <div style={{
                    padding: 32, textAlign: 'center', color: '#6b7280',
                    background: '#fafafa', border: '1px dashed #e5e7eb', borderRadius: 8,
                }}>
                    No call recordings yet. Click <strong>Upload recording</strong> to add one.
                </div>
            )}

            {!loading && grouped.map((group) => (
                <div key={group.label} style={{ marginBottom: 16 }}>
                    <div style={{
                        fontSize: 12, fontWeight: 700, color: '#475569',
                        textTransform: 'uppercase', letterSpacing: 0.5,
                        padding: '6px 0', borderBottom: '1px solid #e5e7eb', marginBottom: 8,
                    }}>
                        {group.label} <Chip size="small" label={group.rows.length} sx={{ ml: 1, height: 18, fontSize: 11 }} />
                    </div>
                    {group.rows.map((rec) => {
                        const canDelete = isAdmin || rec.uploaded_by === me.id;
                        return (
                            <div key={rec.id} style={{
                                display: 'flex', flexDirection: 'column', gap: 6,
                                padding: '10px 12px', marginBottom: 6,
                                background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {rec.file_name || 'recording.mp3'}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                                            {rec.uploaded_by_name || rec.uploaded_by_email || 'Unknown uploader'}
                                            {' · '}{fmtRecTime(rec.uploaded_at)}
                                            {rec.size_bytes ? ` · ${fmtRecSize(rec.size_bytes)}` : ''}
                                            {rec.duration_seconds ? ` · ${rec.duration_seconds}s` : ''}
                                        </div>
                                    </div>
                                    {canDelete && (
                                        <Tooltip title="Delete recording">
                                            <IconButton size="small" onClick={() => handleDelete(rec)}>
                                                <DeleteOutlineIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </div>
                                {playUrls[rec.id] ? (
                                    <audio
                                        controls
                                        src={playUrls[rec.id]}
                                        preload="none"
                                        style={{ width: '100%', height: 36 }}
                                    />
                                ) : (
                                    <Button
                                        variant="text"
                                        size="small"
                                        onClick={() => handlePlay(rec)}
                                        disabled={playLoadingId === rec.id}
                                        startIcon={playLoadingId === rec.id ? <CircularProgress size={14} /> : <GraphicEqIcon />}
                                        sx={{ alignSelf: 'flex-start', fontSize: 12 }}
                                    >
                                        {playLoadingId === rec.id ? 'Loading…' : 'Listen'}
                                    </Button>
                                )}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
