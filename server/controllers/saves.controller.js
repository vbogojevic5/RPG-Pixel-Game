import { prisma } from '../db.js';

const MAX_SAVES_PER_PLAYER = 10;
const MAX_SAVE_NAME_LEN = 40;

function serialize(save) {
  return {
    id: save.id,
    name: save.name,
    heroState: save.heroState,
    defeatedMonsterIds: save.defeatedMonsterIds,
    runStats: save.runStats,
    shopPurchasedSlots: save.shopPurchasedSlots ?? [],
    lastScreen: save.lastScreen,
    createdAt: save.createdAt,
    updatedAt: save.updatedAt,
  };
}

function validatePayload(body) {
  const { name, heroState, defeatedMonsterIds, runStats, lastScreen, shopPurchasedSlots } = body ?? {};
  if (typeof name !== 'string' || name.trim().length === 0) {
    const err = new Error('Save name is required.');
    err.status = 400;
    throw err;
  }
  if (name.length > MAX_SAVE_NAME_LEN) {
    const err = new Error(`Save name too long (max ${MAX_SAVE_NAME_LEN}).`);
    err.status = 400;
    throw err;
  }
  if (!heroState || typeof heroState !== 'object') {
    const err = new Error('heroState is required.');
    err.status = 400;
    throw err;
  }
  if (!Array.isArray(defeatedMonsterIds)) {
    const err = new Error('defeatedMonsterIds must be an array.');
    err.status = 400;
    throw err;
  }
  if (!runStats || typeof runStats !== 'object') {
    const err = new Error('runStats is required.');
    err.status = 400;
    throw err;
  }
  if (shopPurchasedSlots != null && !Array.isArray(shopPurchasedSlots)) {
    const err = new Error('shopPurchasedSlots must be an array.');
    err.status = 400;
    throw err;
  }
  return {
    name: name.trim(),
    heroState,
    defeatedMonsterIds,
    runStats,
    shopPurchasedSlots: Array.isArray(shopPurchasedSlots) ? shopPurchasedSlots : [],
    lastScreen: typeof lastScreen === 'string' ? lastScreen : null,
  };
}

export async function listSaves(req, res, next) {
  try {
    const saves = await prisma.gameSave.findMany({
      where: { playerId: req.player.id },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ saves: saves.map(serialize) });
  } catch (err) {
    next(err);
  }
}

export async function getSave(req, res, next) {
  try {
    const save = await prisma.gameSave.findUnique({ where: { id: req.params.id } });
    if (!save || save.playerId !== req.player.id) {
      return res.status(404).json({ error: 'Save not found.' });
    }
    res.json({ save: serialize(save) });
  } catch (err) {
    next(err);
  }
}

export async function createSave(req, res, next) {
  try {
    const data = validatePayload(req.body);

    const count = await prisma.gameSave.count({ where: { playerId: req.player.id } });
    if (count >= MAX_SAVES_PER_PLAYER) {
      return res.status(409).json({
        error: `You have reached the save limit (${MAX_SAVES_PER_PLAYER}). Delete one to make room.`,
      });
    }

    const save = await prisma.gameSave.create({
      data: { ...data, playerId: req.player.id },
    });
    res.status(201).json({ save: serialize(save) });
  } catch (err) {
    next(err);
  }
}

export async function updateSave(req, res, next) {
  try {
    const data = validatePayload(req.body);
    const existing = await prisma.gameSave.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.playerId !== req.player.id) {
      return res.status(404).json({ error: 'Save not found.' });
    }
    const save = await prisma.gameSave.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ save: serialize(save) });
  } catch (err) {
    next(err);
  }
}

export async function deleteSave(req, res, next) {
  try {
    const existing = await prisma.gameSave.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.playerId !== req.player.id) {
      return res.status(404).json({ error: 'Save not found.' });
    }
    await prisma.gameSave.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
