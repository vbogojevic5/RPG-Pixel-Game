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

/** Load the full config once. Cheap — ~30 rows total. */
export async function loadConfig() {
  const [heroRow, monsterRows, moveRows, constantRows] = await Promise.all([
    prisma.heroConfig.findFirst(),
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

  if (!heroRow) {
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
      ...(m.effect ? { effect: m.effect } : {}),
      ...(m.statusEffect ? { statusEffect: m.statusEffect } : {}),
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

  const hero = {
    id: heroRow.id,
    name: heroRow.name,
    sprite: heroRow.sprite,
    baseStats: heroRow.baseStats,
    defaultMoves: heroRow.defaultMoves,
  };

  return { hero, monsters, moves, constants };
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
