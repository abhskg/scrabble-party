import { describe, it, expect } from 'vitest';
import { createGame, applyPlay } from './engine.js';
import { startChallenge, startOverrideVote, castVote, resolveVoteWith } from './votes.js';
import type { GameSettings, GameState, Placement } from './types.js';

const settings: GameSettings = { dictionaryMode: 'off', takeBacks: false, freeSwaps: 'off', freeSwapLimit: 0 };
const seats = [
  { id: 'p1', name: 'Amy', avatar: '🦊' },
  { id: 'p2', name: 'Ben', avatar: '🐸' },
  { id: 'p3', name: 'Cy', avatar: '🐼' },
];

function playFirstWord(g: GameState) {
  const rack = g.players[0].rack;
  const placements: Placement[] = rack.slice(0, 3).map((tile, i) => ({
    tile: tile.isBlank ? { ...tile, assignedLetter: 'E' } : tile, row: 7, col: 6 + i,
  }));
  const r = applyPlay(g, 'p1', placements);
  if (!r.ok) throw new Error(r.reason);
  return r.state;
}

describe('challenge votes', () => {
  it('challenger opens a vote; mover cannot challenge self', () => {
    const s = playFirstWord(createGame(seats, settings, () => 0.42));
    expect(startChallenge(s, 'p1').ok).toBe(false);
    const c = startChallenge(s, 'p2');
    if (!c.ok) throw new Error(c.reason);
    expect(c.state.phase).toBe('voting');
    expect(c.state.pendingVote?.eligibleVoterIds.sort()).toEqual(['p2', 'p3']);
  });

  it('majority disallow retracts the move and the mover loses the turn', () => {
    const s = playFirstWord(createGame(seats, settings, () => 0.42));
    const moverScore = s.players[0].score;
    expect(moverScore).toBeGreaterThan(0);
    const c = startChallenge(s, 'p2');
    if (!c.ok) throw new Error(c.reason);
    let v = castVote(c.state, 'p2', false);
    if (!v.ok) throw new Error(v.reason);
    expect(v.state.phase).toBe('voting'); // p3 hasn't voted
    v = castVote(v.state, 'p3', false);
    if (!v.ok) throw new Error(v.reason);
    expect(v.state.phase).toBe('playing');
    expect(v.state.players[0].score).toBe(0);
    expect(v.state.board[7][7]).toBeNull();
    expect(v.state.currentPlayerIndex).toBe(1); // turn stays advanced
  });

  it('tie counts as allow (leniency)', () => {
    const s = playFirstWord(createGame(seats, settings, () => 0.42));
    const c = startChallenge(s, 'p2');
    if (!c.ok) throw new Error(c.reason);
    let v = castVote(c.state, 'p2', false);
    if (!v.ok) throw new Error(v.reason);
    v = castVote(v.state, 'p3', true);
    if (!v.ok) throw new Error(v.reason);
    expect(v.state.players[0].score).toBeGreaterThan(0); // move stands
  });
});

describe('override votes', () => {
  it('majority allow applies the rejected play', () => {
    const g = createGame(seats, { ...settings, dictionaryMode: 'override' }, () => 0.42);
    const rack = g.players[0].rack;
    const placements: Placement[] = rack.slice(0, 3).map((tile, i) => ({
      tile: tile.isBlank ? { ...tile, assignedLetter: 'E' } : tile, row: 7, col: 6 + i,
    }));
    const voting = startOverrideVote(g, 'XYZZY', 'p1', placements);
    expect(voting.phase).toBe('voting');
    let v = castVote(voting, 'p2', true);
    if (!v.ok) throw new Error(v.reason);
    v = castVote(v.state, 'p3', true);
    if (!v.ok) throw new Error(v.reason);
    expect(v.state.board[7][7]).not.toBeNull();
    expect(v.state.currentPlayerIndex).toBe(1);
  });

  it('majority deny drops the move; player keeps the turn', () => {
    const g = createGame(seats, { ...settings, dictionaryMode: 'override' }, () => 0.42);
    const rack = g.players[0].rack;
    const placements: Placement[] = rack.slice(0, 3).map((tile, i) => ({
      tile: tile.isBlank ? { ...tile, assignedLetter: 'E' } : tile, row: 7, col: 6 + i,
    }));
    const voting = startOverrideVote(g, 'XYZZY', 'p1', placements);
    let v = castVote(voting, 'p2', false);
    if (!v.ok) throw new Error(v.reason);
    v = castVote(v.state, 'p3', false);
    if (!v.ok) throw new Error(v.reason);
    expect(v.state.board[7][7]).toBeNull();
    expect(v.state.currentPlayerIndex).toBe(0); // retries their turn
    expect(v.state.phase).toBe('playing');
  });
});

