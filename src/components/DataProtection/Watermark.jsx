import { useEffect, useState } from 'react';
import { auth } from '../../lib/endpoints';

// Faint repeating name+id+timestamp overlay on every screen showing lead
// data. Doesn't stop a screenshot — nothing can — but makes any leaked
// screenshot traceable back to exactly who was logged in when it was taken.
// pointer-events: none is load-bearing: this sits ABOVE the real content but
// must never intercept clicks meant for the table/reveal buttons underneath.
const REFRESH_MS = 30_000;
const TILE_W = 260;
const TILE_H = 120;

export default function Watermark() {
  const user = auth.getUser();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  if (!user) return null;
  const label = `${user.name || user.email || 'user'} · ${user.id?.slice(0, 8) || ''} · ${now.toLocaleString()}`;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 5,
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, ${TILE_W}px)`,
        gridAutoRows: `${TILE_H}px`,
        transform: 'rotate(-18deg) scale(1.4)',
        opacity: 0.06,
      }}
    >
      {Array.from({ length: 60 }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 600, color: '#000', whiteSpace: 'nowrap',
          }}
        >
          {label}
        </div>
      ))}
    </div>
  );
}
