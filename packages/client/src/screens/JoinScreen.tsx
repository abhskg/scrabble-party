import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../store';
import { AvatarPicker, AVATARS } from '../components/AvatarPicker';

export function JoinScreen() {
  const joinRoom = useGame(s => s.joinRoom);
  const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  const [code, setCode] = useState(params.get('room') ?? '');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const res = await joinRoom(code.trim().toUpperCase(), name, avatar);
    setBusy(false);
    if (!res.ok) setError(res.error ?? 'Could not join.');
  }

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '2rem 1rem', display: 'grid', gap: 16 }}>
      <motion.h1
        initial={{ rotate: -3, scale: 0.9 }} animate={{ rotate: 3, scale: 1 }}
        transition={{ repeat: Infinity, repeatType: 'mirror', duration: 1.6 }}
        style={{ textAlign: 'center', fontSize: '2.4rem', margin: 0 }}
      >
        🎉 Scrabble Party
      </motion.h1>
      <div className="card" style={{ display: 'grid', gap: 12 }}>
        <input className="jolly" placeholder="ROOM CODE" maxLength={4} value={code}
          onChange={e => setCode(e.target.value.toUpperCase())} style={{ textAlign: 'center', letterSpacing: '0.4em' }} />
        <input className="jolly" placeholder="Your name" maxLength={16} value={name}
          onChange={e => setName(e.target.value)} />
        <AvatarPicker value={avatar} onChange={setAvatar} />
        {error && <div style={{ color: 'var(--pop-pink)', fontWeight: 700 }}>{error}</div>}
        <button className="btn primary" disabled={busy || code.length !== 4 || !name.trim()} onClick={submit}>
          Jump in! 🚀
        </button>
      </div>
      <a href="#/host" style={{ textAlign: 'center', color: 'var(--pop-blue)' }}>I'm the host — set up a game</a>
    </div>
  );
}