describe('resolveVoteWith (host force-close)', () => {
  // 4 seats so a challenge vote has 3 eligible voters (everyone but the mover).
  const fourSeats = [
    { id: 'p1', name: 'Amy', avatar: '🦊' },
    { id: 'p2', name: 'Ben', avatar: '🐸' },
    { id: 'p3', name: 'Cy', avatar: '🐼' },
    { id: 'p4', name: 'Dee', avatar: '🐨' },
  ];

  it('resolves allow when only one connected voter has voted allow and the rest are disconnected', () => {
    const s = playFirstWord(createGame(fourSeats, settings, () => 0.42));
    const c = startChallenge(s, 'p2');
    if (!c.ok) throw new Error(c.reason);
    expect(c.state.pendingVote?.eligibleVoterIds.sort()).toEqual(['p2', 'p3', 'p4']);
    let v = castVote(c.state, 'p2', true);
    if (!v.ok) throw new Error(v.reason);
    expect(v.state.phase).toBe('voting'); // p3, p4 haven't voted

    // p3 and p4 are disconnected; only p2 is connected and has voted allow.
    const resolved = resolveVoteWith(v.state, new Set(['p2']));
    if (!resolved.ok) throw new Error(resolved.reason);
    expect(resolved.state.phase).toBe('playing');
    expect(resolved.state.pendingVote).toBeNull();
    expect(resolved.state.players[0].score).toBeGreaterThan(0); // move stands
  });

  it('resolves disallow and retracts the move when 2 of 3 present voters voted disallow', () => {
    const s = playFirstWord(createGame(fourSeats, settings, () => 0.42));
    const c = startChallenge(s, 'p2');
    if (!c.ok) throw new Error(c.reason);
    let v = castVote(c.state, 'p2', false);
    if (!v.ok) throw new Error(v.reason);
    v = castVote(v.state, 'p3', false);
    if (!v.ok) throw new Error(v.reason);
    expect(v.state.phase).toBe('voting'); // p4 hasn't voted

    // p4 is disconnected; p2 and p3 (both disallow) are connected.
    const resolved = resolveVoteWith(v.state, new Set(['p2', 'p3']));
    if (!resolved.ok) throw new Error(resolved.reason);
    expect(resolved.state.phase).toBe('playing');
    expect(resolved.state.players[0].score).toBe(0);
    expect(resolved.state.board[7][7]).toBeNull();
  });

  it('defaults to allow when nobody connected has voted', () => {
    const s = playFirstWord(createGame(fourSeats, settings, () => 0.42));
    const c = startChallenge(s, 'p2');
    if (!c.ok) throw new Error(c.reason);
    const resolved = resolveVoteWith(c.state, new Set());
    if (!resolved.ok) throw new Error(resolved.reason);
    expect(resolved.state.phase).toBe('playing');
    expect(resolved.state.players[0].score).toBeGreaterThan(0); // move stands (leniency default)
  });

  it('errors when there is no vote in progress', () => {
    const s = playFirstWord(createGame(fourSeats, settings, () => 0.42));
    const resolved = resolveVoteWith(s, new Set());
    expect(resolved.ok).toBe(false);
  });
});
