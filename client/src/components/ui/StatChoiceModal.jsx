import { useMemo } from 'react';

/**
 * StatChoiceModal — overlay shown on level-up. Offers 3 random boosts
 * drawn from a hand-tuned archetype pool. The player clicks one and the
 * parent hook applies the gains.
 *
 * The pool is intentionally balanced around `constants.LEVEL_UP_STAT_GAINS`
 * so the overall XP-to-stat ratio is unchanged.
 */

const ARCHETYPE_POOL = [
  { id: 'stout_heart',    name: 'Stout Heart',     gains: { health: 16 } },
  { id: 'deep_well',      name: 'Deep Well',       gains: { mana: 10 } },
  { id: 'warriors_vigor', name: "Warrior's Vigor", gains: { health: 10, attack: 2 } },
  { id: 'iron_fist',      name: 'Iron Fist',       gains: { attack: 4 } },
  { id: 'bulwark',        name: 'Bulwark',         gains: { defense: 4 } },
  { id: 'arcane_spark',   name: 'Arcane Spark',    gains: { magic: 4 } },
  { id: 'mystic_vigor',   name: 'Mystic Vigor',    gains: { mana: 6, magic: 2 } },
  { id: 'battle_scholar', name: 'Battle Scholar',  gains: { attack: 2, magic: 2 } },
  { id: 'sturdy_mage',    name: 'Sturdy Mage',     gains: { defense: 2, magic: 2 } },
  { id: 'guardian',       name: 'Guardian',        gains: { health: 8, defense: 3 } },
  { id: 'balanced',       name: 'Balanced Growth', gains: { health: 6, mana: 4, attack: 1, defense: 1, magic: 1 } },
  { id: 'tempered_steel', name: 'Tempered Steel',  gains: { attack: 2, defense: 2 } },
];

function pickThree(rngSeed) {
  const pool = [...ARCHETYPE_POOL];
  // Fisher-Yates, seeded-ish by rngSeed so the same level-up doesn't
  // reshuffle on every re-render.
  let rng = rngSeed || Math.random();
  for (let i = pool.length - 1; i > 0; i--) {
    rng = (rng * 9301 + 49297) % 233280;
    const j = Math.floor((rng / 233280) * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

function gainRows(g) {
  return [
    ['health', 'HP'],
    ['mana', 'MANA'],
    ['attack', 'DMG'],
    ['defense', 'DEF'],
    ['magic', 'MAG'],
  ]
    .filter(([key]) => g?.[key])
    .map(([key, label]) => ({ key, label, value: g[key] }));
}

export default function StatChoiceModal({
  queueRemaining,
  onChoose,
  rngSeed,
  busy,
}) {
  const options = useMemo(() => pickThree(rngSeed), [rngSeed]);

  return (
    <div className="modal-backdrop">
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal__header">
          <h3 className="modal__title">Level Up</h3>
          {queueRemaining > 1 && (
            <span className="modal__tab is-active" aria-label="pending levels">
              {queueRemaining} left
            </span>
          )}
        </div>
        <p className="statchoice__subtitle">
          Pick a path of growth.
        </p>
        <div className="statchoice__options">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className="statchoice__option"
              onClick={() => onChoose(opt.gains)}
              disabled={busy}
            >
              <span className="statchoice__option-name">{opt.name}</span>
              <span className="statchoice__option-gain">
                {gainRows(opt.gains).map((gain) => (
                  <span key={gain.key}>+{gain.value} {gain.label}</span>
                ))}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
