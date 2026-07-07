import { describe, it, expect } from 'vitest';
import { RoomManager } from './rooms.js';
import { snapshotFor } from './snapshot.js';
import { createGame } from '@scrabble/shared';
import type { GameSettings } from '@scrabble/shared';

const settings: GameSettings = { dictionaryMode: 'off', takeBacks: true, freeSwaps: 'off', freeSwapLimit: 0 };

function makeStartedRoom() {
  const rm = new RoomManager();
  const room = rm.createRoom(settings);
  const a = rm.joinRoom(room.code, 'Amy', '🦊');
  const b = rm.joinRoom(room.code, 'Ben', '🐸');
  if (!('seat' in a) || !('seat' in b)) throw new Error('join failed');
  room.game = createGame(
    room.seats.map(s => ({ id: s.playerId, name: s.name, avatar: s.avatar })),
    settings,
  );
  return { room, aId: a.seat.playerId, bId: b.seat.playerId };
}

describe('snapshotFor', () => {
  it('shows only the recipient rack; others become counts', () => {
    const { room, aId } = makeStartedRoom();
    const snap = snapshotFor(room, aId);
    const me = snap.players.find(p => p.id === aId)!;
    const other = snap.players.find(p => p.id !== aId)!;
    expect(me.rack).toHaveLength(7);
    expect(other.rack).toBeNull();
    expect(other.rackCount).toBe(7);
    expect(snap.bagCount).toBe(100 - 14);
    expect((snap as Record<string, unknown>).bag).toBeUndefined();
  });

  it('spectator snapshot hides all racks', () => {
    const { room } = makeStartedRoom();
    const snap = snapshotFor(room, null);
    expect(snap.players.every(p => p.rack === null && p.rackCount === 7)).toBe(true);
  });
});
