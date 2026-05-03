import { describe, it, expect, vi, afterEach } from 'vitest';
import { pickMonsterMove } from '../../server/logic/ai.js';

const stubMove = (overrides = {}) => ({
  id: 'm1',
  type: 'physical',
  baseValue: 20,
  ...overrides,
});

describe('pickMonsterMove', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when availableMoves is empty', () => {
    expect(() => pickMonsterMove({ availableMoves: [] }, {})).toThrow(/No available moves/);
  });

  it('returns a pool id when movesById has no entries (fallback randomFrom)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const id = pickMonsterMove({ availableMoves: ['alpha', 'beta'] }, {});
    expect(['alpha', 'beta']).toContain(id);
  });

  it('returns the only scored candidate when a single move is known', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const movesById = { smash: stubMove({ id: 'smash' }) };
    const id = pickMonsterMove({ availableMoves: ['smash'], monsterStats: { health: 100 }, heroStats: { health: 100 } }, movesById);
    expect(id).toBe('smash');
  });

  it('returns one of available moves when multiple are weighted', () => {
    vi.spyOn(Math, 'random').mockImplementation(() => 0.5);
    const movesById = {
      a: stubMove({ id: 'a', baseValue: 10 }),
      b: stubMove({ id: 'b', baseValue: 40 }),
    };
    const state = {
      availableMoves: ['a', 'b'],
      monsterId: 'goblin_warrior',
      monsterStats: { health: 100 },
      heroStats: { health: 100 },
      monsterCurrentHealth: 100,
      heroCurrentHealth: 100,
      monsterBuffs: [],
      heroBuffs: [],
      heroStatuses: [],
    };
    const id = pickMonsterMove(state, movesById);
    expect(['a', 'b']).toContain(id);
  });
});
