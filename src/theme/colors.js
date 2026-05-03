// Global Color Theme.
//
// Brand colors (primary / primaryDark / primaryLight) read live from
// CSS variables on <html> so the per-user theme picker on Profile can
// repaint the whole app without a reload. Other colors stay static.
//
// Design: a Proxy fronts the static defaults. When a caller reads
// colors.primary, the Proxy first checks getComputedStyle(html).--primary;
// if present, that wins. If not, the literal default below is returned.
// All ~170 call sites of `colors.primary` therefore auto-theme without
// modification — they just keep returning the right hex on each access.

const DEFAULTS = {
  // Primary Colors — overridable via CSS vars (--primary, --primary-dark, --primary-light)
  primary: '#E53935',
  primaryDark: '#C62828',
  primaryLight: '#FFEBEE',

  // Base Colors
  black: '#000000',
  white: '#FFFFFF',

  // Grey Scale
  inputGrey: '#F5F5F5',
  textGrey: '#757575',
  borderGrey: '#E0E0E0',
  darkGrey: '#333333',
  midGrey: '#999999',
  hoverGrey: '#F0F0F0',
  scrollGrey: '#CCCCCC',

  // Text Colors
  textDark: '#000000',
  textLight: '#FFFFFF',
  textMuted: '#757575',
  textSecondary: '#666666',

  // Status Colors
  success: '#2E7D32',
  error: '#C62828',
  warning: '#F39C12',
  info: '#1976D2',

  // Background Colors
  bgWhite: '#FFFFFF',
  bgLight: '#F5F5F5',
  bgCard: '#FAFAFA',
  bgDark: '#3E3B52',
};

// Static fields that map 1:1 to the three live CSS variables. The Proxy
// checks these first; everything else returns the static default.
const CSS_VAR_MAP = {
  primary: '--primary',
  primaryDark: '--primary-dark',
  primaryLight: '--primary-light',
};

const readCssVar = (name) => {
  if (typeof document === 'undefined' || !document.documentElement) return '';
  // getPropertyValue returns ' #E53935' (leading space) for inline styles
  // set via document.documentElement.style.setProperty. Trim it.
  return document.documentElement.style.getPropertyValue(name).trim();
};

export const colors = new Proxy(DEFAULTS, {
  get(target, prop) {
    if (typeof prop === 'string' && CSS_VAR_MAP[prop]) {
      const live = readCssVar(CSS_VAR_MAP[prop]);
      if (live) return live;
    }
    return target[prop];
  },
});

export default colors;
