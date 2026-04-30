/**
 * Seeds the database from /server/config.js.
 *
 * Idempotent: every record is upserted, so running the seed again on a
 * populated DB re-syncs it with whatever config.js currently says. This
 * is the Game Designer's "publish" button until we build an admin UI.
 *
 * Usage:
 *   npm run db:seed              (applies current config.js to DB)
 *   npm run db:reseed            (wipes + re-seeds from config.js)
 */
import 'dotenv/config';
import { prisma } from '../db.js';
import { dropTables, hero, heroClasses, items, monsters, moves, shopConfig, constants } from '../config.js';

async function seedConstants() {
  const entries = Object.entries({
    ...constants,
    ITEM_DEFINITIONS: items,
    DROP_TABLES: dropTables,
    SHOP_CONFIG: shopConfig,
  });
  for (const [key, value] of entries) {
    await prisma.constant.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
  return entries.length;
}

async function seedMoves() {
  const entries = Object.entries(moves);
  for (const [id, move] of entries) {
    await prisma.move.upsert({
      where: { id },
      create: {
        id,
        name: move.name,
        type: move.type,
        baseValue: move.baseValue,
        description: move.description,
        cost: move.cost ?? null,
        effect: move.effect ?? null,
        statusEffect: move.statusEffect ?? null,
      },
      update: {
        name: move.name,
        type: move.type,
        baseValue: move.baseValue,
        description: move.description,
        cost: move.cost ?? null,
        effect: move.effect ?? null,
        statusEffect: move.statusEffect ?? null,
      },
    });
  }
  return entries.length;
}

async function seedMonsters() {
  const entries = Object.entries(monsters);
  for (const [id, monster] of entries) {
    await prisma.monster.upsert({
      where: { id },
      create: {
        id,
        name: monster.name,
        order: monster.order,
        stats: monster.stats,
        xpReward: monster.xpReward,
        sprite: monster.sprite ?? null,
      },
      update: {
        name: monster.name,
        order: monster.order,
        stats: monster.stats,
        xpReward: monster.xpReward,
        sprite: monster.sprite ?? null,
      },
    });

    // Rebuild moveset — cheapest way to stay in sync with config.js.
    await prisma.monsterMove.deleteMany({ where: { monsterId: id } });
    for (let slot = 0; slot < monster.moves.length; slot++) {
      await prisma.monsterMove.create({
        data: {
          monsterId: id,
          moveId: monster.moves[slot],
          slot,
        },
      });
    }
  }
  return entries.length;
}

async function seedHero() {
  const entries = Object.values(heroClasses ?? { [hero.id]: hero });
  for (const classConfig of entries) {
    await prisma.heroConfig.upsert({
      where: { id: classConfig.id },
      create: {
        id: classConfig.id,
        name: classConfig.name,
        sprite: classConfig.sprite ?? null,
        baseStats: classConfig.baseStats,
        defaultMoves: classConfig.defaultMoves,
        levelUpGrowth: classConfig.levelUpGrowth ?? null,
      },
      update: {
        name: classConfig.name,
        sprite: classConfig.sprite ?? null,
        baseStats: classConfig.baseStats,
        defaultMoves: classConfig.defaultMoves,
        levelUpGrowth: classConfig.levelUpGrowth ?? null,
      },
    });
  }
  return entries.length;
}

async function main() {
  console.log('[seed] starting...');
  const c = await seedConstants();
  console.log(`[seed] constants: ${c}`);
  const m = await seedMoves();
  console.log(`[seed] moves:     ${m}`);
  const mo = await seedMonsters();
  console.log(`[seed] monsters:  ${mo}`);
  const h = await seedHero();
  console.log(`[seed] heroes:    ${h}`);
  console.log('[seed] done.');
}

main()
  .catch((err) => {
    console.error('[seed] failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
