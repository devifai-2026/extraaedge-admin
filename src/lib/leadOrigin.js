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

// Returns a small badge descriptor for the lead's origin, or null when it has
// no notable origin (plain manual / bulk-import lead).
export const originBadge = (lead) => {
  if (isWhatsAppLead(lead)) return { key: 'whatsapp', label: 'WhatsApp', color: '#25D366' };
  if (isFacebookLead(lead)) return { key: 'facebook', label: 'Facebook', color: '#1877F2' };
  return null;
};
