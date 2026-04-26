import { pickMonsterMove } from '../logic/ai.js';

/**
 * GET /battle/monster-move?state=<base64-json>
 *
 * The `state` query param is a base64-encoded JSON blob describing the
 * current battle state. `validateBattleState` middleware decodes it and
 * attaches the parsed object to `req.battleState`.
 *
 * Returns: { move: <moveId> }
 */
export function getMonsterMove(req, res) {
  const state = req.battleState;
  const move = pickMonsterMove(state);
  res.json({ move });
}
