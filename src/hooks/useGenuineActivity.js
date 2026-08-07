import { useCallback, useEffect, useRef } from 'react';

// Real mouse/keyboard/touch/scroll interaction, as a heuristic for "someone
// is actually at the keyboard" — deliberately NOT satisfied by a single
// event, since one scripted dispatchEvent (or one absent-minded mouse
// wiggle) shouldn't count as a work minute. Requires at least two distinct
// event types spread over MIN_SPREAD_MS of real time. This can still be
// scripted by someone deliberately trying to fake it from devtools — it's a
// meaningfully higher bar than the old signal (any background API call
// counted as "active"), not a bulletproof one.
const TRACKED_EVENTS = ['mousemove', 'mousedown', 'keydown', 'wheel', 'scroll', 'touchstart'];
const MIN_SPREAD_MS = 3000;
const MIN_EVENT_COUNT = 3;

export function useGenuineActivity() {
  const windowRef = useRef({ types: new Set(), count: 0, firstAt: null, lastAt: null });
  // Updated on every tracked event, never reset by consumeGenuine — this is
  // what idle-logout should watch (continuous "time since last real input"),
  // as opposed to the windowed multi-modal check used for the 60s heartbeat.
  // Seeded lazily inside the effect (not at render time — Date.now() is an
  // impure call the React Compiler flags if it runs during render).
  const lastActivityAtRef = useRef(null);

  useEffect(() => {
    if (lastActivityAtRef.current == null) lastActivityAtRef.current = Date.now();
    const onEvent = (e) => {
      const now = Date.now();
      lastActivityAtRef.current = now;
      const w = windowRef.current;
      w.types.add(e.type);
      if (w.firstAt == null) w.firstAt = now;
      w.lastAt = now;
      w.count += 1;
    };
    TRACKED_EVENTS.forEach((type) => window.addEventListener(type, onEvent, { passive: true }));
    return () => TRACKED_EVENTS.forEach((type) => window.removeEventListener(type, onEvent));
  }, []);

  // Call right before each heartbeat. Returns whether the interaction since
  // the last call looks like a real work pattern, then resets the window.
  // Memoized (stable identity across renders) — WorkTimer's heartbeat effect
  // lists this in its dependency array, and WorkTimer re-renders every
  // second (its own activeSeconds tick), so an unmemoized function here
  // would re-run that effect every second, resetting its internal 60s timer
  // before it could ever fire. This is why "genuine" activity never
  // recorded anything before this fix — the heartbeat itself never fired.
  const consumeGenuine = useCallback(() => {
    const w = windowRef.current;
    const hasSpread = w.firstAt != null && (w.lastAt - w.firstAt) >= MIN_SPREAD_MS;
    const genuine = w.types.size >= 2 && w.count >= MIN_EVENT_COUNT && hasSpread;
    windowRef.current = { types: new Set(), count: 0, firstAt: null, lastAt: null };
    return genuine;
  }, []);

  const msSinceLastActivity = useCallback(() => Date.now() - lastActivityAtRef.current, []);

  return { consumeGenuine, msSinceLastActivity };
}
