import { describe, it, expect } from 'vitest';
import {
  physicalDamage,
  magicDamage,
  healAmount,
  effectiveStat,
  clampHP,
  clampMana,
  moveCost,
  canAffordMove,
  tickBuffs,
  tickStatusDurations,
  tickStatuses,
  maybeApplyStatus,
  resolveMove,
  regenMana,
} from '../../client/src/game/battleLogic.js';

function hero(overrides = {}) {
  return {
    id: 'hero',
    name: 'Hero',
    stats: { health: 100, attack: 15, defense: 10, magic: 8, mana: 30 },
    currentHealth: 100,
    currentMana: 30,
    buffs: [],
    ...overrides,
  };
}

function monster(overrides = {}) {
  return {
    id: 'goblin',
    name: 'Goblin',
    stats: { health: 60, attack: 12, defense: 6, magic: 3 },
    currentHealth: 60,
    buffs: [],
    ...overrides,
  };
}

describe('battleLogic formulas', () => {
  it('physicalDamage uses floor(base * atk/10 - def) with minimum 1', () => {
    const move = { baseValue: 20 };
    const atk = hero({ stats: { health: 100, attack: 10, defense: 0, magic: 5, mana: 0 } });
    const def = monster({ stats: { health: 60, attack: 12, defense: 6, magic: 3 } });
    expect(physicalDamage(move, atk, def)).toBe(Math.max(1, Math.floor((20 * 10) / 10 - 6)));
  });

  it('physicalDamage respects buff multipliers', () => {
    const move = { baseValue: 10 };
    const atk = hero({
      stats: { health: 100, attack: 10, defense: 0, magic: 5, mana: 0 },
      buffs: [{ stat: 'attack', multiplier: 2, turnsRemaining: 2 }],
    });
    const def = monster();
    expect(physicalDamage(move, atk, def)).toBe(Math.max(1, Math.floor((10 * 20) / 10 - 6)));
  });

  it('magicDamage uses floor(base * mag/10) with minimum 1', () => {
    const move = { baseValue: 25 };
    const atk = hero({ stats: { health: 100, attack: 10, defense: 10, magic: 10, mana: 0 } });
    expect(magicDamage(move, atk)).toBe(25);
  });

  it('healAmount scales with magic', () => {
    const move = { baseValue: 30 };
    const caster = hero({ stats: { health: 100, attack: 10, defense: 10, magic: 20, mana: 0 } });
    expect(healAmount(move, caster)).toBe(60);
  });

  it('effectiveStat stacks multipliers for matching stat', () => {
    expect(effectiveStat(10, 'attack', [{ stat: 'attack', multiplier: 1.5 }, { stat: 'attack', multiplier: 2 }])).toBe(30);
  });
});

describe('battleLogic clamps and costs', () => {
  it('clampHP and clampMana bound to [0, max]', () => {
    expect(clampHP(150, 100)).toBe(100);
    expect(clampHP(-5, 100)).toBe(0);
    expect(clampMana(40, 30)).toBe(30);
  });

  it('moveCost reads optional cost fields', () => {
    expect(moveCost({})).toEqual({ mana: 0, health: 0 });
    expect(moveCost({ cost: { mana: 5, health: 3 } })).toEqual({ mana: 5, health: 3 });
  });

  it('canAffordMove rejects insufficient mana or lethal HP cost', () => {
    const m = { cost: { mana: 10, health: 0 } };
    expect(canAffordMove(m, hero({ currentMana: 9 }))).toBe(false);
    expect(canAffordMove(m, hero({ currentMana: 10 }))).toBe(true);
    const hpCost = { cost: { mana: 0, health: 50 } };
    expect(canAffordMove(hpCost, hero({ currentHealth: 50 }))).toBe(false);
    expect(canAffordMove(hpCost, hero({ currentHealth: 51 }))).toBe(true);
  });

  it('regenMana caps at max mana', () => {
    const h = hero({ currentMana: 28, stats: { health: 100, attack: 10, defense: 10, magic: 10, mana: 30 } });
    const next = regenMana(h, 5);
    expect(next.currentMana).toBe(30);
  });
});

