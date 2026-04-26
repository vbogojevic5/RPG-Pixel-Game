import {
  registerPlayer,
  loginPlayer,
  signToken,
  toPublicPlayer,
} from '../services/auth.service.js';

export async function register(req, res, next) {
  try {
    const { username, password } = req.body ?? {};
    const player = await registerPlayer(username, password);
    const token = signToken(player);
    res.status(201).json({ token, player: toPublicPlayer(player) });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { username, password } = req.body ?? {};
    const player = await loginPlayer(username, password);
    const token = signToken(player);
    res.json({ token, player: toPublicPlayer(player) });
  } catch (err) {
    next(err);
  }
}

export function me(req, res) {
  res.json({ player: { id: req.player.id, username: req.player.username } });
}
