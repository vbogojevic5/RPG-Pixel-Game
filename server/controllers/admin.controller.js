import { prisma } from '../db.js';
import { loadConfig } from '../services/config.service.js';

const STAT_KEYS = ['health', 'mana', 'attack', 'defense', 'magic'];
const MOVE_TYPES = ['physical', 'magic', 'heal', 'buff', 'debuff'];
const WORLD_CONSTANT_KEYS = ['MAP_CONFIG', 'BIOME_CONFIG', 'ARENA_THEMES'];

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function ensureStats(stats, label = 'stats') {
  if (!stats || typeof stats !== 'object' || Array.isArray(stats)) {
    throw badRequest(`${label} must be an object.`);
  }
  for (const key of STAT_KEYS) {
    if (!Number.isFinite(stats[key]) || stats[key] < 0) {
      throw badRequest(`${label}.${key} must be a non-negative number.`);
    }
  }
  return STAT_KEYS.reduce((acc, key) => ({ ...acc, [key]: Math.floor(stats[key]) }), {});
}

function ensureStringArray(value, label) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || item.length === 0)) {
    throw badRequest(`${label} must be an array of ids.`);
  }
  return [...value];
}

function ensureId(value, label = 'id') {
  if (typeof value !== 'string' || !/^[a-z][a-z0-9_]*$/.test(value)) {
    throw badRequest(`${label} must use lowercase letters, numbers, and underscores, starting with a letter.`);
  }
  return value;
}

function ensureWorldConfig(key, value) {
  if (!WORLD_CONSTANT_KEYS.includes(key)) return value;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw badRequest(`${key} must be an object.`);
  }
  if (key === 'MAP_CONFIG') {
    if (!Array.isArray(value.nodes) || value.nodes.length === 0) {
      throw badRequest('MAP_CONFIG.nodes must be a non-empty array.');
    }
    const ids = new Set();
    for (const node of value.nodes) {
      ensureId(node?.id, 'node.id');
      if (ids.has(node.id)) throw badRequest(`Duplicate map node id: ${node.id}`);
      ids.add(node.id);
      if (!['battle', 'elite', 'shop', 'boss'].includes(node.type)) {
        throw badRequest(`Map node ${node.id} has invalid type.`);
      }
      if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) {
        throw badRequest(`Map node ${node.id} needs numeric x/y coordinates.`);
      }
      if (node.type === 'shop' && !node.merchantId) {
        throw badRequest(`Shop node ${node.id} needs merchantId.`);
      }
      if (node.type !== 'shop' && !node.monsterId) {
        throw badRequest(`Battle node ${node.id} needs monsterId.`);
      }
      if (!Array.isArray(node.children)) throw badRequest(`Map node ${node.id}.children must be an array.`);
    }
    const nodeIds = new Set(value.nodes.map((n) => n.id));
    for (const node of value.nodes) {
      for (const childId of node.children ?? []) {
        if (!nodeIds.has(childId)) {
          throw badRequest(`Map node ${node.id} references unknown child "${childId}".`);
        }
      }
    }
  }
  return value;
}

function publicPlayer(player) {
  return {
    id: player.id,
    username: player.username,
    role: player.role,
    createdAt: player.createdAt,
    updatedAt: player.updatedAt,
  };
}

async function writeAudit(adminId, entityType, entityId, action, before, after) {
  const toJson = (value) => (value == null ? null : JSON.parse(JSON.stringify(value)));
  await prisma.adminAuditLog.create({
    data: { adminId, entityType, entityId, action, before: toJson(before), after: toJson(after) },
  });
}

export async function overview(_req, res, next) {
  try {
    const [users, saves, battles, wins, monsters, moves, recentBattles, recentAudits] =
      await Promise.all([
        prisma.player.count(),
        prisma.gameSave.count(),
        prisma.battleRun.count(),
        prisma.battleRun.count({ where: { outcome: 'victory' } }),
        prisma.monster.count(),
        prisma.move.count(),
        prisma.battleRun.findMany({
          take: 3,
          orderBy: { endedAt: 'desc' },
          include: { player: { select: { username: true } } },
        }),
        prisma.adminAuditLog.findMany({
          take: 3,
          orderBy: { createdAt: 'desc' },
          include: { admin: { select: { username: true } } },
        }),
      ]);

    res.json({
      stats: { users, saves, battles, wins, losses: battles - wins, monsters, moves },
      recentBattles,
      recentAudits,
    });
  } catch (err) {
    next(err);
  }
}

