import { motion } from 'framer-motion';
import { premiumAt, BOARD_SIZE, CENTER } from '@scrabble/shared';
import type { Cell, Placement } from '@scrabble/shared';

const PREM_BG: Record<string, string> = {
  DL: 'var(--prem-dl)', TL: 'var(--prem-tl)', DW: 'var(--prem-dw)', TW: 'var(--prem-tw)',
};
const PREM_LABEL: Record<string, string> = { DL: '2L', TL: '3L', DW: '2W', TW: '3W' };

export function BoardView({ board, staged, onCellTap, highlight }: {
  board: Cell[][];
  staged: Placement[];
  onCellTap?: (row: number, col: number) => void;
  highlight: Set<string>;
}) {
  const stagedAt = new Map(staged.map(p => [`${p.row},${p.col}`, p.tile]));
  return (
    <div style={{ overflow: 'auto', touchAction: 'pan-x pan-y pinch-zoom', flex: 1 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${BOARD_SIZE}, 34px)`,
        gap: 2, padding: 8, background: 'var(--bg-board)',
        borderRadius: 'var(--radius)', width: 'max-content', margin: '0 auto',
      }}>
        {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => {
          const row = Math.floor(i / BOARD_SIZE), col = i % BOARD_SIZE;
          const placed = board[row][col];
          const pending = stagedAt.get(`${row},${col}`);
          const prem = premiumAt(row, col);
          const tile = placed ?? pending ?? null;
          const letter = tile ? (tile.isBlank ? tile.assignedLetter ?? '?' : tile.letter) : null;
          return (
            <div key={i} onClick={() => !placed && onCellTap?.(row, col)}
              style={{
                width: 34, height: 34, borderRadius: 6, position: 'relative',
                background: tile ? undefined : prem ? PREM_BG[prem] : '#d5ecdf',
                display: 'grid', placeItems: 'center',
                fontSize: 9, fontWeight: 700, color: 'rgba(61,43,31,0.55)',
              }}>
              {!tile && prem && PREM_LABEL[prem]}
              {!tile && !prem && row === CENTER && col === CENTER && '★'}
              {tile && (
                <motion.div layout initial={{ scale: 0.6 }} animate={{ scale: 1 }}
                  style={{
                    position: 'absolute', inset: 0, borderRadius: 6,
                    background: 'var(--tile)', border: '2px solid var(--tile-edge)',
                    display: 'grid', placeItems: 'center',
                    fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--ink)',
                    opacity: pending && !placed ? 0.75 : 1,
                    outline: highlight.has(`${row},${col}`) ? '3px solid var(--pop-purple)' : 'none',
                  }}>
                  {letter}
                  <sub style={{ fontSize: 7, position: 'absolute', right: 2, bottom: 1 }}>{tile.value}</sub>
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
