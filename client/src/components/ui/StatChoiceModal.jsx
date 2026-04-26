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
  { id: 'stout_heart',    name: 'Stout Heart',    desc: 'Hardy constitution.',      gains: { health: 16 } },
  { id: 'warriors_vigor', name: "Warrior's Vigor", desc: 'Lean, mean, tougher.',    gains: { health: 10, attack: 2 } },
  { id: 'iron_fist',      name: 'Iron Fist',      desc: 'Sharper, heavier blows.',  gains: { attack: 4 } },
  { id: 'bulwark',        name: 'Bulwark',        desc: 'Shields and plate.',       gains: { defense: 4 } },
  { id: 'arcane_spark',   name: 'Arcane Spark',   desc: 'Magic flows freely.',      gains: { magic: 4 } },
  { id: 'battle_scholar', name: 'Battle Scholar', desc: 'Hybrid study.',            gains: { attack: 2, magic: 2 } },
  { id: 'sturdy_mage',    name: 'Sturdy Mage',    desc: 'Scholar of wards.',        gains: { defense: 2, magic: 2 } },
  { id: 'guardian',       name: 'Guardian',       desc: 'Resolute protector.',      gains: { health: 8, defense: 3 } },
  { id: 'balanced',       name: 'Balanced Growth', desc: 'A little of everything.', gains: { health: 6, attack: 1, defense: 1, magic: 1 } },
  { id: 'tempered_steel', name: 'Tempered Steel', desc: 'Offense meets defense.',   gains: { attack: 2, defense: 2 } },
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

function formatGains(g) {
  const parts = [];
  if (g.health)  parts.push(`+${g.health} HP`);
  if (g.attack)  parts.push(`+${g.attack} ATK`);
  if (g.defense) parts.push(`+${g.defense} DEF`);
  if (g.magic)   parts.push(`+${g.magic} MAG`);
  return parts.join(' · ');
}

export default function StatChoiceModal({
  levelNumber,
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
          <h3 className="modal__title">Level Up! → Lv {levelNumber}</h3>
          {queueRemaining > 1 && (
            <span className="modal__tab is-active" aria-label="pending levels">
              {queueRemaining} left
            </span>
          )}
        </div>
        <p className="statchoice__subtitle">Pick a path of growth.</p>
        <div className="statchoice__options">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className="statchoice__option"
              onClick={() => onChoose(opt.gains)}
              disabled={busy}
            >
              <span>
                <span className="statchoice__option-name">{opt.name}</span>
                <span className="statchoice__option-desc">{opt.desc}</span>
              </span>
              <span className="statchoice__option-gain">{formatGains(opt.gains)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
