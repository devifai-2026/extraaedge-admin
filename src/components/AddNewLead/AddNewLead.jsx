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
import { leadsApi, usersApi, uploadsApi, admissionsApi } from "../../lib/endpoints";
import { auth } from "../../lib/api";
import { useDropdown } from "../../lib/useDropdowns";
import QuickCreateDialog from "../QuickCreateDialog/QuickCreateDialog";
import SubStageReviewModal from "./SubStageReviewModal";
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
    next_action_comment: "",
    remarks: "",
    closure_remarks: "",
    // Discount captured when moving a lead to the Qualified stage. <=10%
    // self-applies for a counsellor; higher needs branch/sales manager approval.
    discount_percent: "",
    discount_reason: "",
    // CSV-parity: optional audit timestamps. Blank → server uses now().
    // Format on the wire: ISO string. UI uses datetime-local inputs.
    created_at: "",
    updated_at: "",
    // Per-stage follow-up history: { [stage_id]: [5 slot objects] }.
    // Each slot: { next_action_datetime: "YYYY-MM-DDTHH:mm", comment, sub_stage_id }.
    // When the user picks a stage_id we lazily seed an empty 5-slot array for it
    // so previously-entered stages are retained in memory as the user toggles
    // between stages within the form. On submit, every populated row across
    // every stage is sent to the API. The sub-stage review modal lets the user
    // assign a sub_stage_id per filled row before submission.
    followups_by_stage: {},
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

// Slice an ISO timestamp down to the shape <input type="datetime-local"> expects:
// "YYYY-MM-DDTHH:mm". Anything past the minute is dropped.
const toLocalDtInput = (iso) => {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '';
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
        return '';
    }
};

// Human-readable date for the read-only "Other follow-up attempts" list.
const fmtAttemptDate = (iso) => {
    if (!iso) return '—';
    try {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '—';
        return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
    } catch { return '—'; }
};

const ATTEMPT_STATUS = {
    planned:   { color: '#FB8C00', label: 'Planned'   },
    done:      { color: '#43A047', label: 'Done'      },
    missed:    { color: '#E53935', label: 'Missed'    },
    cancelled: { color: '#9E9E9E', label: 'Cancelled' },
};

// Build an empty 5-slot array. Used to seed a new stage in the
// followups_by_stage map.
const emptySlots = () => ([
    { next_action_datetime: '', comment: '', sub_stage_id: '' },
    { next_action_datetime: '', comment: '', sub_stage_id: '' },
    { next_action_datetime: '', comment: '', sub_stage_id: '' },
    { next_action_datetime: '', comment: '', sub_stage_id: '' },
    { next_action_datetime: '', comment: '', sub_stage_id: '' },
]);

// Convert the backend's followups_by_stage shape into the form's editable
// shape. Backend gives us { stage_id: [row|null, ...5] } where rows have ISO
// datetimes; we convert each row to datetime-local strings and ensure exactly
// 5 slots per stage.
const hydrateFollowupsByStage = (byStage = {}) => {
    const out = {};
    for (const [stageId, rows] of Object.entries(byStage || {})) {
        const slots = emptySlots();
        for (let n = 0; n < 5; n += 1) {
            const r = rows?.[n];
            if (!r) continue;
            slots[n] = {
                next_action_datetime: r.next_action_datetime ? toLocalDtInput(r.next_action_datetime) : '',
                comment: r.comment || '',
                sub_stage_id: r.sub_stage_id || '',
                // Read-only fields surfaced from the backend so the form
                // can show "Done — <reason>" for closed slots.
                status: r.status || '',
                completion_reason: r.completion_reason || '',
            };
        }
        out[stageId] = slots;
    }
    return out;
};

