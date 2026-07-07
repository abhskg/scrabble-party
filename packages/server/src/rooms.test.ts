import { describe, it, expect } from 'vitest';
import { RoomManager } from './rooms.js';
import type { GameSettings } from '@scrabble/shared';

const settings: GameSettings = { dictionaryMode: 'off', takeBacks: true, freeSwaps: 'off', freeSwapLimit: 0 };

describe('RoomManager', () => {
  it('creates rooms with unique 4-letter codes', () => {
    const rm = new RoomManager();
    const a = rm.createRoom(settings);
    const b = rm.createRoom(settings);
    expect(a.code).toMatch(/^[A-Z]{4}$/);
    expect(a.code).not.toBe(b.code);
    expect(rm.getRoom(a.code)).toBe(a);
  });

  it('joins players up to 8, rejecting duplicates and overflow', () => {
    const rm = new RoomManager();
    const room = rm.createRoom(settings);
    for (let i = 0; i < 8; i++) {
      const r = rm.joinRoom(room.code, `P${i}`, '🦊');
      expect('seat' in r).toBe(true);
    }
    expect('error' in rm.joinRoom(room.code, 'P9', '🦊')).toBe(true);
    expect('error' in rm.joinRoom(room.code, 'P0', '🦊')).toBe(true); // duplicate name
  });

  it('finds seats by reconnect token', () => {
    const rm = new RoomManager();
    const room = rm.createRoom(settings);
    const joined = rm.joinRoom(room.code, 'Amy', '🦊');
    if (!('seat' in joined)) throw new Error('join failed');
    expect(rm.findSeatByToken(room.code, joined.seat.token)?.playerId).toBe(joined.seat.playerId);
  });
});
