import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../server/services/config.service.js', () => ({
  loadMonsterMoveIds: vi.fn(),
}));

import { validateBattleState } from '../../server/middleware/validateBattleState.js';
import { loadMonsterMoveIds } from '../../server/services/config.service.js';

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

describe('validateBattleState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when state is missing', async () => {
    const req = { query: {} };
    const res = mockRes();
    const next = vi.fn();
    await validateBattleState(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid base64/json', async () => {
    const req = { query: { state: 'not-valid-base64!!!' } };
    const res = mockRes();
    const next = vi.fn();
    await validateBattleState(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when monsterId or availableMoves invalid', async () => {
    const payload = { monsterId: '', availableMoves: ['slash'] };
    const req = { query: { state: Buffer.from(JSON.stringify(payload)).toString('base64') } };
    const res = mockRes();
    const next = vi.fn();
    await validateBattleState(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when monster unknown or move illegal', async () => {
    loadMonsterMoveIds.mockResolvedValueOnce([]);
    let req = {
      query: {
        state: Buffer.from(JSON.stringify({ monsterId: 'ghost', availableMoves: ['slash'] })).toString('base64'),
      },
    };
    let res = mockRes();
    let next = vi.fn();
    await validateBattleState(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);

    loadMonsterMoveIds.mockResolvedValueOnce(['rustyBlade']);
    req = {
      query: {
        state: Buffer.from(
          JSON.stringify({ monsterId: 'goblin_warrior', availableMoves: ['slash'] })
        ).toString('base64'),
      },
    };
    res = mockRes();
    next = vi.fn();
    await validateBattleState(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toMatch(/not in/);
  });

  it('calls next and attaches battleState on success', async () => {
    loadMonsterMoveIds.mockResolvedValue(['slash', 'shieldUp']);
    const body = { monsterId: 'goblin_warrior', availableMoves: ['slash'] };
    const req = { query: { state: Buffer.from(JSON.stringify(body)).toString('base64') } };
    const res = mockRes();
    const next = vi.fn();
    await validateBattleState(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.battleState).toEqual(body);
    expect(res.status).not.toHaveBeenCalled();
  });
});
