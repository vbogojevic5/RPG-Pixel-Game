/**
 * Monster AI.
 *
 * Phase 4: weighted tactical choice. Monsters still have randomness, but
 * their weights now react to HP, buffs, debuffs, statuses, and monster role.
 */
export function pickMonsterMove(state, movesById = {}) {
  const pool = Array.isArray(state.availableMoves) ? state.availableMoves : [];
  if (pool.length === 0) {
    throw new Error('No available moves for monster');
  }

  const candidates = pool
    .map((id) => ({ id, move: movesById[id] }))
    .filter((candidate) => candidate.move);

  if (candidates.length === 0) {
    return randomFrom(pool);
  }

  const scored = candidates.map((candidate) => ({
    id: candidate.id,
    weight: scoreMove(candidate.move, state),
  }));

  return weightedRandom(scored);
}

function scoreMove(move, state) {
  const monsterHpPct = hpPct(state.monsterCurrentHealth, state.monsterStats);
  const heroHpPct = hpPct(state.heroCurrentHealth, state.heroStats);
  const monsterBuffs = Array.isArray(state.monsterBuffs) ? state.monsterBuffs : [];
  const heroBuffs = Array.isArray(state.heroBuffs) ? state.heroBuffs : [];
  const heroStatuses = Array.isArray(state.heroStatuses) ? state.heroStatuses : [];

  let score = 10 + Math.random() * 5;

  if (isDamageMove(move)) {
    score += Math.min(18, move.baseValue / 2);
    if (heroHpPct <= 0.3) score += 28;
    if (heroHpPct <= 0.18) score += 18;
    if (move.type === 'magic' && effectiveStat(state.heroStats, 'defense', heroBuffs) >= 12) {
      score += 12;
    }
  }

  if (move.type === 'heal' || move.effect?.lifesteal) {
    score += monsterHpPct <= 0.35 ? 42 : -12;
    if (monsterHpPct <= 0.2) score += 28;
  }

  if (move.type === 'buff' && move.effect?.target === 'self') {
    const alreadyActive = hasStatModifier(monsterBuffs, move.effect.stat, move.effect.multiplier);
    score += alreadyActive ? -24 : 18;
    if (monsterHpPct <= 0.25 && move.effect.stat !== 'defense') score -= 10;
    if (move.effect.stat === 'defense' && monsterHpPct <= 0.45) score += 10;
    if (move.effect.stat === 'attack' || move.effect.stat === 'magic') score += heroHpPct > 0.45 ? 6 : -5;
  }

  if (move.type === 'debuff' || move.effect?.target === 'enemy') {
    const alreadyActive = hasStatModifier(heroBuffs, move.effect?.stat, move.effect?.multiplier);
    score += alreadyActive ? -20 : 16;
    if (heroHpPct <= 0.25) score -= 8;
  }

  if (move.statusEffect?.kind) {
    const alreadyActive = heroStatuses.some((s) => s.kind === move.statusEffect.kind);
    score += alreadyActive ? -18 : 14;
    if (heroHpPct > 0.55) score += 8;
  }

  score += monsterPersonalityBonus(state.monsterId, move);

  return Math.max(1, score);
}

function hpPct(currentHealth, stats) {
  const max = Number(stats?.health) || 1;
  const current = typeof currentHealth === 'number' ? currentHealth : max;
  return Math.max(0, Math.min(1, current / max));
}

function effectiveStat(stats, stat, buffs) {
  let value = Number(stats?.[stat]) || 0;
  for (const buff of buffs) {
    if (buff.stat === stat) value *= buff.multiplier;
  }
  return value;
}

function hasStatModifier(buffs, stat, multiplier) {
  if (!stat || typeof multiplier !== 'number') return false;
  return buffs.some((buff) => buff.stat === stat && buff.multiplier === multiplier);
}

function isDamageMove(move) {
  return move.type === 'physical' || move.type === 'magic';
}

function monsterPersonalityBonus(monsterId, move) {
  switch (monsterId) {
    case 'goblin_warrior':
      return move.type === 'physical' ? 7 : 0;
    case 'giant_spider':
      return move.statusEffect || move.effect?.stat === 'defense' ? 9 : 0;
    case 'goblin_mage':
      return move.type === 'magic' || move.effect?.stat === 'magic' ? 9 : 0;
    case 'witch':
      return move.effect?.lifesteal || move.type === 'debuff' || move.statusEffect ? 10 : 0;
    case 'dragon':
      return move.type === 'magic' || move.effect?.stat === 'defense' ? 11 : 0;
    default:
      return 0;
  }
}

function weightedRandom(scored) {
  const total = scored.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of scored) {
    roll -= item.weight;
    if (roll <= 0) return item.id;
  }
  return scored[scored.length - 1].id;
}

function randomFrom(items) {
  return items[Math.floor(Math.random() * items.length)];
}
