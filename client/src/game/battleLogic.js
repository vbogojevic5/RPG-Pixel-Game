/** Pure combat resolution (used by useBattle + root tests). */

export function effectiveStat(base, stat, buffs) {
  let value = base;
  for (const b of buffs ?? []) {
    if (b.stat === stat) value *= b.multiplier;
  }
  return value;
}

export function physicalDamage(move, attacker, defender) {
  const atk = effectiveStat(attacker.stats.attack, 'attack', attacker.buffs);
  const def = effectiveStat(defender.stats.defense, 'defense', defender.buffs);
  return Math.max(1, Math.floor((move.baseValue * atk) / 10 - def));
}

export function magicDamage(move, attacker) {
  const mag = effectiveStat(attacker.stats.magic, 'magic', attacker.buffs);
  return Math.max(1, Math.floor((move.baseValue * mag) / 10));
}

export function healAmount(move, caster) {
  const mag = effectiveStat(caster.stats.magic, 'magic', caster.buffs);
  return Math.floor((move.baseValue * mag) / 10);
}

export function clampHP(value, max) {
  return Math.max(0, Math.min(max, value));
}

export function clampMana(value, max) {
  return Math.max(0, Math.min(max ?? 0, value));
}

export function moveCost(move) {
  return {
    mana: Math.max(0, move.cost?.mana ?? 0),
    health: Math.max(0, move.cost?.health ?? 0),
  };
}

export function canAffordMove(move, combatant) {
  const cost = moveCost(move);
  if (typeof combatant.currentMana === 'number' && cost.mana > combatant.currentMana) {
    return false;
  }
  if (cost.health > 0 && cost.health >= combatant.currentHealth) {
    return false;
  }
  return true;
}

export function spendMoveCost(move, combatant, turnLog, events) {
  const cost = moveCost(move);
  if (cost.mana <= 0 && cost.health <= 0) return combatant;

  let next = { ...combatant };
  if (typeof next.currentMana === 'number' && cost.mana > 0) {
    next.currentMana = clampMana(next.currentMana - cost.mana, next.stats.mana);
    turnLog.push(`${next.name} spent ${cost.mana} MANA.`);
    events.push({ role: 'attacker', kind: 'mana', text: `-${cost.mana} MANA` });
  }
  if (cost.health > 0) {
    next.currentHealth = clampHP(next.currentHealth - cost.health, next.stats.health);
    turnLog.push(`${next.name} spent ${cost.health} HP.`);
    events.push({ role: 'attacker', kind: 'damage', text: `-${cost.health}` });
  }
  return next;
}

export function regenMana(combatant, amount) {
  if (!Number.isFinite(amount) || amount <= 0 || typeof combatant.currentMana !== 'number') {
    return combatant;
  }
  return {
    ...combatant,
    currentMana: clampMana(combatant.currentMana + amount, combatant.stats.mana),
  };
}

export function removeInventoryItem(inventory, itemId) {
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
 * @param {() => number} rng Returns value in [0, 1), defaults to Math.random
 */
export function maybeApplyStatus(move, attacker, target, turnLog, events, rng = Math.random) {
  const se = move.statusEffect;
  if (!se || !se.kind) return target;
  const chance = typeof se.chance === 'number' ? se.chance : 1;
  if (rng() > chance) return target;

  const next = { ...target, statuses: [...(target.statuses ?? [])] };
  const existingIdx = next.statuses.findIndex((s) => s.kind === se.kind);
  const entry = {
    kind: se.kind,
    damage: se.damage ?? 3,
    turnsRemaining: se.turns ?? 2,
    source: attacker.id,
  };
  if (existingIdx >= 0) {
    next.statuses[existingIdx] = entry;
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

export function tickStatuses(combatant, side, turnLog) {
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

export function tickBuffs(combatant) {
  const next = (combatant.buffs ?? [])
    .map((b) => ({ ...b, turnsRemaining: b.turnsRemaining - 1 }))
    .filter((b) => b.turnsRemaining > 0);
  return { ...combatant, buffs: next };
}

export function tickStatusDurations(combatant) {
  const next = (combatant.statuses ?? [])
    .map((s) => ({ ...s, turnsRemaining: s.turnsRemaining - 1 }))
    .filter((s) => s.turnsRemaining > 0);
  return { ...combatant, statuses: next };
}

export function resolveMove(move, attacker, defender, turnLog, rng = Math.random) {
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
      nextDefender = maybeApplyStatus(move, attacker, nextDefender, turnLog, events, rng);
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
      nextDefender = maybeApplyStatus(move, attacker, nextDefender, turnLog, events, rng);
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
        buffs: [...(nextAttacker.buffs ?? []), newBuff],
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
        buffs: [...(nextDefender.buffs ?? []), newDebuff],
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

export function resolveItem(item, user, target, turnLog) {
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
      turnLog.push(`${user.name} used ${item.name} — restored ${amount} MANA.`);
      events.push({ role: 'attacker', kind: 'mana', text: `+${amount} MANA` });
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
