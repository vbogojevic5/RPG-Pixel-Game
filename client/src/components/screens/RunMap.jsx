import { useMemo } from 'react';
import Sprite from '../ui/Sprite.jsx';
import {
  JOURNEY_NODES,
  JOURNEY_PATH_SEGMENTS,
  MAP_SIZE,
} from '../../constants/overworld.js';
import { statLabel } from '../../constants/movePresentation.js';

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
  onOpenInventory,
  onOpenShop,
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
    const runNodeIds = new Set(JOURNEY_NODES.map((node) => node.id));
    const ordered = [...config.monsters].sort((a, b) => a.order - b.order);
    return ordered.find((m) => runNodeIds.has(m.id) && !defeatedMonsterIds.includes(m.id))?.id ?? null;
  }, [config, defeatedMonsterIds]);

  const xpPct = xpThreshold ? (hero.xp / xpThreshold) * 100 : 0;
  const unlockedMerchants = (config.shopConfig?.merchants ?? [])
    .filter((merchant) => defeatedMonsterIds.length >= merchant.unlockAfterCompleted);

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
          {onOpenInventory && (
            <button type="button" className="btn" onClick={onOpenInventory}>
              Items ({hero.inventory?.length ?? 0}) · {hero.coins ?? 0}
            </button>
          )}
          {unlockedMerchants.map((merchant) => (
            <button type="button" className="btn" key={merchant.id} onClick={() => onOpenShop?.(merchant.id)}>
              {merchant.name}
            </button>
          ))}
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
          {/* Path — individual footprint segments show locked / available / cleared state. */}
          <svg
            className="journey__path"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            {JOURNEY_PATH_SEGMENTS.map((segment) => {
              const cleared = defeatedMonsterIds.includes(segment.to);
              const available = !cleared && defeatedMonsterIds.includes(segment.from);
              const state = cleared ? 'cleared' : available ? 'available' : 'locked';
              return (
                <path
                  key={`${segment.from}-${segment.to}`}
                  d={segment.d}
                  className={`journey__path-line journey__path-line--${state}`}
                />
              );
            })}
          </svg>

          {/* Nodes */}
          {monsters.map((n) => {
            const defeated = defeatedMonsterIds.includes(n.id);
            const isNext = n.id === nextId;
            const locked = !defeated && !isNext;
            const className = [
              'journey__node',
              `journey__node--${n.id}`,
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
                aria-disabled={locked}
                onClick={() => {
                  if (!locked) onSelectMonster(n.id);
                }}
                title={`${n.monster.name} — ${n.label}${
                  defeated ? ' (defeated — fight again to farm XP)' : ''
                }`}
              >
                <span className="journey__node-pin">
                  <Sprite kind="character" id={n.id} size={72} />
                  {defeated && <span className="journey__node-skull">☠</span>}
                </span>
                <span className="journey__node-badge">#{n.order}</span>
                <span className="journey__node-caption">
                  <span className="journey__node-name">{n.monster.name}</span>
                  <span className="journey__node-place">{n.label}</span>
                </span>
                <span className="journey__stat-cloud">
                  <span className="journey__stat-cloud-title">{n.monster.name}</span>
                  <span>HP {n.monster.stats.health}</span>
                  <span>{statLabel('attack')} {n.monster.stats.attack}</span>
                  <span>{statLabel('defense')} {n.monster.stats.defense}</span>
                  <span>AP {n.monster.stats.magic}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {!nextId && (
        <footer className="journey__footer">
          <p className="journey__hint">
            Every foe has fallen. The last defeat will seal your legend.
          </p>
        </footer>
      )}
    </div>
  );
}
