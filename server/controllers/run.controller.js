import { loadConfig } from '../services/config.service.js';

/**
 * GET /run/config
 *
 * Returns the full run configuration: hero base stats, all 5 monsters
 * ordered by difficulty, the moves dictionary, and game-wide constants.
 *
 * Phase 3: data is loaded from the Postgres database via Prisma. The
 * response shape is intentionally unchanged so the existing client keeps
 * working without touching `useRunConfig` or `App.jsx`.
 */
export async function getRunConfig(_req, res, next) {
  try {
    const config = await loadConfig();
    res.json(config);
  } catch (err) {
    next(err);
  }
}
