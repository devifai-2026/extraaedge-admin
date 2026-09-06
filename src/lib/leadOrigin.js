// Lead-origin helpers. A lead's acquisition channel is derived from the
// first_touch_source / first_touch_channel fields the backend sets at
// createLead time (e.g. WhatsApp inbox auto-creates leads with
// first_touch_source='whatsapp'; the Facebook Lead Ads bridge tags
// 'Facebook Lead Ads'). These helpers keep the badge/label logic in one place
// so LeadCard, LeadsTable and any future view stay consistent.

const norm = (v) => String(v || '').toLowerCase();

export const isWhatsAppLead = (lead) => {
  if (!lead) return false;
  return norm(lead.first_touch_source).includes('whatsapp')
    || norm(lead.first_touch_channel).includes('whatsapp');
};

export const isFacebookLead = (lead) => {
  if (!lead) return false;
  return norm(lead.first_touch_source).includes('facebook')
    || norm(lead.first_touch_channel).includes('facebook');
};

// Meta delivers Instagram lead ads on the SAME leadgen webhook as Facebook, so
// an Instagram lead can carry a facebook-ish source alongside
// first_touch_channel='Instagram'. originBadge() therefore tests Instagram
// BEFORE Facebook — the more specific origin has to win. Mirrors
// classifyOrigin() in extraaedge-server/src/lib/leadOrigin.js.
export const isInstagramLead = (lead) => {
  if (!lead) return false;
  return norm(lead.first_touch_source).includes('instagram')
    || norm(lead.first_touch_channel).includes('instagram');
};

export const isJustDialLead = (lead) => {
  if (!lead) return false;
  return norm(lead.first_touch_source).includes('justdial')
    || norm(lead.first_touch_channel).includes('justdial');
};

// e.g. speedupinfotech.com's Free Demo form — see
// extraaedge-server/src/modules/public-leads/service.js, which sets
// first_touch_channel='Website' (first_touch_source carries the domain).
export const isWebsiteLead = (lead) => {
  if (!lead) return false;
  return norm(lead.first_touch_channel).includes('website');
};

// Returns a small badge descriptor for the lead's origin, or null when it has
// no notable origin (plain manual / bulk-import lead).
export const originBadge = (lead) => {
  if (isWhatsAppLead(lead)) return { key: 'whatsapp', label: 'WhatsApp', color: '#25D366' };
  // Instagram before Facebook — see isInstagramLead.
  if (isInstagramLead(lead)) return { key: 'instagram', label: 'Instagram', color: '#E1306C' };
  if (isFacebookLead(lead)) return { key: 'facebook', label: 'Facebook', color: '#1877F2' };
  if (isJustDialLead(lead)) return { key: 'justdial', label: 'JustDial', color: '#F26722' };
  if (isWebsiteLead(lead)) return { key: 'website', label: 'Website', color: '#5C6BC0' };
  return null;
};
