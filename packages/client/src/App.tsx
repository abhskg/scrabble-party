import { useEffect, useState } from 'react';
import { useGame } from './store';

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
  const route = useHashRoute();
  useEffect(() => { connect(); }, [connect]);

  if (route.startsWith('#/host')) return <div className="display">Host view (Task 13)</div>;
  if (route.startsWith('#/play')) return <div className="display">Player view (Task 12)</div>;
  return <div className="display">Join view (Task 11)</div>;
}
