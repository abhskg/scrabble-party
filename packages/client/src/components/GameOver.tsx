import { motion } from 'framer-motion';
import { useGame } from '../store';

const CONFETTI = ['🎉', '✨', '🎊', '⭐', '💛'];

export function GameOver() {
  const snapshot = useGame(s => s.snapshot);
  if (!snapshot) return null;
  const ranked = [...snapshot.players].sort((a, b) => b.score - a.score);
  const winners = ranked.filter(p => snapshot.winnerIds.includes(p.id));

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center', position: 'relative' }}>
      {Array.from({ length: 24 }, (_, i) => (
        <motion.span key={i}
          initial={{ y: -40, x: Math.random() * 320 - 160, opacity: 1 }}
          animate={{ y: 600, rotate: Math.random() * 720 }}
          transition={{ duration: 2.5 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
          style={{ position: 'absolute', left: '50%', fontSize: 22, pointerEvents: 'none' }}>
          {CONFETTI[i % CONFETTI.length]}
        </motion.span>
      ))}
      <h1 style={{ fontSize: '2.2rem' }}>
        🏆 {winners.map(w => `${w.avatar} ${w.name}`).join(' & ')} win{winners.length === 1 ? 's' : ''}!
      </h1>
      <div className="card" style={{ display: 'grid', gap: 8 }}>
        {ranked.map((p, i) => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem' }}>
            <span>{i + 1}. {p.avatar} {p.name}</span><b>{p.score}</b>
          </div>
        ))}
      </div>
      <p style={{ marginTop: 16 }}>Host can start a fresh room for a rematch! 🔁</p>
    </div>
  );
}
