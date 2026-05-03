import { loadMonsterMoveIds } from '../services/config.service.js';

/** Decode `?state=` (base64 JSON), validate moveset vs DB, set `req.battleState`. */
export async function validateBattleState(req, res, next) {
  const raw = req.query.state;
  if (typeof raw !== 'string' || raw.length === 0) {
    return res
      .status(400)
      .json({ error: 'Missing `state` query parameter (base64 JSON).' });
  }

  let parsed;
  try {
    const json = Buffer.from(raw, 'base64').toString('utf-8');
    parsed = JSON.parse(json);
  } catch {
    return res
      .status(400)
      .json({ error: 'Invalid base64 or JSON in `state` parameter.' });
  }

  const { monsterId, availableMoves } = parsed || {};
  if (typeof monsterId !== 'string' || monsterId.length === 0) {
    return res.status(400).json({ error: `Missing monsterId.` });
  }
  if (!Array.isArray(availableMoves) || availableMoves.length === 0) {
    return res
      .status(400)
      .json({ error: '`availableMoves` must be a non-empty array.' });
  }

  try {
    const allowed = await loadMonsterMoveIds(monsterId);
    if (allowed.length === 0) {
      return res.status(400).json({ error: `Unknown monsterId: ${monsterId}` });
    }
    const allowedSet = new Set(allowed);
    const illegal = availableMoves.find((m) => !allowedSet.has(m));
    if (illegal) {
      return res
        .status(400)
        .json({ error: `Move "${illegal}" is not in ${monsterId}'s moveset.` });
    }
  } catch (err) {
    return next(err);
  }

  req.battleState = parsed;
  next();
}