export async function listUsers(_req, res, next) {
  try {
    const users = await prisma.player.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        saves: { select: { runStats: true } },
        _count: { select: { saves: true, battleRuns: true } },
      },
    });

    res.json({
      users: users.map((player) => {
        const aggregateRunStats = player.saves.reduce(
          (acc, save) => {
            const stats = save.runStats ?? {};
            acc.battlesFought += stats.battlesFought ?? 0;
            acc.battlesWon += stats.battlesWon ?? 0;
            acc.battlesLost += stats.battlesLost ?? 0;
            return acc;
          },
          { battlesFought: 0, battlesWon: 0, battlesLost: 0 }
        );
        return {
          ...publicPlayer(player),
          saveCount: player._count.saves,
          battleRunCount: player._count.battleRuns,
          aggregateRunStats,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
}

export async function getUser(req, res, next) {
  try {
    const player = await prisma.player.findUnique({
      where: { id: req.params.id },
      include: {
        saves: { orderBy: { updatedAt: 'desc' } },
        battleRuns: { take: 10, orderBy: { endedAt: 'desc' } },
      },
    });
    if (!player) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: publicPlayer(player), saves: player.saves, recentBattles: player.battleRuns });
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req, res, next) {
  try {
    if (req.params.id === req.player.id) {
      return res.status(400).json({ error: 'You cannot delete your own admin account.' });
    }

    const existing = await prisma.player.findUnique({
      where: { id: req.params.id },
      select: { id: true, username: true, role: true, createdAt: true, updatedAt: true },
    });
    if (!existing) return res.status(404).json({ error: 'User not found.' });

    await writeAudit(req.player.id, 'player', req.params.id, 'delete', existing, null);
    await prisma.player.delete({ where: { id: req.params.id } });
    res.json({ ok: true, deletedUser: existing });
  } catch (err) {
    next(err);
  }
}

export async function listSaves(req, res, next) {
  try {
    const search = String(req.query.search ?? '').trim();
    const saves = await prisma.gameSave.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { player: { username: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : undefined,
      orderBy: { updatedAt: 'desc' },
      include: { player: { select: { id: true, username: true } } },
    });
    res.json({ saves });
  } catch (err) {
    next(err);
  }
}

export async function getConfig(_req, res, next) {
  try {
    res.json(await loadConfig());
  } catch (err) {
    next(err);
  }
}

export async function updateMonster(req, res, next) {
  try {
    const existing = await prisma.monster.findUnique({
      where: { id: req.params.id },
      include: { moves: { orderBy: { slot: 'asc' }, select: { moveId: true, slot: true } } },
    });
    if (!existing) return res.status(404).json({ error: 'Monster not found.' });

    const data = {};
    if (req.body.name !== undefined) {
      if (typeof req.body.name !== 'string' || !req.body.name.trim()) throw badRequest('name is required.');
      data.name = req.body.name.trim();
    }
    if (req.body.order !== undefined) {
      if (!Number.isInteger(req.body.order) || req.body.order < 1) throw badRequest('order must be a positive integer.');
      data.order = req.body.order;
    }
    if (req.body.stats !== undefined) data.stats = ensureStats(req.body.stats);
    if (req.body.xpReward !== undefined) {
      if (!Number.isInteger(req.body.xpReward) || req.body.xpReward < 0) throw badRequest('xpReward must be a non-negative integer.');
      data.xpReward = req.body.xpReward;
    }
    if (req.body.sprite !== undefined) data.sprite = req.body.sprite || null;

    const moveIds = req.body.moves !== undefined ? ensureStringArray(req.body.moves, 'moves') : null;
    if (moveIds) {
      const count = await prisma.move.count({ where: { id: { in: moveIds } } });
      if (count !== new Set(moveIds).size) throw badRequest('moves contains an unknown move id.');
    }

    const before = {
      ...existing,
      moves: existing.moves.map((m) => m.moveId),
    };

    const monster = await prisma.$transaction(async (tx) => {
      const updated = await tx.monster.update({ where: { id: req.params.id }, data });
      if (moveIds) {
        await tx.monsterMove.deleteMany({ where: { monsterId: req.params.id } });
        for (let slot = 0; slot < moveIds.length; slot++) {
          await tx.monsterMove.create({
            data: { monsterId: req.params.id, moveId: moveIds[slot], slot },
          });
        }
      }
      return updated;
    });

    const after = { ...monster, moves: moveIds ?? before.moves };
    await writeAudit(req.player.id, 'monster', req.params.id, 'update', before, after);
    res.json({ monster: after });
  } catch (err) {
    next(err);
  }
}

export async function createMonster(req, res, next) {
  try {
    const id = ensureId(req.body?.id);
    const existing = await prisma.monster.findUnique({ where: { id } });
    if (existing) return res.status(409).json({ error: 'Monster id already exists.' });

    if (typeof req.body.name !== 'string' || !req.body.name.trim()) throw badRequest('name is required.');
    if (!Number.isInteger(req.body.order) || req.body.order < 1) throw badRequest('order must be a positive integer.');
    if (!Number.isInteger(req.body.xpReward) || req.body.xpReward < 0) {
      throw badRequest('xpReward must be a non-negative integer.');
    }
    const moves = ensureStringArray(req.body.moves, 'moves');
    if (moves.length === 0) throw badRequest('moves must contain at least one move.');
    const count = await prisma.move.count({ where: { id: { in: moves } } });
    if (count !== new Set(moves).size) throw badRequest('moves contains an unknown move id.');

    const after = await prisma.$transaction(async (tx) => {
      const monster = await tx.monster.create({
        data: {
          id,
          name: req.body.name.trim(),
          order: req.body.order,
          stats: ensureStats(req.body.stats),
          xpReward: req.body.xpReward,
          sprite: req.body.sprite || null,
        },
      });
      for (let slot = 0; slot < moves.length; slot++) {
        await tx.monsterMove.create({ data: { monsterId: id, moveId: moves[slot], slot } });
      }
      return { ...monster, moves };
    });

    await writeAudit(req.player.id, 'monster', id, 'create', null, after);
    res.status(201).json({ monster: after });
  } catch (err) {
    next(err);
  }
}

export async function createMove(req, res, next) {
  try {
    const id = ensureId(req.body?.id);
    const existing = await prisma.move.findUnique({ where: { id } });
    if (existing) return res.status(409).json({ error: 'Move id already exists.' });

    if (typeof req.body.name !== 'string' || !req.body.name.trim()) throw badRequest('name is required.');
    if (!MOVE_TYPES.includes(req.body.type)) throw badRequest(`type must be one of: ${MOVE_TYPES.join(', ')}.`);
    if (!Number.isInteger(req.body.baseValue) || req.body.baseValue < 0) {
      throw badRequest('baseValue must be a non-negative integer.');
    }
    if (typeof req.body.description !== 'string') throw badRequest('description must be a string.');

    const move = await prisma.move.create({
      data: {
        id,
        name: req.body.name.trim(),
        type: req.body.type,
        baseValue: req.body.baseValue,
        description: req.body.description.trim(),
        cost: req.body.cost ?? null,
        effect: req.body.effect ?? null,
        statusEffect: req.body.statusEffect ?? null,
      },
    });
    await writeAudit(req.player.id, 'move', id, 'create', null, move);
    res.status(201).json({ move });
  } catch (err) {
    next(err);
  }
}

export async function createHero(req, res, next) {
  try {
    const id = ensureId(req.body?.id);
    const existing = await prisma.heroConfig.findUnique({ where: { id } });
    if (existing) return res.status(409).json({ error: 'Hero class id already exists.' });

    if (typeof req.body.name !== 'string' || !req.body.name.trim()) throw badRequest('name is required.');
    const baseStats = ensureStats(req.body.baseStats, 'baseStats');
    const defaultMoves = ensureStringArray(req.body.defaultMoves, 'defaultMoves');
    if (defaultMoves.length === 0) throw badRequest('defaultMoves must contain at least one move.');
    const moveCount = await prisma.move.count({ where: { id: { in: defaultMoves } } });
    if (moveCount !== new Set(defaultMoves).size) throw badRequest('defaultMoves contains an unknown move id.');

    let levelUpGrowth = null;
    if (req.body.levelUpGrowth != null && typeof req.body.levelUpGrowth === 'object') {
      levelUpGrowth = ensureStats(req.body.levelUpGrowth, 'levelUpGrowth');
    }

    const hero = await prisma.heroConfig.create({
      data: {
        id,
        name: req.body.name.trim(),
        sprite: req.body.sprite || null,
        baseStats,
        defaultMoves,
        levelUpGrowth,
      },
    });
    await writeAudit(req.player.id, 'heroConfig', id, 'create', null, hero);
    res.status(201).json({ hero });
  } catch (err) {
    next(err);
  }
}

export async function updateMove(req, res, next) {
  try {
    const existing = await prisma.move.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Move not found.' });

    const data = {};
    if (req.body.name !== undefined) {
      if (typeof req.body.name !== 'string' || !req.body.name.trim()) throw badRequest('name is required.');
      data.name = req.body.name.trim();
    }
    if (req.body.type !== undefined) {
      if (!MOVE_TYPES.includes(req.body.type)) throw badRequest(`type must be one of: ${MOVE_TYPES.join(', ')}.`);
      data.type = req.body.type;
    }
    if (req.body.baseValue !== undefined) {
      if (!Number.isInteger(req.body.baseValue) || req.body.baseValue < 0) throw badRequest('baseValue must be a non-negative integer.');
      data.baseValue = req.body.baseValue;
    }
    if (req.body.description !== undefined) {
      if (typeof req.body.description !== 'string') throw badRequest('description must be a string.');
      data.description = req.body.description.trim();
    }
    if (req.body.cost !== undefined) data.cost = req.body.cost || null;
    if (req.body.effect !== undefined) data.effect = req.body.effect || null;
    if (req.body.statusEffect !== undefined) data.statusEffect = req.body.statusEffect || null;

    const move = await prisma.move.update({ where: { id: req.params.id }, data });
    await writeAudit(req.player.id, 'move', req.params.id, 'update', existing, move);
    res.json({ move });
  } catch (err) {
    next(err);
  }
}

export async function updateConstant(req, res, next) {
  try {
    if (req.params.key === 'MAX_EQUIPPED_MOVES') {
      throw badRequest('MAX_EQUIPPED_MOVES is fixed at 4 and cannot be changed.');
    }
    if (!Object.prototype.hasOwnProperty.call(req.body ?? {}, 'value')) {
      throw badRequest('value is required.');
    }
    const existing = await prisma.constant.findUnique({ where: { key: req.params.key } });
    if (!existing) return res.status(404).json({ error: 'Constant not found.' });
    const value = ensureWorldConfig(req.params.key, req.body.value);
    const constant = await prisma.constant.update({
      where: { key: req.params.key },
      data: { value },
    });
    await writeAudit(req.player.id, 'constant', req.params.key, 'update', existing, constant);
    res.json({ constant });
  } catch (err) {
    next(err);
  }
}

export async function updateHeroConfig(req, res, next) {
  try {
    const heroId = req.params.id ?? 'knight';
    const existing = await prisma.heroConfig.findUnique({ where: { id: heroId } });
    if (!existing) return res.status(404).json({ error: 'Hero config not found.' });

    const data = {};
    if (req.body.name !== undefined) {
      if (typeof req.body.name !== 'string' || !req.body.name.trim()) throw badRequest('name is required.');
      data.name = req.body.name.trim();
    }
    if (req.body.sprite !== undefined) data.sprite = req.body.sprite || null;
    if (req.body.baseStats !== undefined) data.baseStats = ensureStats(req.body.baseStats, 'baseStats');
    if (req.body.levelUpGrowth !== undefined) {
      data.levelUpGrowth = req.body.levelUpGrowth
        ? ensureStats(req.body.levelUpGrowth, 'levelUpGrowth')
        : null;
    }
    if (req.body.defaultMoves !== undefined) {
      const defaultMoves = ensureStringArray(req.body.defaultMoves, 'defaultMoves');
      const count = await prisma.move.count({ where: { id: { in: defaultMoves } } });
      if (count !== new Set(defaultMoves).size) throw badRequest('defaultMoves contains an unknown move id.');
      data.defaultMoves = defaultMoves;
    }

    const hero = await prisma.heroConfig.update({ where: { id: existing.id }, data });
    await writeAudit(req.player.id, 'heroConfig', hero.id, 'update', existing, hero);
    res.json({ hero });
  } catch (err) {
    next(err);
  }
}

export async function listBattleRuns(req, res, next) {
  try {
    const where = {};
    if (req.query.playerId) where.playerId = String(req.query.playerId);
    if (req.query.monsterId) where.monsterId = String(req.query.monsterId);
    if (req.query.outcome) where.outcome = String(req.query.outcome);

    const battleRuns = await prisma.battleRun.findMany({
      where,
      take: 100,
      orderBy: { endedAt: 'desc' },
      include: { player: { select: { id: true, username: true } } },
    });
    res.json({ battleRuns });
  } catch (err) {
    next(err);
  }
}

export async function getBattleRun(req, res, next) {
  try {
    const battleRun = await prisma.battleRun.findUnique({
      where: { id: req.params.id },
      include: { player: { select: { id: true, username: true } } },
    });
    if (!battleRun) return res.status(404).json({ error: 'Battle run not found.' });
    res.json({ battleRun });
  } catch (err) {
    next(err);
  }
}

export async function listAuditLogs(_req, res, next) {
  try {
    const auditLogs = await prisma.adminAuditLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: { admin: { select: { id: true, username: true } } },
    });
    res.json({ auditLogs });
  } catch (err) {
    next(err);
  }
}
