import type { Server, Socket } from 'socket.io';
import {
  createGame, findWordsFormed, startChallenge, startOverrideVote, castVote, MODES,
  type GameSettings, type Placement,
} from '@scrabble/shared';
import { RoomManager, type Room, type Seat } from './rooms.js';
import { snapshotFor } from './snapshot.js';
import { isWordValid } from './dictionary.js';

export function registerSockets(io: Server, rooms: RoomManager, dict: Set<string>): void {
  const watchRoom = (code: string) => `watch:${code}`;

  function broadcast(room: Room): void {
    for (const seat of room.seats) {
      if (seat.socketId) io.to(seat.socketId).emit('game:state', snapshotFor(room, seat.playerId));
    }
    io.to(watchRoom(room.code)).emit('game:state', snapshotFor(room, null));
  }

  function auth(code: string, token: string): { room: Room; seat: Seat } | null {
    const room = rooms.getRoom(code);
    const seat = room && rooms.findSeatByToken(code, token);
    return room && seat ? { room, seat } : null;
  }

  io.on('connection', (socket: Socket) => {
    socket.on('room:create', (settings: GameSettings, cb) => {
      const room = rooms.createRoom(settings);
      socket.join(watchRoom(room.code)); // creator's screen is the big screen
      cb({ code: room.code, hostToken: room.hostToken });
      broadcast(room);
    });

    socket.on('room:watch', ({ code }: { code: string }, cb) => {
      const room = rooms.getRoom(code);
      if (!room) return cb({ ok: false });
      socket.join(watchRoom(room.code));
      cb({ ok: true });
      socket.emit('game:state', snapshotFor(room, null));
    });

    socket.on('room:join', ({ code, name, avatar }: { code: string; name: string; avatar: string }, cb) => {
      const room = rooms.getRoom(code);
      if (!room) return cb({ ok: false, error: 'Room not found.' });
      const res = rooms.joinRoom(code, name, avatar);
      if ('error' in res) return cb({ ok: false, error: res.error });
      res.seat.socketId = socket.id;
      cb({ ok: true, playerId: res.seat.playerId, token: res.seat.token });
      broadcast(room);
    });

    socket.on('room:reconnect', ({ code, token }: { code: string; token: string }, cb) => {
      const found = auth(code, token);
      if (!found) return cb({ ok: false });
      found.seat.socketId = socket.id;
      cb({ ok: true });
      broadcast(found.room);
    });

    socket.on('game:start', ({ code, hostToken }: { code: string; hostToken: string }, cb) => {
      const room = rooms.getRoom(code);
      if (!room || room.hostToken !== hostToken) return cb({ ok: false, error: 'Not the host.' });
      if (room.seats.length < 2) return cb({ ok: false, error: 'Need at least 2 players.' });
      if (room.game) return cb({ ok: false, error: 'Already started.' });
      room.game = createGame(
        room.seats.map(s => ({ id: s.playerId, name: s.name, avatar: s.avatar })),
        room.settings,
      );
      cb({ ok: true });
      broadcast(room);
    });

    function handleMove(
      code: string, token: string, cb: (res: { ok: boolean; error?: string }) => void,
      fn: (room: Room, seat: Seat) => { ok: true } | { ok: false; reason: string },
    ): void {
      const found = auth(code, token);
      if (!found || !found.room.game) return cb({ ok: false, error: 'Not in a running game.' });
      const result = fn(found.room, found.seat);
      if (!result.ok) return cb({ ok: false, error: result.reason });
      cb({ ok: true });
      broadcast(found.room);
    }

    socket.on('move:play', ({ code, token, placements }: { code: string; token: string; placements: Placement[] }, cb) =>
      handleMove(code, token, cb, (room, seat) => {
        const mode = MODES[room.modeId];
        const g = room.game!;
        if (room.settings.dictionaryMode === 'override') {
          if (g.players[g.currentPlayerIndex].id !== seat.playerId) {
            return { ok: false, reason: 'Not your turn.' };
          }
          const pre = mode.validateMove(g, seat.playerId, placements);
          if (!pre.ok) return pre;
          const words = findWordsFormed(g.board, placements);
          const bad = words.find(w => !isWordValid(dict, w.word));
          if (bad) {
            room.game = startOverrideVote(g, bad.word, seat.playerId, placements);
            io.to(socket.id).emit('game:toast', { kind: 'info', text: `"${bad.word}" isn't in the dictionary — group vote started!` });
            return { ok: true };
          }
        }
        const res = mode.play(g, seat.playerId, placements);
        if (!res.ok) return res;
        room.game = res.state;
        return { ok: true };
      }));

    socket.on('move:swap', ({ code, token, tileIds }: { code: string; token: string; tileIds: string[] }, cb) =>
      handleMove(code, token, cb, (room, seat) => {
        const res = MODES[room.modeId].swap(room.game!, seat.playerId, tileIds);
        if (!res.ok) return res;
        room.game = res.state;
        return { ok: true };
      }));

    socket.on('move:pass', ({ code, token }: { code: string; token: string }, cb) =>
      handleMove(code, token, cb, (room, seat) => {
        const res = MODES[room.modeId].pass(room.game!, seat.playerId);
        if (!res.ok) return res;
        room.game = res.state;
        return { ok: true };
      }));

    socket.on('move:takeback', ({ code, token }: { code: string; token: string }, cb) =>
      handleMove(code, token, cb, (room, seat) => {
        const res = MODES[room.modeId].takeBack(room.game!, seat.playerId);
        if (!res.ok) return res;
        room.game = res.state;
        return { ok: true };
      }));

    socket.on('challenge:start', ({ code, token }: { code: string; token: string }, cb) =>
      handleMove(code, token, cb, (room, seat) => {
        const res = startChallenge(room.game!, seat.playerId);
        if (!res.ok) return res;
        room.game = res.state;
        return { ok: true };
      }));

    socket.on('vote:cast', ({ code, token, allow }: { code: string; token: string; allow: boolean }, cb) =>
      handleMove(code, token, cb, (room, seat) => {
        const res = castVote(room.game!, seat.playerId, allow);
        if (!res.ok) return res;
        room.game = res.state;
        return { ok: true };
      }));

    socket.on('disconnect', () => {
      // Mark any seat bound to this socket as away.
      for (const room of rooms.allRooms()) {
        const seat = room.seats.find(s => s.socketId === socket.id);
        if (seat) {
          seat.socketId = null;
          broadcast(room);
        }
      }
    });
  });
}
