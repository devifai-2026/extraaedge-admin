// Shared input validators + sanitizers. Single source of truth so every form
// enforces the same rules (email format, digits-only phone/whatsapp) instead of
// relying on the browser's type="email" hint alone.

// Keep only digits and cap the length (phone/whatsapp/pincode). Mirrors the
// long-standing sanitizer in AddNewLead so callers can drop-in replace it.
export const sanitizeDigits = (v, max = 15) => String(v ?? '').replace(/\D+/g, '').slice(0, max);

// Pragmatic email check: one @, a dot in the domain, no spaces. Not RFC-perfect
// (nothing sane is) but rejects the common garbage (`abc`, `a@b`, trailing dot).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isEmail = (v) => EMAIL_RE.test(String(v ?? '').trim());

// A phone/whatsapp number is 7–15 digits (E.164-ish, local numbers included).
export const isPhone = (v) => /^\d{7,15}$/.test(String(v ?? '').replace(/\D+/g, ''));

// Convenience: return an error string (or '') for an email field. `required`
// controls whether an empty value is an error.
export const emailError = (v, { required = false } = {}) => {
  const s = String(v ?? '').trim();
  if (!s) return required ? 'Email is required' : '';
  return isEmail(s) ? '' : 'Enter a valid email address';
};

// Convenience: error string (or '') for a phone/whatsapp field.
export const phoneError = (v, { required = false, min = 7, max = 15 } = {}) => {
  const digits = String(v ?? '').replace(/\D+/g, '');
  if (!digits) return required ? 'Phone number is required' : '';
  if (digits.length < min) return `Enter at least ${min} digits`;
  if (digits.length > max) return `At most ${max} digits`;
  return '';
};
