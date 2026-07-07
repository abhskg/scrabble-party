import { create } from 'zustand';
import { io, type Socket } from 'socket.io-client';
import type { ClientSnapshot, GameSettings, Placement } from '@scrabble/shared';

interface SavedSeat { code: string; token: string; playerId: string }

interface GameStore {
  socket: Socket | null;
  snapshot: ClientSnapshot | null;
  playerId: string | null;
  token: string | null;
  roomCode: string | null;
  hostToken: string | null;
  toast: { kind: string; text: string } | null;
  connect(): void;
  createRoom(settings: GameSettings): Promise<string>;
  joinRoom(code: string, name: string, avatar: string): Promise<{ ok: boolean; error?: string }>;
  watchRoom(code: string): Promise<boolean>;
  startGame(): Promise<{ ok: boolean; error?: string }>;
  play(placements: Placement[]): Promise<{ ok: boolean; error?: string }>;
  swap(tileIds: string[]): Promise<{ ok: boolean; error?: string }>;
  pass(): Promise<{ ok: boolean; error?: string }>;
  takeBack(): Promise<{ ok: boolean; error?: string }>;
  challenge(): Promise<{ ok: boolean; error?: string }>;
  vote(allow: boolean): Promise<{ ok: boolean; error?: string }>;
  clearToast(): void;
}

const SEAT_KEY = 'scrabble-seat';
const loadSeat = (): SavedSeat | null => {
  try { return JSON.parse(localStorage.getItem(SEAT_KEY) ?? 'null'); } catch { return null; }
};

export const useGame = create<GameStore>((set, get) => {
  const ask = <T>(event: string, payload?: unknown): Promise<T> =>
    new Promise(resolve => {
      const { socket } = get();
      if (!socket) return resolve({ ok: false, error: 'Not connected.' } as T);
      payload === undefined ? socket.emit(event, resolve) : socket.emit(event, payload, resolve);
    });

  const seatArgs = () => ({ code: get().roomCode!, token: get().token! });

  return {
    socket: null, snapshot: null, playerId: null, token: null,
    roomCode: null, hostToken: null, toast: null,

    connect() {
      if (get().socket) return;
      const socket = io();
      socket.on('game:state', (snapshot: ClientSnapshot) => set({ snapshot }));
      socket.on('game:toast', (toast: { kind: string; text: string }) => set({ toast }));
      socket.on('connect', () => {
        const saved = loadSeat();
        if (saved) {
          socket.emit('room:reconnect', { code: saved.code, token: saved.token }, (res: { ok: boolean }) => {
            if (res.ok) set({ roomCode: saved.code, token: saved.token, playerId: saved.playerId });
            else localStorage.removeItem(SEAT_KEY);
          });
        }
      });
      set({ socket });
    },

    async createRoom(settings) {
      const res = await ask<{ code: string; hostToken: string }>('room:create', settings);
      set({ roomCode: res.code, hostToken: res.hostToken });
      return res.code;
    },

    async joinRoom(code, name, avatar) {
      const res = await ask<{ ok: true; playerId: string; token: string } | { ok: false; error: string }>(
        'room:join', { code, name, avatar });
      if (res.ok === true) {
        set({ roomCode: code, token: res.token, playerId: res.playerId });
        localStorage.setItem(SEAT_KEY, JSON.stringify({ code, token: res.token, playerId: res.playerId }));
        return { ok: true };
      }
      return { ok: false, error: (res as { ok: false; error: string }).error };
    },

    async watchRoom(code) {
      const res = await ask<{ ok: boolean }>('room:watch', { code });
      if (res.ok) set({ roomCode: code });
      return res.ok;
    },

    startGame: () => ask('game:start', { code: get().roomCode!, hostToken: get().hostToken! }),
    play: placements => ask('move:play', { ...seatArgs(), placements }),
    swap: tileIds => ask('move:swap', { ...seatArgs(), tileIds }),
    pass: () => ask('move:pass', seatArgs()),
    takeBack: () => ask('move:takeback', seatArgs()),
    challenge: () => ask('challenge:start', seatArgs()),
    vote: allow => ask('vote:cast', { ...seatArgs(), allow }),
    clearToast: () => set({ toast: null }),
  };
});
