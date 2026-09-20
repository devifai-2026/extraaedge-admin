// A cap on how many phone numbers can be unmasked at once, shared across every
// MaskedPhone on the page.
//
// WHY: each MaskedPhone kept its own `revealed` state and knew nothing about
// the others, so a user could click down a list and have the whole column
// unmasked — which defeats the point of masking it. Reveals are audit-logged,
// but a screenshot of 20 open numbers is still a screenshot of 20 numbers.
//
// The rule is a rolling window: revealing a 4th number re-masks the 1st, so at
// most MAX_REVEALED are visible at any moment. Deliberately NOT a hard refusal
// — blocking the 4th click would just read as a broken button, and the person
// almost always wants the number they just clicked.
//
// Lives outside React (a module-level Set + listeners) because the instances
// are siblings scattered through a table with no common parent to hold state.

export const MAX_REVEALED = 3;

// Insertion-ordered: a JS Set preserves insertion order, so the first entry is
// always the oldest reveal — that is the one evicted.
const open = new Set();
const listeners = new Set();

const notify = () => { listeners.forEach((fn) => fn()); };

export const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const isOpen = (key) => open.has(key);

// Register a reveal, evicting the oldest if we are at the cap. Re-revealing
// something already open just refreshes its position (it becomes the newest,
// so it is not the next one evicted).
export const openReveal = (key) => {
  if (open.has(key)) open.delete(key);
  open.add(key);
  while (open.size > MAX_REVEALED) {
    const oldest = open.values().next().value;
    open.delete(oldest);
  }
  notify();
};

export const closeReveal = (key) => {
  if (open.delete(key)) notify();
};

// Clearing on logout/unmount of the list keeps a stale key from surviving into
// the next page of results.
export const clearReveals = () => {
  if (open.size === 0) return;
  open.clear();
  notify();
};
