// Hardcoded "flag" / status-tag mapping for the LeadCard top-right badge.
//
// Resolution order (first match wins):
//   1. Sub-stage exact name match (most specific)
//   2. Stage name match
//   3. is_fresh (created < 24h)
//   4. is_untouched (assigned but no human activity)
//   5. fallback "Active"
//
// Tones drive the colored badge background:
//   neutral  - grey
//   fresh    - green
//   warn     - amber/orange
//   danger   - red
//   success  - blue/teal
//   primary  - brand red
//
// Names are matched case-insensitively, accepting "01-New" / "New" / "new".

const norm = (s) => (s || '').toString().trim().toLowerCase().replace(/^\d+\s*[-_.]\s*/, '');

const SUB_STAGE_MAP = {
  // -- urgency / immediate-action sub-stages --
  'will join soon':            { text: 'Hot - Joining Soon', tone: 'fresh' },
  'awaiting confirmation':     { text: 'Awaiting Confirm',   tone: 'warn'  },
  'negotiation phase':         { text: 'Negotiating',        tone: 'warn'  },
  'needs demo':                { text: 'Demo Pending',       tone: 'warn'  },

  // -- low-priority sub-stages --
  'asked to call back':        { text: 'Call-back Scheduled',tone: 'neutral' },
  'asked to call later':       { text: 'Call-back Scheduled',tone: 'neutral' },
  'not called':                { text: 'Not Yet Called',     tone: 'untouched' },
  'not interested':            { text: 'Not Interested',     tone: 'danger' },
  'not eligible':              { text: 'Not Eligible',       tone: 'danger' },
};

const STAGE_MAP = {
  'new':                { text: 'New',          tone: 'fresh' },
  'contacted':          { text: 'Contacted',    tone: 'success' },
  'followup':           { text: 'In Followup',  tone: 'success' },
  'follow up':          { text: 'In Followup',  tone: 'success' },
  'ringing':            { text: 'Ringing',      tone: 'warn'    },
  'ringing / not reachable': { text: 'Not Reachable', tone: 'warn' },
  'not reachable':      { text: 'Not Reachable',tone: 'warn'    },
  'qualified':          { text: 'Qualified',    tone: 'primary' },
  'requirement match':  { text: 'Requirement Match', tone: 'primary' },
  'interested':         { text: 'Interested',   tone: 'primary' },
  'engaged':            { text: 'Engaged',      tone: 'primary' },
  'engaged leads':      { text: 'Engaged',      tone: 'primary' },
  'prospect':           { text: 'Prospect',     tone: 'primary' },
  'demo scheduled':     { text: 'Demo Scheduled', tone: 'warn'  },
  'demo attended':      { text: 'Demo Attended', tone: 'success' },
  'scheduled visit':    { text: 'Visit Scheduled', tone: 'warn' },
  'visited':            { text: 'Visited',      tone: 'success' },
  'enrolled':           { text: 'Enrolled',     tone: 'fresh'   },
  'junk':               { text: 'Junk',         tone: 'danger'  },
  'cold':               { text: 'Cold',         tone: 'neutral' },
  're-enquired':        { text: 'Re-enquired',  tone: 'fresh'   },
};

export const flagForLead = (lead) => {
  if (!lead) return null;

  const subKey = norm(lead.sub_stage_name);
  if (subKey && SUB_STAGE_MAP[subKey]) return SUB_STAGE_MAP[subKey];

  const stageKey = norm(lead.stage_name);
  if (stageKey && STAGE_MAP[stageKey]) return STAGE_MAP[stageKey];

  if (lead.is_fresh) return { text: 'Fresh', tone: 'fresh' };
  if (lead.is_untouched) return { text: 'Untouched', tone: 'untouched' };

  return null;
};

// Tone → CSS color tokens. Keep in sync with LeadCard.css `.untouched-badge.X`.
export const TONE_BG = {
  neutral:    '#9e9e9e',
  fresh:      '#2e7d32',
  warn:       '#ef6c00',
  danger:     '#c62828',
  success:    '#0277bd',
  primary:    '#c62828',
  untouched:  '#6d4c41',
  converted:  '#1b5e20',
};

// Age display: "Xd" for whole days, but for leads under 24h we show hours
// (e.g. "5h") and for leads under an hour we show minutes ("12m"). Falls
// back to the server-side `lead_age_days` count when `created_at` is missing
// so existing rows still render something sensible.
//
// Why: the API rounds age down via integer division, so a lead created
// 30 minutes ago looks identical to one created yesterday — both render "0d".
// Hour-level granularity for fresh leads matches what counsellors expect.
export const formatLeadAge = (createdAt, fallbackDays) => {
  if (createdAt) {
    const created = new Date(createdAt);
    if (!isNaN(created.getTime())) {
      const diffMs = Date.now() - created.getTime();
      if (diffMs < 0) return '0m';
      const minutes = Math.floor(diffMs / 60000);
      if (minutes < 60) return `${minutes}m`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h`;
      const days = Math.floor(hours / 24);
      return `${days}d`;
    }
  }
  return `${fallbackDays ?? 0}d`;
};

// Friendly absolute timestamp used in tooltips (e.g. "May 2, 2026, 12:37 AM").
const TS_FMT = { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true };
export const formatTimestamp = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleString('en-US', TS_FMT);
};
