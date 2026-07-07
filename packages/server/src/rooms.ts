import { nanoid } from 'nanoid';
import type { GameSettings, GameState } from '@scrabble/shared';

export interface Seat {
  playerId: string;
  token: string;
  name: string;
  avatar: string;
  socketId: string | null;
}

export interface Room {
  code: string;
  hostToken: string;
  seats: Seat[];
  settings: GameSettings;
  game: GameState | null;
  modeId: string;
}

const MAX_SEATS = 8;

export class RoomManager {
  private rooms = new Map<string, Room>();

  private newCode(): string {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I/O to avoid confusion
    let code: string;
    do {
      code = Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(settings: GameSettings): Room {
    const room: Room = {
      code: this.newCode(), hostToken: nanoid(),
      seats: [], settings, game: null, modeId: 'classic',
    };
    this.rooms.set(room.code, room);
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  joinRoom(code: string, name: string, avatar: string): { seat: Seat } | { error: string } {
    const room = this.getRoom(code);
    if (!room) return { error: 'Room not found.' };
    if (room.game) return { error: 'Game already started.' };
    if (room.seats.length >= MAX_SEATS) return { error: 'Room is full (8 players max).' };
    const trimmed = name.trim().slice(0, 16);
    if (!trimmed) return { error: 'Name required.' };
    if (room.seats.some(s => s.name.toLowerCase() === trimmed.toLowerCase()))
      return { error: 'That name is taken.' };
    const seat: Seat = { playerId: nanoid(8), token: nanoid(), name: trimmed, avatar, socketId: null };
    room.seats.push(seat);
    return { seat };
  }

  findSeatByToken(code: string, token: string): Seat | undefined {
    return this.getRoom(code)?.seats.find(s => s.token === token);
  }

  removeSeat(code: string, playerId: string): void {
    const room = this.getRoom(code);
    if (room && !room.game) room.seats = room.seats.filter(s => s.playerId !== playerId);
  }
}
