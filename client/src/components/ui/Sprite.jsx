import { useEffect, useRef, useState } from 'react';
import { characterSprite, tileSprite } from '../../constants/sprites.js';

/**
 * Sprite — renders a pixel-art sprite from either:
 *   - a single PNG file (entry.image), or
 *   - one cell of a sprite sheet (entry.sheet + sx/sy/size).
 *
 * The source pixel size is always `entry.size` (default 32 for 32rogues).
 * We draw it scaled to `size` CSS pixels using `image-rendering:
 * pixelated` + scaled background / scaled <img>, so the pixel art stays
 * crisp even at 3× – 4× the original size.
 *
 * If the source file fails to load we fall back to a colored tile with
 * an emoji centred inside, so the UI never goes blank while you're
 * still setting up assets.
 *
 * Props:
 *   kind     'character' | 'tile'
 *   id       sprite id (see sprites.js)
 *   size     CSS pixels (width & height on screen)
 *   facing   'left' | 'right' — mirrors horizontally
 *   label    accessible name
 */
export default function Sprite({ kind, id, size = 40, facing = 'right', label }) {
  const entry = kind === 'tile' ? tileSprite(id) : characterSprite(id);
  const [failed, setFailed] = useState(false);

  // Preload sheet sources in sheet mode so we can detect missing files
  // and switch to the emoji fallback.
  const probeRef = useRef(null);
  useEffect(() => {
    if (!entry.sheet || failed) return;
    const img = new Image();
    probeRef.current = img;
    img.onload = () => { if (probeRef.current === img) probeRef.current = null; };
    img.onerror = () => { if (probeRef.current === img) setFailed(true); };
    img.src = entry.sheet;
    return () => {
      if (probeRef.current === img) probeRef.current = null;
    };
  }, [entry.sheet, failed]);

  const styleBase = {
    width: size,
    height: size,
    display: 'inline-block',
    lineHeight: `${size}px`,
    fontSize: Math.round(size * 0.7),
    textAlign: 'center',
    verticalAlign: 'middle',
  };

  // ---- Sheet mode (32rogues-style) ----
  //
  // Trick: render an inner <span> that is exactly the native cell size
  // (32×32) with the sheet positioned so the correct cell is at (0,0).
  // Then CSS `transform: scale(...)` blows it up to `size` CSS pixels.
  // The outer wrapper is fixed at `size` and `overflow: hidden` so only
  // the one scaled cell remains visible. `image-rendering: pixelated`
  // keeps the nearest-neighbour upscaling crisp.
  if (entry.sheet && !failed) {
    const cell = entry.size ?? 32;
    const scale = size / cell;
    return (
      <span
        role="img"
        aria-label={label ?? id}
        className={`sprite sprite--sheet sprite--${kind}`}
        style={{
          width: size,
          height: size,
          display: 'inline-block',
          overflow: 'hidden',
          position: 'relative',
          transform: facing === 'left' ? 'scaleX(-1)' : undefined,
        }}
      >
        <span
          aria-hidden
          style={{
            display: 'block',
            width: cell,
            height: cell,
            backgroundImage: `url(${entry.sheet})`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: `-${entry.sx}px -${entry.sy}px`,
            imageRendering: 'pixelated',
            transform: `scale(${scale})`,
            transformOrigin: '0 0',
          }}
        />
      </span>
    );
  }

  // ---- Single-image mode ----
  if (entry.image && !failed) {
    return (
      <img
        src={entry.image}
        alt={label ?? id}
        width={size}
        height={size}
        className="sprite sprite--img"
        style={{
          ...styleBase,
          imageRendering: 'pixelated',
          transform: facing === 'left' ? 'scaleX(-1)' : undefined,
        }}
        onError={() => setFailed(true)}
        draggable={false}
      />
    );
  }

  // ---- Fallback — colored tile with emoji ----
  const bg = kind === 'tile' ? (entry.color ?? '#222') : 'transparent';
  return (
    <span
      role="img"
      aria-label={label ?? id}
      className={`sprite sprite--fallback sprite--${kind}`}
      style={{
        ...styleBase,
        background: bg,
        borderRadius: kind === 'tile' ? 0 : '50%',
        boxShadow:
          kind === 'character'
            ? `0 0 0 2px ${entry.tint ?? '#888'} inset, 0 2px 6px rgba(0,0,0,0.4)`
            : undefined,
        transform: facing === 'left' ? 'scaleX(-1)' : undefined,
      }}
    >
      {entry.emoji}
    </span>
  );
}
