// Pin every date/time the admin renders to the TENANT's timezone instead of
// whatever timezone the viewer's browser happens to be in.
//
// Why this exists
// ---------------
// Timestamps are stored (correctly) as UTC `timestamptz` and sent to the FE as
// ISO strings. `Date#toLocaleString()` with no `timeZone` option formats in the
// BROWSER's zone, so the same lead read "6:29 PM" for a counsellor in Pune and
// "8:59 AM" for someone opening the CRM from New York. Staff compare these
// times against call logs and follow-up SLAs, so the reading has to be the
// institute's local time for everyone — a lead created at 6:29 PM IST is a
// 6:29 PM lead no matter who is looking.
//
// How
// ---
// There are 100+ `toLocaleString` / `toLocaleDateString` / `toLocaleTimeString`
// call sites across the app. Rather than touch each one (and rely on every
// future call site remembering), we install the tenant zone as the DEFAULT for
// all three at startup: the wrappers inject `timeZone` only when the caller
// did not specify one, so any call that deliberately passes its own zone is
// left untouched.
//
// The zone comes from the tenant blob that /auth/login + /auth/me already
// return (`tenant.timezone`, e.g. "Asia/Kolkata"). Before login there is no
// tenant, so we fall back to the browser zone and re-apply after login —
// see setAppTimezone() wired into the auth session setter.

const FALLBACK_TZ = 'Asia/Kolkata';

let activeTz = null;

// Guard: an invalid IANA name would make every toLocaleString call throw and
// white-screen the app, so validate before installing.
const isValidTimeZone = (tz) => {
  if (!tz || typeof tz !== 'string') return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export const getAppTimezone = () => activeTz;

// Resolve the zone to use: explicit tenant value → sane default → browser.
export const resolveTenantTimezone = (tenant) => {
  const fromTenant = tenant?.timezone;
  if (isValidTimeZone(fromTenant)) return fromTenant;
  if (isValidTimeZone(FALLBACK_TZ)) return FALLBACK_TZ;
  return undefined; // let the browser decide
};

// Patch the three Date locale formatters so they default to `tz`. Idempotent:
// the originals are captured once and re-used on every re-apply (login, tenant
// switch), so repeated calls never stack wrappers.
const ORIGINALS = {
  toLocaleString: Date.prototype.toLocaleString,
  toLocaleDateString: Date.prototype.toLocaleDateString,
  toLocaleTimeString: Date.prototype.toLocaleTimeString,
};

export const setAppTimezone = (tenant) => {
  const tz = resolveTenantTimezone(tenant);
  activeTz = tz ?? null;
  if (!tz) {
    // Restore pristine behaviour (browser zone).
    Date.prototype.toLocaleString = ORIGINALS.toLocaleString;
    Date.prototype.toLocaleDateString = ORIGINALS.toLocaleDateString;
    Date.prototype.toLocaleTimeString = ORIGINALS.toLocaleTimeString;
    return activeTz;
  }
  for (const name of Object.keys(ORIGINALS)) {
    const original = ORIGINALS[name];
    Date.prototype[name] = function patched(locales, options) {
      // Respect an explicit timeZone from the caller; only fill the gap.
      const opts = options && options.timeZone
        ? options
        : { ...(options || {}), timeZone: tz };
      return original.call(this, locales, opts);
    };
  }
  return activeTz;
};
