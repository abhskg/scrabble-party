import { useState } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { useGame } from '../store';
import { BoardView } from '../components/BoardView';
import { GameOver } from '../components/GameOver';
import { VoteSheet } from '../components/VoteSheet';

export function BigScreen() {
  const snapshot = useGame(s => s.snapshot);
  const hostToken = useGame(s => s.hostToken);
  const startGame = useGame(s => s.startGame);
  const [error, setError] = useState('');
  if (!snapshot) return <div className="display" style={{ padding: 40 }}>Setting up…</div>;

  const joinUrl = `${window.location.origin}/#/?room=${snapshot.roomCode}`;

  if (snapshot.phase === 'lobby') {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh', gap: 20, padding: 20, textAlign: 'center' }}>
        <motion.h1 animate={{ rotate: [-2, 2] }} transition={{ repeat: Infinity, repeatType: 'mirror', duration: 1.4 }}
          style={{ fontSize: 'clamp(2rem, 6vw, 4rem)', margin: 0 }}>
          🎉 Scrabble Party
        </motion.h1>
        <div className="card" style={{ display: 'grid', gap: 12, placeItems: 'center' }}>
          <div className="display" style={{ fontSize: 'clamp(3rem, 10vw, 6rem)', letterSpacing: '0.3em' }}>
            {snapshot.roomCode}
          </div>
          <QRCodeSVG value={joinUrl} size={220} />
          <div>{joinUrl}</div>
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', fontSize: '1.5rem' }}>
          {snapshot.seats.map(s => (
            <motion.div key={s.playerId} initial={{ scale: 0 }} animate={{ scale: 1 }} className="display">
              {s.avatar} {s.name}
            </motion.div>
          ))}
          {snapshot.seats.length === 0 && <span>Waiting for players… 📱</span>}
        </div>
        {hostToken && (
          <button className="btn primary" style={{ fontSize: '1.4rem' }}
            disabled={snapshot.seats.length < 2}
            onClick={async () => {
              const res = await startGame();
              if (!res.ok) setError(res.error ?? 'Could not start.');
            }}>
            Start the game! 🚀 ({snapshot.seats.length}/8)
          </button>
        )}
        {error && <div style={{ color: 'var(--pop-pink)', fontWeight: 700 }}>{error}</div>}
      </div>
    );
  }

  if (snapshot.phase === 'ended') return <GameOver />;

  const current = snapshot.players.find(p => p.id === snapshot.currentPlayerId);
  const highlight = new Set((snapshot.lastMove?.placements ?? []).map(p => `${p.row},${p.col}`));

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, padding: 16, minHeight: '100dvh', justifyContent: 'center' }}>
      <div style={{ flex: '1 1 500px', maxWidth: 700, display: 'flex' }}>
        <BoardView board={snapshot.board!} staged={[]} highlight={highlight} />
      </div>
      <div style={{ flex: '0 1 300px', display: 'grid', gap: 12, alignContent: 'start' }}>
        <motion.div key={snapshot.currentPlayerId ?? ''} className="card display"
          initial={{ scale: 0.8 }} animate={{ scale: 1 }}
          style={{ textAlign: 'center', fontSize: '1.4rem', background: 'var(--pop-pink)', color: 'white' }}>
          {current?.avatar} {current?.name}’s turn
        </motion.div>
        <div className="card" style={{ display: 'grid', gap: 8 }}>
          {[...snapshot.players].sort((a, b) => b.score - a.score).map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem' }}>
              <span>{p.avatar} {p.name}{!p.connected && ' 💤'}</span>
              <b>{p.score}</b>
            </div>
          ))}
        </div>
        {snapshot.lastMove && (
          <div className="card">
            Last: <b>{snapshot.lastMove.words.join(', ')}</b> for <b>{snapshot.lastMove.score}</b> 🎯
          </div>
        )}
        <div className="card">🎒 Bag: {snapshot.bagCount} tiles</div>
      </div>
      <VoteSheet />
    </div>
  );
}
