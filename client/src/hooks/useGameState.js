import { useCallback, useMemo, useState } from 'react';

/**
 * Tracks hero state across a full run (Phase 2).
 *
 * Fields owned by this hook:
 *   - hero               Current hero snapshot (live HP, stats, equipped & known moves)
 *   - defeatedMonsterIds List of monsters already beaten in this run
 *   - runStats           Aggregate stats for the Victory screen (battles fought, won, lost)
 *
 * Progression rules live here so screens and battle logic can stay dumb:
 *   - onBattleEnd(payload) — single entry point after a fight resolves.
 *     Applies XP, HP survival, defeat flag, learned move, and level-ups.
 *   - Level up uses constants pulled from the server config (single
 *     source of truth so the Game Designer can retune without a client
 *     rebuild).
 */

function selectedHeroConfig(config, heroClassId) {
  return config?.heroClasses?.[heroClassId] ?? config?.hero ?? null;
}

function emptyEquippedItems(constants) {
  const equipped = {};
  for (const slot of constants?.EQUIPMENT_SLOTS ?? ['weapon', 'armor', 'accessory']) {
    equipped[slot] = null;
  }
  equipped.relics = [];
  return equipped;
}

function itemById(items, id) {
  return items?.[id] ?? null;
}

function applyItemStatModifiers(baseStats, equippedItems, items) {
  const next = { ...baseStats };
  const equippedIds = [
    ...Object.entries(equippedItems ?? {})
      .filter(([slot]) => slot !== 'relics')
      .map(([, id]) => id)
      .filter(Boolean),
    ...(equippedItems?.relics ?? []),
  ];

  for (const id of equippedIds) {
    const item = itemById(items, id);
    for (const [stat, value] of Object.entries(item?.statModifiers ?? {})) {
      next[stat] = (next[stat] ?? 0) + value;
    }
  }
  return next;
}

function buildFreshHero(config, heroClassId) {
  if (!config) return null;
  const classConfig = selectedHeroConfig(config, heroClassId);
  if (!classConfig) return null;
  const baseStats = { ...classConfig.baseStats };
  const equippedItems = emptyEquippedItems(config.constants);
  return {
    id: classConfig.id,
    heroClassId: classConfig.id,
    name: classConfig.name,
    sprite: classConfig.sprite ?? null,
    baseStats,
    stats: applyItemStatModifiers(baseStats, equippedItems, config.items),
    currentHealth: baseStats.health,
    currentMana: baseStats.mana ?? 0,
    equippedMoves: [...classConfig.defaultMoves],
    knownMoves: [...classConfig.defaultMoves],
    coins: 0,
    inventory: [],
    equippedItems,
    visitedMerchantIds: [],
    levelUpGrowth: classConfig.levelUpGrowth ?? null,
    xp: 0,
    level: 1,
  };
}

function xpThresholdFor(level, thresholds) {
  // thresholds[0] is for level 1 (0 xp required to be level 1)
  // threshold[level] is the total XP needed to reach level (level + 1)
  if (!Array.isArray(thresholds) || thresholds.length === 0) {
    // Fallback curve: 100, 250, 450, 700, 1000, +300 each thereafter
    const fallback = [0, 100, 250, 450, 700, 1000];
    return fallback[level] ?? 1000 + (level - 5) * 300;
  }
  return thresholds[level] ?? thresholds[thresholds.length - 1] + (level - (thresholds.length - 1)) * 300;
}

function combineGains(choiceGains, classGrowth) {
  const next = {};
  for (const key of ['health', 'mana', 'attack', 'defense', 'magic']) {
    next[key] = (choiceGains?.[key] ?? 0) + (classGrowth?.[key] ?? 0);
  }
  return next;
}

function applyLevelUp(hero, gains, items) {
  const nextBaseStats = {
    health: hero.baseStats.health + (gains.health ?? 0),
    mana: (hero.baseStats.mana ?? 0) + (gains.mana ?? 0),
    attack: hero.baseStats.attack + (gains.attack ?? 0),
    defense: hero.baseStats.defense + (gains.defense ?? 0),
    magic: hero.baseStats.magic + (gains.magic ?? 0),
  };
  const nextStats = applyItemStatModifiers(nextBaseStats, hero.equippedItems, items);
  return {
    ...hero,
    level: hero.level + 1,
    baseStats: nextBaseStats,
    stats: nextStats,
    // Heal the +health delta so it immediately benefits the hero.
    currentHealth: Math.min(nextStats.health, hero.currentHealth + (gains.health ?? 0)),
    currentMana: Math.min(nextStats.mana ?? 0, (hero.currentMana ?? hero.stats.mana ?? 0) + (gains.mana ?? 0)),
  };
}

