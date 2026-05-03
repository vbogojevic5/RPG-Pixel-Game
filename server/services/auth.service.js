/**
 * Auth service — all password and JWT handling lives here so routes
 * and middleware stay thin.
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';

const SALT_ROUNDS = 10;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 8) {
    throw new Error('JWT_SECRET is missing or too short (set it in /server/.env).');
  }
  return secret;
}

function getJwtExpiresIn() {
  return process.env.JWT_EXPIRES_IN || '7d';
}

/** Register-only: length, one uppercase Latin letter, one digit. */
export function assertPasswordPolicy(password) {
  if (typeof password !== 'string' || password.length < 8) {
    const err = new Error('Password must be at least 8 characters.');
    err.status = 400;
    throw err;
  }
  if (!/[A-Z]/.test(password)) {
    const err = new Error('Password must include at least one capital letter.');
    err.status = 400;
    throw err;
  }
  if (!/\d/.test(password)) {
    const err = new Error('Password must include at least one number.');
    err.status = 400;
    throw err;
  }
}

export function signToken(player) {
  return jwt.sign(
    { sub: player.id, username: player.username, role: player.role },
    getJwtSecret(),
    { expiresIn: getJwtExpiresIn() }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

export async function registerPlayer(username, password) {
  const normalized = String(username ?? '').trim().toLowerCase();
  if (normalized.length < 3 || normalized.length > 24) {
    const err = new Error('Username must be 3–24 characters.');
    err.status = 400;
    throw err;
  }
  if (!/^[a-z0-9_.-]+$/i.test(normalized)) {
    const err = new Error('Username may only contain letters, digits, _, . and -.');
    err.status = 400;
    throw err;
  }
  assertPasswordPolicy(password);

  const existing = await prisma.player.findUnique({ where: { username: normalized } });
  if (existing) {
    const err = new Error('Username is already taken.');
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const player = await prisma.player.create({
    data: { username: normalized, passwordHash },
  });
  return player;
}

export async function loginPlayer(username, password) {
  const normalized = String(username ?? '').trim().toLowerCase();
  const player = await prisma.player.findUnique({ where: { username: normalized } });
  if (!player) {
    const err = new Error('Invalid username or password.');
    err.status = 401;
    throw err;
  }
  const ok = await bcrypt.compare(password ?? '', player.passwordHash);
  if (!ok) {
    const err = new Error('Invalid username or password.');
    err.status = 401;
    throw err;
  }
  return player;
}

export function toPublicPlayer(player) {
  return {
    id: player.id,
    username: player.username,
    role: player.role,
    createdAt: player.createdAt,
  };
}
