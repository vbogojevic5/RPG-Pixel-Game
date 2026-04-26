import { verifyToken } from '../services/auth.service.js';
import { prisma } from '../db.js';

/**
 * Authentication gate. Expects an `Authorization: Bearer <jwt>` header.
 * On success, attaches `req.player` ({ id, username }) for downstream
 * handlers.
 */
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  try {
    const player = await prisma.player.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true },
    });
    if (!player) {
      return res.status(401).json({ error: 'Account no longer exists.' });
    }
    req.player = player;
    next();
  } catch (err) {
    next(err);
  }
}
