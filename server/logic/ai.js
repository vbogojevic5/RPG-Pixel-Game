/**
 * Monster AI.
 *
 * Phase 1: pure random choice from the monster's available moves.
 * Phase 3 bonus: add smarter logic (heal when low HP, debuff when hero
 * has high stats, etc.) — keep random as the fallback.
 */
export function pickMonsterMove(state) {
  const pool = Array.isArray(state.availableMoves) ? state.availableMoves : [];
  if (pool.length === 0) {
    throw new Error('No available moves for monster');
  }
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}
