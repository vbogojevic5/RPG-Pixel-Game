/**
 * Pure combat math used client-side.
 *
 * The client is the authoritative simulator for a single turn — the server
 * only decides which move the monster plays. Keeping these helpers here on
 * the server too lets us reuse them later (e.g. for a server-authoritative
 * rewrite or integration tests).
 *
 * Currently unused by the Phase 1 server; the client re-implements the
 * formulas (see client/src/hooks/useBattle.js). Keep the two in sync.
 */

export function physicalDamage(baseValue, attack, defense) {
  return Math.max(1, Math.floor((baseValue * attack) / 10 - defense));
}

export function magicDamage(baseValue, magic) {
  return Math.max(1, Math.floor((baseValue * magic) / 10));
}

export function healAmount(baseValue, magic) {
  return Math.floor((baseValue * magic) / 10);
}
