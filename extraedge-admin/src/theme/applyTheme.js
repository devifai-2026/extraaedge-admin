// Live theme application. Writes the three brand-color CSS variables
// onto <html>.style so the whole app repaints instantly. The Proxy in
// theme/colors.js reads from these on every access, so JS-driven colors
// (sx props, inline styles) follow along.
//
// Persistence: this is a pure DOM op. Whoever calls applyTheme() is
// responsible for also calling the API + updating localStorage so the
// choice survives a reload. See pages/Profile and the boot hook.

const HEX_RE = /^#[0-9a-fA-F]{6}$/u;

const set = (key, value) => {
  if (typeof document === 'undefined' || !document.documentElement) return;
  if (value && HEX_RE.test(value)) {
    document.documentElement.style.setProperty(key, value);
  } else {
    document.documentElement.style.removeProperty(key);
  }
};

// Apply (or clear, by passing null/undefined) the three brand colors.
// Anything not a valid 7-char hex is silently treated as "remove" so
// stored garbage can't poison the page.
export const applyTheme = ({ primary, primary_dark, primary_light } = {}) => {
  set('--primary', primary);
  set('--primary-dark', primary_dark);
  set('--primary-light', primary_light);
};

// Convenience: pass the user object straight from /auth/me or login.
// The server stores theme_primary etc.; we map them to the CSS-var names.
export const applyThemeFromUser = (user) => {
  if (!user) return;
  applyTheme({
    primary: user.theme_primary,
    primary_dark: user.theme_primary_dark,
    primary_light: user.theme_primary_light,
  });
};

export const clearTheme = () => applyTheme({});
