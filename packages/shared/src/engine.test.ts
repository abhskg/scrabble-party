import { describe, it, expect } from 'vitest';
import { createGame, applyPlay, applyPass, applySwap, applyTakeBack, finalizeGame } from './engine.js';
import type { GameSettings, GameState, Placement } from './types.js';

const settings: GameSettings = { dictionaryMode: 'off', takeBacks: true, freeSwaps: 'unlimited', freeSwapLimit: 0 };
const players = [
  { id: 'p1', name: 'Amy', avatar: '🦊' },
  { id: 'p2', name: 'Ben', avatar: '🐸' },
];

/** Place the first N letters of the current player's rack in a row through center. */
function firstMovePlacements(state: GameState, count: number): Placement[] {
  const rack = state.players[state.currentPlayerIndex].rack;
  return rack.slice(0, count).map((tile, i) => ({
    tile: tile.isBlank ? { ...tile, assignedLetter: 'E' } : tile,
    row: 7, col: 7 + i - Math.floor(count / 2),
  }));
}

describe('engine', () => {
  it('createGame deals 7 tiles to each player', () => {
    const g = createGame(players, settings, () => 0.42);
    expect(g.players.every(p => p.rack.length === 7)).toBe(true);
    expect(g.bag).toHaveLength(100 - 14);
    expect(g.phase).toBe('playing');
    expect(g.currentPlayerIndex).toBe(0);
  });

  it('applyPlay rejects out-of-turn and foreign tiles', () => {
    const g = createGame(players, settings, () => 0.42);
    expect(applyPlay(g, 'p2', firstMovePlacements(g, 2)).ok).toBe(false);
    const stolen = { ...firstMovePlacements(g, 2)[0], tile: { id: 'nope', letter: 'A', value: 1, isBlank: false } };
    expect(applyPlay(g, 'p1', [stolen, firstMovePlacements(g, 2)[1]]).ok).toBe(false);
  });

  it('applyPlay scores, refills the rack, advances the turn', () => {
    const g = createGame(players, settings, () => 0.42);
    const res = applyPlay(g, 'p1', firstMovePlacements(g, 3));
    if (!res.ok) throw new Error(res.reason);
    expect(res.state.players[0].score).toBeGreaterThan(0);
    expect(res.state.players[0].rack).toHaveLength(7);
    expect(res.state.currentPlayerIndex).toBe(1);
    expect(res.state.lastMove?.playerId).toBe('p1');
    expect(res.state.board[7][7]).not.toBeNull();
  });

  it('take-back restores everything and returns the turn', () => {
    const g = createGame(players, settings, () => 0.42);
    const played = applyPlay(g, 'p1', firstMovePlacements(g, 3));
    if (!played.ok) throw new Error(played.reason);
    const undone = applyTakeBack(played.state, 'p1');
    if (!undone.ok) throw new Error(undone.reason);
    expect(undone.state.players[0].score).toBe(0);
    expect(undone.state.currentPlayerIndex).toBe(0);
    expect(undone.state.board[7][7]).toBeNull();
    expect(undone.state.players[0].rack.map(t => t.id).sort())
      .toEqual(g.players[0].rack.map(t => t.id).sort());
  });

  it('take-back rejected when disabled or not the last mover', () => {
    const strict = { ...settings, takeBacks: false };
    const g = createGame(players, strict, () => 0.42);
    const played = applyPlay(g, 'p1', firstMovePlacements(g, 3));
    if (!played.ok) throw new Error(played.reason);
    expect(applyTakeBack(played.state, 'p1').ok).toBe(false);
    expect(applyTakeBack(played.state, 'p2').ok).toBe(false);
  });

  it('free swap keeps the turn; standard swap consumes it', () => {
    const g = createGame(players, settings, () => 0.42);
    const free = applySwap(g, 'p1', g.players[0].rack.slice(0, 2).map(t => t.id));
    if (!free.ok) throw new Error(free.reason);
    expect(free.state.currentPlayerIndex).toBe(0); // unlimited free swaps
    const strictSettings = { ...settings, freeSwaps: 'off' as const };
    const g2 = createGame(players, strictSettings, () => 0.42);
    const paid = applySwap(g2, 'p1', g2.players[0].rack.slice(0, 2).map(t => t.id));
    if (!paid.ok) throw new Error(paid.reason);
    expect(paid.state.currentPlayerIndex).toBe(1);
  });

  it('limited free swaps run out', () => {
    const lim = { ...settings, freeSwaps: 'limited' as const, freeSwapLimit: 1 };
    const g = createGame(players, lim, () => 0.42);
    const one = applySwap(g, 'p1', [g.players[0].rack[0].id]);
    if (!one.ok) throw new Error(one.reason);
    expect(one.state.currentPlayerIndex).toBe(0);
    const two = applySwap(one.state, 'p1', [one.state.players[0].rack[0].id]);
    if (!two.ok) throw new Error(two.reason);
    expect(two.state.currentPlayerIndex).toBe(1); // second swap is no longer free
  });

  it('take-back restores the rack correctly when the bag underflowed during the play', () => {
    const g = createGame(players, settings, () => 0.42);
    const scarceBag = g.bag.slice(0, 1); // only 1 tile left, player will place 2
    const s: GameState = { ...g, bag: scarceBag };
    const placements = firstMovePlacements(s, 2);
    const played = applyPlay(s, 'p1', placements);
    if (!played.ok) throw new Error(played.reason);
    // Bag underflowed: only 1 tile was available to draw for 2 placed.
    expect(played.state.players[0].rack).toHaveLength(6);
    expect(played.state.bag).toHaveLength(0);
    const undone = applyTakeBack(played.state, 'p1');
    if (!undone.ok) throw new Error(undone.reason);
    expect(undone.state.players[0].rack.map(t => t.id).sort())
      .toEqual(g.players[0].rack.map(t => t.id).sort());
    expect(undone.state.bag.map(t => t.id).sort()).toEqual(scarceBag.map(t => t.id).sort());
  });

  it('paid swaps do not increment swapsUsed', () => {
    const lim = { ...settings, freeSwaps: 'limited' as const, freeSwapLimit: 1 };
    const g = createGame(players, lim, () => 0.42);
    const one = applySwap(g, 'p1', [g.players[0].rack[0].id]);
    if (!one.ok) throw new Error(one.reason);
    expect(one.state.players[0].swapsUsed).toBe(1); // free swap consumed
    const two = applySwap(one.state, 'p1', [one.state.players[0].rack[0].id]);
    if (!two.ok) throw new Error(two.reason);
    expect(two.state.players[0].swapsUsed).toBe(1); // paid swap: unchanged
  });

  it('game ends after everyone passes twice in a row', () => {
    const g = createGame(players, settings, () => 0.42);
    let s = g;
    for (const pid of ['p1', 'p2', 'p1', 'p2']) {
      const r = applyPass(s, pid);
      if (!r.ok) throw new Error(r.reason);
      s = r.state;
    }
    expect(s.phase).toBe('ended');
  });

  it('finalizeGame deducts racks and pays the out-player', () => {
    const g = createGame(players, settings, () => 0.42);
    const s: GameState = {
      ...g,
      bag: [],
      players: [
        { ...g.players[0], rack: [], score: 100 },
        { ...g.players[1], rack: [{ id: 'z', letter: 'Q', value: 10, isBlank: false }], score: 100 },
      ],
    };
    const done = finalizeGame(s);
    expect(done.players[0].score).toBe(110); // +10 from Ben's rack
    expect(done.players[1].score).toBe(90);
    expect(done.winnerIds).toEqual(['p1']);
    expect(done.phase).toBe('ended');
  });
});
