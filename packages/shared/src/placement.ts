import { BOARD_SIZE, CENTER } from './board.js';
import type { Board, Placement } from './types.js';

type Result = { ok: true } | { ok: false; reason: string };
const fail = (reason: string): Result => ({ ok: false, reason });

export function validatePlacement(board: Board, placements: Placement[]): Result {
  if (placements.length === 0) return fail('No tiles placed.');

  for (const { row, col } of placements) {
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return fail('Tile off the board.');
    if (board[row][col] !== null) return fail('Square already occupied.');
  }
  const keys = new Set(placements.map(pl => `${pl.row},${pl.col}`));
  if (keys.size !== placements.length) return fail('Two tiles on one square.');

  const rows = new Set(placements.map(pl => pl.row));
  const cols = new Set(placements.map(pl => pl.col));
  const isRow = rows.size === 1;
  const isCol = cols.size === 1;
  if (!isRow && !isCol) return fail('Tiles must be in a single row or column.');

  const boardEmpty = board.every(r => r.every(c => c === null));

  // Contiguity: every cell between min and max along the line must be
  // either newly placed or already occupied.
  const line = isRow
    ? { fixed: placements[0].row, coords: placements.map(pl => pl.col) }
    : { fixed: placements[0].col, coords: placements.map(pl => pl.row) };
  const min = Math.min(...line.coords);
  const max = Math.max(...line.coords);
  for (let i = min; i <= max; i++) {
    const [r, c] = isRow ? [line.fixed, i] : [i, line.fixed];
    if (board[r][c] === null && !keys.has(`${r},${c}`)) return fail('Word has a gap.');
  }

  if (boardEmpty) {
    if (!keys.has(`${CENTER},${CENTER}`)) return fail('First word must cover the center star.');
    if (placements.length < 2) return fail('First word needs at least two letters.');
    return { ok: true };
  }

  const touchesExisting = placements.some(({ row, col }) =>
    [[row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]].some(
      ([r, c]) => r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] !== null,
    ),
  );
  if (!touchesExisting) return fail('Word must connect to tiles on the board.');
  return { ok: true };
}
