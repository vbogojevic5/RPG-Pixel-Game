/**
 * LevelUpModal — inline badge/notification shown inside PostBattle when
 * the hero just leveled up.
 *
 * Shows the new level plus the stat gains the player received. Phase 3
 * could replace the fixed gains with a player-choice picker.
 */
export default function LevelUpModal({ newLevel, statGains }) {
  if (!newLevel || !statGains) return null;

  const items = [
    { label: 'HP', value: statGains.health },
    { label: 'DMG', value: statGains.attack },
    { label: 'DEF', value: statGains.defense },
    { label: 'MAG', value: statGains.magic },
  ].filter((s) => s.value > 0);

  return (
    <div className="levelup">
      <div className="levelup__header">Level Up!</div>
      <div className="levelup__level">Now Level {newLevel}</div>
      <ul className="levelup__stats">
        {items.map((s) => (
          <li key={s.label} className="levelup__stat">
            <span className="levelup__stat-label">{s.label}</span>
            <span className="levelup__stat-value">+{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
