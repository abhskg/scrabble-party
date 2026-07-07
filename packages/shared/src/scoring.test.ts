import { describe, it, expect } from 'vitest';
import { createEmptyBoard } from './board.js';
import { scoreMove, findWordsFormed } from './scoring.js';
import { LETTER_VALUES } from './tiles.js';
import type { Board, Placement, Tile } from './types.js';

let n = 0;
const tile = (letter: string, isBlank = false): Tile => ({
  id: `s${n++}`, letter: isBlank ? '_' : letter, value: isBlank ? 0 : LETTER_VALUES[letter],
  isBlank, ...(isBlank ? { assignedLetter: letter } : {}),
});
const p = (letter: string, row: number, col: number, isBlank = false): Placement =>
  ({ tile: tile(letter, isBlank), row, col });
const put = (b: Board, letter: string, row: number, col: number) => { b[row][col] = tile(letter); };

describe('scoring', () => {
  it('scores CAT on first move with center DW: (3+1+1)*2 = 10', () => {
    const { total, words } = scoreMove(createEmptyBoard(), [p('C', 7, 6), p('A', 7, 7), p('T', 7, 8)]);
    expect(words).toHaveLength(1);
    expect(words[0].word).toBe('CAT');
    expect(total).toBe(10);
  });

  it('letter premium applies before word premium', () => {
    // QI at (7,7),(7,8): center DW doubles the word; no letter premium there.
    // Q=10, I=1 -> 22
    expect(scoreMove(createEmptyBoard(), [p('Q', 7, 7), p('I', 7, 8)]).total).toBe(22);
  });

  it('premiums do not count for previously placed tiles', () => {
    const b = createEmptyBoard();
    put(b, 'C', 7, 6); put(b, 'A', 7, 7); put(b, 'T', 7, 8);
    // Hook S at (7,9): CATS = 3+1+1+1 = 6, no premium at (7,9)... actually (7,9) is plain.
    const { total, words } = scoreMove(b, [p('S', 7, 9)]);
    expect(words[0].word).toBe('CATS');
    expect(total).toBe(6);
  });

  it('scores cross-words', () => {
    const b = createEmptyBoard();
    put(b, 'C', 7, 6); put(b, 'A', 7, 7); put(b, 'T', 7, 8);
    // Play AN vertically: A(6,7) already? no — place N(8,7) and use existing A(7,7)?
    // Place 'N' at (8,7) plus 'O' at (8,8): forms NO (main, row 8) + AN (cross at col 7) + TO (cross at col 8)
    const { words, total } = scoreMove(b, [p('N', 8, 7), p('O', 8, 8)]);
    const found = words.map(w => w.word).sort();
    expect(found).toEqual(['AN', 'NO', 'TO']);
    // NO: N1+O1=2 (8,8 is TL for O? premiumAt(8,8)='DL') -> O doubled: N1+O2=3
    // AN: A1+N1=2 ; TO: T1+O2=3 (same DL applies to its cross-word)
    expect(total).toBe(3 + 2 + 3);
  });

  it('blank tiles score zero but form words', () => {
    const b = createEmptyBoard();
    const { total, words } = scoreMove(b, [p('C', 7, 6), p('A', 7, 7, true), p('T', 7, 8)]);
    expect(words[0].word).toBe('CAT');
    expect(total).toBe((3 + 0 + 1) * 2);
  });

  it('awards 50-point bingo for using 7 tiles', () => {
    const placements = 'AEROBIC'.split('').map((l, i) => p(l, 7, 4 + i));
    const { total, bingo } = scoreMove(createEmptyBoard(), placements);
    expect(bingo).toBe(true);
    // A1 E1 R1 O1 B3 I1 C3 = 11; DL at (7,3)? no. (7,7) DW; (7,11) DL under C.
    // letters: A(7,4) E(7,5) R(7,6) O(7,7 DW) B(7,8) I(7,9) C(7,10)
    // sum = 11, word x2 = 22, +50 = 72
    expect(total).toBe(72);
  });
});
