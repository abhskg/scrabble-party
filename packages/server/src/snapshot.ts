import type { GamePhase, GameSettings, PendingVote, LastMove, Cell, Tile } from '@scrabble/shared';
import type { Room } from './rooms.js';

export interface SnapshotPlayer {
  id: string;
  name: string;
  avatar: string;
  score: number;
  connected: boolean;
  rack: Tile[] | null;   // only for the recipient
  rackCount: number;
  swapsUsed: number;
}

export interface ClientSnapshot {
  roomCode: string;
  modeId: string;
  settings: GameSettings;
  phase: GamePhase | 'lobby';
  seats: { playerId: string; name: string; avatar: string; connected: boolean }[];
  board: Cell[][] | null;
  players: SnapshotPlayer[];
  currentPlayerId: string | null;
  bagCount: number;
  consecutivePasses: number;
  lastMove: LastMove | null;
  pendingVote: PendingVote | null;
  winnerIds: string[];
}

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
    players: (g?.players ?? []).map(p => ({
      id: p.id, name: p.name, avatar: p.avatar, score: p.score,
      connected: room.seats.find(s => s.playerId === p.id)?.socketId !== null && true,
      rack: p.id === playerId ? p.rack : null,
      rackCount: p.rack.length,
      swapsUsed: p.swapsUsed,
    })),
    currentPlayerId: g ? g.players[g.currentPlayerIndex].id : null,
    bagCount: g?.bag.length ?? 0,
    consecutivePasses: g?.consecutivePasses ?? 0,
    lastMove: g?.lastMove ?? null,
    pendingVote: g?.pendingVote ?? null,
    winnerIds: g?.winnerIds ?? [],
  };
}
