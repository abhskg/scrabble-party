export interface Tile {
  id: string;
  letter: string;          // 'A'..'Z' or '_' for a blank
  value: number;
  isBlank: boolean;
  assignedLetter?: string; // set when a blank is played
}

export interface Placement { tile: Tile; row: number; col: number }

export type Cell = Tile | null;
export type Board = Cell[][];
export type Premium = 'DL' | 'TL' | 'DW' | 'TW' | null;

export interface PlayerState {
  id: string;
  name: string;
  avatar: string;          // emoji avatar key, e.g. '🦊'
  rack: Tile[];
  score: number;
  connected: boolean;
  swapsUsed: number;
}

export interface GameSettings {
  dictionaryMode: 'off' | 'override';
  takeBacks: boolean;
  freeSwaps: 'off' | 'limited' | 'unlimited';
  freeSwapLimit: number;   // used when freeSwaps === 'limited'
}

export type GamePhase = 'lobby' | 'playing' | 'voting' | 'ended';

export interface PendingVote {
  kind: 'challenge' | 'override';
  word: string;
  targetPlayerId: string;      // player whose move is in question
  votes: Record<string, boolean>; // voterId -> allow?
  eligibleVoterIds: string[];
}

export interface LastMove {
  playerId: string;
  placements: Placement[];
  score: number;
  words: string[];
}

export interface GameState {
  board: Board;
  bag: Tile[];
  players: PlayerState[];
  currentPlayerIndex: number;
  phase: GamePhase;
  settings: GameSettings;
  consecutivePasses: number;
  lastMove: LastMove | null;
  pendingVote: PendingVote | null;
  winnerIds: string[];         // filled when phase === 'ended'
}
