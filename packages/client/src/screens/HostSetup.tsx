import { useState } from 'react';
import type { GameSettings } from '@scrabble/shared';
import { useGame } from '../store';

export function HostSetup() {
  const createRoom = useGame(s => s.createRoom);
  const [settings, setSettings] = useState<GameSettings>({
    dictionaryMode: 'off', takeBacks: true, freeSwaps: 'limited', freeSwapLimit: 3,
  });
  const set = <K extends keyof GameSettings>(k: K, v: GameSettings[K]) =>
    setSettings({ ...settings, [k]: v });

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '2rem 1rem', display: 'grid', gap: 16 }}>
      <h1 style={{ textAlign: 'center' }}>🎪 Host a game</h1>
      <div className="card" style={{ display: 'grid', gap: 14 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <b>📖 Word checking</b>
          <select className="jolly" value={settings.dictionaryMode}
            onChange={e => set('dictionaryMode', e.target.value as GameSettings['dictionaryMode'])}>
            <option value="off">Anything goes — challenge & vote</option>
            <option value="override">Dictionary, group can override</option>
          </select>
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" checked={settings.takeBacks} onChange={e => set('takeBacks', e.target.checked)} />
          <b>↩️ Allow take-backs</b> (undo before the next player moves)
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <b>🔄 Free tile swaps</b>
          <select className="jolly" value={settings.freeSwaps}
            onChange={e => set('freeSwaps', e.target.value as GameSettings['freeSwaps'])}>
            <option value="off">Off — swapping costs your turn</option>
            <option value="limited">A few freebies per player</option>
            <option value="unlimited">Unlimited freebies</option>
          </select>
        </label>
        {settings.freeSwaps === 'limited' && (
          <label style={{ display: 'grid', gap: 4 }}>
            <b>How many freebies?</b>
            <input className="jolly" type="number" min={1} max={10} value={settings.freeSwapLimit}
              onChange={e => set('freeSwapLimit', Math.max(1, Number(e.target.value) || 1))} />
          </label>
        )}
        <button className="btn primary" onClick={() => createRoom(settings)}>Open the room! 🎉</button>
      </div>
    </div>
  );
}