describe('battleLogic ticks and status', () => {
  it('tickBuffs removes expired buffs', () => {
    const c = hero({
      buffs: [
        { stat: 'attack', multiplier: 1.5, turnsRemaining: 1 },
        { stat: 'defense', multiplier: 1.2, turnsRemaining: 2 },
      ],
    });
    const next = tickBuffs(c);
    expect(next.buffs).toHaveLength(1);
    expect(next.buffs[0].stat).toBe('defense');
  });

  it('tickStatusDurations removes expired statuses', () => {
    const c = hero({
      statuses: [{ kind: 'poison', damage: 2, turnsRemaining: 1 }],
    });
    const next = tickStatusDurations(c);
    expect(next.statuses).toHaveLength(0);
  });

  it('tickStatuses applies damage per status and can flag kill', () => {
    const c = hero({
      currentHealth: 3,
      statuses: [
        { kind: 'bleed', damage: 2, turnsRemaining: 2 },
        { kind: 'burn', damage: 2, turnsRemaining: 2 },
      ],
    });
    const log = [];
    const { combatant, killed } = tickStatuses(c, 'hero', log);
    expect(killed).toBe(true);
    expect(combatant.currentHealth).toBe(0);
    expect(log.length).toBeGreaterThan(0);
  });

  it('maybeApplyStatus respects rng and chance', () => {
    const move = { statusEffect: { kind: 'poison', chance: 0.5, damage: 4, turns: 2 } };
    const attacker = { id: 'm', name: 'M' };
    const target = monster({ statuses: [] });
    const log = [];
    const events = [];
    const miss = maybeApplyStatus(move, attacker, target, log, events, () => 0.9);
    expect(miss.statuses ?? []).toHaveLength(0);
    const hit = maybeApplyStatus(move, attacker, target, log, events, () => 0.1);
    expect(hit.statuses).toHaveLength(1);
    expect(hit.statuses[0].kind).toBe('poison');
  });
});

describe('battleLogic resolveMove', () => {
  it('applies physical damage and optional status when rng allows', () => {
    const slash = { id: 'slash', name: 'Slash', type: 'physical', baseValue: 20 };
    const h = hero({ currentHealth: 100 });
    const m = monster({ currentHealth: 60 });
    const log = [];
    const { defender } = resolveMove(slash, h, m, log, () => 0);
    expect(defender.currentHealth).toBe(60 - physicalDamage(slash, h, m));
    expect(log.some((l) => l.includes('Slash'))).toBe(true);
  });

  it('magic with lifesteal heals attacker', () => {
    const drain = {
      id: 'drain',
      name: 'Drain',
      type: 'magic',
      baseValue: 10,
      effect: { lifesteal: 0.5 },
    };
    const h = hero({ currentHealth: 50 });
    const m = monster();
    const log = [];
    const { attacker, defender } = resolveMove(drain, h, m, log, () => 1);
    const dmg = magicDamage(drain, h);
    expect(defender.currentHealth).toBe(m.currentHealth - dmg);
    expect(attacker.currentHealth).toBe(50 + Math.floor(dmg * 0.5));
  });

  it('debuff adds entry to defender buffs list', () => {
    const curse = {
      id: 'curse',
      name: 'Curse',
      type: 'debuff',
      baseValue: 0,
      effect: { stat: 'attack', multiplier: 0.8, turns: 2 },
    };
    const h = hero();
    const m = monster({ buffs: [] });
    const log = [];
    const { defender } = resolveMove(curse, h, m, log, () => 1);
    expect(defender.buffs).toHaveLength(1);
    expect(defender.buffs[0].stat).toBe('attack');
  });
});
