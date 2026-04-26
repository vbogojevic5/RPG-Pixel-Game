/**
 * BattleState model — represents the shape of the payload sent
 * to GET /battle/monster-move as a base64-encoded JSON string.
 *
 * Expected fields:
 *   monsterId: string
 *   monsterStats: { health, attack, defense, magic }
 *   monsterBuffs: Array<{ stat, multiplier, turnsRemaining }>
 *   heroStats:    { health, attack, defense, magic }
 *   heroBuffs:    Array<{ stat, multiplier, turnsRemaining }>
 *   availableMoves: string[]
 */
export default class BattleState {}
