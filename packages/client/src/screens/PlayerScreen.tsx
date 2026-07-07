import { useMemo, useState } from 'react';
import type { Placement } from '@scrabble/shared';
import { useGame } from '../store';
import { BoardView } from '../components/BoardView';
import { Rack } from '../components/Rack';
import { VoteSheet } from '../components/VoteSheet';
import { GameOver } from '../components/GameOver';

export function PlayerScreen() {
  const snapshot = useGame(s => s.snapshot);
  const playerId = useGame(s => s.playerId);
  const play = useGame(s => s.play);
  const swap = useGame(s => s.swap);
  const pass = useGame(s => s.pass);
  const takeBack = useGame(s => s.takeBack);
  const challenge = useGame(s => s.challenge);
  const toast = useGame(s => s.toast);
  const clearToast = useGame(s => s.clearToast);

  const [staged, setStaged] = useState<Placement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<'place' | 'swap'>('place');
  const [swapSel, setSwapSel] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  const me = snapshot?.players.find(p => p.id === playerId);
  const myTurn = snapshot?.currentPlayerId === playerId;
  const stagedIds = useMemo(() => new Set(staged.map(p => p.tile.id)), [staged]);
  const rackTiles = (me?.rack ?? []).filter(t => !stagedIds.has(t.id));
  const highlight = useMemo(
    () => new Set((snapshot?.lastMove?.placements ?? []).map(p => `${p.row},${p.col}`)),
    [snapshot?.lastMove],
  );

  if (!snapshot || !me) return null;
  if (snapshot.phase === 'ended') return <GameOver />;

  function onCellTap(row: number, col: number) {
    const existing = staged.find(p => p.row === row && p.col === col);
    if (existing) { setStaged(staged.filter(p => p !== existing)); return; }
    if (!selectedId) return;
    const tile = me!.rack!.find(t => t.id === selectedId);
    if (!tile) return;
    let placed = tile;
    if (tile.isBlank) {
      const letter = (window.prompt('Blank tile — which letter?') ?? '').trim().toUpperCase();
      if (!/^[A-Z]$/.test(letter)) return;
      placed = { ...tile, assignedLetter: letter };
    }
    setStaged([...staged, { tile: placed, row, col }]);
    setSelectedId(null);
  }

  function onRackTap(id: string) {
    if (mode === 'swap') {
      const next = new Set(swapSel);
      next.has(id) ? next.delete(id) : next.add(id);
      setSwapSel(next);
    } else {
      setSelectedId(selectedId === id ? null : id);
    }
  }

  async function act(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError('');
    const res = await fn();
    if (!res.ok) setError(res.error ?? 'That didn’t work.');
    else { setStaged([]); setSwapSel(new Set()); setMode('place'); }
  }

  const current = snapshot.players.find(p => p.id === snapshot.currentPlayerId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <header style={{ display: 'flex', gap: 8, padding: '6px 10px', alignItems: 'center', overflowX: 'auto' }}>
        {snapshot.players.map(p => (
          <div key={p.id} className="display" style={{
            whiteSpace: 'nowrap', padding: '2px 8px', borderRadius: 10,
            background: p.id === snapshot.currentPlayerId ? 'var(--pop-pink)' : 'transparent',
            color: p.id === snapshot.currentPlayerId ? 'white' : 'var(--ink)',
          }}>
            {p.avatar} {p.name}: {p.score}{!p.connected && ' 💤'}
          </div>
        ))}
        <div style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>🎒 {snapshot.bagCount}</div>
      </header>

      <div className="display" style={{ textAlign: 'center', padding: 2 }}>
        {myTurn ? '✨ Your turn!' : `${current?.avatar} ${current?.name} is thinking…`}
      </div>

      <BoardView board={snapshot.board!} staged={staged} onCellTap={myTurn && mode === 'place' ? onCellTap : undefined} highlight={highlight} />

      {(error || toast) && (
        <div onClick={clearToast} style={{ color: 'var(--pop-pink)', textAlign: 'center', fontWeight: 700, padding: 4 }}>
          {error || toast?.text}
        </div>
      )}

      <Rack tiles={rackTiles} selectedId={selectedId} onSelect={onRackTap} swapSelection={swapSel} mode={mode} />

      <div style={{ display: 'flex', gap: 8, padding: '0 8px 10px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {mode === 'place' ? (
          <>
            <button className="btn primary" disabled={!myTurn || staged.length === 0} onClick={() => act(() => play(staged))}>Play ✅</button>
            <button className="btn ghost" disabled={staged.length === 0} onClick={() => setStaged([])}>Clear</button>
            <button className="btn" disabled={!myTurn} onClick={() => setMode('swap')}>Swap 🔄</button>
            <button className="btn ghost" disabled={!myTurn} onClick={() => act(pass)}>Pass 😴</button>
            {snapshot.phase === 'playing' && snapshot.settings.takeBacks && snapshot.lastMove?.playerId === playerId && (
              <button className="btn ghost" onClick={() => act(takeBack)}>Undo ↩️</button>
            )}
            {snapshot.settings.dictionaryMode === 'off' && snapshot.lastMove && snapshot.lastMove.playerId !== playerId && (
              <button className="btn" onClick={() => act(challenge)}>Challenge ⚔️</button>
            )}
          </>
        ) : (
          <>
            <button className="btn primary" disabled={swapSel.size === 0} onClick={() => act(() => swap([...swapSel]))}>
              Swap {swapSel.size} tile{swapSel.size === 1 ? '' : 's'} 🔄
            </button>
            <button className="btn ghost" onClick={() => { setMode('place'); setSwapSel(new Set()); }}>Cancel</button>
          </>
        )}
      </div>

      <VoteSheet />
    </div>
  );
}
