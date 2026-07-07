import { useEffect, useState } from 'react';
import { useGame } from './store';
import { JoinScreen } from './screens/JoinScreen';
import { Lobby } from './screens/Lobby';
import { PlayerScreen } from './screens/PlayerScreen';
import { HostSetup } from './screens/HostSetup';
import { BigScreen } from './screens/BigScreen';

function useHashRoute(): string {
  const [hash, setHash] = useState(window.location.hash || '#/');
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

export default function App() {
  const connect = useGame(s => s.connect);
  const snapshot = useGame(s => s.snapshot);
  const playerId = useGame(s => s.playerId);
  const roomCode = useGame(s => s.roomCode);
  const route = useHashRoute();
  useEffect(() => { connect(); }, [connect]);

  if (route.startsWith('#/host')) return roomCode ? <BigScreen /> : <HostSetup />;
  if (!playerId || !snapshot) return <JoinScreen />;
  if (snapshot.phase === 'lobby') return <Lobby />;
  return <PlayerScreen />;
}
