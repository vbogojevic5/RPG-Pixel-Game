import { useEffect, useMemo, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import { getEffectPreset } from '../../constants/spellEffects.js';

let enginePromise = null;
let engineReady = false;

export function ensureParticleEngine() {
  if (!enginePromise) {
    enginePromise = initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      engineReady = true;
    });
  }
  return enginePromise;
}

/**
 * One-shot tsparticles burst pinned to a fighter.
 * Auto-unmounts after `lifetimeMs` so the canvas tears down cleanly.
 */
export default function SpellBurst({
  effectKey,
  side = 'left',
  burstId,
  lifetimeMs = 900,
  intensity = 1,
}) {
  const [ready, setReady] = useState(engineReady);

  useEffect(() => {
    if (engineReady) {
      setReady(true);
      return;
    }
    let alive = true;
    ensureParticleEngine().then(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const options = useMemo(() => {
    const preset = getEffectPreset(effectKey);
    if (intensity === 1) return preset;
    const cloned = { ...preset, emitters: (preset.emitters ?? []).map((e) => ({ ...e })) };
    for (const e of cloned.emitters) {
      const base = typeof e.startCount === 'number' ? e.startCount : 24;
      e.startCount = Math.max(8, Math.round(base * intensity));
    }
    return cloned;
  }, [effectKey, intensity]);

  if (!ready) return null;

  return (
    <div
      className={`spell-burst spell-burst--${side} spell-burst--${effectKey}`}
      aria-hidden
    >
      <Particles
        key={burstId}
        id={`spell-${side}-${burstId}`}
        options={options}
      />
      <div
        className={`spell-burst__shockwave spell-burst__shockwave--${effectKey}`}
        style={{ animationDuration: `${lifetimeMs}ms` }}
      />
    </div>
  );
}
