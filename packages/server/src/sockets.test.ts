import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { io as clientIO, type Socket } from 'socket.io-client';
import { RoomManager } from './rooms.js';
import { registerSockets } from './sockets.js';
import type { ClientSnapshot, GameSettings } from '@scrabble/shared';

const settings: GameSettings = { dictionaryMode: 'off', takeBacks: true, freeSwaps: 'off', freeSwapLimit: 0 };

let httpServer: ReturnType<typeof createServer>;
let port: number;
const sockets: Socket[] = [];

function connect(): Promise<Socket> {
  return new Promise(resolve => {
    const s = clientIO(`http://127.0.0.1:${port}`, { transports: ['websocket'] });
    sockets.push(s);
    s.on('connect', () => resolve(s));
  });
}
const emit = <T>(s: Socket, ev: string, ...args: unknown[]): Promise<T> =>
  new Promise(resolve => s.emit(ev, ...args, resolve));
const nextState = (s: Socket): Promise<ClientSnapshot> =>
  new Promise(resolve => s.once('game:state', resolve));

// Waits for the next game:state whose phase matches; guards against stale
// broadcasts (e.g. a lobby-phase snapshot from an earlier room:join) landing
// on a listener that was actually meant to catch a later transition.
function waitForPhase(s: Socket, phase: ClientSnapshot['phase']): Promise<ClientSnapshot> {
  return new Promise(resolve => {
    const handler = (snap: ClientSnapshot) => {
      if (snap.phase === phase) {
        s.off('game:state', handler);
        resolve(snap);
      }
    };
    s.on('game:state', handler);
  });
}

beforeAll(async () => {
  httpServer = createServer();
  const io = new Server(httpServer);
  registerSockets(io, new RoomManager(), new Set(['CAT', 'DOG']));
  await new Promise<void>(r => httpServer.listen(0, r));
  port = (httpServer.address() as { port: number }).port;
});

afterAll(() => {
  sockets.forEach(s => s.disconnect());
  httpServer.close();
});