/**
 * Count how many times the hero would level up if we ran the XP loop
 * on `startXp` at `startLevel`, using the given thresholds.
 */
function countLevelUps(startXp, startLevel, thresholds) {
  let level = startLevel;
  let xp = startXp;
  let count = 0;
  while (xp >= xpThresholdFor(level, thresholds)) {
    level += 1;
    count += 1;
    if (count > 50) break; // sanity guard against broken thresholds
  }
  return count;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function inventorySlotCount(inventory) {
  return (inventory ?? []).length;
}

function addInventoryItem(inventory, itemId, items, maxSlots) {
  const item = itemById(items, itemId);
  if (!item) return { inventory, added: false, reason: 'unknown' };
  const maxStack = Math.max(1, item.maxStack ?? 1);
  const next = [...(inventory ?? [])];
  if (maxStack > 1) {
    const stackIndex = next.findIndex((entry) => entry.itemId === itemId && entry.quantity < maxStack);
    if (stackIndex >= 0) {
      next[stackIndex] = { ...next[stackIndex], quantity: next[stackIndex].quantity + 1 };
      return { inventory: next, added: true };
    }
  }
  if (inventorySlotCount(next) >= maxSlots) {
    return { inventory, added: false, reason: 'full' };
  }
  next.push({ itemId, quantity: 1 });
  return { inventory: next, added: true };
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

function equippedItemIds(equippedItems) {
  return [
    ...Object.entries(equippedItems ?? {})
      .filter(([slot]) => slot !== 'relics')
      .map(([, id]) => id)
      .filter(Boolean),
    ...(equippedItems?.relics ?? []),
  ];
}

function coinMultiplier(hero, items) {
  return equippedItemIds(hero.equippedItems).reduce((multiplier, id) => {
    const item = itemById(items, id);
    return item?.passive?.kind === 'coinMultiplier'
      ? multiplier * (item.passive.multiplier ?? 1)
      : multiplier;
  }, 1);
}

function withRecalculatedItemStats(hero, nextEquippedItems, items) {
  const nextStats = applyItemStatModifiers(hero.baseStats, nextEquippedItems, items);
  return {
    ...hero,
    equippedItems: nextEquippedItems,
    stats: nextStats,
    currentHealth: Math.min(hero.currentHealth, nextStats.health),
    currentMana: Math.min(hero.currentMana ?? 0, nextStats.mana ?? 0),
  };
}

export default function useGameState() {
  const [hero, setHero] = useState(null);
  const [constants, setConstants] = useState(null);
  const [items, setItems] = useState(null);
  const [dropTables, setDropTables] = useState(null);
  const [defeatedMonsterIds, setDefeatedMonsterIds] = useState([]);
  const [runStats, setRunStats] = useState({ battlesFought: 0, battlesWon: 0, battlesLost: 0 });

  const startRun = useCallback((config, heroClassId) => {
    setHero(buildFreshHero(config, heroClassId));
    setConstants(config.constants ?? null);
    setItems(config.items ?? null);
    setDropTables(config.dropTables ?? null);
    setDefeatedMonsterIds([]);
    setRunStats({ battlesFought: 0, battlesWon: 0, battlesLost: 0 });
  }, []);

  /**
   * Load an existing run from a persisted save.
   * Uses the live `config` so constants stay up-to-date even if the
   * Game Designer has rebalanced since the save was written.
   */
  const loadRun = useCallback((save, config) => {
    if (!save || !config) return;
    const incoming = save.heroState ?? {};
    const classConfig = selectedHeroConfig(config, incoming.heroClassId ?? incoming.id);
    const equippedItems = incoming.equippedItems ?? emptyEquippedItems(config.constants);
    const baseStats = incoming.baseStats ?? { ...(classConfig?.baseStats ?? config.hero.baseStats) };
    const stats = applyItemStatModifiers(baseStats, equippedItems, config.items);
    setHero({
      id: incoming.id ?? classConfig?.id ?? config.hero.id,
      heroClassId: incoming.heroClassId ?? classConfig?.id ?? incoming.id ?? config.hero.id,
      name: incoming.name ?? classConfig?.name ?? config.hero.name,
      sprite: incoming.sprite ?? classConfig?.sprite ?? config.hero.sprite ?? null,
      baseStats,
      stats,
      currentHealth:
        typeof incoming.currentHealth === 'number'
          ? incoming.currentHealth
          : stats.health,
      currentMana:
        typeof incoming.currentMana === 'number'
          ? incoming.currentMana
          : stats.mana ?? 0,
      equippedMoves: Array.isArray(incoming.equippedMoves) && incoming.equippedMoves.length > 0
        ? [...incoming.equippedMoves]
        : [...(classConfig?.defaultMoves ?? config.hero.defaultMoves)],
      knownMoves: Array.isArray(incoming.knownMoves) && incoming.knownMoves.length > 0
        ? [...incoming.knownMoves]
        : [...(classConfig?.defaultMoves ?? config.hero.defaultMoves)],
      coins: Number.isFinite(incoming.coins) ? incoming.coins : 0,
      inventory: Array.isArray(incoming.inventory) ? [...incoming.inventory] : [],
      equippedItems,
      visitedMerchantIds: Array.isArray(incoming.visitedMerchantIds) ? [...incoming.visitedMerchantIds] : [],
      levelUpGrowth: incoming.levelUpGrowth ?? classConfig?.levelUpGrowth ?? null,
      xp: Number.isFinite(incoming.xp) ? incoming.xp : 0,
      level: Number.isFinite(incoming.level) ? incoming.level : 1,
    });
    setConstants(config.constants ?? null);
    setItems(config.items ?? null);
    setDropTables(config.dropTables ?? null);
    setDefeatedMonsterIds(Array.isArray(save.defeatedMonsterIds) ? [...save.defeatedMonsterIds] : []);
    setRunStats(save.runStats ?? { battlesFought: 0, battlesWon: 0, battlesLost: 0 });
  }, []);

  const endRun = useCallback(() => {
    setHero(null);
    setConstants(null);
    setItems(null);
    setDropTables(null);
    setDefeatedMonsterIds([]);
    setRunStats({ battlesFought: 0, battlesWon: 0, battlesLost: 0 });
  }, []);

  /** Snapshot shaped for POST /saves and PUT /saves/:id. */
  const snapshotForSave = useCallback(
    (name) => {
      if (!hero) return null;
      return {
        name,
        heroState: {
          id: hero.id,
          heroClassId: hero.heroClassId ?? hero.id,
          name: hero.name,
          sprite: hero.sprite,
          baseStats: hero.baseStats,
          stats: hero.stats,
          currentHealth: hero.currentHealth,
          currentMana: hero.currentMana ?? hero.stats.mana ?? 0,
          equippedMoves: hero.equippedMoves,
          knownMoves: hero.knownMoves,
          coins: hero.coins ?? 0,
          inventory: hero.inventory ?? [],
          equippedItems: hero.equippedItems ?? emptyEquippedItems(constants),
          visitedMerchantIds: hero.visitedMerchantIds ?? [],
          levelUpGrowth: hero.levelUpGrowth ?? null,
          xp: hero.xp,
          level: hero.level,
        },
        defeatedMonsterIds,
        runStats,
        lastScreen: null,
      };
    },
    [hero, constants, defeatedMonsterIds, runStats]
  );

  const fullHealHero = useCallback(() => {
    setHero((h) => (h ? { ...h, currentHealth: h.stats.health, currentMana: h.stats.mana ?? 0 } : h));
  }, []);

  const updateEquippedMoves = useCallback((nextEquipped) => {
    setHero((h) => (h ? { ...h, equippedMoves: [...nextEquipped] } : h));
  }, []);

  const addItemToInventory = useCallback((itemId) => {
    let result = { added: false };
    setHero((h) => {
      if (!h) return h;
      result = addInventoryItem(h.inventory, itemId, items, constants?.MAX_INVENTORY_SLOTS ?? 8);
      return result.added ? { ...h, inventory: result.inventory } : h;
    });
    return result;
  }, [constants, items]);

  const buyItem = useCallback((itemId, price) => {
    let result = { ok: false, reason: 'unknown' };
    setHero((h) => {
      if (!h) return h;
      if ((h.coins ?? 0) < price) {
        result = { ok: false, reason: 'coins' };
        return h;
      }
      const added = addInventoryItem(h.inventory, itemId, items, constants?.MAX_INVENTORY_SLOTS ?? 8);
      if (!added.added) {
        result = { ok: false, reason: added.reason ?? 'inventory' };
        return h;
      }
      result = { ok: true };
      return { ...h, coins: h.coins - price, inventory: added.inventory };
    });
    return result;
  }, [constants, items]);

  const equipItem = useCallback((itemId) => {
    let result = { ok: false, reason: 'unknown' };
    setHero((h) => {
      if (!h) return h;
      const item = itemById(items, itemId);
      if (!item || !['equipment', 'relic'].includes(item.category)) {
        result = { ok: false, reason: 'type' };
        return h;
      }
      if (!(h.inventory ?? []).some((entry) => entry.itemId === itemId && entry.quantity > 0)) {
        result = { ok: false, reason: 'inventory' };
        return h;
      }

      let inventory = removeInventoryItem(h.inventory, itemId);
      const equippedItems = { ...(h.equippedItems ?? emptyEquippedItems(constants)) };
      if (item.category === 'equipment') {
        const slot = item.slot;
        const previous = equippedItems[slot];
        if (previous) inventory = addInventoryItem(inventory, previous, items, constants?.MAX_INVENTORY_SLOTS ?? 8).inventory;
        equippedItems[slot] = itemId;
      } else {
        const maxRelics = constants?.MAX_RELIC_SLOTS ?? 3;
        const relics = [...(equippedItems.relics ?? [])];
        if (relics.length >= maxRelics) {
          const previous = relics.shift();
          if (previous) inventory = addInventoryItem(inventory, previous, items, constants?.MAX_INVENTORY_SLOTS ?? 8).inventory;
        }
        relics.push(itemId);
        equippedItems.relics = relics;
      }

      result = { ok: true };
      return { ...withRecalculatedItemStats(h, equippedItems, items), inventory };
    });
    return result;
  }, [constants, items]);

  const unequipItem = useCallback((slotOrRelicId) => {
    let result = { ok: false, reason: 'unknown' };
    setHero((h) => {
      if (!h) return h;
      const equippedItems = { ...(h.equippedItems ?? emptyEquippedItems(constants)) };
      let itemId = equippedItems[slotOrRelicId];
      if (!itemId && (equippedItems.relics ?? []).includes(slotOrRelicId)) {
        itemId = slotOrRelicId;
        equippedItems.relics = equippedItems.relics.filter((id) => id !== slotOrRelicId);
      } else if (itemId) {
        equippedItems[slotOrRelicId] = null;
      }
      if (!itemId) return h;
      const added = addInventoryItem(h.inventory, itemId, items, constants?.MAX_INVENTORY_SLOTS ?? 8);
      if (!added.added) {
        result = { ok: false, reason: added.reason ?? 'inventory' };
        return h;
      }
      result = { ok: true };
      return { ...withRecalculatedItemStats(h, equippedItems, items), inventory: added.inventory };
    });
    return result;
  }, [constants, items]);

  /**
   * Apply the outcome of a battle to hero state.
   *
   * payload: {
   *   outcome: 'victory' | 'defeat',
   *   monsterId: string,
   *   heroEndHealth: number,     // HP hero had when fight ended
   *   xpReward: number,          // from monster config; loss-gets-half handled here
   *   monsterMoves: string[],    // pool to roll a learned move from (win only)
   * }
   *
   * Returns a summary object the PostBattle screen can display:
   *   { xpGained, leveledUp, newLevel, learnedMove, alreadyKnown }
   *
   * Compute-then-apply pattern: all decisions (RNG, level-up loop) happen
   * once up-front, then setState receives a pure, deterministic update.
   * This keeps React StrictMode's double-invocation safe.
   */
  const applyBattleOutcome = useCallback(
    (payload) => {
      const summary = {
        xpGained: 0,
        leveledUp: false,
        newLevel: null,
        statGains: null,
        learnedMove: null,
        alreadyKnown: false,
        coinsGained: 0,
        itemDrop: null,
        itemDropAdded: false,
        itemDropReason: null,
      };

      if (!hero) return summary;

      // --- XP award (win = full, lose = half) ---
      const baseXp = payload.xpReward ?? 0;
      const xpGained = payload.outcome === 'victory'
        ? baseXp
        : Math.floor(baseXp / 2);
      summary.xpGained = xpGained;

      let next = {
        ...hero,
        inventory: Array.isArray(payload.heroEndInventory)
          ? payload.heroEndInventory
          : hero.inventory,
        xp: hero.xp + xpGained,
        // Each encounter starts fresh; HP does not carry between battles.
        currentHealth: hero.stats.health,
        currentMana: hero.stats.mana ?? 0,
      };

      // --- Currency and item drops (victory only; replays included) ---
      if (payload.outcome === 'victory') {
        const table = dropTables?.[payload.monsterId];
        if (table?.coins) {
          const rawCoins = randomInt(table.coins.min ?? 0, table.coins.max ?? 0);
          const gained = Math.floor(rawCoins * coinMultiplier(next, items));
          summary.coinsGained = gained;
          next = { ...next, coins: (next.coins ?? 0) + gained };
        }

        const chance = Math.max(0, Math.min(1, table?.itemChance ?? 0));
        if (Array.isArray(table?.itemPool) && table.itemPool.length > 0 && Math.random() < chance) {
          const itemId = table.itemPool[Math.floor(Math.random() * table.itemPool.length)];
          const result = addInventoryItem(
            next.inventory,
            itemId,
            items,
            constants?.MAX_INVENTORY_SLOTS ?? 8
          );
          summary.itemDrop = itemId;
          summary.itemDropAdded = result.added;
          summary.itemDropReason = result.reason ?? null;
          next = { ...next, inventory: result.inventory };
        }
      }

      // --- Level up: do NOT auto-apply gains. Queue them so the player
      //     can pick a stat boost per level-up (Phase 3 feature). ---
      const thresholds = constants?.XP_LEVEL_THRESHOLDS;
      const pendingLevelUps = countLevelUps(next.xp, next.level, thresholds);
      if (pendingLevelUps > 0) {
        summary.leveledUp = true;
        summary.pendingLevelUps = pendingLevelUps;
      } else {
        summary.pendingLevelUps = 0;
      }

      // --- Learn a move on victory (if it's not already known) ---
      if (
        payload.outcome === 'victory' &&
        Array.isArray(payload.monsterMoves) &&
        payload.monsterMoves.length > 0
      ) {
        const pool = payload.monsterMoves.filter(
          (id) => !next.knownMoves.includes(id)
        );
        if (pool.length > 0) {
          const picked = pool[Math.floor(Math.random() * pool.length)];
          summary.learnedMove = picked;
          next = { ...next, knownMoves: [...next.knownMoves, picked] };
        } else {
          summary.alreadyKnown = true;
          summary.learnedMove = payload.monsterMoves[
            Math.floor(Math.random() * payload.monsterMoves.length)
          ];
        }
      }

      setHero(next);
      setRunStats((s) => ({
        battlesFought: s.battlesFought + 1,
        battlesWon: s.battlesWon + (payload.outcome === 'victory' ? 1 : 0),
        battlesLost: s.battlesLost + (payload.outcome === 'defeat' ? 1 : 0),
      }));
      if (payload.outcome === 'victory') {
        setDefeatedMonsterIds((list) =>
          list.includes(payload.monsterId) ? list : [...list, payload.monsterId]
        );
      }

      return summary;
    },
    [hero, constants, dropTables, items]
  );

  const xpThreshold = useMemo(() => {
    if (!hero) return null;
    return xpThresholdFor(hero.level, constants?.XP_LEVEL_THRESHOLDS);
  }, [hero, constants]);

  /**
   * Apply a stat-choice level-up pick. Drains one pending level-up and
   * increases the chosen stats. Returns the new level so the UI can
   * show "You are now Lv X".
   */
  const applyLevelUpChoice = useCallback((gains) => {
    let newLevel = null;
    setHero((h) => {
      if (!h) return h;
      const next = applyLevelUp(h, combineGains(gains, h.levelUpGrowth), items);
      newLevel = next.level;
      return next;
    });
    return newLevel;
  }, [items]);

  return {
    hero,
    defeatedMonsterIds,
    runStats,
    xpThreshold,
    startRun,
    loadRun,
    endRun,
    fullHealHero,
    updateEquippedMoves,
    applyBattleOutcome,
    applyLevelUpChoice,
    addItemToInventory,
    buyItem,
    equipItem,
    unequipItem,
    snapshotForSave,
  };
}
