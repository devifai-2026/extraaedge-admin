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

// Tunable in one place. 0.16 reads clearly in a screenshot or a phone photo
// while still letting dense table text through underneath; raise toward 0.25
// for more deterrence, drop toward 0.08 if staff find it noisy.
const OPACITY = 0.16;
const FONT_SIZE = 13;
// Tile geometry is derived from the ROTATED bounding box, not guessed: at
// -20deg a ~300px label spans ~280x102px, so two rows need ~230px of height.
// Sizing the tile any shorter clips the top line and leaves a dead band at
// the bottom of every repeat — both of which showed up when this was eyeballed.
const TILE_W = 320;
const TILE_H = 230;
const ROW1_Y = 112;
const ROW2_Y = 227;

const escapeXml = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]
));

// One tile, drawn twice on a diagonal so the repeat reads as a dense mesh
// rather than widely-spaced stripes.
const tileDataUri = (label) => {
  const t = escapeXml(label);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_W}" height="${TILE_H}">`
    + `<g fill="#111" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="${FONT_SIZE}" font-weight="600">`
    + `<text x="12" y="${ROW1_Y}" transform="rotate(-20 12 ${ROW1_Y})">${t}</text>`
    + `<text x="12" y="${ROW2_Y}" transform="rotate(-20 12 ${ROW2_Y})">${t}</text>`
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
