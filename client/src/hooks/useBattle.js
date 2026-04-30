import { useCallback, useMemo, useState } from 'react';
import { getMonsterMove } from '../services/api.js';

const ACTION_MS = 420;
const TICK_MS = 260;
const MONSTER_THINK_MS = 1200;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

function clampMana(value, max) {
  return Math.max(0, Math.min(max ?? 0, value));
}

function moveCost(move) {
  return {
    mana: Math.max(0, move.cost?.mana ?? 0),
    health: Math.max(0, move.cost?.health ?? 0),
  };
}

function canAffordMove(move, combatant) {
  const cost = moveCost(move);
  if (typeof combatant.currentMana === 'number' && cost.mana > combatant.currentMana) {
    return false;
  }
  if (cost.health > 0 && cost.health >= combatant.currentHealth) {
    return false;
  }
  return true;
}

function spendMoveCost(move, combatant, turnLog, events) {
  const cost = moveCost(move);
  if (cost.mana <= 0 && cost.health <= 0) return combatant;

  let next = { ...combatant };
  if (typeof next.currentMana === 'number' && cost.mana > 0) {
    next.currentMana = clampMana(next.currentMana - cost.mana, next.stats.mana);
    turnLog.push(`${next.name} spent ${cost.mana} MP.`);
    events.push({ role: 'attacker', kind: 'mana', text: `-${cost.mana} MP` });
  }
  if (cost.health > 0) {
    next.currentHealth = clampHP(next.currentHealth - cost.health, next.stats.health);
    turnLog.push(`${next.name} spent ${cost.health} HP.`);
    events.push({ role: 'attacker', kind: 'damage', text: `-${cost.health}` });
  }
  return next;
}

function regenMana(combatant, amount) {
  if (!Number.isFinite(amount) || amount <= 0 || typeof combatant.currentMana !== 'number') {
    return combatant;
  }
  return {
    ...combatant,
    currentMana: clampMana(combatant.currentMana + amount, combatant.stats.mana),
  };
}

