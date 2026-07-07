import type { ClientSnapshot } from '@scrabble/shared';
import type { Room } from './rooms.js';

export function snapshotFor(room: Room, playerId: string | null): ClientSnapshot {
  const g = room.game;
  return {
    roomCode: room.code,
    modeId: room.modeId,
    settings: room.settings,
    phase: g?.phase ?? 'lobby',
    seats: room.seats.map(s => ({
      playerId: s.playerId, name: s.name, avatar: s.avatar, connected: s.socketId !== null,
    })),
    board: g?.board ?? null,
    players: (g?.players ?? []).map(p => {
      const seat = room.seats.find(s => s.playerId === p.id);
      const connected = !!seat?.socketId;
      return {
        id: p.id, name: p.name, avatar: p.avatar, score: p.score,
        connected,
        rack: p.id === playerId ? p.rack : null,
        rackCount: p.rack.length,
        swapsUsed: p.swapsUsed,
      };
    }),
    currentPlayerId: g ? g.players[g.currentPlayerIndex].id : null,
    bagCount: g?.bag.length ?? 0,
    consecutivePasses: g?.consecutivePasses ?? 0,
    lastMove: g?.lastMove
      ? (({ drawnTileIds: _omit, ...rest }) => rest)(g.lastMove)
      : null,
    pendingVote: g?.pendingVote ?? null,
    winnerIds: g?.winnerIds ?? [],
  };
}
