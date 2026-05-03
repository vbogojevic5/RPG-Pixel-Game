import Sprite from './Sprite.jsx';
import { statLabel } from '../../constants/movePresentation.js';

function statRows(hero) {
  return [
    ['HP', hero.stats.health],
    [statLabel('mana'), hero.stats.mana ?? 0],
    [statLabel('attack'), hero.stats.attack],
    [statLabel('defense'), hero.stats.defense],
    ['MAG', hero.stats.magic],
  ];
}

/**
 * Coin purse icon: Heroicons v2 outline CurrencyDollarIcon (MIT)
 * https://github.com/tailwindlabs/heroicons
 */
function CoinIcon({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      aria-hidden
    >
      <path
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
}

export default function ChampionStatsPanel({ hero, xpThreshold, compact = false }) {
  if (!hero) return null;
  const xpPct = xpThreshold ? Math.max(0, Math.min(100, (hero.xp / xpThreshold) * 100)) : 0;
  const coins = hero.coins ?? 0;

  return (
    <aside className={`champion-stats ${compact ? 'champion-stats--compact' : ''}`}>
      <div className="champion-stats__head">
        <div className="champion-stats__portrait">
          <Sprite kind="character" id={hero.id} size={compact ? 54 : 56} />
        </div>
        <div>
          <p className="champion-stats__eyebrow">Champion</p>
          <h3>{hero.name}</h3>
          <span>Level {hero.level}</span>
        </div>
      </div>
      <div className="champion-stats__xp" title={`XP ${hero.xp}/${xpThreshold ?? '?'}`}>
        <div className="champion-stats__xp-fill" style={{ width: `${xpPct}%` }} />
        <span>XP {hero.xp}/{xpThreshold ?? '—'}</span>
      </div>
      <div className="champion-stats__progress champion-stats__coins" title="Coins">
        <CoinIcon className="champion-stats__coin-icon" />
        <span>{coins}</span>
      </div>
      <div className="champion-stats__grid">
        {statRows(hero).map(([label, value]) => (
          <div className="champion-stats__row" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </aside>
  );
}
