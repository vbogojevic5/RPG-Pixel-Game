import { useEffect, useMemo } from 'react';
import ChampionStatsPanel from '../ui/ChampionStatsPanel.jsx';
import Sprite from '../ui/Sprite.jsx';
import {
  mapNodes,
  mapSegmentsGlobal,
  orderMapNodesBfs,
  layoutMapPages,
  MAP_PAGE_SIZE,
  computeAvailableMapNodeIds,
} from '../../constants/overworld.js';
import { statLabel } from '../../constants/movePresentation.js';

const EMPTY_NODE_IDS = [];

/** Map layout `gy` is 0–100 from top; above this, stat cloud stays on top of the pin. */
const STAT_CLOUD_PLACE_BELOW_GY = 42;

/** Large chevron icons for map paging (prev mirrors next). */
function MapNavChevron({ direction }) {
  return (
    <svg
      className="journey__nav-icon"
      viewBox="0 0 24 24"
      width="40"
      height="40"
      aria-hidden
      style={direction === 'prev' ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path
        fill="currentColor"
        d="M9.2 5.3c.4-.2.9-.2 1.3 0l8.5 5.2c.5.3.8.8.8 1.4s-.3 1.1-.8 1.4l-8.5 5.2c-.4.2-.9.2-1.3 0A1.5 1.5 0 0 1 8 16.5v-9c0-.6.3-1.2.8-1.4z"
      />
    </svg>
  );
}

/**
 * RunMap — journey map with fixed viewport and paged horizontal scroll.
 *
 * Up to MAP_PAGE_SIZE nodes per page; one continuous path in global
 * coordinates; arrows snap the viewport between pages.
 */
export default function RunMap({
  config,
  hero,
  defeatedMonsterIds,
  mapProgress,
  mapPageIndex: mapPageIndexProp = 0,
  onMapPageChange,
  xpThreshold,
  onSelectNode,
  onOpenConfigure,
  onOpenShop,
  onOpenSave,
  onBackToMenu,
}) {
  const worldNodes = useMemo(() => mapNodes(config), [config]);

  const { nodesWithLayout, numPages, segments } = useMemo(() => {
    const starts =
      config?.mapConfig?.startNodeIds?.length > 0
        ? config.mapConfig.startNodeIds
        : worldNodes[0]?.id
          ? [worldNodes[0].id]
          : [];
    const ordered = orderMapNodesBfs(worldNodes, starts);
    const { nodesWithLayout: layout, numPages: pages } = layoutMapPages(ordered, MAP_PAGE_SIZE);
    const segs = mapSegmentsGlobal(layout);
    return { nodesWithLayout: layout, numPages: pages, segments: segs };
  }, [config, worldNodes]);

  const maxPage = Math.max(0, numPages - 1);
  const pageIndex = Math.min(Math.max(0, mapPageIndexProp), maxPage);

  useEffect(() => {
    if (!onMapPageChange) return;
    if (mapPageIndexProp > maxPage) {
      onMapPageChange(maxPage);
    }
  }, [maxPage, mapPageIndexProp, onMapPageChange]);

  const nodes = useMemo(() => {
    const byId = new Map(config.monsters.map((m) => [m.id, m]));
    const merchants = new Map((config.shopConfig?.merchants ?? []).map((m) => [m.id, m]));
    let fightLevel = 0;
    return nodesWithLayout.map((n) => {
      const monster = n.monsterId ? byId.get(n.monsterId) : null;
      const merchant = n.merchantId ? merchants.get(n.merchantId) : null;
      if (n.type === 'shop') {
        if (!merchant) {
          return { ...n, monster: null, merchant: null, battleLevel: null, configGap: true };
        }
        return { ...n, monster: null, merchant, battleLevel: null };
      }
      if (!monster) {
        return { ...n, monster: null, merchant: null, battleLevel: null, configGap: true };
      }
      const battleLevel = ++fightLevel;
      return { ...n, monster, merchant, battleLevel };
    });
  }, [config, nodesWithLayout]);

  const clearedNodeIds = mapProgress?.clearedNodeIds ?? EMPTY_NODE_IDS;

  const availableNodeIds = useMemo(
    () => computeAvailableMapNodeIds(worldNodes, clearedNodeIds, config?.monsters),
    [worldNodes, clearedNodeIds, config?.monsters]
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      if (t?.isContentEditable) return;
      if (numPages <= 1) return;
      e.preventDefault();
      if (e.key === 'ArrowRight') {
        onMapPageChange?.(Math.min(numPages - 1, pageIndex + 1));
      } else {
        onMapPageChange?.(Math.max(0, pageIndex - 1));
      }
    };
    window.addEventListener('keydown', onKey, { passive: false });
    return () => window.removeEventListener('keydown', onKey);
  }, [numPages, onMapPageChange, pageIndex]);

  const viewBoxWidth = 100 * numPages;
  const mapTransform =
    numPages <= 1 ? undefined : `translateX(calc(-${pageIndex} * 100% / ${numPages}))`;

  return (
    <div className="screen run-layout">
      <header className="run-layout__page-heading">
        <div className="run-layout__title">
          <h2 className="screen-page-title">Map</h2>
        </div>
      </header>

      <div className="run-layout__body">
        <aside className="run-layout__sidebar">
          <ChampionStatsPanel hero={hero} xpThreshold={xpThreshold} compact />
          <div className="run-layout__sidebar-actions">
            <button type="button" className="btn" onClick={onOpenConfigure}>
              <i className="fa-solid fa-gear btn__fa" aria-hidden />
              Setup
            </button>
            {onOpenSave && (
              <button type="button" className="btn" onClick={onOpenSave}>
                <i className="fa-solid fa-sd-card btn__fa" aria-hidden />
                Save
              </button>
            )}
            <button type="button" className="btn btn--ghost" onClick={onBackToMenu}>
              <i className="fa-solid fa-bars btn__fa" aria-hidden />
              Menu
            </button>
          </div>
        </aside>
        <div className="run-layout__main run-layout__main--map">
          <div className="journey__viewport">
            <div
              className="journey__map"
              style={{
                width: `${numPages * 100}%`,
                transform: mapTransform,
              }}
            >
              <svg
                className="journey__path"
                viewBox={`0 0 ${viewBoxWidth} 100`}
                preserveAspectRatio="none"
                aria-hidden
              >
                {segments.map((segment) => {
                  const cleared = clearedNodeIds.includes(segment.to);
                  const available = !cleared && clearedNodeIds.includes(segment.from);
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

              {nodes.map((n) => {
                const cleared = clearedNodeIds.includes(n.id);
                const defeated = n.monsterId ? defeatedMonsterIds.includes(n.monsterId) : cleared;
                const isNext = availableNodeIds.has(n.id);
                const gapLocked = Boolean(n.configGap);
                const locked = gapLocked || (!cleared && !isNext);
                const leftPct = (n.gx / viewBoxWidth) * 100;
                const title = n.configGap
                  ? n.type === 'shop'
                    ? `Map node references missing shop merchant "${n.merchantId ?? ''}". Check SHOP_CONFIG / MAP_CONFIG.`
                    : `Map node references monster "${n.monsterId ?? ''}" but it is missing from this run config. Refresh or re-fetch /run/config after admin changes.`
                  : n.type === 'shop'
                    ? `${n.merchant?.name ?? 'Shop'} — ${n.label}`
                    : `${n.monster.name} — ${n.label}${defeated ? ' (defeated — fight again to farm XP)' : ''}`;
                const className = [
                  'journey__node',
                  `journey__node--${n.type}`,
                  n.biomeId && `journey__node--biome-${n.biomeId}`,
                  `journey__node--${n.id}`,
                  n.configGap && 'journey__node--config-gap',
                  cleared && 'is-defeated',
                  isNext && 'is-next',
                  locked && 'is-locked',
                ]
                  .filter(Boolean)
                  .join(' ');
                const gy = typeof n.gy === 'number' ? n.gy : 50;
                const statCloudBelow = gy <= STAT_CLOUD_PLACE_BELOW_GY;
                return (
                  <button
                    key={n.id}
                    type="button"
                    className={className}
                    style={{ left: `${leftPct}%`, top: `${n.gy}%` }}
                    aria-disabled={locked}
                    onClick={() => {
                      if (locked) return;
                      if (n.type === 'shop') {
                        onOpenShop?.(n.merchantId, n.id);
                      } else {
                        onSelectNode(n);
                      }
                    }}
                    title={title}
                  >
                    <span className="journey__node-badge">
                      {n.configGap ? '!' : n.type === 'shop' ? 'SHOP' : `Level ${n.battleLevel}`}
                    </span>
                    <span className="journey__node-pin">
                      {n.configGap ? (
                        <span className="journey__node-gap-icon" aria-hidden>
                          ?
                        </span>
                      ) : n.type === 'shop' ? (
                        <span className="journey__shop-icon" aria-hidden>
                          ◆
                        </span>
                      ) : (
                        <Sprite kind="character" id={n.monsterId} size={72} />
                      )}
                      {cleared && <span className="journey__node-skull">{n.type === 'shop' ? '✓' : '☠'}</span>}
                    </span>
                    <span className="journey__node-caption">
                      <span className="journey__node-name">
                        {n.configGap
                          ? n.type === 'shop'
                            ? n.label ?? 'Shop'
                            : n.label ?? n.monsterId ?? 'Fight'
                          : n.type === 'shop'
                            ? n.merchant?.name
                            : n.monster.name}
                      </span>
                    </span>
                    {!n.configGap && n.type !== 'shop' && (
                      <span
                        className={
                          statCloudBelow
                            ? 'journey__stat-cloud journey__stat-cloud--below'
                            : 'journey__stat-cloud'
                        }
                      >
                        <span className="journey__stat-cloud-title">{n.monster.name}</span>
                        <span>HP {n.monster.stats.health}</span>
                        <span>
                          {statLabel('attack')} {n.monster.stats.attack}
                        </span>
                        <span>
                          {statLabel('defense')} {n.monster.stats.defense}
                        </span>
                        <span>
                          {statLabel('magic')} {n.monster.stats.magic}
                        </span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {numPages > 1 && (
              <>
                <button
                  type="button"
                  className="journey__nav journey__nav--prev"
                  onClick={() => onMapPageChange?.(Math.max(0, pageIndex - 1))}
                  disabled={pageIndex <= 0}
                  aria-label="Show previous part of the map"
                  data-sfx="buttonClick"
                >
                  <MapNavChevron direction="prev" />
                </button>
                <button
                  type="button"
                  className="journey__nav journey__nav--next"
                  onClick={() => onMapPageChange?.(Math.min(numPages - 1, pageIndex + 1))}
                  disabled={pageIndex >= maxPage}
                  aria-label="Show next part of the map"
                  data-sfx="buttonClick"
                >
                  <MapNavChevron direction="next" />
                </button>
              </>
            )}
          </div>

          {mapProgress?.bossDefeated && (
            <footer className="journey__footer">
              <p className="journey__hint">Every foe has fallen. The last defeat will seal your legend.</p>
            </footer>
          )}
        </div>
      </div>
    </div>
  );
}
