import { describe, it, expect } from 'vitest';
import { createEmptyBoard, premiumAt, BOARD_SIZE, CENTER } from './board.js';

describe('board', () => {
  it('creates a 15x15 empty board', () => {
    const b = createEmptyBoard();
    expect(b).toHaveLength(BOARD_SIZE);
    expect(b.every(row => row.length === BOARD_SIZE && row.every(c => c === null))).toBe(true);
  });

  it('has triple-word squares at the classic corners and edges', () => {
    for (const [r, c] of [[0, 0], [0, 7], [0, 14], [7, 0], [7, 14], [14, 0], [14, 7], [14, 14]]) {
      expect(premiumAt(r, c)).toBe('TW');
    }
  });

  it('center square is a double-word square', () => {
    expect(premiumAt(CENTER, CENTER)).toBe('DW');
  });

  it('has the classic triple-letter squares', () => {
    for (const [r, c] of [[1, 5], [1, 9], [5, 1], [5, 5], [5, 9], [5, 13], [9, 1], [9, 5], [9, 9], [9, 13], [13, 5], [13, 9]]) {
      expect(premiumAt(r, c)).toBe('TL');
    }
  });

  it('sample double-letter and plain squares', () => {
    expect(premiumAt(0, 3)).toBe('DL');
    expect(premiumAt(6, 6)).toBe('DL');
    expect(premiumAt(4, 4)).toBe('DW');
    expect(premiumAt(0, 1)).toBe(null);
  });

  it('is symmetric under 90-degree rotation', () => {
    for (let r = 0; r < 15; r++)
      for (let c = 0; c < 15; c++)
        expect(premiumAt(r, c)).toBe(premiumAt(c, 14 - r));
  });
});
