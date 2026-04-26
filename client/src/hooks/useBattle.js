import { useCallback, useMemo, useState } from 'react';
import { getMonsterMove } from '../services/api.js';

/**
 * Turn-by-turn battle state + logic.
 *
 * A "turn" here is:
 *   1. DoT tick on the hero (bleed/poison/burn).
 *   2. Hero acts — maybe applies a new status on hit.
 *   3. KO check on monster.
 *   4. DoT tick on the monster.
 *   5. Server returns monster move, monster acts.
 *   6. KO check on hero.
 *   7. End of round: tick buff/debuff turn counters and status turn counters.
 *
 * Status effects live on the target as:
 *   { kind: 'bleed'|'poison'|'burn', damage: n, turnsRemaining: n }
 *
 * HP updates are written directly back to state; the UI re-renders with
 * the new numbers. No animations in Phase 1.
 */

function effectiveStat(base, stat, buffs) {
  let value = base;
  for (const b of buffs) {
    if (b.stat === stat) value *= b.multiplier;
  }
  return value;
}

function physicalDamage(move, attacker, defender) {
  const atk = effectiveStat(attacker.stats.attack, 'attack', attacker.buffs);
  const def = effectiveStat(defender.stats.defense, 'defense', defender.buffs);
  return Math.max(1, Math.floor((move.baseValue * atk) / 10 - def));
}

function magicDamage(move, attacker) {
  const mag = effectiveStat(attacker.stats.magic, 'magic', attacker.buffs);
  return Math.max(1, Math.floor((move.baseValue * mag) / 10));
}

function healAmount(move, caster) {
  const mag = effectiveStat(caster.stats.magic, 'magic', caster.buffs);
  return Math.floor((move.baseValue * mag) / 10);
}

function clampHP(value, max) {
  return Math.max(0, Math.min(max, value));
}

const STATUS_LABEL = {
  bleed: 'bleeding',
  poison: 'poisoned',
  burn: 'burning',
};

/**
 * Attempt to apply a move's status effect to `target`. Rolls the
 * configured chance; if it hits, the status is appended. Refreshes
 * duration if the same status is already active (instead of stacking).
 */
function maybeApplyStatus(move, attacker, target, turnLog) {
  const se = move.statusEffect;
  if (!se || !se.kind) return target;
  const chance = typeof se.chance === 'number' ? se.chance : 1;
  if (Math.random() > chance) return target;

  const next = { ...target, statuses: [...(target.statuses ?? [])] };
  const existingIdx = next.statuses.findIndex((s) => s.kind === se.kind);
  const entry = {
    kind: se.kind,
    damage: se.damage ?? 3,
    turnsRemaining: se.turns ?? 2,
    source: attacker.id,
  };
  if (existingIdx >= 0) {
    next.statuses[existingIdx] = entry; // refresh
    turnLog.push(`${target.name}'s ${STATUS_LABEL[se.kind] ?? se.kind} is refreshed.`);
  } else {
    next.statuses.push(entry);
    turnLog.push(`${target.name} is now ${STATUS_LABEL[se.kind] ?? se.kind}!`);
  }
  return next;
}

/**
 * Apply all active statuses as tick damage to `combatant`. Returns the
 * updated combatant and a kill flag so callers can short-circuit on KO.
 */
function tickStatuses(combatant, turnLog) {
  if (!combatant.statuses || combatant.statuses.length === 0) {
    return { combatant, killed: false };
  }
  let hp = combatant.currentHealth;
  for (const s of combatant.statuses) {
    if (hp <= 0) break;
    const damage = Math.max(1, s.damage ?? 1);
    hp = Math.max(0, hp - damage);
    const verb =
      s.kind === 'bleed' ? 'bleeds' :
      s.kind === 'poison' ? 'suffers from poison' :
      s.kind === 'burn' ? 'burns' :
      s.kind;
    turnLog.push(`${combatant.name} ${verb} — ${damage} damage.`);
  }
  return {
    combatant: { ...combatant, currentHealth: hp },
    killed: hp <= 0,
  };
}

/**
 * Decrement every buff's turnsRemaining and drop expired ones.
 * Called once at the end of each full round.
 */
