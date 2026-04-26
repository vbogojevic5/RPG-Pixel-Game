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

function buildFreshHero(config) {
  if (!config) return null;
  return {
    id: config.hero.id,
    name: config.hero.name,
    sprite: config.hero.sprite ?? null,
    baseStats: { ...config.hero.baseStats },
    stats: { ...config.hero.baseStats },
    currentHealth: config.hero.baseStats.health,
    equippedMoves: [...config.hero.defaultMoves],
    knownMoves: [...config.hero.defaultMoves],
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

function applyLevelUp(hero, gains) {
  const nextStats = {
    health: hero.stats.health + (gains.health ?? 0),
    attack: hero.stats.attack + (gains.attack ?? 0),
    defense: hero.stats.defense + (gains.defense ?? 0),
    magic: hero.stats.magic + (gains.magic ?? 0),
  };
  return {
    ...hero,
    level: hero.level + 1,
    stats: nextStats,
    // Heal the +health delta so it immediately benefits the hero.
    currentHealth: Math.min(nextStats.health, hero.currentHealth + (gains.health ?? 0)),
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

export default function useGameState() {
  const [hero, setHero] = useState(null);
  const [constants, setConstants] = useState(null);
  const [defeatedMonsterIds, setDefeatedMonsterIds] = useState([]);
  const [runStats, setRunStats] = useState({ battlesFought: 0, battlesWon: 0, battlesLost: 0 });

  const startRun = useCallback((config) => {
    setHero(buildFreshHero(config));
    setConstants(config.constants ?? null);
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
    setHero({
      id: incoming.id ?? config.hero.id,
      name: incoming.name ?? config.hero.name,
      sprite: incoming.sprite ?? config.hero.sprite ?? null,
      baseStats: incoming.baseStats ?? { ...config.hero.baseStats },
      stats: incoming.stats ?? { ...config.hero.baseStats },
      currentHealth:
        typeof incoming.currentHealth === 'number'
          ? incoming.currentHealth
          : (incoming.stats ?? config.hero.baseStats).health,
      equippedMoves: Array.isArray(incoming.equippedMoves) && incoming.equippedMoves.length > 0
        ? [...incoming.equippedMoves]
        : [...config.hero.defaultMoves],
      knownMoves: Array.isArray(incoming.knownMoves) && incoming.knownMoves.length > 0
        ? [...incoming.knownMoves]
        : [...config.hero.defaultMoves],
      xp: Number.isFinite(incoming.xp) ? incoming.xp : 0,
      level: Number.isFinite(incoming.level) ? incoming.level : 1,
    });
    setConstants(config.constants ?? null);
    setDefeatedMonsterIds(Array.isArray(save.defeatedMonsterIds) ? [...save.defeatedMonsterIds] : []);
    setRunStats(save.runStats ?? { battlesFought: 0, battlesWon: 0, battlesLost: 0 });
  }, []);

  const endRun = useCallback(() => {
    setHero(null);
    setConstants(null);
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
          name: hero.name,
          sprite: hero.sprite,
          baseStats: hero.baseStats,
          stats: hero.stats,
          currentHealth: hero.currentHealth,
          equippedMoves: hero.equippedMoves,
          knownMoves: hero.knownMoves,
          xp: hero.xp,
          level: hero.level,
        },
        defeatedMonsterIds,
        runStats,
        lastScreen: null,
      };
    },
    [hero, defeatedMonsterIds, runStats]
  );

  const fullHealHero = useCallback(() => {
    setHero((h) => (h ? { ...h, currentHealth: h.stats.health } : h));
  }, []);

  const updateEquippedMoves = useCallback((nextEquipped) => {
    setHero((h) => (h ? { ...h, equippedMoves: [...nextEquipped] } : h));
  }, []);

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
        xp: hero.xp + xpGained,
        currentHealth:
          payload.outcome === 'victory'
            ? Math.max(1, payload.heroEndHealth)
            : Math.max(0, payload.heroEndHealth),
      };

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
    [hero, constants]
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
      const next = applyLevelUp(h, gains);
      newLevel = next.level;
      return next;
    });
    return newLevel;
  }, []);

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
    snapshotForSave,
  };
}
