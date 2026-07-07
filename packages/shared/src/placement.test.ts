import { describe, it, expect } from 'vitest';
import { createEmptyBoard, CENTER } from './board.js';
import { validatePlacement } from './placement.js';
import type { Board, Placement, Tile } from './types.js';

let n = 0;
const tile = (letter: string): Tile => ({ id: `x${n++}`, letter, value: 1, isBlank: false });
const put = (board: Board, letter: string, row: number, col: number) => { board[row][col] = tile(letter); };
const p = (letter: string, row: number, col: number): Placement => ({ tile: tile(letter), row, col });

describe('validatePlacement', () => {
  it('accepts a first move through the center', () => {
    const r = validatePlacement(createEmptyBoard(), [p('C', 7, 6), p('A', 7, 7), p('T', 7, 8)]);
    expect(r.ok).toBe(true);
  });

  it('rejects a first move that misses the center', () => {
    const r = validatePlacement(createEmptyBoard(), [p('C', 0, 0), p('A', 0, 1)]);
    expect(r.ok).toBe(false);
  });

  it('rejects a single-tile first move', () => {
    expect(validatePlacement(createEmptyBoard(), [p('A', CENTER, CENTER)]).ok).toBe(false);
  });

  it('rejects tiles not in one line', () => {
    const r = validatePlacement(createEmptyBoard(), [p('C', 7, 7), p('A', 8, 8)]);
    expect(r.ok).toBe(false);
  });

  it('rejects occupied cells and out-of-bounds', () => {
    const b = createEmptyBoard();
    put(b, 'X', 7, 7);
    expect(validatePlacement(b, [p('A', 7, 7), p('B', 7, 8)]).ok).toBe(false);
    expect(validatePlacement(createEmptyBoard(), [p('A', 7, 14), p('B', 7, 15)]).ok).toBe(false);
  });

  it('allows gaps filled by existing tiles', () => {
    const b = createEmptyBoard();
    put(b, 'A', 7, 7);
    // C _ T around existing A: C(7,6) A(existing 7,7) T(7,8)
    expect(validatePlacement(b, [p('C', 7, 6), p('T', 7, 8)]).ok).toBe(true);
  });

  it('rejects true gaps', () => {
    const b = createEmptyBoard();
    put(b, 'A', 7, 7);
    expect(validatePlacement(b, [p('C', 7, 5), p('T', 7, 9)]).ok).toBe(false);
  });

  it('rejects disconnected non-first moves', () => {
    const b = createEmptyBoard();
    put(b, 'A', 7, 7);
    expect(validatePlacement(b, [p('B', 0, 0), p('E', 0, 1)]).ok).toBe(false);
  });

  it('accepts a single tile hooked onto an existing word', () => {
    const b = createEmptyBoard();
    put(b, 'C', 7, 6); put(b, 'A', 7, 7); put(b, 'T', 7, 8);
    expect(validatePlacement(b, [p('S', 7, 9)]).ok).toBe(true);
  });
});
