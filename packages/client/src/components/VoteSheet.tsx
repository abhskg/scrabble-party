import { motion } from 'framer-motion';
import { useGame } from '../store';

export function VoteSheet() {
  const snapshot = useGame(s => s.snapshot);
  const playerId = useGame(s => s.playerId);
  const vote = useGame(s => s.vote);
  const pending = snapshot?.pendingVote;
  if (!pending) return null;

  const canVote = playerId != null
    && pending.eligibleVoterIds.includes(playerId)
    && !(playerId in pending.votes);
  const voted = Object.keys(pending.votes).length;
  const needed = pending.eligibleVoterIds.length;
  const mover = snapshot!.players.find(p => p.id === pending.targetPlayerId);

  return (
    <motion.div initial={{ y: 200 }} animate={{ y: 0 }}
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50,
        background: 'white', borderTop: '3px solid var(--ink)',
        borderRadius: '20px 20px 0 0', padding: '1rem', textAlign: 'center',
      }}>
      <h2 style={{ margin: '0 0 4px' }}>
        {pending.kind === 'challenge' ? '⚔️ Word challenged!' : '📖 Not in the dictionary!'}
      </h2>
      <p style={{ margin: '0 0 10px' }}>
        Does <b className="display" style={{ fontSize: '1.4rem' }}>{pending.word}</b> by {mover?.avatar} {mover?.name} count?
      </p>
      {canVote ? (
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button className="btn" onClick={() => vote(true)}>👍 Let it stand</button>
          <button className="btn primary" onClick={() => vote(false)}>👎 No way</button>
        </div>
      ) : (
        <p>Votes in: {voted}/{needed} 🗳️</p>
      )}
    </motion.div>
  );
}
