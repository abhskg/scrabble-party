import type { Board, Premium } from './types.js';

export const BOARD_SIZE = 15;
export const CENTER = 7;

const TW: [number, number][] = [[0, 0], [0, 7], [0, 14], [7, 0], [7, 14], [14, 0], [14, 7], [14, 14]];
const DW: [number, number][] = [
  [1, 1], [2, 2], [3, 3], [4, 4], [7, 7],
  [1, 13], [2, 12], [3, 11], [4, 10],
  [13, 1], [12, 2], [11, 3], [10, 4],
  [13, 13], [12, 12], [11, 11], [10, 10],
];
const TL: [number, number][] = [
  [1, 5], [1, 9], [5, 1], [5, 5], [5, 9], [5, 13],
  [9, 1], [9, 5], [9, 9], [9, 13], [13, 5], [13, 9],
];
const DL: [number, number][] = [
  [0, 3], [0, 11], [2, 6], [2, 8], [3, 0], [3, 7], [3, 14],
  [6, 2], [6, 6], [6, 8], [6, 12], [7, 3], [7, 11],
  [8, 2], [8, 6], [8, 8], [8, 12], [11, 0], [11, 7], [11, 14],
  [12, 6], [12, 8], [14, 3], [14, 11],
];

const premiumMap = new Map<string, Premium>();
for (const [list, kind] of [[TW, 'TW'], [DW, 'DW'], [TL, 'TL'], [DL, 'DL']] as const) {
  for (const [r, c] of list) premiumMap.set(`${r},${c}`, kind);
}

export function premiumAt(row: number, col: number): Premium {
  return premiumMap.get(`${row},${col}`) ?? null;
}

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () => Array<null>(BOARD_SIZE).fill(null));
}
