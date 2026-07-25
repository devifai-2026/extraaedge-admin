// Bridges the shared audience_filter_json keys (used across marketing modules)
// to the rule-engine condition_json shape the drip scheduler actually evaluates
// per step: { all: [{ field: 'lead.<col>', op, value }] } against { lead }.
//
// The campaigns_drip table has NO audience column — the audience gate lives on
// each step's condition_json. So the Create-Drip audience builder produces this
// condition, and it is carried onto every step created for the campaign.

export const audienceToCondition = (audience) => {
    const a = audience || {};
    const clauses = [];

    if (Array.isArray(a.stage_ids) && a.stage_ids.length) {
        clauses.push({ field: "lead.stage_id", op: "in", value: a.stage_ids });
    }
    if (Array.isArray(a.program_ids) && a.program_ids.length) {
        clauses.push({ field: "lead.program_id", op: "in", value: a.program_ids });
    }
    if (Array.isArray(a.assigned_to) && a.assigned_to.length) {
        clauses.push({ field: "lead.assigned_to", op: "in", value: a.assigned_to });
    }
    if (Array.isArray(a.sources) && a.sources.length) {
        clauses.push({ field: "lead.source", op: "in", value: a.sources });
    }
    if (a.created_from) {
        clauses.push({ field: "lead.created_at", op: "gte", value: a.created_from });
    }
    if (a.created_to) {
        clauses.push({ field: "lead.created_at", op: "lte", value: a.created_to });
    }

    if (!clauses.length) return {};
    return { all: clauses };
};

// Best-effort reverse: turn a condition_json ({ all: [...] }) back into the
// audience_filter_json keys so the Edit modal can pre-populate the builder.
export const conditionToAudience = (condition) => {
    const out = {};
    const clauses = (condition && Array.isArray(condition.all) && condition.all) || [];
    for (const c of clauses) {
        switch (c.field) {
            case "lead.stage_id":
                out.stage_ids = c.value;
                break;
            case "lead.program_id":
                out.program_ids = c.value;
                break;
            case "lead.assigned_to":
                out.assigned_to = c.value;
                break;
            case "lead.source":
                out.sources = c.value;
                break;
            case "lead.created_at":
                if (c.op === "gte") out.created_from = c.value;
                if (c.op === "lte") out.created_to = c.value;
                break;
            default:
                break;
        }
    }
    return out;
};