function removeInventoryItem(inventory, itemId) {
  const next = [...(inventory ?? [])];
  const index = next.findIndex((entry) => entry.itemId === itemId);
  if (index < 0) return next;
  const entry = next[index];
  if (entry.quantity > 1) {
    next[index] = { ...entry, quantity: entry.quantity - 1 };
  } else {
    next.splice(index, 1);
  }
  return next;
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
function maybeApplyStatus(move, attacker, target, turnLog, events) {
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
  events.push({
    role: 'defender',
    kind: se.kind,
    text: STATUS_LABEL[se.kind] ?? se.kind,
  });
  return next;
}

/**
 * Apply all active statuses as tick damage to `combatant`. Returns the
 * updated combatant and a kill flag so callers can short-circuit on KO.
 */
function tickStatuses(combatant, side, turnLog) {
  if (!combatant.statuses || combatant.statuses.length === 0) {
    return { combatant, killed: false, events: [] };
  }
  let hp = combatant.currentHealth;
  const events = [];
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
    events.push({ side, kind: s.kind, text: `-${damage}` });
  }
  return {
    combatant: { ...combatant, currentHealth: hp },
    killed: hp <= 0,
    events,
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
  const events = [];

  nextAttacker = spendMoveCost(move, nextAttacker, turnLog, events);

  switch (move.type) {
    case 'physical': {
      const dmg = physicalDamage(move, attacker, defender);
      nextDefender = {
        ...defender,
        currentHealth: clampHP(defender.currentHealth - dmg, defender.stats.health),
      };
      turnLog.push(`${attacker.name} used ${move.name} — ${dmg} damage.`);
      events.push({ role: 'defender', kind: 'damage', text: `-${dmg}` });
      nextDefender = maybeApplyStatus(move, attacker, nextDefender, turnLog, events);
      break;
    }
    case 'magic': {
      const dmg = magicDamage(move, attacker);
      nextDefender = {
        ...defender,
        currentHealth: clampHP(defender.currentHealth - dmg, defender.stats.health),
      };
      turnLog.push(`${attacker.name} cast ${move.name} — ${dmg} magic damage.`);
      events.push({ role: 'defender', kind: 'magic', text: `-${dmg}` });
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
        events.push({ role: 'attacker', kind: 'heal', text: `+${healed}` });
      }
      nextDefender = maybeApplyStatus(move, attacker, nextDefender, turnLog, events);
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
      events.push({ role: 'attacker', kind: 'heal', text: `+${heal}` });
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
      events.push({
        role: 'attacker',
        kind: 'buff',
        text: `${eff.stat.toUpperCase()}${eff.multiplier > 1 ? '↑' : '↓'}`,
      });
      if (eff.selfDamage && !move.cost?.health) {
        nextAttacker = {
          ...nextAttacker,
          currentHealth: clampHP(
            nextAttacker.currentHealth - eff.selfDamage,
            nextAttacker.stats.health
          ),
        };
        turnLog.push(`${attacker.name} paid ${eff.selfDamage} HP as cost.`);
        events.push({ role: 'attacker', kind: 'damage', text: `-${eff.selfDamage}` });
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
      events.push({ role: 'defender', kind: 'debuff', text: `${eff.stat.toUpperCase()}↓` });
      break;
    }
    default:
      turnLog.push(`${attacker.name} used ${move.name}.`);
  }

  return { attacker: nextAttacker, defender: nextDefender, events };
}

function resolveItem(item, user, target, turnLog) {
  let nextUser = { ...user, inventory: removeInventoryItem(user.inventory, item.id) };
  let nextTarget = { ...target };
  const events = [];
  const effect = item.effect ?? {};

  switch (effect.kind) {
    case 'heal': {
      const amount = Math.max(0, effect.amount ?? 0);
      nextUser.currentHealth = clampHP(nextUser.currentHealth + amount, nextUser.stats.health);
      turnLog.push(`${user.name} used ${item.name} — restored ${amount} HP.`);
      events.push({ role: 'attacker', kind: 'heal', text: `+${amount}` });
      break;
    }
    case 'restoreMana': {
      const amount = Math.max(0, effect.amount ?? 0);
      nextUser.currentMana = clampMana((nextUser.currentMana ?? 0) + amount, nextUser.stats.mana);
      turnLog.push(`${user.name} used ${item.name} — restored ${amount} MP.`);
      events.push({ role: 'attacker', kind: 'mana', text: `+${amount} MP` });
      break;
    }
    case 'cleanseStatuses': {
      const removed = nextUser.statuses?.length ?? 0;
      nextUser.statuses = [];
      turnLog.push(`${user.name} used ${item.name} — cleansed ${removed} status effect${removed === 1 ? '' : 's'}.`);
      events.push({ role: 'attacker', kind: 'heal', text: 'Cleanse' });
      break;
    }
    case 'temporaryBuff': {
      const buff = {
        stat: effect.stat,
        multiplier: effect.multiplier ?? 1,
        turnsRemaining: effect.turns ?? 2,
      };
      nextUser.buffs = [...(nextUser.buffs ?? []), buff];
      turnLog.push(`${user.name} used ${item.name} — ${effect.stat} raised for ${buff.turnsRemaining} turns.`);
      events.push({ role: 'attacker', kind: 'buff', text: `${effect.stat.toUpperCase()}↑` });
      break;
    }
    case 'directDamage': {
      const amount = Math.max(1, effect.amount ?? 1);
      nextTarget.currentHealth = clampHP(nextTarget.currentHealth - amount, nextTarget.stats.health);
      turnLog.push(`${user.name} used ${item.name} — ${amount} damage.`);
      events.push({ role: 'defender', kind: 'damage', text: `-${amount}` });
      break;
    }
    default:
      turnLog.push(`${user.name} used ${item.name}.`);
  }

  return { user: nextUser, target: nextTarget, events };
}

export default function useBattle({ hero, monster, moves, items, constants }) {
  // Local battle-scoped state: HP, buffs, statuses, log, lifecycle flags.
  const [heroState, setHeroState] = useState(() => {
    const stats = hero.stats ?? hero.baseStats;
    return {
      id: hero.id,
      name: hero.name,
      stats,
      currentHealth: stats.health,
      currentMana: stats.mana ?? 0,
      buffs: [],
      statuses: [],
      equippedMoves: hero.equippedMoves ?? hero.defaultMoves ?? [],
      inventory: hero.inventory ?? [],
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
  const [animation, setAnimation] = useState(null);
  const [floaters, setFloaters] = useState([]);
  const [currentTurn, setCurrentTurn] = useState('hero');

  const isOver = outcome !== null;

  const showFloaters = useCallback((events, attackerSide, defenderSide) => {
    if (!events || events.length === 0) return;
    const now = Date.now();
    const next = events.map((event, index) => ({
      id: `${now}-${index}-${event.text}`,
      side: event.side ?? (event.role === 'attacker' ? attackerSide : defenderSide),
      kind: event.kind,
      text: event.text,
    }));
    setFloaters((prev) => [...prev, ...next].slice(-10));
    for (const floater of next) {
      setTimeout(() => {
        setFloaters((prev) => prev.filter((item) => item.id !== floater.id));
      }, 950);
    }
  }, []);

  const playTurn = useCallback(
    async (moveId) => {
      if (isProcessing || isOver) return;
      const heroMove = moves[moveId];
      if (!heroMove) return;
      if (!canAffordMove(heroMove, heroState)) {
        setLog((prev) => [...prev, `${heroState.name} does not have enough resources for ${heroMove.name}.`]);
        return;
      }

      setIsProcessing(true);
      try {
        let nextHero = heroState;
        let nextMonster = monsterState;

        // --- 1. Hero start-of-turn: DoTs ---
        {
          const turnLog = [];
          const { combatant, killed, events } = tickStatuses(nextHero, 'hero', turnLog);
          nextHero = combatant;
          if (events.length > 0) {
            setHeroState(nextHero);
            setLog((prev) => [...prev, ...turnLog]);
            showFloaters(events);
            await sleep(TICK_MS);
          }
          if (killed) {
            setHeroState(nextHero);
            setLog((prev) => [...prev, `${nextHero.name} was defeated!`]);
            setOutcome('defeat');
            return;
          }
        }

        // --- 2. Hero acts ---
        {
          const turnLog = [];
          setAnimation({ actor: 'hero', target: 'monster', type: heroMove.type, id: Date.now() });
          setCurrentTurn('hero');
          const result = resolveMove(heroMove, nextHero, nextMonster, turnLog);
          nextHero = result.attacker;
          nextMonster = result.defender;
          setHeroState(nextHero);
          setMonsterState(nextMonster);
          setLog((prev) => [...prev, ...turnLog]);
          showFloaters(result.events, 'hero', 'monster');
          await sleep(ACTION_MS);
          setAnimation(null);
        }

        // --- 3. Monster KO? ---
        if (nextMonster.currentHealth <= 0) {
          const turnLog = [`${nextMonster.name} was defeated!`];
          setHeroState(nextHero);
          setMonsterState(nextMonster);
          setLog((prev) => [...prev, ...turnLog]);
          setOutcome('victory');
          return;
        }

        // --- 4. Monster start-of-turn: DoTs ---
        {
          const turnLog = [];
          const { combatant, killed, events } = tickStatuses(nextMonster, 'monster', turnLog);
          nextMonster = combatant;
          if (events.length > 0) {
            setMonsterState(nextMonster);
            setLog((prev) => [...prev, ...turnLog]);
            showFloaters(events);
            await sleep(TICK_MS);
          }
          if (killed) {
            setHeroState(nextHero);
            setMonsterState(nextMonster);
            setLog((prev) => [...prev, `${nextMonster.name} was defeated!`]);
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
          heroCurrentHealth: nextHero.currentHealth,
          heroCurrentMana: nextHero.currentMana,
          heroStatuses: nextHero.statuses,
          monsterCurrentHealth: nextMonster.currentHealth,
          monsterStatuses: nextMonster.statuses,
          availableMoves: nextMonster.availableMoves,
        };
        const { move: monsterMoveId } = await getMonsterMove(battleState);
        const monsterMove = moves[monsterMoveId];
        if (!monsterMove) {
          throw new Error(`Unknown monster move: ${monsterMoveId}`);
        }

        setCurrentTurn('monster');
        await sleep(MONSTER_THINK_MS);

        // --- 6. Monster acts ---
        {
          const turnLog = [];
          setAnimation({ actor: 'monster', target: 'hero', type: monsterMove.type, id: Date.now() });
          const result = resolveMove(monsterMove, nextMonster, nextHero, turnLog);
          nextMonster = result.attacker;
          nextHero = result.defender;
          setHeroState(nextHero);
          setMonsterState(nextMonster);
          setLog((prev) => [...prev, ...turnLog]);
          showFloaters(result.events, 'monster', 'hero');
          await sleep(ACTION_MS);
          setAnimation(null);
        }

        // --- 7. Hero KO? ---
        if (nextHero.currentHealth <= 0) {
          const turnLog = [`${nextHero.name} was defeated!`];
          setHeroState(nextHero);
          setMonsterState(nextMonster);
          setLog((prev) => [...prev, ...turnLog]);
          setOutcome('defeat');
          return;
        }

        // --- 8. End of round: tick buff + status timers ---
        nextHero = tickStatusDurations(tickBuffs(nextHero));
        nextHero = regenMana(nextHero, constants?.MANA_REGEN_PER_TURN ?? 0);
        nextMonster = tickStatusDurations(tickBuffs(nextMonster));

        setHeroState(nextHero);
        setMonsterState(nextMonster);
        setCurrentTurn('hero');
      } catch (err) {
        setLog((prev) => [...prev, `Error: ${err.message}`]);
      } finally {
        setAnimation(null);
        if (!isOver) setCurrentTurn('hero');
        setIsProcessing(false);
      }
    },
    [heroState, monsterState, isProcessing, isOver, moves, showFloaters, constants]
  );

  const useItemTurn = useCallback(
    async (itemId) => {
      if (isProcessing || isOver) return;
      const item = items?.[itemId];
      if (!item || item.category !== 'consumable') return;
      if (!(heroState.inventory ?? []).some((entry) => entry.itemId === itemId && entry.quantity > 0)) return;

      setIsProcessing(true);
      try {
        let nextHero = heroState;
        let nextMonster = monsterState;

        // Hero start-of-turn statuses still tick before using an item.
        {
          const turnLog = [];
          const { combatant, killed, events } = tickStatuses(nextHero, 'hero', turnLog);
          nextHero = combatant;
          if (events.length > 0) {
            setHeroState(nextHero);
            setLog((prev) => [...prev, ...turnLog]);
            showFloaters(events);
            await sleep(TICK_MS);
          }
          if (killed) {
            setHeroState(nextHero);
            setLog((prev) => [...prev, `${nextHero.name} was defeated!`]);
            setOutcome('defeat');
            return;
          }
        }

        // Item use is the hero action for this round.
        {
          const turnLog = [];
          setAnimation({ actor: 'hero', target: item.effect?.kind === 'directDamage' ? 'monster' : 'hero', type: 'item', id: Date.now() });
          setCurrentTurn('hero');
          const result = resolveItem(item, nextHero, nextMonster, turnLog);
          nextHero = result.user;
          nextMonster = result.target;
          setHeroState(nextHero);
          setMonsterState(nextMonster);
          setLog((prev) => [...prev, ...turnLog]);
          showFloaters(result.events, 'hero', item.effect?.kind === 'directDamage' ? 'monster' : 'hero');
          await sleep(ACTION_MS);
          setAnimation(null);
        }

        if (nextMonster.currentHealth <= 0) {
          setHeroState(nextHero);
          setMonsterState(nextMonster);
          setLog((prev) => [...prev, `${nextMonster.name} was defeated!`]);
          setOutcome('victory');
          return;
        }

        // Monster start-of-turn statuses.
        {
          const turnLog = [];
          const { combatant, killed, events } = tickStatuses(nextMonster, 'monster', turnLog);
          nextMonster = combatant;
          if (events.length > 0) {
            setMonsterState(nextMonster);
            setLog((prev) => [...prev, ...turnLog]);
            showFloaters(events);
            await sleep(TICK_MS);
          }
          if (killed) {
            setHeroState(nextHero);
            setMonsterState(nextMonster);
            setLog((prev) => [...prev, `${nextMonster.name} was defeated!`]);
            setOutcome('victory');
            return;
          }
        }

        const battleState = {
          monsterId: nextMonster.id,
          monsterStats: nextMonster.stats,
          monsterBuffs: nextMonster.buffs,
          heroStats: nextHero.stats,
          heroBuffs: nextHero.buffs,
          heroCurrentHealth: nextHero.currentHealth,
          heroCurrentMana: nextHero.currentMana,
          heroStatuses: nextHero.statuses,
          monsterCurrentHealth: nextMonster.currentHealth,
          monsterStatuses: nextMonster.statuses,
          availableMoves: nextMonster.availableMoves,
        };
        const { move: monsterMoveId } = await getMonsterMove(battleState);
        const monsterMove = moves[monsterMoveId];
        if (!monsterMove) throw new Error(`Unknown monster move: ${monsterMoveId}`);

        setCurrentTurn('monster');
        await sleep(MONSTER_THINK_MS);

        {
          const turnLog = [];
          setAnimation({ actor: 'monster', target: 'hero', type: monsterMove.type, id: Date.now() });
          const result = resolveMove(monsterMove, nextMonster, nextHero, turnLog);
          nextMonster = result.attacker;
          nextHero = result.defender;
          setHeroState(nextHero);
          setMonsterState(nextMonster);
          setLog((prev) => [...prev, ...turnLog]);
          showFloaters(result.events, 'monster', 'hero');
          await sleep(ACTION_MS);
          setAnimation(null);
        }

        if (nextHero.currentHealth <= 0) {
          setHeroState(nextHero);
          setMonsterState(nextMonster);
          setLog((prev) => [...prev, `${nextHero.name} was defeated!`]);
          setOutcome('defeat');
          return;
        }

        nextHero = tickStatusDurations(tickBuffs(nextHero));
        nextHero = regenMana(nextHero, constants?.MANA_REGEN_PER_TURN ?? 0);
        nextMonster = tickStatusDurations(tickBuffs(nextMonster));

        setHeroState(nextHero);
        setMonsterState(nextMonster);
        setCurrentTurn('hero');
      } catch (err) {
        setLog((prev) => [...prev, `Error: ${err.message}`]);
      } finally {
        setAnimation(null);
        if (!isOver) setCurrentTurn('hero');
        setIsProcessing(false);
      }
    },
    [heroState, monsterState, isProcessing, isOver, items, moves, showFloaters, constants]
  );

  const equippedMoveObjects = useMemo(
    () => heroState.equippedMoves.map((id) => moves[id]).filter(Boolean),
    [heroState.equippedMoves, moves]
  );

  const battleItems = useMemo(
    () => (heroState.inventory ?? [])
      .map((entry) => ({ ...items?.[entry.itemId], quantity: entry.quantity }))
      .filter((item) => item.id && item.category === 'consumable'),
    [heroState.inventory, items]
  );

  const canAfford = useCallback(
    (move) => canAffordMove(move, heroState),
    [heroState]
  );

  return {
    heroState,
    monsterState,
    equippedMoves: equippedMoveObjects,
    battleItems,
    log,
    animation,
    floaters,
    currentTurn,
    isProcessing,
    outcome,
    isOver,
    playTurn,
    useItemTurn,
    canAfford,
  };
}
