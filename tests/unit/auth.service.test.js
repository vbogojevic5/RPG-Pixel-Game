import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import bcrypt from 'bcryptjs';

vi.mock('../../server/db.js', () => ({
  prisma: {
    player: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import {
  assertPasswordPolicy,
  registerPlayer,
  loginPlayer,
  signToken,
  verifyToken,
  toPublicPlayer,
} from '../../server/services/auth.service.js';
import { prisma } from '../../server/db.js';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-at-least-8-chars';
  process.env.JWT_EXPIRES_IN = '1h';
});

describe('assertPasswordPolicy', () => {
  it('rejects short passwords', () => {
    expect(() => assertPasswordPolicy('Ab1')).toThrow(/at least 8/);
  });

  it('rejects passwords without uppercase', () => {
    expect(() => assertPasswordPolicy('lowercase1long')).toThrow(/capital/);
  });

  it('rejects passwords without digit', () => {
    expect(() => assertPasswordPolicy('NoDigitsXx')).toThrow(/number/);
  });

  it('accepts valid passwords', () => {
    expect(() => assertPasswordPolicy('Valid1Pass')).not.toThrow();
  });
});

describe('registerPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes username and creates player when available', async () => {
    prisma.player.findUnique.mockResolvedValue(null);
    prisma.player.create.mockResolvedValue({
      id: 'u1',
      username: 'alice',
      passwordHash: 'hash',
      role: 'player',
      createdAt: new Date(),
    });

    const player = await registerPlayer('  Alice  ', 'Valid1Pass');

    expect(prisma.player.findUnique).toHaveBeenCalledWith({ where: { username: 'alice' } });
    expect(prisma.player.create).toHaveBeenCalledTimes(1);
    expect(player.username).toBe('alice');
    const createData = prisma.player.create.mock.calls[0][0].data;
    expect(createData.username).toBe('alice');
    expect(typeof createData.passwordHash).toBe('string');
    expect(createData.passwordHash).not.toBe('Valid1Pass');
  });

  it('throws 409 when username exists', async () => {
    prisma.player.findUnique.mockResolvedValue({ id: 'x' });
    await expect(registerPlayer('taken', 'Valid1Pass')).rejects.toMatchObject({
      message: 'Username is already taken.',
      status: 409,
    });
    expect(prisma.player.create).not.toHaveBeenCalled();
  });

  it('throws 400 for invalid username pattern', async () => {
    await expect(registerPlayer('ab', 'Valid1Pass')).rejects.toMatchObject({ status: 400 });
    await expect(registerPlayer('bad name!', 'Valid1Pass')).rejects.toMatchObject({ status: 400 });
  });
});

describe('loginPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns player when password matches', async () => {
    const hash = await bcrypt.hash('Valid1Pass', 4);
    prisma.player.findUnique.mockResolvedValue({
      id: 'u1',
      username: 'bob',
      passwordHash: hash,
      role: 'player',
    });

    const player = await loginPlayer('Bob', 'Valid1Pass');
    expect(player.username).toBe('bob');
  });

  it('throws 401 when user missing', async () => {
    prisma.player.findUnique.mockResolvedValue(null);
    await expect(loginPlayer('nobody', 'Valid1Pass')).rejects.toMatchObject({
      status: 401,
      message: 'Invalid username or password.',
    });
  });

  it('throws 401 when password wrong', async () => {
    const hash = await bcrypt.hash('Other1Pass', 4);
    prisma.player.findUnique.mockResolvedValue({
      id: 'u1',
      username: 'bob',
      passwordHash: hash,
    });
    await expect(loginPlayer('bob', 'Valid1Pass')).rejects.toMatchObject({ status: 401 });
  });
});

describe('JWT helpers', () => {
  it('signToken and verifyToken round-trip payload fields', () => {
    const player = { id: 'p1', username: 'u', role: 'admin' };
    const token = signToken(player);
    const payload = verifyToken(token);
    expect(payload.sub).toBe('p1');
    expect(payload.username).toBe('u');
    expect(payload.role).toBe('admin');
  });

  it('toPublicPlayer strips password hash', () => {
    const pub = toPublicPlayer({
      id: '1',
      username: 'a',
      role: 'player',
      createdAt: new Date(),
      passwordHash: 'secret',
    });
    expect(pub).not.toHaveProperty('passwordHash');
    expect(pub.username).toBe('a');
  });
});
