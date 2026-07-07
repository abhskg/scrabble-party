import { motion } from 'framer-motion';
import type { Tile } from '@scrabble/shared';

export function Rack({ tiles, selectedId, onSelect, swapSelection, mode }: {
  tiles: Tile[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  swapSelection: Set<string>;
  mode: 'place' | 'swap';
}) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', padding: '10px 6px' }}>
      {tiles.map(t => {
        const active = mode === 'swap' ? swapSelection.has(t.id) : selectedId === t.id;
        return (
          <motion.button key={t.id} onClick={() => onSelect(t.id)} whileTap={{ scale: 0.9 }}
            animate={{ y: active ? -10 : 0, rotate: active ? -4 : 0 }}
            style={{
              width: 44, height: 48, borderRadius: 8, cursor: 'pointer', position: 'relative',
              background: 'var(--tile)', border: '3px solid var(--tile-edge)',
              boxShadow: active ? '0 6px 0 var(--pop-purple)' : 'var(--shadow)',
              fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--ink)',
            }}>
            {t.isBlank ? '★' : t.letter}
            <sub style={{ fontSize: 9, position: 'absolute', right: 3, bottom: 2 }}>{t.value}</sub>
          </motion.button>
        );
      })}
    </div>
  );
}
