import { useEffect, useState } from 'react';
import { auth } from '../../lib/endpoints';

// Repeating name + id + timestamp overlay across the screen. Doesn't stop a
// screenshot — nothing can — but makes any leaked screenshot traceable back to
// exactly who was logged in when it was taken.
//
// TWO THINGS ARE LOAD-BEARING HERE:
//
//   position: fixed — NOT absolute. The old version pinned to its nearest
//   positioned ancestor, which inside LeadsTable is a box with
//   `overflow: auto` wrapping a `min-width: 1400px` table. The overlay
//   therefore covered only the visible box and scrolled away from the content
//   underneath it. Fixed pins to the viewport, which is what a screenshot
//   actually captures.
//
//   pointer-events: none — this sits ABOVE real content (including dialogs)
//   and must never intercept a click meant for the form underneath.
//
// Drawn as ONE element with a repeating SVG background rather than N text
// nodes. The previous 60-<div> grid simply ran out of tiles on a long list,
// leaving the bottom of the page unmarked; a background repeats forever for
// free, and rotating inside the SVG avoids the transform/overflow hack the
// grid needed.

const REFRESH_MS = 30_000;

// Tunable in one place. This has to stay traceable without making the app
// tiring to work in all day: 0.055 is legible when you look for it (and in a
// screenshot enlarged to read the data) but recedes while reading the page.
const OPACITY = 0.055;
const FONT_SIZE = 12;
// Tile geometry is derived from the ROTATED bounding box, not guessed: at
// -20deg a ~280px label spans ~260x95px. The tile is then made deliberately
// LARGER than the text so the marks are spaced out — the first version packed
// two rows into every 320x230 tile, which stamped text over every card, KPI
// number and sidebar item at once and read as visual noise. One mark per
// tile, on a wide pitch, is just as traceable and far calmer.
const TILE_W = 620;
const TILE_H = 320;
const ROW1_Y = 150;

const escapeXml = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]
));

// One mark per tile. The tile is much larger than the mark, so the repeat
// gives a sparse diagonal grid instead of a dense mesh.
const tileDataUri = (label) => {
  const t = escapeXml(label);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_W}" height="${TILE_H}">`
    + `<g fill="#111" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="${FONT_SIZE}" font-weight="600">`
    + `<text x="24" y="${ROW1_Y}" transform="rotate(-20 24 ${ROW1_Y})">${t}</text>`
    + `</g></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
};

export default function Watermark({ zIndex = 1200 }) {
  const [user, setUser] = useState(() => auth.getUser());
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  // Layout refreshes the cached user from /auth/me on mount and announces it.
  // Without this the label can sit on a stale (or missing) name for the first
  // render after login.
  useEffect(() => {
    const onUser = () => setUser(auth.getUser());
    window.addEventListener('ee:user-updated', onUser);
    return () => window.removeEventListener('ee:user-updated', onUser);
  }, []);

  if (!user) return null;
  const label = `${user.name || user.email || 'user'} · ${user.id?.slice(0, 8) || ''} · ${now.toLocaleString()}`;

  return (
    <div
      aria-hidden="true"
      data-watermark="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex,
        opacity: OPACITY,
        backgroundImage: tileDataUri(label),
        backgroundRepeat: 'repeat',
        backgroundPosition: '0 0',
      }}
    />
  );
}
