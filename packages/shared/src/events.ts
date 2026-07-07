import type { GamePhase, GameSettings, PendingVote, LastMove, Cell, Tile, Placement } from './types.js';

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

export interface ClientToServer {
  'room:create': (settings: GameSettings, cb: (res: { code: string; hostToken: string }) => void) => void;
  'room:join': (p: { code: string; name: string; avatar: string }, cb: (res: { ok: true; playerId: string; token: string } | { ok: false; error: string }) => void) => void;
  'room:reconnect': (p: { code: string; token: string }, cb: (res: { ok: boolean }) => void) => void;
  'room:watch': (p: { code: string }, cb: (res: { ok: boolean }) => void) => void;
  'game:start': (p: { code: string; hostToken: string }, cb: (res: { ok: boolean; error?: string }) => void) => void;
  'move:play': (p: { code: string; token: string; placements: Placement[] }, cb: (res: { ok: boolean; error?: string }) => void) => void;
  'move:swap': (p: { code: string; token: string; tileIds: string[] }, cb: (res: { ok: boolean; error?: string }) => void) => void;
  'move:pass': (p: { code: string; token: string }, cb: (res: { ok: boolean; error?: string }) => void) => void;
  'move:takeback': (p: { code: string; token: string }, cb: (res: { ok: boolean; error?: string }) => void) => void;
  'challenge:start': (p: { code: string; token: string }, cb: (res: { ok: boolean; error?: string }) => void) => void;
  'vote:cast': (p: { code: string; token: string; allow: boolean }, cb: (res: { ok: boolean; error?: string }) => void) => void;
  'host:skip': (p: { code: string; hostToken: string }, cb: (res: { ok: boolean; error?: string }) => void) => void;
}

export interface ServerToClient {
  'game:state': (snapshot: ClientSnapshot) => void;
  'game:toast': (msg: { kind: 'info' | 'error' | 'party'; text: string }) => void;
}
