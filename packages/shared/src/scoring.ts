import { BOARD_SIZE, premiumAt } from './board.js';
import { RACK_SIZE } from './tiles.js';
import type { Board, Placement, Tile } from './types.js';

export interface WordFormed {
  word: string;
  score: number;
  cells: { row: number; col: number }[];
}

const letterOf = (t: Tile): string => (t.isBlank ? (t.assignedLetter ?? '?') : t.letter);

/** Board overlaid with the new placements, plus a set of the new cells. */
function overlay(board: Board, placements: Placement[]) {
  const grid: (Tile | null)[][] = board.map(row => [...row]);
  const fresh = new Set<string>();
  for (const { tile, row, col } of placements) {
    grid[row][col] = tile;
    fresh.add(`${row},${col}`);
  }
  return { grid, fresh };
}

function scanWord(
  grid: (Tile | null)[][], fresh: Set<string>,
  row: number, col: number, dr: number, dc: number,
): WordFormed {
  // rewind to start of word
  while (row - dr >= 0 && col - dc >= 0 && grid[row - dr][col - dc] !== null) { row -= dr; col -= dc; }
  let word = '';
  let score = 0;
  let multiplier = 1;
  const cells: { row: number; col: number }[] = [];
  while (row < BOARD_SIZE && col < BOARD_SIZE && grid[row][col] !== null) {
    const tile = grid[row][col]!;
    let tileScore = tile.value;
    if (fresh.has(`${row},${col}`)) {
      const prem = premiumAt(row, col);
      if (prem === 'DL') tileScore *= 2;
      if (prem === 'TL') tileScore *= 3;
      if (prem === 'DW') multiplier *= 2;
      if (prem === 'TW') multiplier *= 3;
    }
    word += letterOf(tile);
    score += tileScore;
    cells.push({ row, col });
    row += dr; col += dc;
  }
  return { word, score: score * multiplier, cells };
}

export function findWordsFormed(board: Board, placements: Placement[]): WordFormed[] {
  const { grid, fresh } = overlay(board, placements);
  const isRow = new Set(placements.map(pl => pl.row)).size === 1 && placements.length > 1
    ? true
    : new Set(placements.map(pl => pl.col)).size === 1 && placements.length > 1
      ? false
      : true; // single tile: pick row axis as "main", cross scan covers the other
  const [mr, mc] = isRow ? [0, 1] : [1, 0];
  const words: WordFormed[] = [];
  const main = scanWord(grid, fresh, placements[0].row, placements[0].col, mr, mc);
  if (main.word.length >= 2) words.push(main);
  for (const { row, col } of placements) {
    const cross = scanWord(grid, fresh, row, col, mc, mr);
    if (cross.word.length >= 2) words.push(cross);
  }
  return words;
}

export function scoreMove(board: Board, placements: Placement[]) {
  const words = findWordsFormed(board, placements);
  const bingo = placements.length === RACK_SIZE;
  const total = words.reduce((s, w) => s + w.score, 0) + (bingo ? 50 : 0);
  return { total, words, bingo };
}
