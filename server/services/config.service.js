/**
 * Config service — reads the complete game configuration from the DB
 * and returns it in the shape the existing client already expects
 * (same contract as the old config.js exports).
 *
 * This is the only place the Prisma config models are unpacked. Routes,
 * middleware and AI can all pretend they are still reading a flat JS
 * object.
 */
import { prisma } from '../db.js';

/** Ensure MAP_CONFIG from DB is a plain object the client can use (Prisma Json + legacy rows). */
function normalizeMapConfig(raw) {
  const empty = { version: 1, nodes: [], startNodeIds: [], bossNodeId: null };
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return empty;
  const nodes = Array.isArray(raw.nodes)
    ? raw.nodes.map((n) => ({
        ...n,
        children: Array.isArray(n.children) ? [...n.children] : [],
      }))
    : [];
  return {
    ...empty,
    ...raw,
    version: raw.version ?? 1,
    size: raw.size ?? undefined,
    startNodeIds: Array.isArray(raw.startNodeIds) ? [...raw.startNodeIds] : [],
    bossNodeId: raw.bossNodeId ?? null,
    nodes,
  };
}

function normalizeMoveEffects(move) {
  const effects = [];

  if (move.statusEffect?.kind) {
    effects.push({
      kind: 'status',
      target: 'enemy',
      timing: 'onHit',
      status: move.statusEffect.kind,
      chance: move.statusEffect.chance ?? 1,
      damage: move.statusEffect.damage ?? 3,
      turns: move.statusEffect.turns ?? 2,
      scalesWith: move.statusEffect.scalesWith ?? null,
    });
  }

  if (move.effect?.stat) {
    const multiplier = move.effect.multiplier ?? 1;
    effects.push({
      kind: 'statModifier',
      mode: multiplier >= 1 ? 'buff' : 'debuff',
      target: move.effect.target ?? (multiplier >= 1 ? 'self' : 'enemy'),
      stat: move.effect.stat,
      multiplier,
      turns: move.effect.turns ?? 2,
    });
  }

  if (move.effect?.damageIncrease) {
    effects.push({
      kind: 'damageIncrease',
      target: move.effect.target ?? 'self',
      multiplier: move.effect.damageIncrease,
      turns: move.effect.turns ?? 2,
    });
  }

  if (move.effect?.damageReduction) {
    effects.push({
      kind: 'damageReduction',
      target: move.effect.target ?? 'self',
      multiplier: move.effect.damageReduction,
      turns: move.effect.turns ?? 2,
    });
  }

  if (move.effect?.lifesteal) {
    effects.push({
      kind: 'lifesteal',
      target: 'self',
      ratio: move.effect.lifesteal,
    });
  }

  return effects;
}

/** Load the full config once. Cheap — ~30 rows total. */
export async function loadConfig() {
  const [heroRows, monsterRows, moveRows, constantRows] = await Promise.all([
    prisma.heroConfig.findMany({ orderBy: { name: 'asc' } }),
    prisma.monster.findMany({
      orderBy: { order: 'asc' },
      include: {
        moves: {
          orderBy: { slot: 'asc' },
          select: { moveId: true, slot: true },
        },
      },
    }),
    prisma.move.findMany(),
    prisma.constant.findMany(),
  ]);

  if (heroRows.length === 0) {
    throw new Error('HeroConfig is empty. Run `npm run db:seed`.');
  }

  const moves = {};
  for (const m of moveRows) {
    moves[m.id] = {
      id: m.id,
      name: m.name,
      type: m.type,
      baseValue: m.baseValue,
      description: m.description,
      ...(m.cost ? { cost: m.cost } : {}),
      ...(m.effect ? { effect: m.effect } : {}),
      ...(m.statusEffect ? { statusEffect: m.statusEffect } : {}),
      effects: normalizeMoveEffects(m),
    };
  }

  const monsters = monsterRows.map((m) => ({
    id: m.id,
    name: m.name,
    order: m.order,
    stats: m.stats,
    moves: m.moves.map((mm) => mm.moveId),
    xpReward: m.xpReward,
    sprite: m.sprite,
  }));

  const constants = {};
  for (const c of constantRows) constants[c.key] = c.value;
  const items = constants.ITEM_DEFINITIONS ?? {};
  const dropTables = constants.DROP_TABLES ?? {};
  const shopConfig = constants.SHOP_CONFIG ?? { merchants: [] };
  const mapConfig = normalizeMapConfig(constants.MAP_CONFIG);
  constants.MAP_CONFIG = mapConfig;
  const biomeConfig = constants.BIOME_CONFIG ?? {};
  const arenaThemes = constants.ARENA_THEMES ?? {};

  const heroClasses = {};
  for (const row of heroRows) {
    heroClasses[row.id] = {
      id: row.id,
      name: row.name,
      sprite: row.sprite,
      baseStats: row.baseStats,
      defaultMoves: row.defaultMoves,
      levelUpGrowth: row.levelUpGrowth ?? null,
    };
  }

  const hero = heroClasses.knight ?? heroClasses[heroRows[0].id];

  return {
    hero,
    heroClasses,
    monsters,
    moves,
    items,
    dropTables,
    shopConfig,
    mapConfig,
    biomeConfig,
    arenaThemes,
    constants,
  };
}

/** Just the moves dictionary (used by validateBattleState). */
export async function loadMovesById() {
  const rows = await prisma.move.findMany();
  const map = {};
  for (const m of rows) map[m.id] = m;
  return map;
}

/** Valid move ids for a given monster — used by middleware validation. */
export async function loadMonsterMoveIds(monsterId) {
  const rows = await prisma.monsterMove.findMany({
    where: { monsterId },
    orderBy: { slot: 'asc' },
    select: { moveId: true },
  });
  return rows.map((r) => r.moveId);
}