describe('socket flow', () => {
  it('create -> join -> start -> play a move', async () => {
    const host = await connect();
    const { code, hostToken } = await emit<{ code: string; hostToken: string }>(host, 'room:create', settings);
    expect(code).toMatch(/^[A-Z]{4}$/);

    const amy = await connect();
    const ben = await connect();
    const joinA = await emit<{ ok: true; playerId: string; token: string }>(amy, 'room:join', { code, name: 'Amy', avatar: '🦊' });
    const joinB = await emit<{ ok: true; playerId: string; token: string }>(ben, 'room:join', { code, name: 'Ben', avatar: '🐸' });
    expect(joinA.ok && joinB.ok).toBe(true);

    const amyStatePromise = waitForPhase(amy, 'playing');
    const benStatePromise = waitForPhase(ben, 'playing');
    await emit(host, 'game:start', { code, hostToken });
    const [amySnap, benSnap] = await Promise.all([amyStatePromise, benStatePromise]);
    expect(amySnap.phase).toBe('playing');

    const me = amySnap.players.find(p => p.id === joinA.playerId)!;
    expect(me.rack).toHaveLength(7);
    const other = amySnap.players.find(p => p.id !== joinA.playerId)!;
    expect(other.rack).toBeNull();

    // First player plays two tiles through center.
    const current = amySnap.currentPlayerId === joinA.playerId
      ? { sock: amy, token: joinA.token, snap: amySnap }
      : { sock: ben, token: joinB.token, snap: benSnap };
    const rack = current.snap.players.find(p => p.id === current.snap.currentPlayerId)!.rack!;
    const placements = rack.slice(0, 2).map((tile, i) => ({
      tile: tile.isBlank ? { ...tile, assignedLetter: 'E' } : tile, row: 7, col: 7 + i,
    }));
    const played = await emit<{ ok: boolean; error?: string }>(current.sock, 'move:play',
      { code, token: current.token, placements });
    expect(played.ok).toBe(true);
  });

  it('rejects a move from the wrong player and with a bad token', async () => {
    const host = await connect();
    const { code, hostToken } = await emit<{ code: string; hostToken: string }>(host, 'room:create', settings);

    const amy = await connect();
    const ben = await connect();
    const joinA = await emit<{ ok: true; playerId: string; token: string }>(amy, 'room:join', { code, name: 'Amy2', avatar: '🦊' });
    const joinB = await emit<{ ok: true; playerId: string; token: string }>(ben, 'room:join', { code, name: 'Ben2', avatar: '🐸' });

    const amyStatePromise = waitForPhase(amy, 'playing');
    const benStatePromise = waitForPhase(ben, 'playing');
    await emit(host, 'game:start', { code, hostToken });
    const [amySnap] = await Promise.all([amyStatePromise, benStatePromise]);

    const notCurrent = amySnap.currentPlayerId === joinA.playerId
      ? { sock: ben, token: joinB.token }
      : { sock: amy, token: joinA.token };

    const res = await emit<{ ok: boolean; error?: string }>(notCurrent.sock, 'move:play',
      { code, token: notCurrent.token, placements: [] });
    expect(res.ok).toBe(false);
    expect(res.error).toBeTruthy();

    const badToken = await emit<{ ok: boolean; error?: string }>(amy, 'move:play',
      { code, token: 'garbage-token', placements: [] });
    expect(badToken.ok).toBe(false);
  });

  it('watch gets a spectator snapshot with no racks', async () => {
    const host = await connect();
    const { code } = await emit<{ code: string; hostToken: string }>(host, 'room:create', settings);

    const spectator = await connect();
    const statePromise = nextState(spectator); // register before emitting: ack + push race on the same socket
    const watchRes = await emit<{ ok: boolean }>(spectator, 'room:watch', { code });
    expect(watchRes.ok).toBe(true);

    const spectatorSnap = await statePromise;
    expect(spectatorSnap.roomCode).toBe(code);
    for (const p of spectatorSnap.players) expect(p.rack).toBeNull();
  });

  it('disconnect marks a seat away, reconnect restores it', async () => {
    const host = await connect();
    const { code, hostToken } = await emit<{ code: string; hostToken: string }>(host, 'room:create', settings);

    const amy = await connect();
    const ben = await connect();
    const joinA = await emit<{ ok: true; playerId: string; token: string }>(amy, 'room:join', { code, name: 'Amy3', avatar: '🦊' });
    await emit<{ ok: true; playerId: string; token: string }>(ben, 'room:join', { code, name: 'Ben3', avatar: '🐸' });

    const benAwayPromise = nextState(ben);
    amy.disconnect();
    const benSnapAfterDisconnect = await benAwayPromise;
    const amySeat = benSnapAfterDisconnect.seats.find(s => s.playerId === joinA.playerId)!;
    expect(amySeat.connected).toBe(false);

    const amy2 = await connect();
    const reconnectRes = await emit<{ ok: boolean }>(amy2, 'room:reconnect', { code, token: joinA.token });
    expect(reconnectRes.ok).toBe(true);
  });

  it('override vote: invalid word starts a vote instead of hard-rejecting', async () => {
    const host = await connect();
    const overrideSettings: GameSettings = { dictionaryMode: 'override', takeBacks: true, freeSwaps: 'off', freeSwapLimit: 0 };
    const { code, hostToken } = await emit<{ code: string; hostToken: string }>(host, 'room:create', overrideSettings);

    const amy = await connect();
    const ben = await connect();
    const joinA = await emit<{ ok: true; playerId: string; token: string }>(amy, 'room:join', { code, name: 'Amy4', avatar: '🦊' });
    const joinB = await emit<{ ok: true; playerId: string; token: string }>(ben, 'room:join', { code, name: 'Ben4', avatar: '🐸' });

    const amyStatePromise = waitForPhase(amy, 'playing');
    const benStatePromise = waitForPhase(ben, 'playing');
    await emit(host, 'game:start', { code, hostToken });
    const [amySnap, benSnap] = await Promise.all([amyStatePromise, benStatePromise]);

    const current = amySnap.currentPlayerId === joinA.playerId
      ? { sock: amy, token: joinA.token, snap: amySnap, other: ben }
      : { sock: ben, token: joinB.token, snap: benSnap, other: amy };
    const rack = current.snap.players.find(p => p.id === current.snap.currentPlayerId)!.rack!;
    // Build a two-letter placement extremely unlikely to be a real word (dict is small: only CAT, DOG valid).
    const placements = rack.slice(0, 2).map((tile, i) => ({
      tile: tile.isBlank ? { ...tile, assignedLetter: 'Z' } : tile, row: 7, col: 7 + i,
    }));

    const nextAfterMove = waitForPhase(current.other, 'voting');
    const played = await emit<{ ok: boolean; error?: string }>(current.sock, 'move:play',
      { code, token: current.token, placements });
    expect(played.ok).toBe(true);
    const followUp = await nextAfterMove;
    expect(followUp.phase).toBe('voting');
    expect(followUp.pendingVote).not.toBeNull();
  });
});
