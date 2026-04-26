import { useMemo } from 'react';
import Sprite from '../ui/Sprite.jsx';
import {
  JOURNEY_NODES,
  JOURNEY_PATH_D,
  MAP_SIZE,
} from '../../constants/overworld.js';

/**
 * RunMap — the journey map (Phase 2, revised).
 *
 * Fixed illustration, no movement. Five monster nodes sit along one
 * winding path drawn in SVG. The path's filled portion (dashes in a
 * warm color) grows as the player beats monsters, leaving the
 * remainder as a dotted "unexplored" trail.
 *
 * Nodes render the monster sprite at the percentage coordinate from
 * JOURNEY_NODES. Click the next available node to fight; defeated
 * nodes stay clickable for XP farming; locked nodes are disabled.
 */
export default function RunMap({
  config,
  hero,
  defeatedMonsterIds,
  xpThreshold,
  onSelectMonster,
  onOpenMoveManager,
  onOpenSave,
  onBackToMenu,
}) {
  const monsters = useMemo(() => {
    const byId = new Map(config.monsters.map((m) => [m.id, m]));
    return JOURNEY_NODES
      .map((n, idx) => {
        const monster = byId.get(n.id);
        if (!monster) return null;
        return { ...n, monster, order: monster.order ?? idx + 1 };
      })
      .filter(Boolean);
  }, [config]);

  // Next-to-fight = first undefeated in order.
  const nextId = useMemo(() => {
    const ordered = [...config.monsters].sort((a, b) => a.order - b.order);
    return ordered.find((m) => !defeatedMonsterIds.includes(m.id))?.id ?? null;
  }, [config, defeatedMonsterIds]);

  const hpPct = hero ? (hero.currentHealth / hero.stats.health) * 100 : 0;
  const xpPct = xpThreshold ? (hero.xp / xpThreshold) * 100 : 0;

  // How much of the path is "traveled" — a ratio 0..1 based on
  // defeated count. The path has 5 segments so each kill lights up
  // 1/5 of it.
  const progress = defeatedMonsterIds.length / monsters.length;

  return (
    <div className="screen journey">
      <header className="journey__topbar">
        <div className="journey__hero-panel">
          <div className="journey__hero-portrait">
            <Sprite kind="character" id={hero.id} size={44} />
          </div>
          <div className="journey__hero-info">
            <div className="journey__hero-name">
              {hero.name} <span className="journey__hero-level">Lv {hero.level}</span>
            </div>
            <div className="journey__hero-bars">
              <div className="journey__bar" title={`HP ${hero.currentHealth}/${hero.stats.health}`}>
                <div
                  className="journey__bar-fill journey__bar-fill--hp"
                  style={{ width: `${Math.max(0, Math.min(100, hpPct))}%` }}
                />
                <span className="journey__bar-label">
                  HP {hero.currentHealth}/{hero.stats.health}
                </span>
              </div>
              <div className="journey__bar" title={`XP ${hero.xp}/${xpThreshold ?? '?'}`}>
                <div
                  className="journey__bar-fill journey__bar-fill--xp"
                  style={{ width: `${Math.max(0, Math.min(100, xpPct))}%` }}
                />
                <span className="journey__bar-label">
                  XP {hero.xp}/{xpThreshold ?? '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="journey__actions">
          <button type="button" className="btn" onClick={onOpenMoveManager}>
            Moves ({hero.knownMoves.length})
          </button>
          {onOpenSave && (
            <button type="button" className="btn" onClick={onOpenSave}>
              Save
            </button>
          )}
          <button type="button" className="btn btn--ghost" onClick={onBackToMenu}>
            Menu
          </button>
        </div>
      </header>

      <div className="journey__stage">
        <div
          className="journey__map"
          style={{ aspectRatio: `${MAP_SIZE.width} / ${MAP_SIZE.height}` }}
        >
          {/* Path — two SVGs stacked so the traveled portion is coloured */}
          <svg
            className="journey__path"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              d={JOURNEY_PATH_D}
              className="journey__path-line journey__path-line--remaining"
            />
            <path
              d={JOURNEY_PATH_D}
              className="journey__path-line journey__path-line--traveled"
              style={{ strokeDashoffset: `${(1 - progress) * 200}%` }}
            />
          </svg>

          {/* Nodes */}
          {monsters.map((n) => {
            const defeated = defeatedMonsterIds.includes(n.id);
            const isNext = n.id === nextId;
            const locked = !defeated && !isNext;
            const className = [
              'journey__node',
              defeated && 'is-defeated',
              isNext && 'is-next',
              locked && 'is-locked',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <button
                key={n.id}
                type="button"
                className={className}
                style={{ left: `${n.x}%`, top: `${n.y}%` }}
                disabled={locked}
                onClick={() => onSelectMonster(n.id)}
                title={`${n.monster.name} — ${n.label}${
                  defeated ? ' (defeated — fight again to farm XP)' : ''
                }`}
              >
                <span className="journey__node-pin">
                  <Sprite kind="character" id={n.id} size={64} />
                  {defeated && <span className="journey__node-skull">☠</span>}
                </span>
                <span className="journey__node-badge">#{n.order}</span>
                <span className="journey__node-caption">
                  <span className="journey__node-name">{n.monster.name}</span>
                  <span className="journey__node-place">{n.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <footer className="journey__footer">
        {nextId ? (
          <p className="journey__hint">
            Click the pulsing banner to challenge the next foe. Defeated monsters can be
            re-fought to grind XP.
          </p>
        ) : (
          <p className="journey__hint">
            Every foe has fallen. The last defeat will seal your legend.
          </p>
        )}
      </footer>
    </div>
  );
}
