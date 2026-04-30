import { pickMonsterMove } from '../logic/ai.js';
import { loadMovesById } from '../services/config.service.js';
import { prisma } from '../db.js';

/**
 * GET /battle/monster-move?state=<base64-json>
 *
 * The `state` query param is a base64-encoded JSON blob describing the
 * current battle state. `validateBattleState` middleware decodes it and
 * attaches the parsed object to `req.battleState`.
 *
 * Returns: { move: <moveId> }
 */
export async function getMonsterMove(req, res) {
  const state = req.battleState;
  const movesById = await loadMovesById();
  const move = pickMonsterMove(state, movesById);
  res.json({ move });
}

function countTurns(battleLog) {
  const actionEntries = battleLog.filter((entry) =>
    /\b(used|cast)\b/i.test(String(entry))
  );
  return Math.max(1, Math.ceil(actionEntries.length / 2));
}

export async function recordBattleResult(req, res, next) {
  try {
    const {
      monsterId,
      monsterName,
      outcome,
      xpGained,
      turns,
      battleLog,
      startedAt,
      endedAt,
    } = req.body ?? {};

    if (typeof monsterId !== 'string' || !monsterId) {
      return res.status(400).json({ error: 'monsterId is required.' });
    }
    if (!['victory', 'defeat'].includes(outcome)) {
      return res.status(400).json({ error: 'outcome must be victory or defeat.' });
    }
    if (!Array.isArray(battleLog)) {
      return res.status(400).json({ error: 'battleLog must be an array.' });
    }

    const monster = await prisma.monster.findUnique({ where: { id: monsterId } });
    const battleRun = await prisma.battleRun.create({
      data: {
        playerId: req.player.id,
        monsterId,
        monsterName: typeof monsterName === 'string' && monsterName ? monsterName : monster?.name ?? monsterId,
        outcome,
        xpGained: Number.isInteger(xpGained) ? xpGained : 0,
        turns: Number.isInteger(turns) && turns > 0 ? turns : countTurns(battleLog),
        battleLog,
        startedAt: startedAt ? new Date(startedAt) : null,
        endedAt: endedAt ? new Date(endedAt) : new Date(),
      },
    });

    res.status(201).json({ battleRun });
  } catch (err) {
    next(err);
  }
}