function tickBuffs(combatant) {
  const next = (combatant.buffs ?? [])
    .map((b) => ({ ...b, turnsRemaining: b.turnsRemaining - 1 }))
    .filter((b) => b.turnsRemaining > 0);
  return { ...combatant, buffs: next };
}

/** Same idea for statuses — tick duration counters at end of round. */
function tickStatusDurations(combatant) {
  const next = (combatant.statuses ?? [])
    .map((s) => ({ ...s, turnsRemaining: s.turnsRemaining - 1 }))
    .filter((s) => s.turnsRemaining > 0);
  return { ...combatant, statuses: next };
}

/**
 * Resolve one move from `attacker` onto `defender` and return updated
 * combatant states + a log entry describing what happened.
 */
function resolveMove(move, attacker, defender, turnLog) {
  let nextAttacker = { ...attacker };
  let nextDefender = { ...defender };

  switch (move.type) {
    case 'physical': {
      const dmg = physicalDamage(move, attacker, defender);
      nextDefender = {
        ...defender,
        currentHealth: clampHP(defender.currentHealth - dmg, defender.stats.health),
      };
      turnLog.push(`${attacker.name} used ${move.name} — ${dmg} damage.`);
      nextDefender = maybeApplyStatus(move, attacker, nextDefender, turnLog);
      break;
    }
    case 'magic': {
      const dmg = magicDamage(move, attacker);
      nextDefender = {
        ...defender,
        currentHealth: clampHP(defender.currentHealth - dmg, defender.stats.health),
      };
      turnLog.push(`${attacker.name} cast ${move.name} — ${dmg} magic damage.`);
      if (move.effect?.lifesteal) {
        const healed = Math.floor(dmg * move.effect.lifesteal);
        nextAttacker = {
          ...nextAttacker,
          currentHealth: clampHP(
            nextAttacker.currentHealth + healed,
            nextAttacker.stats.health
          ),
        };
        turnLog.push(`${attacker.name} drained ${healed} HP.`);
      }
      nextDefender = maybeApplyStatus(move, attacker, nextDefender, turnLog);
      break;
    }
    case 'heal': {
      const heal = healAmount(move, attacker);
      nextAttacker = {
        ...nextAttacker,
        currentHealth: clampHP(
          attacker.currentHealth + heal,
          attacker.stats.health
        ),
      };
      turnLog.push(`${attacker.name} used ${move.name} — restored ${heal} HP.`);
      break;
    }
    case 'buff': {
      const eff = move.effect;
      const newBuff = {
        stat: eff.stat,
        multiplier: eff.multiplier,
        turnsRemaining: eff.turns,
      };
      nextAttacker = {
        ...nextAttacker,
        buffs: [...nextAttacker.buffs, newBuff],
      };
      turnLog.push(
        `${attacker.name} used ${move.name} — ${eff.stat} ${
          eff.multiplier > 1 ? 'raised' : 'lowered'
        } for ${eff.turns} turns.`
      );
      if (eff.selfDamage) {
        nextAttacker = {
          ...nextAttacker,
          currentHealth: clampHP(
            nextAttacker.currentHealth - eff.selfDamage,
            nextAttacker.stats.health
          ),
        };
        turnLog.push(`${attacker.name} paid ${eff.selfDamage} HP as cost.`);
      }
      break;
    }
    case 'debuff': {
      const eff = move.effect;
      const newDebuff = {
        stat: eff.stat,
        multiplier: eff.multiplier,
        turnsRemaining: eff.turns,
      };
      nextDefender = {
        ...nextDefender,
        buffs: [...nextDefender.buffs, newDebuff],
      };
      turnLog.push(
        `${attacker.name} used ${move.name} — ${defender.name}'s ${eff.stat} lowered for ${eff.turns} turns.`
      );
      break;
    }
    default:
      turnLog.push(`${attacker.name} used ${move.name}.`);
  }

  return { attacker: nextAttacker, defender: nextDefender };
}

