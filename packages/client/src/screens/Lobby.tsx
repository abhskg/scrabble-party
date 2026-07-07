import { motion } from 'framer-motion';
import { useGame } from '../store';

export function Lobby() {
  const snapshot = useGame(s => s.snapshot);
  const playerId = useGame(s => s.playerId);
  if (!snapshot) return null;

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '2rem 1rem', display: 'grid', gap: 16 }}>
      <h1 style={{ textAlign: 'center' }}>Room {snapshot.roomCode}</h1>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Who's here ({snapshot.seats.length}/8)</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          {snapshot.seats.map((s, i) => (
            <motion.div key={s.playerId}
              initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.2rem' }}>
              <span style={{ fontSize: '1.6rem' }}>{s.avatar}</span>
              <b>{s.name}</b>
              {s.playerId === playerId && <span style={{ color: 'var(--pop-purple)' }}>(you)</span>}
              {!s.connected && <span title="away">💤</span>}
            </motion.div>
          ))}
        </div>
      </div>
      <p className="display" style={{ textAlign: 'center' }}>Waiting for the host to start… 🍿</p>
    </div>
  );
}
