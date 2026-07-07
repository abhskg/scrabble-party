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

  it('strips drawnTileIds from lastMove for everyone, including the mover', () => {
    const { room, aId, bId } = makeStartedRoom();
    room.game!.lastMove = {
      playerId: aId,
      placements: [],
      score: 12,
      words: ['CAT'],
      drawnTileIds: ['t0', 't1', 't2'],
    };
    const snapForMover = snapshotFor(room, aId);
    const snapForOther = snapshotFor(room, bId);
    const snapForSpectator = snapshotFor(room, null);
    expect(snapForMover.lastMove).not.toBeNull();
    expect((snapForMover.lastMove as Record<string, unknown>).drawnTileIds).toBeUndefined();
    expect((snapForOther.lastMove as Record<string, unknown>).drawnTileIds).toBeUndefined();
    expect((snapForSpectator.lastMove as Record<string, unknown>).drawnTileIds).toBeUndefined();
    expect(snapForMover.lastMove?.score).toBe(12);
    expect(snapForMover.lastMove?.words).toEqual(['CAT']);
  });
});