export default function useBattle({ hero, monster, moves }) {
  // Local battle-scoped state: HP, buffs, statuses, log, lifecycle flags.
  const [heroState, setHeroState] = useState(() => {
    const stats = hero.stats ?? hero.baseStats;
    return {
      id: hero.id,
      name: hero.name,
      stats,
      currentHealth: hero.currentHealth ?? stats.health,
      buffs: [],
      statuses: [],
      equippedMoves: hero.equippedMoves ?? hero.defaultMoves ?? [],
    };
  });

  const [monsterState, setMonsterState] = useState(() => ({
    id: monster.id,
    name: monster.name,
    stats: monster.stats,
    currentHealth: monster.stats.health,
    buffs: [],
    statuses: [],
    availableMoves: monster.moves,
  }));

  const [log, setLog] = useState([`A wild ${monster.name} appears!`]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [outcome, setOutcome] = useState(null); // null | 'victory' | 'defeat'

  const isOver = outcome !== null;

  const playTurn = useCallback(
    async (moveId) => {
      if (isProcessing || isOver) return;
      const heroMove = moves[moveId];
      if (!heroMove) return;

      setIsProcessing(true);
      try {
        const turnLog = [];
        let nextHero = heroState;
        let nextMonster = monsterState;

        // --- 1. Hero start-of-turn: DoTs ---
        {
          const { combatant, killed } = tickStatuses(nextHero, turnLog);
          nextHero = combatant;
          if (killed) {
            turnLog.push(`${nextHero.name} was defeated!`);
            setHeroState(nextHero);
            setLog((prev) => [...prev, ...turnLog]);
            setOutcome('defeat');
            return;
          }
        }

        // --- 2. Hero acts ---
        {
          const result = resolveMove(heroMove, nextHero, nextMonster, turnLog);
          nextHero = result.attacker;
          nextMonster = result.defender;
        }

        // --- 3. Monster KO? ---
        if (nextMonster.currentHealth <= 0) {
          turnLog.push(`${nextMonster.name} was defeated!`);
          setHeroState(nextHero);
          setMonsterState(nextMonster);
          setLog((prev) => [...prev, ...turnLog]);
          setOutcome('victory');
          return;
        }

        // --- 4. Monster start-of-turn: DoTs ---
        {
          const { combatant, killed } = tickStatuses(nextMonster, turnLog);
          nextMonster = combatant;
          if (killed) {
            turnLog.push(`${nextMonster.name} was defeated!`);
            setHeroState(nextHero);
            setMonsterState(nextMonster);
            setLog((prev) => [...prev, ...turnLog]);
            setOutcome('victory');
            return;
          }
        }

        // --- 5. Ask server for the monster's move ---
        const battleState = {
          monsterId: nextMonster.id,
          monsterStats: nextMonster.stats,
          monsterBuffs: nextMonster.buffs,
          heroStats: nextHero.stats,
          heroBuffs: nextHero.buffs,
          availableMoves: nextMonster.availableMoves,
        };
        const { move: monsterMoveId } = await getMonsterMove(battleState);
        const monsterMove = moves[monsterMoveId];
        if (!monsterMove) {
          throw new Error(`Unknown monster move: ${monsterMoveId}`);
        }

        // --- 6. Monster acts ---
        {
          const result = resolveMove(monsterMove, nextMonster, nextHero, turnLog);
          nextMonster = result.attacker;
          nextHero = result.defender;
        }

        // --- 7. Hero KO? ---
        if (nextHero.currentHealth <= 0) {
          turnLog.push(`${nextHero.name} was defeated!`);
          setHeroState(nextHero);
          setMonsterState(nextMonster);
          setLog((prev) => [...prev, ...turnLog]);
          setOutcome('defeat');
          return;
        }

        // --- 8. End of round: tick buff + status timers ---
        nextHero = tickStatusDurations(tickBuffs(nextHero));
        nextMonster = tickStatusDurations(tickBuffs(nextMonster));

        setHeroState(nextHero);
        setMonsterState(nextMonster);
        setLog((prev) => [...prev, ...turnLog]);
      } catch (err) {
        setLog((prev) => [...prev, `Error: ${err.message}`]);
      } finally {
        setIsProcessing(false);
      }
    },
    [heroState, monsterState, isProcessing, isOver, moves]
  );

  const equippedMoveObjects = useMemo(
    () => heroState.equippedMoves.map((id) => moves[id]).filter(Boolean),
    [heroState.equippedMoves, moves]
  );

  return {
    heroState,
    monsterState,
    equippedMoves: equippedMoveObjects,
    log,
    isProcessing,
    outcome,
    isOver,
    playTurn,
  };
}