// `viewOnly` opens the same edit modal but locks every input and hides the
// Update button — used by surfaces like Accounts → Pending Admissions where
// a non-counsellor role needs to inspect the lead snapshot without editing.
// Internally we route this through the existing `lockedConverted` plumbing
// so we don't have to wire a second "is locked" signal through 1300 lines.
const AddNewLead = ({ open, onClose, leadData, onCreated, onSaved, viewOnly = false, phonePrefill = '' }) => {
    const isEditMode = Boolean(leadData?.id);
    const [activeTab, setActiveTab] = useState(0);
    const [mandatoryOnly, setMandatoryOnly] = useState(false);
    const [formData, setFormData] = useState(blankForm);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [hydrating, setHydrating] = useState(false);
    // Fresh copy of the lead loaded by leadsApi.get on open and re-fetched
    // after in-dialog mutations like reassign. The Current Counsellor /
    // Current Manager fields read from this so they always reflect the
    // latest server state, not the stale `leadData` prop from the list.
    const [freshLead, setFreshLead] = useState(null);
    // Sub-stage review modal state. When the user clicks Save, if there are
    // filled follow-up rows we open this modal so they can pick a sub-stage
    // per row before the payload actually hits the API.
    const [reviewOpen, setReviewOpen] = useState(false);
    const [reviewRows, setReviewRows] = useState([]);

    // Once a lead has crossed into a success stage (converted_at !== null),
    // only super_admin can keep editing. The backend enforces the same rule
    // on PUT /leads/:id and POST /leads/:id/stage — this flag drives the UI.
    const isConverted = isEditMode && Boolean(leadData?.converted_at || leadData?.is_converted);
    // The `lockedConverted` flag now also fires for the explicit `viewOnly`
    // prop. Every read of this flag inside the JSX below already gates the
    // right things (input disable, Update button hide, reassign panel hide)
    // so we get a full read-only modal for free.
    const lockedConverted = viewOnly || (isConverted && !isRole(ROLES.SUPER_ADMIN));

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
    // Reassign UI is hidden from counsellors — they can't reassign anyone
    // (server-side scope on POST /lead-assignments enforces the same).
    const canReassign = isEditMode && !isRole(ROLES.COUNSELLOR);
    const [reassignList, setReassignList] = useState([]);     // [{id,name,email,manager_id}]
    const [reassignTo, setReassignTo] = useState('');         // chosen user id
    const [reassignReason, setReassignReason] = useState(''); // free-text
    const [reassigning, setReassigning] = useState(false);
    const [reassignErr, setReassignErr] = useState('');
    // Manager preview for the picked counsellor. Loaded lazily when
    // reassignTo changes; null until resolved or if the user has no
    // primary manager.
    const [pickedManagerName, setPickedManagerName] = useState('');
    // Name of the current owner's reporting manager. Resolved from the
    // freshLead's assigned_to → users.manager_id lookup after each load /
    // reassign.
    const [currentManagerName, setCurrentManagerName] = useState('');

    useEffect(() => {
        if (!open || !canReassign) return;
        // Admins see every active counsellor; managers + counsellors get
        // their team-scoped list from the server.
        // Backend caps `limit` at 200 (listUsersQuery zod schema). Asking for
        // more produced a 400 that the .catch below swallowed, leaving the
        // dropdown empty.
        const loader = isRole(ROLES.SUPER_ADMIN)
            ? usersApi.list({ role: 'counsellor', limit: 200 })
            : usersApi.myTeam();
        loader
            .then((r) => {
                const me = leadData?.assigned_to;
                const rows = (r?.data || []).filter((u) =>
                    u.is_active !== false && u.id !== me,
                );
                setReassignList(rows);
            })
            .catch((err) => {
                // Surface the failure to the dev console — previously this
                // swallowed errors silently and left the dropdown empty
                // (e.g. when limit > 200 hit the zod cap).
                console.warn('Reassign list load failed:', err?.message || err);
                setReassignList([]);
            });
    }, [open, canReassign, leadData?.assigned_to]);

    // When a new counsellor is picked, resolve and show their reporting
    // manager so the admin can verify the auto-link before confirming.
    // Cleared when no counsellor is picked.
    useEffect(() => {
        if (!reassignTo) { setPickedManagerName(''); return; }
        const picked = reassignList.find((u) => u.id === reassignTo);
        const mgrId = picked?.manager_id;
        if (!mgrId) { setPickedManagerName(''); return; }
        let alive = true;
        usersApi.get(mgrId)
            .then((r) => { if (alive) setPickedManagerName(r?.data?.name || r?.data?.email || ''); })
            .catch(() => { if (alive) setPickedManagerName(''); });
        return () => { alive = false; };
    }, [reassignTo, reassignList]);

    // Resolve current owner's manager name whenever the lead refreshes (open,
    // reassign). Two-hop lookup: freshLead.assigned_to → users.manager_id →
    // users.name. Cleared if there's no assignee or the user has no manager.
    useEffect(() => {
        const assignee = freshLead?.assigned_to;
        if (!assignee) { setCurrentManagerName(''); return; }
        let alive = true;
        usersApi.get(assignee)
            .then((r) => {
                const mgrId = r?.data?.manager_id;
                if (!mgrId) { if (alive) setCurrentManagerName(''); return null; }
                return usersApi.get(mgrId);
            })
            .then((r2) => {
                if (!r2 || !alive) return;
                setCurrentManagerName(r2?.data?.name || r2?.data?.email || '');
            })
            .catch(() => { if (alive) setCurrentManagerName(''); });
        return () => { alive = false; };
    }, [freshLead?.assigned_to]);

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
            // Refresh in-dialog state instead of closing — Current Counsellor
            // and Current Manager should immediately reflect the new owner.
            // Parent gets onSaved so its list also refreshes in the background.
            try {
                const r = await leadsApi.get(leadData.id);
                setFreshLead(r?.data || null);
            } catch { /* non-fatal — onSaved will refresh on next open */ }
            setReassignTo('');
            setReassignReason('');
            onSaved?.();
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

    // Does the selected stage mark the lead as CONVERTED ("Marks as Converted"
    // / is_success)? Drives the Discount % field — discounts are captured at
    // the moment of conversion (e.g. Enrolled, or any tenant-defined converted
    // stage), using the flag rather than a hardcoded stage code.
    const selectedStage = (stages.data || []).find((s) => s.id === formData.stage_id) || null;
    const isConversionStage = selectedStage?.is_success === true;
    // A counsellor can self-apply up to 10%; higher needs manager approval.
    const discountNum = Number(formData.discount_percent);
    const discountNeedsApproval = Number.isFinite(discountNum) && discountNum > 10;

    // Hydrate form when opening in edit mode. The list endpoint returns flat
    // fields with names; we need IDs, so fetch full lead by id.
    useEffect(() => {
        if (!open) return;
        if (!isEditMode) {
            // Seed the phone when creating a lead from an unmatched recording.
            setFormData(phonePrefill ? { ...blankForm, phone: phonePrefill } : blankForm);
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
                setFreshLead(lead);
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
                    // datetime-local needs "YYYY-MM-DDTHH:mm". The API returns ISO,
                    // so slice off everything after the minute.
                    created_at: lead.created_at ? toLocalDtInput(lead.created_at) : '',
                    updated_at: lead.updated_at ? toLocalDtInput(lead.updated_at) : '',
                    // Upcoming planned follow-up: API returns it in
                    // `upcoming_followups[]` (status='planned', no slot_index).
                    // Hydrate the first one into the "Followup Scheduled On"
                    // field so the user can see/edit it in the form.
                    next_action_datetime: lead.upcoming_followups?.[0]?.next_action_datetime
                        ? toLocalDtInput(lead.upcoming_followups[0].next_action_datetime)
                        : '',
                    next_action_comment: lead.upcoming_followups?.[0]?.comment || '',
                    // Per-stage 5-slot history. Backend returns followups_by_stage
                    // as { stage_id: [row|null × 5] }; we hydrate every stage the
                    // lead currently has rows for so the user sees the full
                    // history when toggling between stages.
                    followups_by_stage: hydrateFollowupsByStage(lead.followups_by_stage),
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

    // Update a single slot for the given stage. Lazily seeds a 5-slot array
    // for the stage if it hasn't been touched yet, so the user can edit any
    // stage without explicit init.
    const setSlotField = (stageId, idx, field) => (e) => {
        const val = e.target.value;
        setFormData((prev) => {
            const byStage = { ...(prev.followups_by_stage || {}) };
            const slots = byStage[stageId] ? [...byStage[stageId]] : emptySlots();
            slots[idx] = { ...(slots[idx] || {}), [field]: val };
            byStage[stageId] = slots;
            return { ...prev, followups_by_stage: byStage };
        });
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

        // Optional audit timestamps. Only send when the user typed something —
        // otherwise we want the server to default to now() (or keep existing
        // values on edit).
        if (formData.created_at) p.created_at = new Date(formData.created_at).toISOString();
        if (formData.updated_at) p.updated_at = new Date(formData.updated_at).toISOString();

        // Per-stage follow-up history. Each (stage, slot) row with a datetime
        // becomes a followups[] entry with status='done', slot_index, and
        // stage_id (required by backend for slot rows). sub_stage_id is
        // assigned via the review modal — buildPayload reads from the
        // already-confirmed `formData.followups_by_stage` map.
        //
        // The upcoming planned follow-up still uses the separate
        // next_action_datetime field (kept for back-compat with /stage
        // endpoint behavior); it's emitted on CREATE only.
        // Status is date-driven, not hard-coded: a future datetime means the
        // followup is still planned, a past datetime means it's already done.
        // Avoids the previous bug where every slot row was stamped 'done'
        // regardless of whether the action had actually happened yet.
        const followups = [];
        const nowMs = Date.now();
        for (const [stageId, slots] of Object.entries(formData.followups_by_stage || {})) {
            if (!stageId) continue;
            for (let i = 0; i < slots.length; i += 1) {
                const slot = slots[i];
                // A comment is only applicable with a date — handleSubmit blocks
                // comment-without-date before we get here, so a slot is sent
                // only when it carries a date.
                if (!slot?.next_action_datetime) continue;
                const dt = new Date(slot.next_action_datetime);
                followups.push({
                    stage_id: stageId,
                    sub_stage_id: slot.sub_stage_id || null,
                    slot_index: i + 1,
                    next_action_datetime: dt.toISOString(),
                    comment: slot.comment || null,
                    status: dt.getTime() > nowMs ? 'planned' : 'done',
                });
            }
        }
        // Top-level "Followup Scheduled On" + "Follow up Comments". Sent in
        // both create and edit mode whenever a date is present (a comment
        // without a date is rejected upstream in handleSubmit).
        if (formData.next_action_datetime) {
            followups.push({
                stage_id: formData.stage_id || null,
                sub_stage_id: formData.sub_stage_id || null,
                next_action_datetime: new Date(formData.next_action_datetime).toISOString(),
                comment: formData.next_action_comment || null,
                status: 'planned',
            });
        }
        if (followups.length) p.followups = followups;

        return p;
    };

    // Build the review-modal rows from current form state. Each row carries
    // enough context (stage name, slot, date, comment) to be reviewed, plus
    // the current sub_stage_id (pre-filled if already set on the slot, or
    // inherited from the form's top-level sub_stage_id when the row's stage
    // matches the currently-selected stage).
    const buildReviewRows = () => {
        const out = [];
        const stagesData = stages.data || [];
        for (const [stageId, slots] of Object.entries(formData.followups_by_stage || {})) {
            if (!stageId) continue;
            const stage = stagesData.find((s) => s.id === stageId);
            if (!stage || stage.is_success) continue;
            for (let i = 0; i < slots.length; i += 1) {
                const slot = slots[i];
                // Only date-bearing slots are reviewable/savable. Comment-
                // without-date is rejected earlier in handleSubmit.
                if (!slot?.next_action_datetime) continue;
                out.push({
                    stage_id: stageId,
                    stage_name: stage.name,
                    slot_index: i + 1,
                    next_action_datetime: slot.next_action_datetime,
                    comment: slot.comment || '',
                    sub_stage_id: slot.sub_stage_id
                        || (stageId === formData.stage_id ? formData.sub_stage_id : '')
                        || '',
                });
            }
        }
        return out;
    };

    // Perform the actual save. Called either directly (no followup rows to
    // review) or from the review modal's onConfirm (rows now carry the
    // user-picked sub_stage_id).
    const performSave = async (reviewedRows) => {
        setSubmitting(true);
        try {
            const payload = buildPayload();
            // Merge reviewed sub_stage_id back into payload.followups by
            // (stage_id, slot_index). Planned rows (no slot_index) are
            // left as-is.
            if (Array.isArray(payload.followups) && reviewedRows?.length) {
                const bySlot = new Map(
                    reviewedRows.map((r) => [`${r.stage_id}|${r.slot_index}`, r.sub_stage_id || null]),
                );
                payload.followups = payload.followups.map((f) => {
                    if (!f.slot_index) return f;
                    const k = `${f.stage_id}|${f.slot_index}`;
                    return bySlot.has(k) ? { ...f, sub_stage_id: bySlot.get(k) } : f;
                });
            }
            if (isEditMode) {
                // A stage/sub-stage transition is owned ENTIRELY by POST
                // /leads/:id/stage (it does the timeline activity, the
                // outgoing-stage follow-up sweep, socket notify, and the
                // Qualified discount hook). If we ALSO sent stage_id in the
                // PUT, the PUT would move the stage + stamp converted_at first,
                // and the subsequent /stage call would then hit the
                // "already converted" guard (blockEditIfConverted) and 403.
                // So: detect the transition, strip stage fields from the PUT,
                // and let /stage handle it.
                const stageChanged = payload.stage_id && payload.stage_id !== leadData.stage_id;
                const subChanged = (payload.sub_stage_id || null) !== (leadData.sub_stage_id || null);
                const doStageMove = payload.stage_id && (stageChanged || subChanged);

                const putPayload = { ...payload };
                if (doStageMove) {
                    delete putPayload.stage_id;
                    delete putPayload.sub_stage_id;
                }
                await leadsApi.update(leadData.id, putPayload);

                let stageResp = null;
                if (doStageMove) {
                    stageResp = await leadsApi.changeStage(leadData.id, {
                        stage_id: payload.stage_id,
                        sub_stage_id: payload.sub_stage_id,
                        remarks: payload.closure_remarks || payload.remarks,
                        ...(formData.next_action_datetime
                            ? { next_action_datetime: new Date(formData.next_action_datetime).toISOString() }
                            : {}),
                        // Discount is only honored by the backend when the
                        // destination is a CONVERSION stage; harmless otherwise.
                        ...(formData.discount_percent !== '' && formData.discount_percent != null
                            ? {
                                discount_percent: Number(formData.discount_percent),
                                ...(formData.discount_reason ? { discount_reason: formData.discount_reason } : {}),
                            }
                            : {}),
                    });
                }
                // If the discount needs approval, the backend HELD the conversion:
                // the lead did NOT move to the converted stage. Tell the user so
                // they don't think it failed.
                if (stageResp?.data?.discount_pending) {
                    setSubmitError('');
                    // eslint-disable-next-line no-alert
                    window.alert(stageResp.data.message || 'Discount sent for manager approval — the lead will convert once approved.');
                }
                onSaved?.();
            } else {
                const created = await leadsApi.create(payload);
                // Pass the created lead back so callers (e.g. the Unmatched
                // Recordings tab) can link it. Existing no-arg handlers ignore it.
                onCreated?.(created?.data ?? null);
            }
            setFormData(blankForm);
            setReviewOpen(false);
            onClose?.(null);
        } catch (e) {
            setSubmitError(e.message || 'Save failed');
        } finally {
            setSubmitting(false);
        }
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
        // Reject past-dated planned follow-ups before any network call.
        if (
            formData.next_action_datetime &&
            new Date(formData.next_action_datetime).getTime() < Date.now()
        ) {
            setSubmitError('Follow-up date and time must be in the future');
            return;
        }
        // A comment without a date is not applicable — every comment must be
        // tied to a "Next Action Date". Flag the offending slot(s) / the top
        // "Follow up Comments" box so the user adds a date or clears the text.
        const commentNoDate = [];
        const topComment = (formData.next_action_comment || '').trim();
        if (topComment && !formData.next_action_datetime) {
            commentNoDate.push('Follow up Comments');
        }
        const stagesData = stages.data || [];
        for (const [stageId, slots] of Object.entries(formData.followups_by_stage || {})) {
            if (!stageId) continue;
            const stageName = stagesData.find((s) => s.id === stageId)?.name || 'stage';
            (slots || []).forEach((slot, idx) => {
                const hasComment = typeof slot?.comment === 'string' && slot.comment.trim();
                if (hasComment && !slot?.next_action_datetime) {
                    commentNoDate.push(`${stageName} — Comment ${idx + 1}`);
                }
            });
        }
        if (commentNoDate.length) {
            setSubmitError(
                `A comment needs a Next Action Date. Add a date (or clear the comment) for: ${commentNoDate.join(', ')}`,
            );
            return;
        }
        // If there are filled follow-up rows, open the sub-stage review modal
        // first. The user picks a sub-stage per row and the modal calls
        // performSave with the reviewed rows. If no rows, skip straight to
        // save with an empty review.
        const rows = buildReviewRows();
        if (rows.length) {
            setReviewRows(rows);
            setReviewOpen(true);
            return;
        }
        await performSave([]);
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
            slotProps={{ paper: { className: "add-lead-dialog" } }}
        >
            <DialogTitle className="add-lead-title" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {viewOnly
                        ? `View Lead ${leadData?.name || ''}`
                        : isEditMode ? `Edit Lead ${leadData?.name || ''}` : 'Add New Lead'}
                </span>
                <IconButton onClick={handleCancel} className="add-lead-close-btn">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <div className="add-lead-tabs-wrapper">
                <Tabs
                    value={activeTab}
                    onChange={(e, v) => setActiveTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    allowScrollButtonsMobile
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
                    {/* Admission Timeline: only for converted leads. Index
                        is "one past Call Recordings" — base 3 + 1 (custom)
                        + 1 (recordings) = 4..5 depending on what else is shown. */}
                    {isEditMode && isConverted && (
                        <Tab
                            label="Admission Timeline"
                            className={activeTab === (3 + (visibleCustomFields.length > 0 ? 1 : 0) + 1) ? "add-lead-tab active" : "add-lead-tab"}
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
                            {/* Read-only branch the lead belongs to (snapshotted from its
                                owner). Shown on edit for every role; "N/A" if unbranched. */}
                            {isEditMode && (
                                <TextField
                                    size="small" label="Branch" fullWidth disabled
                                    value={freshLead?.branch_name || leadData?.branch_name || 'N/A'}
                                />
                            )}
                            {!mandatoryOnly && <TextField label="Email Id" size="small" value={formData.email} onChange={setField('email')} fullWidth />}
                            {!mandatoryOnly && <TextField label="Alternate Email Id" size="small" value={formData.alternate_email} onChange={setField('alternate_email')} fullWidth />}
                            <TextField label="WhatsApp Number" required size="small" value={formData.whatsapp_number} onChange={setField('whatsapp_number')} fullWidth slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*', maxLength: 15 } }} />
                            {!mandatoryOnly && <TextField label="Phone" size="small" value={formData.phone} onChange={setField('phone')} fullWidth slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*', maxLength: 15 } }} />}
                            {!mandatoryOnly && <TextField label="Alternate Contact Number" size="small" value={formData.alternate_contact} onChange={setField('alternate_contact')} fullWidth slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*', maxLength: 15 } }} />}

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
                                    slotProps={{ htmlInput: { min: 1950, max: 2100, step: 1 } }}
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
                                    slotProps={{ htmlInput: { min: 1950, max: 2100, step: 1 } }}
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
                                {(() => {
                                    // Prefer freshLead (re-fetched after reassign / on open)
                                    // over the stale list-row prop.
                                    const counsellor =
                                        freshLead?.current_owner?.assigned_to_name
                                        || freshLead?.assigned_to_name
                                        || leadData?.assigned_to_name
                                        || 'Unassigned';
                                    const manager =
                                        currentManagerName
                                        || freshLead?.manager_name
                                        || leadData?.manager_name
                                        || '—';
                                    return (
                                        <div className="add-lead-form-grid" style={{ alignItems: 'center' }}>
                                            <TextField
                                                size="small" label="Current Counsellor" fullWidth disabled
                                                value={counsellor}
                                            />
                                            <TextField
                                                size="small" label="Current Manager" fullWidth disabled
                                                value={manager}
                                            />
                                        </div>
                                    );
                                })()}
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
                                                        : reassignTo && pickedManagerName
                                                            ? `Reports to: ${pickedManagerName} (linked automatically).`
                                                            : reassignTo
                                                                ? 'This counsellor has no reporting manager set.'
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
                                        onClick={handleReassign}
                                        disabled={reassigning || !reassignTo || reassignTo === leadData?.assigned_to}
                                        sx={{
                                            textTransform: 'none',
                                            backgroundColor: 'var(--primary)',
                                            '&:hover': { backgroundColor: 'var(--primary)', filter: 'brightness(0.92)' },
                                        }}
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

                                {/* Discount % — only when moving to a CONVERSION stage
                                    ("Marks as Converted"), i.e. when the lead is about to be
                                    enrolled. Counsellors can self-apply up to 10%; higher
                                    routes to branch/sales-manager approval (server-enforced). */}
                                {isConversionStage && (
                                    <div style={{ marginTop: 12, padding: 12, border: '1px solid #eee', borderRadius: 8, background: '#fcfcfc' }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Discount %</div>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                            {[5, 10].map((pct) => (
                                                <Chip
                                                    key={pct}
                                                    label={`${pct}%`}
                                                    size="small"
                                                    color={Number(formData.discount_percent) === pct ? 'primary' : 'default'}
                                                    variant={Number(formData.discount_percent) === pct ? 'filled' : 'outlined'}
                                                    onClick={() => setField('discount_percent')({ target: { value: pct } })}
                                                />
                                            ))}
                                            <TextField
                                                size="small"
                                                type="number"
                                                label="Custom %"
                                                value={formData.discount_percent}
                                                onChange={(e) => setField('discount_percent')({ target: { value: e.target.value } })}
                                                inputProps={{ min: 0, max: 100, step: 1 }}
                                                sx={{ width: 120 }}
                                            />
                                            {formData.discount_percent !== '' && (
                                                <Button size="small" onClick={() => { setField('discount_percent')({ target: { value: '' } }); setField('discount_reason')({ target: { value: '' } }); }}>
                                                    Clear
                                                </Button>
                                            )}
                                        </div>
                                        {discountNeedsApproval && (
                                            <Alert severity="warning" sx={{ mt: 1, fontSize: 12, py: 0 }}>
                                                Above 10% — this will be sent to a branch/sales manager for approval.
                                            </Alert>
                                        )}
                                        {formData.discount_percent !== '' && (
                                            <TextField
                                                size="small"
                                                fullWidth
                                                label="Reason (optional)"
                                                placeholder="Why this discount?"
                                                value={formData.discount_reason}
                                                onChange={(e) => setField('discount_reason')({ target: { value: e.target.value } })}
                                                sx={{ mt: 1 }}
                                            />
                                        )}
                                    </div>
                                )}


                                {/* Upcoming follow-up — shown for every stage EXCEPT the
                                    tenant's success ("Converted") stage. Converted leads own
                                    no followups by policy. */}
                                {(() => {
                                    const picked = (stages.data || []).find((s) => s.id === formData.stage_id);
                                    if (!picked || picked.is_success) return null;
                                    const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
                                    const minStr = now.toISOString().slice(0, 16);
                                    const value = formData.next_action_datetime || '';
                                    const isPast = value && new Date(value).getTime() < Date.now();
                                    return (
                                        <div className="add-lead-form-grid">
                                            {/* Native input avoids the MUI floating-label / browser
                                                dd/mm/yyyy placeholder overlap that was visible in
                                                the previous TextField-based render. */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <label style={{ fontSize: 12, color: '#555', fontWeight: 500 }}>Followup Scheduled On</label>
                                                <input
                                                    type="datetime-local"
                                                    value={value}
                                                    onChange={setField('next_action_datetime')}
                                                    min={minStr}
                                                    style={{
                                                        height: 40, padding: '8px 12px',
                                                        border: `1px solid ${isPast ? '#d32f2f' : 'rgba(0,0,0,0.23)'}`,
                                                        borderRadius: 4,
                                                        fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', width: '100%',
                                                    }}
                                                />
                                                <span style={{ fontSize: 11, color: isPast ? '#d32f2f' : '#888' }}>
                                                    {isPast
                                                        ? 'Pick a future date and time.'
                                                        : 'Optional. Schedules a planned follow-up — lead shows up in Follow-up Manager.'}
                                                </span>
                                            </div>
                                            <TextField
                                                label="Follow up Comments"
                                                size="small"
                                                value={formData.next_action_comment || ''}
                                                onChange={setField('next_action_comment')}
                                                fullWidth
                                                helperText="Comment for the scheduled follow-up."
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

                                {/* Per-stage 5-slot follow-up history. Shown for every stage
                                    EXCEPT the success ("Converted") stage. Works in both Add
                                    and Edit modes.

                                    We render a section for EVERY stage that already has
                                    follow-ups (so a lead's existing history stays visible no
                                    matter which stage is currently selected) PLUS the
                                    currently-selected stage (so the user can add new slots to
                                    it). Previously the grid only showed the selected stage's
                                    slots, so switching stages made the original stage's
                                    follow-ups + comments vanish from view — they were still in
                                    state, but looked deleted. */}
                                {(() => {
                                    const stageList = stages.data || [];
                                    const byStage = formData.followups_by_stage || {};
                                    // Stages that already carry follow-ups, plus the selected
                                    // stage. Dedupe, drop success stages (Converted owns none).
                                    const stageIds = Array.from(new Set([
                                        ...Object.keys(byStage).filter((sid) => sid && (byStage[sid] || []).some((s) => s?.next_action_datetime || s?.comment)),
                                        ...(formData.stage_id ? [formData.stage_id] : []),
                                    ]));
                                    const sections = stageIds
                                        .map((sid) => stageList.find((s) => s.id === sid))
                                        .filter((s) => s && !s.is_success);
                                    if (!sections.length) return null;
                                    return sections.map((picked) => {
                                        const stageId = picked.id;
                                        const slots = byStage[stageId] || emptySlots();
                                        return (
                                        <React.Fragment key={`fu-${stageId}`}>
                                            <div className="add-lead-section-title">
                                                Follow-up Attempts for {picked.name} (5 slots, most recent first)
                                            </div>
                                            {slots.map((slot, idx) => {
                                                const isDone = slot.status === 'done';
                                                return (
                                                <div key={`${stageId}-${idx}`}>
                                                    <div className="add-lead-form-grid">
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                            <label style={{ fontSize: 12, color: '#555', fontWeight: 500 }}>
                                                                Next Action Date {idx + 1}
                                                                {isDone && (
                                                                    <span style={{
                                                                        marginLeft: 8, fontSize: 10, fontWeight: 700,
                                                                        background: '#e8f5e9', color: '#1b5e20',
                                                                        padding: '2px 6px', borderRadius: 4,
                                                                    }}>DONE</span>
                                                                )}
                                                            </label>
                                                            <input
                                                                type="datetime-local"
                                                                value={slot.next_action_datetime || ''}
                                                                onChange={setSlotField(stageId, idx, 'next_action_datetime')}
                                                                disabled={isDone}
                                                                style={{
                                                                    height: 40,
                                                                    padding: '8px 12px',
                                                                    border: '1px solid rgba(0,0,0,0.23)',
                                                                    borderRadius: 4,
                                                                    fontSize: 14,
                                                                    fontFamily: 'inherit',
                                                                    boxSizing: 'border-box',
                                                                    width: '100%',
                                                                    background: isDone ? '#f5f5f5' : 'white',
                                                                }}
                                                            />
                                                        </div>
                                                        <TextField
                                                            label={`Comment ${idx + 1}`}
                                                            size="small"
                                                            value={slot.comment || ''}
                                                            onChange={setSlotField(stageId, idx, 'comment')}
                                                            fullWidth
                                                            multiline
                                                            maxRows={3}
                                                            disabled={isDone}
                                                        />
                                                    </div>
                                                    {isDone && slot.completion_reason && (
                                                        <div style={{
                                                            marginTop: -8, marginBottom: 16,
                                                            padding: '8px 12px',
                                                            background: '#f0fdf4', borderLeft: '3px solid #43A047',
                                                            borderRadius: 4, fontSize: 12, color: '#1b5e20',
                                                        }}>
                                                            <strong>Closure remark:</strong> {slot.completion_reason}
                                                        </div>
                                                    )}
                                                </div>
                                                );
                                            })}
                                        </React.Fragment>
                                        );
                                    });
                                })()}
                                {/* Other follow-up attempts — read-only.
                                    The 5-slot grid above only renders rows that carry a
                                    slot_index (1..5) tied to a stage. Ad-hoc follow-ups
                                    (slot_index = null) — e.g. ones created via the
                                    "Followup Scheduled On" field, the Follow-up Manager, or
                                    bulk import without slot columns — have no slot to live in,
                                    so they'd otherwise be invisible here even though the lead
                                    clearly has follow-up history. List them read-only so the
                                    user can see WHY a lead matched a follow-up date filter. */}
                                {(() => {
                                    const all = freshLead?.past_followups || [];
                                    const adhoc = all.filter((f) => f && (f.slot_index === null || f.slot_index === undefined));
                                    if (!adhoc.length) return null;
                                    const stageName = (sid) => (stages.data || []).find((s) => s.id === sid)?.name;
                                    const subStageName = (ssid) => (subStages.data || []).find((s) => s.id === ssid)?.name;
                                    return (
                                        <>
                                            <div className="add-lead-section-title">
                                                Other follow-up attempts ({adhoc.length})
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                                                {adhoc.map((f) => {
                                                    const meta = ATTEMPT_STATUS[f.status] || { color: '#9E9E9E', label: f.status || '—' };
                                                    return (
                                                        <div
                                                            key={f.id}
                                                            style={{
                                                                display: 'flex', alignItems: 'flex-start', gap: 10,
                                                                padding: '8px 12px', borderRadius: 6,
                                                                background: '#fafafa', border: '1px solid #eee',
                                                            }}
                                                        >
                                                            <span style={{
                                                                flexShrink: 0, marginTop: 2,
                                                                padding: '2px 8px', borderRadius: 999,
                                                                background: `${meta.color}1A`, color: meta.color,
                                                                fontSize: 11, fontWeight: 700,
                                                            }}>
                                                                {meta.label}
                                                            </span>
                                                            <div style={{ minWidth: 0 }}>
                                                                <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>
                                                                    {fmtAttemptDate(f.next_action_datetime)}
                                                                </div>
                                                                {(stageName(f.stage_id) || subStageName(f.sub_stage_id)) && (
                                                                    <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>
                                                                        <span style={{ fontWeight: 600 }}>Stage:</span> {stageName(f.stage_id) || '—'}
                                                                        <span style={{ margin: '0 8px', color: '#ccc' }}>|</span>
                                                                        <span style={{ fontWeight: 600 }}>Sub-stage:</span> {subStageName(f.sub_stage_id) || '—'}
                                                                    </div>
                                                                )}
                                                                {f.comment && (
                                                                    <div style={{ fontSize: 12, color: '#555', fontStyle: 'italic', marginTop: 2 }}>
                                                                        &quot;{f.comment}&quot;
                                                                    </div>
                                                                )}
                                                                {f.completion_reason && (
                                                                    <div style={{ fontSize: 12, color: '#1b5e20', marginTop: 2 }}>
                                                                        <strong>Closure remark:</strong> {f.completion_reason}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    );
                                })()}
                                {/* Audit timestamps — rendered once, outside the per-stage
                                    follow-up loop. Hidden on the success (Converted) stage. */}
                                {(() => {
                                    const picked = (stages.data || []).find((s) => s.id === formData.stage_id);
                                    if (!picked || picked.is_success) return null;
                                    return (
                                        <>
                                            {/* Audit timestamps. Optional — leave blank to let the server
                                                use now() (or, on edit, keep whatever is already in DB). */}
                                            <div className="add-lead-section-title">Audit Timestamps (optional)</div>
                                            <div className="add-lead-form-grid">
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                    <label style={{ fontSize: 12, color: '#555', fontWeight: 500 }}>Lead Created On</label>
                                                    <input
                                                        type="datetime-local"
                                                        value={formData.created_at || ''}
                                                        onChange={setField('created_at')}
                                                        style={{
                                                            height: 40, padding: '8px 12px',
                                                            border: '1px solid rgba(0,0,0,0.23)', borderRadius: 4,
                                                            fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', width: '100%',
                                                        }}
                                                    />
                                                    <span style={{ fontSize: 11, color: '#888' }}>If left blank, today&apos;s date and time will be used automatically.</span>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                    <label style={{ fontSize: 12, color: '#555', fontWeight: 500 }}>Updated On</label>
                                                    <input
                                                        type="datetime-local"
                                                        value={formData.updated_at || ''}
                                                        onChange={setField('updated_at')}
                                                        style={{
                                                            height: 40, padding: '8px 12px',
                                                            border: '1px solid rgba(0,0,0,0.23)', borderRadius: 4,
                                                            fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', width: '100%',
                                                        }}
                                                    />
                                                    <span style={{ fontSize: 11, color: '#888' }}>If left blank, today&apos;s date and time will be used automatically.</span>
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()}
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
                            <TextField label="Father's Mobile No." size="small" value={formData.family.father_mobile} onChange={setFamilyField('father_mobile')} fullWidth slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*', maxLength: 15 } }} />
                            <TextField label="Mother's Mobile No." size="small" value={formData.family.mother_mobile} onChange={setFamilyField('mother_mobile')} fullWidth slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*', maxLength: 15 } }} />
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
                            <TextField label="Pincode" size="small" value={formData.pincode} onChange={setField('pincode')} fullWidth slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*', maxLength: 10 } }} />
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

                {/* Admission Timeline tab — converted leads only. Stays
                    one past Call Recordings regardless of custom-fields
                    visibility. */}
                {!hydrating && isEditMode && isConverted && activeTab === (3 + (visibleCustomFields.length > 0 ? 1 : 0) + 1) && (
                    <AdmissionTimelineTab leadId={leadData.id} />
                )}
            </DialogContent>

            <DialogActions className="add-lead-actions">
                {submitError && (
                    <Alert severity="error" sx={{ mr: 'auto', flex: 1, fontSize: 13, py: 0 }}>{submitError}</Alert>
                )}
                {/* The "only an administrator can edit" banner is meant for
                    edit-mode-on-a-converted-lead. Suppress it in viewOnly
                    mode — the user explicitly opened the view, so they're
                    not trying to edit. */}
                {!submitError && lockedConverted && !viewOnly && (
                    <Alert severity="info" sx={{ mr: 'auto', flex: 1, fontSize: 13, py: 0 }}>
                        This lead has been converted. Only an administrator can edit it.
                    </Alert>
                )}
                <Button variant="outlined" onClick={handleCancel} disabled={submitting} className="add-lead-cancel-btn">
                    {lockedConverted ? 'Close' : 'Cancel'}
                </Button>
                {/* Hide the Update/Add button entirely in viewOnly mode —
                    showing it greyed out is confusing because the user
                    didn't open the modal to edit. */}
                {!viewOnly && (
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
                )}
            </DialogActions>

            {/* Inline create-new dialog. Renders on top of this Dialog with a higher
                z-index; closing it leaves the Add/Edit Lead form intact. */}
            <QuickCreateDialog
                open={!!quickCreate.type}
                type={quickCreate.type}
                onClose={closeQuickCreate}
                onCreated={handleQuickCreated}
            />
            {/* Sub-stage review modal. Opens on submit when there are filled
                follow-up rows; on confirm, performSave fires the API call. */}
            <SubStageReviewModal
                open={reviewOpen}
                rows={reviewRows}
                subStages={subStages.data || []}
                onCancel={() => setReviewOpen(false)}
                onConfirm={(rows) => performSave(rows)}
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

// ---------- Admission Timeline tab ---------------------------------------
//
// Shown inside the lead drawer when the lead is converted. Fetches the
// admission_events log via /admissions/by-lead/:leadId/timeline and
// renders a vertical timeline with status badges + actor info + a
// human-readable summary per event.
const EVENT_META = {
    created:         { label: 'Created',        color: '#10b981', icon: '●' },
    status_changed:  { label: 'Status changed', color: '#3b82f6', icon: '→' },
    receipt_added:   { label: 'Receipt added',  color: '#16a34a', icon: '₹' },
    receipt_deleted: { label: 'Receipt removed',color: '#dc2626', icon: '−' },
    field_edited:    { label: 'Edited',         color: '#8b5cf6', icon: '✎' },
    photo_uploaded:  { label: 'Photo uploaded', color: '#0ea5e9', icon: '📷' },
    note_added:      { label: 'Note added',     color: '#64748b', icon: '✎' },
};

const ACTOR_LABEL = {
    user: 'Team',
    student: 'Student',
    system: 'System',
};

const fmtEventTime = (s) => {
    if (!s) return '';
    try {
        return new Date(s).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    } catch { return ''; }
};

// Pretty-print a cell value. null/undefined/empty → "Not filled yet".
const fmtCell = (v) => {
    if (v === null || v === undefined || v === '') {
        return <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Not filled yet</span>;
    }
    return String(v);
};

const fmtMoney = (v) => {
    if (v === null || v === undefined || v === '') return '₹0';
    const n = Number(v);
    if (!Number.isFinite(n)) return '₹0';
    return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const fmtDateOnly = (s) => {
    if (!s) return '';
    try {
        return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return ''; }
};

// HTML escape for the printable view — every interpolated value runs
// through this so a stray "<" or "&" in user data can't break the markup.
const esc = (v) => {
    if (v === null || v === undefined) return '<span style="color:#9ca3af;font-style:italic">Not filled yet</span>';
    const s = String(v);
    if (s === '') return '<span style="color:#9ca3af;font-style:italic">Not filled yet</span>';
    return s
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};
const escMoney = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return '&#8377;0';
    return `&#8377;${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};
const escDate = (s) => {
    if (!s) return esc(null);
    try {
        return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return esc(null); }
};

// Darken a hex colour by `pct` percentage points. Used to derive the
// gradient end-stop for the branded hero. Keeps the printable HTML
// self-contained — no extra colour library at runtime. Declared before
// buildAdmissionFormHtml so the builder's closure resolves it (const
// declarations don't hoist).
const darken = (hex, pct) => {
    const h = String(hex || '').replace('#', '');
    if (h.length !== 6) return hex;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const f = Math.max(0, 1 - pct / 100);
    const to2 = (n) => Math.round(n * f).toString(16).padStart(2, '0');
    return `#${to2(r)}${to2(g)}${to2(b)}`;
};

// Build a fully self-contained printable HTML document for the admission
// form. Returns just the <body> content + an inline <style> block — the
// view-in-new-tab path wraps it in a full document, the download path
// renders it offscreen for html2canvas.
//
// IMPORTANT: html2canvas struggles with flex/grid when the host is mounted
// offscreen (position:fixed left:-10000px). To keep the rendered PDF and
// the in-tab view byte-identical, the entire layout uses HTML tables —
// they're a 1995-era hack, but they paint correctly under html2canvas
// every time and they're equally happy in the live tab.
const buildAdmissionFormHtml = ({
    admission, accountManager, resolvedManager, tenant,
    photoUrl,
    courseFeeSource, totalFees, paid, pending,
    feeSchedule, receipts, education,
}) => {
    const a = admission || {};
    const fullName = [a.first_name, a.middle_name, a.last_name].filter(Boolean).join(' ') || null;
    const managerLine = a.guided_by_manager_name
        || (resolvedManager ? `${resolvedManager.name}${resolvedManager.email ? ' · ' + resolvedManager.email : ''}` : null);

    // Tenant branding — pulled from the cached session blob written at
    // login. Falls back to the orange brand colour used elsewhere when
    // the tenant didn't configure one.
    const brand = tenant?.brand_primary_color || '#E87B2F';
    const brandDark = darken(brand, 18);
    const brandName = tenant?.brand_name || tenant?.company_name || tenant?.name || 'ExtraaEdge';
    const logoUrl = tenant?.logo_url || null;

    // Render helpers used only inside this builder
    const row = (label, value) => `
      <tr>
        <td class="lbl">${esc(label)}</td>
        <td class="val">${value}</td>
      </tr>
    `;
    const sect = (title, inner) => `
      <div class="section">
        <div class="section-title">${esc(title)}</div>
        <div class="section-body">${inner}</div>
      </div>
    `;

    // Tables
    const receiptsTable = receipts.length === 0
        ? `<div class="empty">No payments recorded yet.</div>`
        : `<table class="grid" cellspacing="0" cellpadding="0">
            <thead><tr>
              <th style="width:18%">Receipt #</th>
              <th style="width:18%">Date</th>
              <th style="width:20%" class="r">Amount</th>
              <th style="width:18%">Mode</th>
              <th>Transaction</th>
            </tr></thead><tbody>${
              receipts.map((r) => `<tr>
                <td><strong>${esc(r.receipt_no || '—')}</strong></td>
                <td>${escDate(r.receipt_date)}</td>
                <td class="r mono"><strong>${escMoney(r.amount)}</strong></td>
                <td>${esc(r.mode_of_payment || '—')}</td>
                <td>${esc(r.transaction_details || '—')}</td>
              </tr>`).join('')
           }</tbody></table>`;

    const scheduleTable = feeSchedule.length === 0
        ? `<div class="empty">Not filled yet</div>`
        : `<table class="grid" cellspacing="0" cellpadding="0">
            <thead><tr>
              <th style="width:30%">Installment</th>
              <th style="width:40%">Due date</th>
              <th class="r">Amount</th>
            </tr></thead><tbody>${
              feeSchedule.map((f) => `<tr>
                <td><strong>#${esc(f.installment_no)}</strong></td>
                <td>${escDate(f.due_date)}</td>
                <td class="r mono"><strong>${escMoney(f.amount)}</strong></td>
              </tr>`).join('')
           }</tbody></table>`;

    const eduTable = education.length === 0
        ? `<div class="empty">Not filled yet</div>`
        : `<table class="grid" cellspacing="0" cellpadding="0">
            <thead><tr>
              <th>Examination</th><th>Stream</th><th>Board / University</th><th>College</th>
              <th class="r" style="width:10%">Year</th>
              <th class="r" style="width:10%">%</th>
            </tr></thead><tbody>${
              education.map((e) => `<tr>
                <td><strong>${esc(e.examination || '—')}</strong></td>
                <td>${esc(e.stream || '—')}</td>
                <td>${esc(e.board_university || '—')}</td>
                <td>${esc(e.college_name || '—')}</td>
                <td class="r">${esc(e.year_of_passing || '—')}</td>
                <td class="r">${e.percentage != null ? esc(e.percentage) + '%' : '—'}</td>
              </tr>`).join('')
           }</tbody></table>`;

    const courseFeesBlock = !courseFeeSource
        ? `<div class="alert">Course price is missing. No custom offer exists for this lead and the programme has no catalogue price.</div>`
        : `<table class="kv-table" cellspacing="0" cellpadding="0">
             <tbody>
               <tr>
                 <td class="lbl">Pricing source</td>
                 <td class="val">
                   <span class="tag ${courseFeeSource.kind === 'offer' ? 'tag-offer' : 'tag-catalogue'}">
                     ${courseFeeSource.kind === 'offer' ? 'Custom offer' : 'Catalogue price'}
                   </span>
                   <span class="muted">${esc(courseFeeSource.label)}</span>
                 </td>
               </tr>
               ${row('Total course fees', `<strong>${escMoney(courseFeeSource.data.course_fees)}</strong>`)}
               ${row('Registration amount', escMoney(courseFeeSource.data.registration_amount ?? 0))}
               ${row('Payment mode', esc(courseFeeSource.data.payment_mode))}
             </tbody>
           </table>`;

    // Payment summary as a 3-column TABLE (not flex/grid) so html2canvas
    // lays it out reliably. Each cell is its own card-like box.
    const pendingLabel = pending < 0 ? 'Overpaid' : 'Remaining';
    const pendingTint = pending > 0 ? '#fef2f2' : pending < 0 ? '#fef3c7' : '#f1f5f9';
    const pendingBorder = pending > 0 ? '#fecaca' : pending < 0 ? '#fde68a' : '#e2e8f0';
    const paymentSummaryBlock = `
      <table class="money-table" cellspacing="0" cellpadding="0">
        <tr>
          <td class="money-cell" style="background:#eef2ff;border-color:#c7d2fe">
            <div class="money-lbl">Total fees</div>
            <div class="money-val">${escMoney(totalFees)}</div>
          </td>
          <td class="money-gap"></td>
          <td class="money-cell" style="background:#ecfdf5;border-color:#a7f3d0">
            <div class="money-lbl">Paid till date</div>
            <div class="money-val">${escMoney(paid)}</div>
          </td>
          <td class="money-gap"></td>
          <td class="money-cell" style="background:${pendingTint};border-color:${pendingBorder}">
            <div class="money-lbl">${esc(pendingLabel)}</div>
            <div class="money-val">${escMoney(Math.abs(pending))}</div>
          </td>
        </tr>
      </table>
    `;

    // Account manager block — table-based, with an avatar disk on the left
    // and the role/email stack on the right. Mirrors the in-app banner.
    const amInitials = accountManager
        ? accountManager.name.split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase()
        : 'AM';
    const amBlock = `
      <table class="am-banner" cellspacing="0" cellpadding="0">
        <tr>
          <td class="am-avatar"><div class="am-disc">${esc(amInitials)}</div></td>
          <td class="am-text">
            <div class="am-lbl">Account manager</div>
            ${accountManager
                ? `<div class="am-name"><strong>${esc(accountManager.name)}</strong>${
                      accountManager.email
                        ? ` <span class="muted">&middot; ${esc(accountManager.email)}</span>`
                        : ''
                   }</div>`
                : `<div class="am-name muted" style="font-style:italic">Not yet assigned</div>`
            }
          </td>
        </tr>
      </table>
    `;

    const style = `
      * { box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        color: #0f172a;
        margin: 0;
        padding: 0;
        background: #f1f5f9;
        font-size: 12px;
        line-height: 1.45;
        -webkit-font-smoothing: antialiased;
      }
      .doc {
        max-width: 794px;
        margin: 0 auto;
        background: #fff;
        padding: 0 0 24px;
        box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06);
      }

      /* ---- Branded hero ---- */
      .hero {
        background: linear-gradient(135deg, ${brand} 0%, ${brandDark} 100%);
        color: #fff;
        padding: 22px 32px;
      }
      .hero-table { width: 100%; border-collapse: collapse; }
      .hero-table td { vertical-align: top; padding: 0; }
      .hero-logo { width: 64px; padding-right: 14px !important; }
      .hero-logo img { width: 56px; height: 56px; object-fit: contain; background: #fff; border-radius: 8px; padding: 6px; }
      .hero-logo .logo-fallback {
        width: 56px; height: 56px; border-radius: 8px;
        background: rgba(255,255,255,0.18); color: #fff;
        font-size: 22px; font-weight: 700; text-align: center; line-height: 56px;
      }
      .hero-title { font-size: 13px; opacity: 0.85; margin: 0 0 4px; letter-spacing: 0.5px; text-transform: uppercase; font-weight: 600; }
      .hero-name  { font-size: 22px; font-weight: 700; margin: 0; }
      .hero-sub   { font-size: 12px; opacity: 0.85; margin-top: 4px; }
      .hero-meta  { text-align: right; font-size: 11px; line-height: 1.7; }
      .hero-meta .key { opacity: 0.78; }
      .hero-meta .val { font-weight: 600; }

      /* ---- Status pill in the hero ---- */
      .pill {
        display: inline-block; padding: 2px 10px; border-radius: 999px;
        background: rgba(255,255,255,0.22); font-size: 10px; font-weight: 700;
        letter-spacing: 0.5px; text-transform: uppercase;
      }

      /* ---- Page body ---- */
      .doc-body { padding: 22px 32px 8px; }

      /* ---- Account-manager strip ---- */
      .am-banner { width: 100%; border-collapse: collapse; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; margin-bottom: 18px; }
      .am-banner td { padding: 10px 14px; vertical-align: middle; }
      .am-avatar { width: 48px; padding-right: 0 !important; }
      .am-disc { width: 36px; height: 36px; border-radius: 50%; background: ${brand}; color: #fff; font-size: 12px; font-weight: 700; text-align: center; line-height: 36px; }
      .am-lbl { font-size: 10px; font-weight: 700; letter-spacing: 0.5px; color: #9a3412; text-transform: uppercase; margin-bottom: 2px; }
      .am-name { font-size: 13px; color: #0f172a; }

      /* ---- Sections ---- */
      .section { margin-bottom: 16px; page-break-inside: avoid; }
      .section-title {
        font-size: 11px; font-weight: 700; color: ${brandDark};
        letter-spacing: 0.6px; text-transform: uppercase;
        border-bottom: 2px solid ${brand}; padding-bottom: 4px; margin-bottom: 10px;
      }
      .section-body { font-size: 12px; }

      /* ---- Key-value tables ---- */
      table.kv-table { width: 100%; border-collapse: collapse; }
      table.kv-table .lbl {
        width: 200px;
        color: #64748b; font-size: 10px; font-weight: 700;
        text-transform: uppercase; letter-spacing: 0.5px;
        padding: 6px 16px 6px 0; vertical-align: top;
      }
      table.kv-table .val { padding: 6px 0; vertical-align: top; }
      table.kv-table tr + tr .lbl, table.kv-table tr + tr .val { border-top: 1px solid #f1f5f9; }

      /* ---- Data tables (receipts / schedule / education) ---- */
      table.grid { width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #e2e8f0; border-radius: 6px; }
      table.grid th {
        text-align: left; background: #f8fafc; color: #475569; font-weight: 700;
        padding: 8px 10px; border-bottom: 1px solid #e2e8f0;
        font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px;
      }
      table.grid td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
      table.grid tr:last-child td { border-bottom: none; }
      table.grid .r { text-align: right; }
      .mono { font-family: ui-monospace, Menlo, monospace; }

      /* ---- Payment-summary money cards (as a TABLE not flex) ---- */
      table.money-table { width: 100%; border-collapse: separate; border-spacing: 0; }
      table.money-table .money-cell {
        width: 32%;
        border: 1px solid #e2e8f0; border-radius: 8px;
        padding: 12px 14px; vertical-align: top;
      }
      table.money-table .money-gap { width: 2%; }
      .money-lbl { font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
      .money-val { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 4px; }

      /* ---- Misc ---- */
      .empty { color: #9ca3af; font-style: italic; font-size: 12px; padding: 8px 2px; }
      .alert { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; border-radius: 6px; padding: 10px 14px; font-size: 12px; font-weight: 500; }
      .tag {
        display: inline-block;
        font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 999px;
        text-transform: uppercase; letter-spacing: 0.5px; margin-right: 8px;
      }
      .tag-offer { background: #fef3c7; color: #92400e; }
      .tag-catalogue { background: #dbeafe; color: #1e40af; }
      .muted { color: #64748b; font-size: 11px; }

      /* ---- Footer ---- */
      .footer {
        margin-top: 24px;
        border-top: 1px dashed #cbd5e1;
        padding: 14px 32px 0;
        font-size: 10px; color: #94a3b8; text-align: center;
      }
      .footer strong { color: ${brand}; }

      @media print {
        body { background: #fff; }
        .doc { box-shadow: none; }
        .section { break-inside: avoid; }
      }
    `;

    // Hero — logo / title block on the left, meta on the right. Pure
    // table layout so html2canvas reproduces it byte-for-byte.
    const logoCell = logoUrl
        ? `<img src="${esc(logoUrl)}" alt="" />`
        : `<div class="logo-fallback">${esc(brandName.charAt(0))}</div>`;
    const statusPill = a.status
        ? `<span class="pill">${esc(a.status)}</span>`
        : '';

    const body = `
      <div class="doc">
        <div class="hero">
          <table class="hero-table">
            <tr>
              <td class="hero-logo">${logoCell}</td>
              <td>
                <div class="hero-title">${esc(brandName)}</div>
                <div class="hero-name">Admission Form</div>
                <div class="hero-sub">${esc(fullName || '—')} ${statusPill}</div>
              </td>
              <td class="hero-meta">
                <div><span class="key">Admission ID</span><br/><span class="val">${esc(a.admission_code || a.id || '—')}</span></div>
                <div style="margin-top:6px"><span class="key">Generated</span><br/><span class="val">${esc(new Date().toLocaleString('en-IN'))}</span></div>
              </td>
            </tr>
          </table>
        </div>

        <div class="doc-body">

          ${amBlock}

          ${sect('Course fees', courseFeesBlock)}
          ${sect('Payment summary', paymentSummaryBlock)}
          ${sect(`Receipts (${receipts.length})`, receiptsTable)}
          ${sect(`Fee schedule (${feeSchedule.length})`, scheduleTable)}

          ${sect('Identity', `
            <table class="kv-table" cellspacing="0" cellpadding="0"><tbody>
              ${row('Full name', esc(fullName))}
              ${row('Admission date', escDate(a.admission_date))}
              ${row('Email', esc(a.email))}
              ${row('WhatsApp', esc(a.whatsapp_number))}
              ${row('Alternate contact', esc(a.alternate_contact))}
              ${row('Address', esc(a.address))}
            </tbody></table>
          `)}

          ${sect('Programme', `
            <table class="kv-table" cellspacing="0" cellpadding="0"><tbody>
              ${row('Programme', esc(a.program_name))}
              ${row('Mode of training', esc(a.mode_of_training))}
              ${row('Centre', esc(a.center_name))}
              ${row('Mode of payment', esc(a.mode_of_payment))}
              ${row('Source', esc(a.source))}
              ${row('Status', esc(a.status))}
              ${row('Counsellor', esc(a.guided_by_counsellor_name))}
              ${row('Manager', esc(managerLine))}
              ${row('Break reason', esc(a.break_reason))}
            </tbody></table>
          `)}

          ${sect(`Education (${education.length})`, eduTable)}

          ${sect('Student photo', photoUrl
              ? `<img src="${esc(photoUrl)}" alt="Student photo"
                       crossorigin="anonymous"
                       style="max-width:180px;max-height:240px;border:1px solid #e2e8f0;border-radius:8px;display:block;" />`
              : a.photo_r2_key
                  ? `<div class="empty">Photo on file but preview unavailable.</div>`
                  : `<div class="empty">No photo uploaded.</div>`)}

        </div>

        <div class="footer">
          Generated from <strong>${esc(brandName)}</strong> &middot;
          Admission ${esc(a.id || '—')}
        </div>
      </div>
    `;

    return { body, style };
};

// One labelled field. Empty values render "Not filled yet" so accounts
// can see at a glance what the student / counsellor still owes.
const Field = ({ label, value, span = 1 }) => (
    <div style={{ gridColumn: `span ${span}`, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>
            {label}
        </div>
        <div style={{ fontSize: 13, color: '#0f172a', overflowWrap: 'anywhere' }}>
            {fmtCell(value)}
        </div>
    </div>
);

function AdmissionTimelineTab({ leadId }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [admissionId, setAdmissionId] = useState(null);
    const [admission, setAdmission] = useState(null);
    const [items, setItems] = useState([]);
    const [feeOffer, setFeeOffer] = useState(null);
    const [programFees, setProgramFees] = useState(null);
    const [resolvedManager, setResolvedManager] = useState(null);
    const [accountManager, setAccountManager] = useState(null);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    // Signed URL for the admission photo. The photo_r2_key on the row is
    // a storage key, not a fetchable URL — uploadsApi.signedUrl exchanges
    // it for a short-lived signed download URL we can drop straight into
    // an <img src> on both the in-tab view and the html2canvas PDF capture.
    const [photoUrl, setPhotoUrl] = useState(null);

    // Gate for the View / Download admission form buttons. Originally
    // locked to super_admin per spec, but the accounts team also needs
    // the printable copy for student handoff, so account_manager is
    // included here too. Counsellors / staff don't get it.
    const me = auth.getUser() || {};
    const isAdmin = me.role === 'super_admin' || me.role === 'account_manager';

    useEffect(() => {
        if (!leadId) return undefined;
        let alive = true;
        // No setLoading(true) here — useState initialiser already starts
        // true; re-running on leadId change keeps the old data visible
        // for the brief moment until the new fetch resolves.
        admissionsApi.timelineByLead(leadId)
            .then((r) => {
                if (!alive) return;
                const data = r?.data || {
                    admission_id: null, admission: null, events: [],
                    fee_offer: null, program_fees: null,
                    resolved_manager: null, account_manager: null,
                };
                setAdmissionId(data.admission_id);
                setAdmission(data.admission || null);
                setItems(data.events || []);
                setFeeOffer(data.fee_offer || null);
                setProgramFees(data.program_fees || null);
                setResolvedManager(data.resolved_manager || null);
                setAccountManager(data.account_manager || null);
            })
            .catch((e) => { if (alive) setError(e?.message || 'Failed to load timeline'); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [leadId]);

    // Resolve photo_r2_key → signed URL. Best-effort: if the lookup
    // fails (deleted file, ACL mismatch) we just leave photoUrl null
    // and the printable form falls back to a "no photo" placeholder.
    const photoKey = admission?.photo_r2_key || null;
    useEffect(() => {
        if (!photoKey) { setPhotoUrl(null); return undefined; }
        let alive = true;
        uploadsApi.signedUrl(photoKey)
            .then((r) => { if (alive) setPhotoUrl(r?.data?.url || null); })
            .catch(() => { if (alive) setPhotoUrl(null); });
        return () => { alive = false; };
    }, [photoKey]);

    if (loading) {
        return (
            <div style={{ padding: 24, textAlign: 'center' }}>
                <CircularProgress size={20} />
            </div>
        );
    }

    if (error) {
        return <div style={{ padding: 24, color: '#dc2626' }}>{error}</div>;
    }

    if (!admissionId) {
        return (
            <div style={{ padding: 24, color: '#6b7280' }}>
                This lead has converted but no admission has been created yet.
                The accounts team will set one up from <strong>Pending Admissions</strong>.
            </div>
        );
    }

    const a = admission || {};
    const fullName = [a.first_name, a.middle_name, a.last_name].filter(Boolean).join(' ') || null;
    const receipts = Array.isArray(a.receipts) ? a.receipts : [];
    const education = Array.isArray(a.education) ? a.education : [];

    // Course-fee resolution cascade:
    //   1. lead_fee_offers (per-lead override set by accounts)
    //   2. programs.course_fees / registration / installments (catalog)
    //   3. Neither → "Course price is missing"
    const courseFeeSource = feeOffer
        ? { kind: 'offer', label: 'Custom offer for this lead', data: feeOffer }
        : programFees
            ? { kind: 'program', label: 'Programme catalogue price', data: programFees }
            : null;
    // Authoritative "total fees" used in the payment-summary cards:
    // course fee from the cascade if available, else the admission's own
    // total_fees (legacy fallback). This prevents the "Remaining ₹-5,000"
    // bug where total_fees was 0 but receipts already exist.
    const courseTotal = courseFeeSource ? Number(courseFeeSource.data.course_fees || 0) : null;
    const admissionTotal = Number(a.total_fees ?? 0);
    const totalFees = courseTotal != null ? courseTotal : admissionTotal;
    const paid = Number(a.paid_till_date ?? 0);
    const pending = totalFees - paid;
    // Fee schedule: prefer the per-lead offer / programme installments,
    // else fall back to the legacy admission_fee_schedule rows.
    const cascadeInstallments = courseFeeSource && Array.isArray(courseFeeSource.data.fee_installments)
        ? courseFeeSource.data.fee_installments
        : null;
    const feeSchedule = cascadeInstallments && cascadeInstallments.length
        ? cascadeInstallments
        : (Array.isArray(a.fee_schedule) ? a.fee_schedule : []);

    // Bundle every piece of data the printable view needs so View and
    // Download stay in sync — no chance one drifts from the other.
    // tenant comes from the cached login blob and carries brand_name /
    // logo_url / brand_primary_color used in the hero.
    const printableData = {
        admission, accountManager, resolvedManager,
        tenant: auth.getTenant() || null,
        photoUrl, // signed download URL for admission.photo_r2_key, or null
        courseFeeSource, totalFees, paid, pending,
        feeSchedule, receipts, education,
    };

    // View — open a Blob-URL'd HTML document in a new tab. We deliberately
    // avoid window.open('') + document.write because Chrome's popup
    // blocker treats the empty-URL form as a pop-up and refuses it
    // unconditionally even after a user click. Blob URLs navigate cleanly.
    const handleViewForm = () => {
        const { body, style } = buildAdmissionFormHtml(printableData);
        const studentName = [a.first_name, a.last_name].filter(Boolean).join(' ') || 'admission';
        const safeTitle = `Admission Form — ${studentName}`;
        const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${safeTitle.replace(/</g, '&lt;')}</title>
<style>${style}</style></head>
<body>${body}</body></html>`;
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        // Open with a concrete URL so it's a navigation, not a pop-up.
        // Fall back to assigning location.href on the same window if the
        // browser still refuses (rare — Safari with strict tracking
        // settings). The Blob URL is revoked after a delay so the new
        // tab has time to load.
        const w = window.open(url, '_blank');
        if (!w) {
            window.location.href = url;
        }
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
    };

    // Download — render the printable HTML offscreen, snap it with
    // html2canvas, paginate into A4 with jsPDF. Dynamic-imported so
    // these two heavyweight libs aren't in the main bundle.
    const handleDownloadPdf = async () => {
        if (generatingPdf) return;
        setGeneratingPdf(true);
        const studentName = [a.first_name, a.last_name].filter(Boolean).join(' ') || 'admission';
        const safeName = studentName.replace(/[^a-z0-9_\- ]/gi, '').trim().replace(/\s+/g, '_') || 'admission';
        // Offscreen mount. Width matches the rendered HTML at ~96dpi so the
        // canvas snapshot has enough resolution for a crisp A4 page.
        const host = document.createElement('div');
        host.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;background:#fff;';
        const { body, style } = buildAdmissionFormHtml(printableData);
        host.innerHTML = `<style>${style}</style>${body}`;
        document.body.appendChild(host);
        try {
            const [{ default: html2canvas }, { default: JsPDFCtor }] = await Promise.all([
                import('html2canvas'),
                import('jspdf').then((m) => ({ default: m.jsPDF })),
            ]);
            // Wait for every <img> inside the offscreen host to finish
            // loading before we snapshot — html2canvas captures whatever
            // is painted at that instant, so an in-flight image would
            // turn into a blank box on the PDF. We swallow image errors
            // (broken link / 403) so a single bad photo doesn't kill
            // the whole download — the rest of the form still renders.
            await Promise.all(
                Array.from(host.querySelectorAll('img')).map((img) => {
                    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
                    return new Promise((resolve) => {
                        img.addEventListener('load', resolve, { once: true });
                        img.addEventListener('error', resolve, { once: true });
                    });
                }),
            );
            // useCORS lets html2canvas paint same-origin-tainted images
            // from R2/GCS signed URLs. Backed by the `crossorigin` attr
            // we set on the rendered <img> tag.
            const canvas = await html2canvas(host, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
                allowTaint: false,
                logging: false,
            });
            const pdf = new JsPDFCtor({ unit: 'pt', format: 'a4' });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pageWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            // Slice the tall canvas into A4-sized pages.
            const dataUrl = canvas.toDataURL('image/png');
            let remaining = imgHeight;
            let position = 0;
            while (remaining > 0) {
                pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
                remaining -= pageHeight;
                if (remaining > 0) {
                    position -= pageHeight;
                    pdf.addPage();
                }
            }
            pdf.save(`AdmissionForm_${safeName}.pdf`);
        } catch (err) {
            window.alert(`Failed to generate PDF: ${err.message || err}`);
        } finally {
            document.body.removeChild(host);
            setGeneratingPdf(false);
        }
    };

    return (
        <div style={{ padding: 18 }}>

            {/* ----- Admin actions: View / Download admission form ----------
                Locked to super_admin per product spec. Buttons are hidden
                outright for non-admins so the rest of this tab still
                renders without a confusing disabled state. */}
            {isAdmin && (
                <div style={{
                    display: 'flex', gap: 8, justifyContent: 'flex-end',
                    marginBottom: 12,
                }}>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={handleViewForm}
                        className="always-clickable"
                        sx={{ textTransform: 'none', borderColor: '#cbd5e1', color: '#0f172a' }}
                    >
                        View admission form
                    </Button>
                    <Button
                        variant="contained"
                        size="small"
                        onClick={handleDownloadPdf}
                        disabled={generatingPdf}
                        className="always-clickable"
                        sx={{
                            textTransform: 'none', background: '#E87B2F',
                            '&:hover': { background: '#cf6c25' },
                        }}
                    >
                        {generatingPdf ? 'Generating…' : 'Download PDF'}
                    </Button>
                </div>
            )}

            {/* ----- Top banner: account manager attribution ---------------- */}
            <div style={{
                background: accountManager ? '#fff7ed' : '#f8fafc',
                border: `1px solid ${accountManager ? '#fed7aa' : '#e2e8f0'}`,
                borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                display: 'flex', alignItems: 'center', gap: 10,
            }}>
                <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: accountManager ? '#E87B2F' : '#cbd5e1',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                }}>
                    {accountManager
                        ? accountManager.name.split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase()
                        : 'AM'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: '#9a3412', textTransform: 'uppercase' }}>
                        Account manager
                    </div>
                    {accountManager ? (
                        <div style={{ fontSize: 13, color: '#0f172a' }}>
                            <strong>{accountManager.name}</strong>
                            {accountManager.email && (
                                <span style={{ color: '#6b7280' }}> · {accountManager.email}</span>
                            )}
                        </div>
                    ) : (
                        <div style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>
                            Not yet assigned · will populate once the admission is approved
                        </div>
                    )}
                </div>
            </div>

            {/* ----- Course fees attached to this lead --------------------- */}
            <SectionHeader>Course fees</SectionHeader>
            {!courseFeeSource ? (
                <div style={{
                    background: '#fef2f2', border: '1px solid #fecaca',
                    borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                    color: '#991b1b', fontSize: 13,
                }}>
                    <strong>Course price is missing.</strong> No custom offer exists for this lead
                    and the programme has no catalogue price.
                </div>
            ) : (
                <div style={{
                    border: '1px solid #e2e8f0', borderRadius: 8,
                    padding: '12px 14px', marginBottom: 16,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <span style={{
                            fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
                            background: courseFeeSource.kind === 'offer' ? '#fef3c7' : '#dbeafe',
                            color: courseFeeSource.kind === 'offer' ? '#92400e' : '#1e40af',
                            padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase',
                        }}>
                            {courseFeeSource.kind === 'offer' ? 'Custom offer' : 'Catalogue price'}
                        </span>
                        <span style={{ fontSize: 12, color: '#64748b' }}>{courseFeeSource.label}</span>
                    </div>
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 12, marginBottom: feeSchedule.length ? 12 : 0,
                    }}>
                        <Field label="Total course fees" value={fmtMoney(courseFeeSource.data.course_fees)} />
                        <Field label="Registration amount" value={fmtMoney(courseFeeSource.data.registration_amount ?? 0)} />
                        <Field label="Payment mode" value={courseFeeSource.data.payment_mode} />
                    </div>
                </div>
            )}

            {/* ----- Payment summary --------------------------------------- */}
            <SectionHeader>Payment summary</SectionHeader>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12, marginBottom: 14,
            }}>
                <MoneyCard label="Total fees" value={fmtMoney(totalFees)} tint="#eef2ff" border="#c7d2fe" />
                <MoneyCard label="Paid till date" value={fmtMoney(paid)} tint="#ecfdf5" border="#a7f3d0" />
                <MoneyCard
                    label={pending < 0 ? 'Overpaid' : 'Remaining'}
                    value={fmtMoney(Math.abs(pending))}
                    tint={pending > 0 ? '#fef2f2' : pending < 0 ? '#fef3c7' : '#f1f5f9'}
                    border={pending > 0 ? '#fecaca' : pending < 0 ? '#fde68a' : '#e2e8f0'}
                />
            </div>
            {totalFees === 0 && receipts.length > 0 && (
                <div style={{
                    fontSize: 12, color: '#92400e', background: '#fffbeb',
                    border: '1px solid #fde68a', borderRadius: 6,
                    padding: '6px 10px', marginBottom: 14,
                }}>
                    Heads up: receipts exist but no course fee is set, so &quot;Remaining&quot;
                    cannot be computed. Set a custom offer or programme catalogue price.
                </div>
            )}

            {/* ----- Receipts table ---------------------------------------- */}
            <SectionHeader>Receipts ({receipts.length})</SectionHeader>
            {receipts.length === 0 ? (
                <div style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic', marginBottom: 16 }}>
                    No payments recorded yet.
                </div>
            ) : (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead style={{ background: '#f8fafc' }}>
                            <tr>
                                <Th>Receipt #</Th>
                                <Th>Date</Th>
                                <Th align="right">Amount</Th>
                                <Th>Mode</Th>
                                <Th>Transaction</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {receipts.map((r) => (
                                <tr key={r.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                                    <Td><strong>{r.receipt_no || '—'}</strong></Td>
                                    <Td>{fmtDateOnly(r.receipt_date)}</Td>
                                    <Td align="right" mono><strong>{fmtMoney(r.amount)}</strong></Td>
                                    <Td>{r.mode_of_payment || '—'}</Td>
                                    <Td>{r.transaction_details || '—'}</Td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ----- Fee schedule ------------------------------------------ */}
            <SectionHeader>Fee schedule ({feeSchedule.length})</SectionHeader>
            {feeSchedule.length === 0 ? (
                <div style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic', marginBottom: 16 }}>
                    Not filled yet
                </div>
            ) : (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead style={{ background: '#f8fafc' }}>
                            <tr>
                                <Th>Installment</Th>
                                <Th>Due date</Th>
                                <Th align="right">Amount</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {feeSchedule.map((f) => (
                                <tr key={f.id || f.installment_no} style={{ borderTop: '1px solid #f1f5f9' }}>
                                    <Td>#{f.installment_no}</Td>
                                    <Td>{fmtDateOnly(f.due_date)}</Td>
                                    <Td align="right" mono>{fmtMoney(f.amount)}</Td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ----- Admission form details -------------------------------- */}
            <SectionHeader>Admission form · Identity</SectionHeader>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 14, marginBottom: 16,
            }}>
                <Field label="Full name" value={fullName} span={2} />
                <Field label="Admission date" value={fmtDateOnly(a.admission_date)} />
                <Field label="Email" value={a.email} />
                <Field label="WhatsApp" value={a.whatsapp_number} />
                <Field label="Alternate contact" value={a.alternate_contact} />
                <Field label="Address" value={a.address} span={3} />
            </div>

            <SectionHeader>Admission form · Programme</SectionHeader>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 14, marginBottom: 16,
            }}>
                <Field label="Programme" value={a.program_name} />
                <Field label="Mode of training" value={a.mode_of_training} />
                <Field label="Centre" value={a.center_name} />
                <Field label="Mode of payment" value={a.mode_of_payment} />
                <Field label="Source" value={a.source} />
                <Field label="Status" value={a.status} />
                <Field label="Counsellor" value={a.guided_by_counsellor_name} />
                <Field
                    label="Manager"
                    value={
                        a.guided_by_manager_name
                        || (resolvedManager
                            ? `${resolvedManager.name}${resolvedManager.email ? ` · ${resolvedManager.email}` : ''}`
                            : null)
                    }
                />
                <Field label="Break reason" value={a.break_reason} />
            </div>

            {/* ----- Education --------------------------------------------- */}
            <SectionHeader>Education ({education.length})</SectionHeader>
            {education.length === 0 ? (
                <div style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic', marginBottom: 16 }}>
                    Not filled yet
                </div>
            ) : (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead style={{ background: '#f8fafc' }}>
                            <tr>
                                <Th>Examination</Th>
                                <Th>Stream</Th>
                                <Th>Board / University</Th>
                                <Th>College</Th>
                                <Th align="right">Year</Th>
                                <Th align="right">%</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {education.map((ed) => (
                                <tr key={ed.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                                    <Td>{ed.examination || '—'}</Td>
                                    <Td>{ed.stream || '—'}</Td>
                                    <Td>{ed.board_university || '—'}</Td>
                                    <Td>{ed.college_name || '—'}</Td>
                                    <Td align="right">{ed.year_of_passing || '—'}</Td>
                                    <Td align="right">{ed.percentage != null ? `${ed.percentage} ${ed.grade_unit === 'cgpa' ? 'CGPA' : '%'}` : '—'}</Td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ----- Photos -------------------------------------------------
                The DB has two columns: photo_r2_key (used by both the public
                admission form and the internal New Admission page) and
                selfie_r2_key (only ever populated by the internal page's
                separate webcam-selfie slot). For any lead that came through
                the public form, selfie_r2_key is always null and showing
                "Not filled yet" is misleading — so we render the Selfie row
                only when it actually has a value. */}
            <SectionHeader>Photos</SectionHeader>
            <div style={{
                display: 'grid',
                gridTemplateColumns: a.selfie_r2_key ? 'repeat(2, 1fr)' : '1fr',
                gap: 14, marginBottom: 16,
            }}>
                <Field label="Photo uploaded" value={a.photo_r2_key ? 'Yes' : null} />
                {a.selfie_r2_key && (
                    <Field label="Selfie uploaded" value="Yes" />
                )}
            </div>

            {/* ----- Event log --------------------------------------------- */}
            <SectionHeader>Event log ({items.length})</SectionHeader>
            {items.length === 0 ? (
                <div style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>
                    No events recorded on this admission yet.
                </div>
            ) : (
            <div style={{ position: 'relative' }}>
                {/* Vertical timeline rail */}
                <div style={{
                    position: 'absolute', left: 11, top: 8, bottom: 8,
                    width: 2, background: '#e2e8f0',
                }} />
                {items.map((ev) => {
                    const meta = EVENT_META[ev.event_type] || { label: ev.event_type, color: '#64748b', icon: '•' };
                    const actorBadge = ACTOR_LABEL[ev.actor_kind] || 'System';
                    return (
                        <div key={ev.id} style={{ position: 'relative', paddingLeft: 36, marginBottom: 16 }}>
                            {/* Dot */}
                            <div style={{
                                position: 'absolute', left: 4, top: 4,
                                width: 16, height: 16, borderRadius: '50%',
                                background: meta.color, color: '#fff',
                                fontSize: 10, lineHeight: '16px', textAlign: 'center',
                                boxShadow: '0 0 0 3px #fff',
                            }}>
                                {meta.icon}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>
                                    {meta.label}
                                </span>
                                {ev.prev_status && ev.next_status && (
                                    <span style={{ fontSize: 11, color: '#475569' }}>
                                        {ev.prev_status} → <strong>{ev.next_status}</strong>
                                    </span>
                                )}
                                {!ev.prev_status && ev.next_status && (
                                    <span style={{ fontSize: 11, color: '#475569' }}>
                                        Status: <strong>{ev.next_status}</strong>
                                    </span>
                                )}
                                <span style={{
                                    fontSize: 10, fontWeight: 600,
                                    background: '#f1f5f9', color: '#475569',
                                    padding: '2px 8px', borderRadius: 999, letterSpacing: 0.3,
                                }}>
                                    {actorBadge}
                                </span>
                            </div>
                            {ev.summary && (
                                <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{ev.summary}</div>
                            )}
                            {/* field_edited details */}
                            {ev.event_type === 'field_edited' && ev.metadata?.changes && (
                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, lineHeight: 1.5 }}>
                                    {Object.entries(ev.metadata.changes).slice(0, 4).map(([k, v]) => (
                                        <div key={k}>
                                            <strong>{k}</strong>: {String(v.from ?? '—')} → {String(v.to ?? '—')}
                                        </div>
                                    ))}
                                    {Object.keys(ev.metadata.changes).length > 4 && (
                                        <div style={{ fontStyle: 'italic' }}>
                                            +{Object.keys(ev.metadata.changes).length - 4} more
                                        </div>
                                    )}
                                </div>
                            )}
                            {/* receipt_added details. When the BE captured a
                                share_token (newer receipts), surface a clickable
                                link so admins can jump straight to the printable
                                public copy. */}
                            {ev.event_type === 'receipt_added' && ev.metadata && (
                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                                    {ev.metadata.receipt_no && <span>Receipt #<strong>{ev.metadata.receipt_no}</strong> · </span>}
                                    {ev.metadata.receipt_kind === 'installment' && <span>Installment {ev.metadata.installment_no} · </span>}
                                    {ev.metadata.receipt_kind === 'registration' && <span>Registration · </span>}
                                    <span>Amount <strong>₹{ev.metadata.amount}</strong></span>
                                    {ev.metadata.mode_of_payment && <span> via {ev.metadata.mode_of_payment}</span>}
                                    {ev.metadata.share_token && (
                                        <a
                                            href={`/r/${ev.metadata.share_token}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{
                                                marginLeft: 'auto',
                                                fontSize: 11, color: 'var(--primary)',
                                                textDecoration: 'none', fontWeight: 600,
                                                padding: '2px 8px', borderRadius: 999,
                                                background: 'rgba(79, 70, 229, 0.08)',
                                            }}
                                        >
                                            View receipt ↗
                                        </a>
                                    )}
                                </div>
                            )}
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                                {fmtEventTime(ev.occurred_at)}
                                {ev.actor_name && <> · {ev.actor_name}</>}
                            </div>
                        </div>
                    );
                })}
            </div>
            )}
        </div>
    );
}

// ---------- Small helpers used inside AdmissionTimelineTab ---------------

const SectionHeader = ({ children }) => (
    <div style={{
        fontSize: 11, fontWeight: 700, color: '#94a3b8',
        letterSpacing: 0.8, textTransform: 'uppercase',
        margin: '14px 0 8px',
    }}>
        {children}
    </div>
);

const MoneyCard = ({ label, value, tint, border }) => (
    <div style={{
        background: tint, border: `1px solid ${border}`,
        borderRadius: 8, padding: '10px 12px',
    }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: '#475569', textTransform: 'uppercase' }}>
            {label}
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
            {value}
        </div>
    </div>
);

const Th = ({ children, align = 'left' }) => (
    <th style={{
        textAlign: align, padding: '8px 12px',
        fontSize: 11, fontWeight: 700, color: '#475569',
        textTransform: 'uppercase', letterSpacing: 0.4,
    }}>
        {children}
    </th>
);

const Td = ({ children, align = 'left', mono = false }) => (
    <td style={{
        textAlign: align, padding: '8px 12px',
        color: '#0f172a',
        fontFamily: mono ? 'ui-monospace, monospace' : 'inherit',
    }}>
        {children}
    </td>
);
