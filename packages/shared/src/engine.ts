import { createEmptyBoard } from './board.js';
import { validatePlacement } from './placement.js';
import { scoreMove } from './scoring.js';
import { createTileBag, drawTiles, RACK_SIZE } from './tiles.js';
import type { GameSettings, GameState, Placement, PlayerState } from './types.js';

export type EngineResult = { ok: true; state: GameState } | { ok: false; reason: string };
const fail = (reason: string): EngineResult => ({ ok: false, reason });

export function createGame(
  seats: { id: string; name: string; avatar: string }[],
  settings: GameSettings,
  rng: () => number = Math.random,
): GameState {
  let bag = createTileBag(seats.length, rng);
  const players: PlayerState[] = seats.map(seat => {
    const { drawn, bag: rest } = drawTiles(bag, RACK_SIZE);
    bag = rest;
    return { ...seat, rack: drawn, score: 0, connected: true, swapsUsed: 0 };
  });
  return {
    board: createEmptyBoard(), bag, players, currentPlayerIndex: 0,
    phase: 'playing', settings, consecutivePasses: 0,
    lastMove: null, pendingVote: null, winnerIds: [],
  };
}

function guardTurn(state: GameState, playerId: string): EngineResult | null {
  if (state.phase !== 'playing') return fail('Game is not accepting moves right now.');
  if (state.players[state.currentPlayerIndex].id !== playerId) return fail('Not your turn.');
  return null;
}

const nextIndex = (state: GameState) => (state.currentPlayerIndex + 1) % state.players.length;

export function applyPlay(state: GameState, playerId: string, placements: Placement[]): EngineResult {
  const guard = guardTurn(state, playerId);
  if (guard) return guard;
  const player = state.players[state.currentPlayerIndex];

  const rackIds = new Set(player.rack.map(t => t.id));
  if (!placements.every(pl => rackIds.has(pl.tile.id))) return fail('Tile not in your rack.');
  if (placements.some(pl => pl.tile.isBlank && !/^[A-Z]$/.test(pl.tile.assignedLetter ?? '')))
    return fail('Blank tile needs a letter.');

  const valid = validatePlacement(state.board, placements);
  if (!valid.ok) return fail(valid.reason);

  const { total, words } = scoreMove(state.board, placements);
  const board = state.board.map(r => [...r]);
  for (const { tile, row, col } of placements) board[row][col] = tile;

  const usedIds = new Set(placements.map(pl => pl.tile.id));
  const { drawn, bag } = drawTiles(state.bag, usedIds.size);
  const players = state.players.map((p, i) =>
    i === state.currentPlayerIndex
      ? { ...p, rack: [...p.rack.filter(t => !usedIds.has(t.id)), ...drawn], score: p.score + total }
      : p,
  );

  const next: GameState = {
    ...state, board, bag, players,
    consecutivePasses: 0,
    lastMove: { playerId, placements, score: total, words: words.map(w => w.word) },
    currentPlayerIndex: nextIndex(state),
  };

  // Endgame: bag empty and the mover's rack is empty.
  if (next.bag.length === 0 && players[state.currentPlayerIndex].rack.length === 0) {
    return { ok: true, state: finalizeGame(next) };
  }
  return { ok: true, state: next };
}

export function applySwap(state: GameState, playerId: string, tileIds: string[]): EngineResult {
  const guard = guardTurn(state, playerId);
  if (guard) return guard;
  if (tileIds.length === 0) return fail('Pick tiles to swap.');
  if (state.bag.length < tileIds.length) return fail('Not enough tiles left in the bag.');

  const idx = state.currentPlayerIndex;
  const player = state.players[idx];
  const ids = new Set(tileIds);
  const giving = player.rack.filter(t => ids.has(t.id));
  if (giving.length !== tileIds.length) return fail('Tile not in your rack.');

  const { drawn, bag: afterDraw } = drawTiles(state.bag, tileIds.length);
  const bag = [...afterDraw, ...giving]; // returned tiles go to the back; server reshuffles on its own clock — order is invisible to clients

  const s = state.settings;
  const isFree = s.freeSwaps === 'unlimited' || (s.freeSwaps === 'limited' && player.swapsUsed < s.freeSwapLimit);

  const players = state.players.map((p, i) =>
    i === idx
      ? { ...p, rack: [...p.rack.filter(t => !ids.has(t.id)), ...drawn], swapsUsed: p.swapsUsed + 1 }
      : p,
  );

  return {
    ok: true,
    state: {
      ...state, bag, players,
      consecutivePasses: 0,
      lastMove: null, // a swap invalidates challenge/take-back windows
      currentPlayerIndex: isFree ? state.currentPlayerIndex : nextIndex(state),
    },
  };
}

export function applyPass(state: GameState, playerId: string): EngineResult {
  const guard = guardTurn(state, playerId);
  if (guard) return guard;
  const consecutivePasses = state.consecutivePasses + 1;
  const next: GameState = {
    ...state, consecutivePasses, lastMove: null,
    currentPlayerIndex: nextIndex(state),
  };
  if (consecutivePasses >= state.players.length * 2) {
    return { ok: true, state: finalizeGame(next) };
  }
  return { ok: true, state: next };
}

/** Remove lastMove's tiles from the board and refund tiles/score. Does not change the turn. */
export function retractLastMove(state: GameState): GameState {
  const move = state.lastMove;
  if (!move) return state;
  const board = state.board.map(r => [...r]);
  for (const { row, col } of move.placements) board[row][col] = null;
  const returned = move.placements.map(pl =>
    pl.tile.isBlank ? { ...pl.tile, assignedLetter: undefined } : pl.tile,
  );
  const moverIdx = state.players.findIndex(p => p.id === move.playerId);
  const mover = state.players[moverIdx];
  // Give back the played tiles; return the same number of drawn tiles to the bag.
  const drawnCount = returned.length;
  const giveBack = mover.rack.slice(mover.rack.length - drawnCount);
  const keep = mover.rack.slice(0, mover.rack.length - drawnCount);
  const players = state.players.map((p, i) =>
    i === moverIdx ? { ...p, rack: [...keep, ...returned], score: p.score - move.score } : p,
  );
  return { ...state, board, players, bag: [...state.bag, ...giveBack], lastMove: null };
}

export function applyTakeBack(state: GameState, playerId: string): EngineResult {
  if (!state.settings.takeBacks) return fail('Take-backs are disabled.');
  if (!state.lastMove || state.lastMove.playerId !== playerId) return fail('Nothing to take back.');
  const moverIdx = state.players.findIndex(p => p.id === playerId);
  const retracted = retractLastMove(state);
  return { ok: true, state: { ...retracted, currentPlayerIndex: moverIdx } };
}

export function finalizeGame(state: GameState): GameState {
  const rackValue = (p: PlayerState) => p.rack.reduce((s, t) => s + t.value, 0);
  const totalRemaining = state.players.reduce((s, p) => s + rackValue(p), 0);
  const players = state.players.map(p => {
    const mine = rackValue(p);
    const score = mine === 0 ? p.score + (totalRemaining - mine) : p.score - mine;
    return { ...p, score };
  });
  const top = Math.max(...players.map(p => p.score));
  return {
    ...state, players, phase: 'ended',
    winnerIds: players.filter(p => p.score === top).map(p => p.id),
  };
}
