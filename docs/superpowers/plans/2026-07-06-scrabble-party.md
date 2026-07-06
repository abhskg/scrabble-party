# Scrabble Party Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Browser-based 2–8 player Scrabble for LAN parties: one Node server on the host PC, players join from phones via LAN IP/QR, with a big-screen spectator view and host-configurable leniency rules.

**Architecture:** TypeScript monorepo (npm workspaces). `packages/shared` holds a pure, fully unit-tested rules engine used by both sides. `packages/server` (Express + Socket.IO) is authoritative: clients send intents, server validates and broadcasts per-recipient full-state snapshots. `packages/client` (React + Vite + Zustand) renders three views: join/lobby, player game screen (mobile-first), and read-only big-screen host view.

**Tech Stack:** Node 20+, TypeScript 5, Express 4, Socket.IO 4, React 18, Vite 5, Zustand 4, framer-motion 11, Vitest 2, `word-list` (ENABLE dictionary), `qrcode-terminal`, `qrcode.react`.

## Global Constraints

- All game state lives in server memory; no database (spec: Non-Goals v1).
- Board is always 15×15; tile bag is 100 tiles for 2–4 players, 200 for 5–8 (spec: Game Rules Engine).
- Clients never mutate game state directly — intents in, snapshots out; a player's snapshot includes only their own rack, opponents' racks as counts (spec: Architecture).
- Server binds `0.0.0.0:3000` and prints LAN IP + QR on startup (spec: Architecture).
- Room codes are 4 uppercase letters (spec: Architecture).
- The rules engine in `packages/shared` must be pure (no I/O, no sockets, no randomness except an injectable RNG for the bag shuffle).
- v1 ships only `ClassicMode`; the `GameMode` interface is the extension point (spec: Non-Goals).
- Mobile-first UI: base styles target ~375px wide viewports; desktop is the enhancement.
- Run all package scripts from the repo root with `npm run <script> -w packages/<name>`.

---

### Task 1: Monorepo scaffolding

**Files:**
- Create: `package.json`, `tsconfig.base.json`, `.gitignore`
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/index.ts`
- Create: `packages/server/package.json`, `packages/server/tsconfig.json`
- Create: `packages/client/package.json` (via Vite scaffold, then edited)
- Test: `packages/shared/src/smoke.test.ts`

**Interfaces:**
- Produces: workspace layout and scripts every later task relies on: `npm test -w packages/shared`, `npm run dev -w packages/server`, `npm run dev -w packages/client`, `npm run build`.

- [ ] **Step 1: Create root files**

`package.json`:
```json
{
  "name": "scrabble-party",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "npm run build -w packages/shared && npm run build -w packages/client && npm run build -w packages/server",
    "test": "npm test -w packages/shared && npm test -w packages/server",
    "start": "npm run start -w packages/server"
  }
}
```

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true
  }
}
```

`.gitignore`:
```
node_modules/
dist/
*.local
```

- [ ] **Step 2: Create the shared package**

`packages/shared/package.json`:
```json
{
  "name": "@scrabble/shared",
  "version": "0.0.1",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

`packages/shared/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

`packages/shared/src/index.ts`:
```ts
export const SHARED_OK = true;
```

- [ ] **Step 3: Create the server package**

`packages/server/package.json`:
```json
{
  "name": "@scrabble/server",
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "start": "tsx src/main.ts",
    "build": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@scrabble/shared": "*",
    "express": "^4.19.0",
    "socket.io": "^4.7.0",
    "qrcode-terminal": "^0.12.0",
    "word-list": "^4.0.0",
    "nanoid": "^5.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "@types/node": "^20.0.0",
    "@types/qrcode-terminal": "^0.12.0",
    "socket.io-client": "^4.7.0",
    "tsx": "^4.16.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

`packages/server/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src", "types": ["node"] },
  "include": ["src"]
}
```

- [ ] **Step 4: Scaffold the client with Vite**

```bash
cd packages && npm create vite@latest client -- --template react-ts
```

Then edit `packages/client/package.json`: set `"name": "@scrabble/client"` and add dependencies:
```json
{
  "dependencies": {
    "@scrabble/shared": "*",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "socket.io-client": "^4.7.0",
    "zustand": "^4.5.0",
    "framer-motion": "^11.0.0",
    "qrcode.react": "^3.1.0"
  }
}
```

- [ ] **Step 5: Install and add a smoke test**

Run: `npm install` (repo root).

`packages/shared/src/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { SHARED_OK } from './index.js';

describe('workspace', () => {
  it('resolves the shared package', () => {
    expect(SHARED_OK).toBe(true);
  });
});
```

- [ ] **Step 6: Run the smoke test**

Run: `npm test -w packages/shared`
Expected: 1 test PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold npm-workspaces monorepo (shared, server, client)"
```

---

### Task 2: Shared types, board layout, and premium squares

**Files:**
- Create: `packages/shared/src/types.ts`
- Create: `packages/shared/src/board.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/src/board.test.ts`

**Interfaces:**
- Produces:
  - `types.ts`: `Tile { id: string; letter: string; value: number; isBlank: boolean; assignedLetter?: string }`, `Placement { tile: Tile; row: number; col: number }`, `Cell = Tile | null`, `Board = Cell[][]`, `Premium = 'DL' | 'TL' | 'DW' | 'TW' | null`, plus `PlayerState`, `GameSettings`, `GamePhase`, `GameState`, `PendingVote`, `LastMove` (full definitions below).
  - `board.ts`: `BOARD_SIZE = 15`, `CENTER = 7`, `createEmptyBoard(): Board`, `premiumAt(row: number, col: number): Premium`.

- [ ] **Step 1: Write failing tests for the board layout**

`packages/shared/src/board.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createEmptyBoard, premiumAt, BOARD_SIZE, CENTER } from './board.js';

describe('board', () => {
  it('creates a 15x15 empty board', () => {
    const b = createEmptyBoard();
    expect(b).toHaveLength(BOARD_SIZE);
    expect(b.every(row => row.length === BOARD_SIZE && row.every(c => c === null))).toBe(true);
  });

  it('has triple-word squares at the classic corners and edges', () => {
    for (const [r, c] of [[0, 0], [0, 7], [0, 14], [7, 0], [7, 14], [14, 0], [14, 7], [14, 14]]) {
      expect(premiumAt(r, c)).toBe('TW');
    }
  });

  it('center square is a double-word square', () => {
    expect(premiumAt(CENTER, CENTER)).toBe('DW');
  });

  it('has the classic triple-letter squares', () => {
    for (const [r, c] of [[1, 5], [1, 9], [5, 1], [5, 5], [5, 9], [5, 13], [9, 1], [9, 5], [9, 9], [9, 13], [13, 5], [13, 9]]) {
      expect(premiumAt(r, c)).toBe('TL');
    }
  });

  it('sample double-letter and plain squares', () => {
    expect(premiumAt(0, 3)).toBe('DL');
    expect(premiumAt(6, 6)).toBe('DL');
    expect(premiumAt(4, 4)).toBe('DW');
    expect(premiumAt(0, 1)).toBe(null);
  });

  it('is symmetric under 90-degree rotation', () => {
    for (let r = 0; r < 15; r++)
      for (let c = 0; c < 15; c++)
        expect(premiumAt(r, c)).toBe(premiumAt(c, 14 - r));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -w packages/shared`
Expected: FAIL — `board.js` does not exist.

- [ ] **Step 3: Write `types.ts` and `board.ts`**

`packages/shared/src/types.ts`:
```ts
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
```

`packages/shared/src/board.ts`:
```ts
import type { Board, Premium } from './types.js';

export const BOARD_SIZE = 15;
export const CENTER = 7;

const TW: [number, number][] = [[0, 0], [0, 7], [0, 14], [7, 0], [7, 14], [14, 0], [14, 7], [14, 14]];
const DW: [number, number][] = [
  [1, 1], [2, 2], [3, 3], [4, 4], [7, 7],
  [1, 13], [2, 12], [3, 11], [4, 10],
  [13, 1], [12, 2], [11, 3], [10, 4],
  [13, 13], [12, 12], [11, 11], [10, 10],
];
const TL: [number, number][] = [
  [1, 5], [1, 9], [5, 1], [5, 5], [5, 9], [5, 13],
  [9, 1], [9, 5], [9, 9], [9, 13], [13, 5], [13, 9],
];
const DL: [number, number][] = [
  [0, 3], [0, 11], [2, 6], [2, 8], [3, 0], [3, 7], [3, 14],
  [6, 2], [6, 6], [6, 8], [6, 12], [7, 3], [7, 11],
  [8, 2], [8, 6], [8, 8], [8, 12], [11, 0], [11, 7], [11, 14],
  [12, 6], [12, 8], [14, 3], [14, 11],
];

const premiumMap = new Map<string, Premium>();
for (const [list, kind] of [[TW, 'TW'], [DW, 'DW'], [TL, 'TL'], [DL, 'DL']] as const) {
  for (const [r, c] of list) premiumMap.set(`${r},${c}`, kind);
}

export function premiumAt(row: number, col: number): Premium {
  return premiumMap.get(`${row},${col}`) ?? null;
}

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () => Array<null>(BOARD_SIZE).fill(null));
}
```

`packages/shared/src/index.ts` (replace contents):
```ts
export * from './types.js';
export * from './board.js';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -w packages/shared`
Expected: all board tests PASS. Delete `smoke.test.ts` (superseded).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(shared): game types, 15x15 board, premium-square layout"
```

---

### Task 3: Tile bag with player-count scaling

**Files:**
- Create: `packages/shared/src/tiles.ts`
- Modify: `packages/shared/src/index.ts` (add `export * from './tiles.js';`)
- Test: `packages/shared/src/tiles.test.ts`

**Interfaces:**
- Produces: `LETTER_VALUES: Record<string, number>`, `createTileBag(playerCount: number, rng?: () => number): Tile[]` (shuffled; 100 tiles for ≤4 players, 200 for 5+), `drawTiles(bag: Tile[], n: number): { drawn: Tile[]; bag: Tile[] }` (pure — returns a new bag), `RACK_SIZE = 7`.

- [ ] **Step 1: Write failing tests**

`packages/shared/src/tiles.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createTileBag, drawTiles, LETTER_VALUES, RACK_SIZE } from './tiles.js';

describe('tile bag', () => {
  it('has 100 tiles for 2-4 players and 200 for 5-8', () => {
    expect(createTileBag(2)).toHaveLength(100);
    expect(createTileBag(4)).toHaveLength(100);
    expect(createTileBag(5)).toHaveLength(200);
    expect(createTileBag(8)).toHaveLength(200);
  });

  it('has the standard English distribution', () => {
    const bag = createTileBag(2);
    const count = (l: string) => bag.filter(t => t.letter === l).length;
    expect(count('E')).toBe(12);
    expect(count('A')).toBe(9);
    expect(count('Q')).toBe(1);
    expect(count('_')).toBe(2);
  });

  it('assigns standard values, blanks worth 0', () => {
    expect(LETTER_VALUES['Q']).toBe(10);
    expect(LETTER_VALUES['E']).toBe(1);
    expect(LETTER_VALUES['K']).toBe(5);
    expect(LETTER_VALUES['_']).toBe(0);
  });

  it('gives every tile a unique id', () => {
    const bag = createTileBag(5);
    expect(new Set(bag.map(t => t.id)).size).toBe(200);
  });

  it('drawTiles is pure and draws n tiles', () => {
    const bag = createTileBag(2);
    const { drawn, bag: rest } = drawTiles(bag, RACK_SIZE);
    expect(drawn).toHaveLength(7);
    expect(rest).toHaveLength(93);
    expect(bag).toHaveLength(100); // original untouched
  });

  it('drawTiles drains a short bag without error', () => {
    const bag = createTileBag(2).slice(0, 3);
    const { drawn, bag: rest } = drawTiles(bag, 7);
    expect(drawn).toHaveLength(3);
    expect(rest).toHaveLength(0);
  });

  it('shuffle is deterministic with an injected rng', () => {
    const rng = () => 0.5;
    expect(createTileBag(2, rng).map(t => t.letter).join('')).toBe(
      createTileBag(2, rng).map(t => t.letter).join(''),
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -w packages/shared`
Expected: FAIL — `tiles.js` does not exist.

- [ ] **Step 3: Implement `tiles.ts`**

```ts
import type { Tile } from './types.js';

export const RACK_SIZE = 7;

export const LETTER_VALUES: Record<string, number> = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5, L: 1, M: 3,
  N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10, _: 0,
};

const DISTRIBUTION: Record<string, number> = {
  A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9, J: 1, K: 1, L: 4, M: 2,
  N: 6, O: 8, P: 2, Q: 1, R: 6, S: 4, T: 6, U: 4, V: 2, W: 2, X: 1, Y: 2, Z: 1, _: 2,
};

export function createTileBag(playerCount: number, rng: () => number = Math.random): Tile[] {
  const copies = playerCount >= 5 ? 2 : 1;
  const bag: Tile[] = [];
  let n = 0;
  for (let copy = 0; copy < copies; copy++) {
    for (const [letter, count] of Object.entries(DISTRIBUTION)) {
      for (let i = 0; i < count; i++) {
        bag.push({ id: `t${n++}`, letter, value: LETTER_VALUES[letter], isBlank: letter === '_' });
      }
    }
  }
  // Fisher-Yates
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

export function drawTiles(bag: Tile[], n: number): { drawn: Tile[]; bag: Tile[] } {
  const take = Math.min(n, bag.length);
  return { drawn: bag.slice(0, take), bag: bag.slice(take) };
}
```

Add to `packages/shared/src/index.ts`: `export * from './tiles.js';`

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -w packages/shared`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(shared): tile bag with standard distribution and 5-8 player scaling"
```

---

### Task 4: Placement validation

**Files:**
- Create: `packages/shared/src/placement.ts`
- Modify: `packages/shared/src/index.ts` (add `export * from './placement.js';`)
- Test: `packages/shared/src/placement.test.ts`

**Interfaces:**
- Consumes: `Board`, `Placement`, `createEmptyBoard`, `CENTER` from Task 2.
- Produces: `validatePlacement(board: Board, placements: Placement[]): { ok: true } | { ok: false; reason: string }`. Rules enforced: 1+ tiles; all cells empty and in bounds; no duplicate cells; single row or column; the placed line is contiguous once existing tiles are counted; first move covers the center; non-first moves touch at least one existing tile; single-tile first move is rejected (a word needs 2+ letters).

- [ ] **Step 1: Write failing tests**

`packages/shared/src/placement.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createEmptyBoard, CENTER } from './board.js';
import { validatePlacement } from './placement.js';
import type { Board, Placement, Tile } from './types.js';

let n = 0;
const tile = (letter: string): Tile => ({ id: `x${n++}`, letter, value: 1, isBlank: false });
const put = (board: Board, letter: string, row: number, col: number) => { board[row][col] = tile(letter); };
const p = (letter: string, row: number, col: number): Placement => ({ tile: tile(letter), row, col });

describe('validatePlacement', () => {
  it('accepts a first move through the center', () => {
    const r = validatePlacement(createEmptyBoard(), [p('C', 7, 6), p('A', 7, 7), p('T', 7, 8)]);
    expect(r.ok).toBe(true);
  });

  it('rejects a first move that misses the center', () => {
    const r = validatePlacement(createEmptyBoard(), [p('C', 0, 0), p('A', 0, 1)]);
    expect(r.ok).toBe(false);
  });

  it('rejects a single-tile first move', () => {
    expect(validatePlacement(createEmptyBoard(), [p('A', CENTER, CENTER)]).ok).toBe(false);
  });

  it('rejects tiles not in one line', () => {
    const r = validatePlacement(createEmptyBoard(), [p('C', 7, 7), p('A', 8, 8)]);
    expect(r.ok).toBe(false);
  });

  it('rejects occupied cells and out-of-bounds', () => {
    const b = createEmptyBoard();
    put(b, 'X', 7, 7);
    expect(validatePlacement(b, [p('A', 7, 7), p('B', 7, 8)]).ok).toBe(false);
    expect(validatePlacement(createEmptyBoard(), [p('A', 7, 14), p('B', 7, 15)]).ok).toBe(false);
  });

  it('allows gaps filled by existing tiles', () => {
    const b = createEmptyBoard();
    put(b, 'A', 7, 7);
    // C _ T around existing A: C(7,6) A(existing 7,7) T(7,8)
    expect(validatePlacement(b, [p('C', 7, 6), p('T', 7, 8)]).ok).toBe(true);
  });

  it('rejects true gaps', () => {
    const b = createEmptyBoard();
    put(b, 'A', 7, 7);
    expect(validatePlacement(b, [p('C', 7, 5), p('T', 7, 9)]).ok).toBe(false);
  });

  it('rejects disconnected non-first moves', () => {
    const b = createEmptyBoard();
    put(b, 'A', 7, 7);
    expect(validatePlacement(b, [p('B', 0, 0), p('E', 0, 1)]).ok).toBe(false);
  });

  it('accepts a single tile hooked onto an existing word', () => {
    const b = createEmptyBoard();
    put(b, 'C', 7, 6); put(b, 'A', 7, 7); put(b, 'T', 7, 8);
    expect(validatePlacement(b, [p('S', 7, 9)]).ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -w packages/shared`
Expected: FAIL — `placement.js` missing.

- [ ] **Step 3: Implement `placement.ts`**

```ts
import { BOARD_SIZE, CENTER } from './board.js';
import type { Board, Placement } from './types.js';

type Result = { ok: true } | { ok: false; reason: string };
const fail = (reason: string): Result => ({ ok: false, reason });

export function validatePlacement(board: Board, placements: Placement[]): Result {
  if (placements.length === 0) return fail('No tiles placed.');

  for (const { row, col } of placements) {
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return fail('Tile off the board.');
    if (board[row][col] !== null) return fail('Square already occupied.');
  }
  const keys = new Set(placements.map(pl => `${pl.row},${pl.col}`));
  if (keys.size !== placements.length) return fail('Two tiles on one square.');

  const rows = new Set(placements.map(pl => pl.row));
  const cols = new Set(placements.map(pl => pl.col));
  const isRow = rows.size === 1;
  const isCol = cols.size === 1;
  if (!isRow && !isCol) return fail('Tiles must be in a single row or column.');

  const boardEmpty = board.every(r => r.every(c => c === null));

  // Contiguity: every cell between min and max along the line must be
  // either newly placed or already occupied.
  const line = isRow
    ? { fixed: placements[0].row, coords: placements.map(pl => pl.col) }
    : { fixed: placements[0].col, coords: placements.map(pl => pl.row) };
  const min = Math.min(...line.coords);
  const max = Math.max(...line.coords);
  for (let i = min; i <= max; i++) {
    const [r, c] = isRow ? [line.fixed, i] : [i, line.fixed];
    if (board[r][c] === null && !keys.has(`${r},${c}`)) return fail('Word has a gap.');
  }

  if (boardEmpty) {
    if (!keys.has(`${CENTER},${CENTER}`)) return fail('First word must cover the center star.');
    if (placements.length < 2) return fail('First word needs at least two letters.');
    return { ok: true };
  }

  const touchesExisting = placements.some(({ row, col }) =>
    [[row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]].some(
      ([r, c]) => r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] !== null,
    ),
  );
  if (!touchesExisting) return fail('Word must connect to tiles on the board.');
  return { ok: true };
}
```

Add to `index.ts`: `export * from './placement.js';`

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -w packages/shared`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(shared): placement validation (line, contiguity, center, connectivity)"
```

---

### Task 5: Word extraction and scoring

**Files:**
- Create: `packages/shared/src/scoring.ts`
- Modify: `packages/shared/src/index.ts` (add `export * from './scoring.js';`)
- Test: `packages/shared/src/scoring.test.ts`

**Interfaces:**
- Consumes: `premiumAt` (Task 2), `Board`, `Placement`, `Tile`, `RACK_SIZE` (Task 3).
- Produces:
  - `WordFormed { word: string; score: number; cells: { row: number; col: number }[] }`
  - `findWordsFormed(board: Board, placements: Placement[]): WordFormed[]` — main word plus every cross-word of length ≥ 2. Blank tiles read as `assignedLetter`.
  - `scoreMove(board: Board, placements: Placement[]): { total: number; words: WordFormed[]; bingo: boolean }` — premiums apply only under newly placed tiles; bingo = all 7 rack tiles used, +50.

- [ ] **Step 1: Write failing tests**

`packages/shared/src/scoring.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createEmptyBoard } from './board.js';
import { scoreMove, findWordsFormed } from './scoring.js';
import { LETTER_VALUES } from './tiles.js';
import type { Board, Placement, Tile } from './types.js';

let n = 0;
const tile = (letter: string, isBlank = false): Tile => ({
  id: `s${n++}`, letter: isBlank ? '_' : letter, value: isBlank ? 0 : LETTER_VALUES[letter],
  isBlank, ...(isBlank ? { assignedLetter: letter } : {}),
});
const p = (letter: string, row: number, col: number, isBlank = false): Placement =>
  ({ tile: tile(letter, isBlank), row, col });
const put = (b: Board, letter: string, row: number, col: number) => { b[row][col] = tile(letter); };

describe('scoring', () => {
  it('scores CAT on first move with center DW: (3+1+1)*2 = 10', () => {
    const { total, words } = scoreMove(createEmptyBoard(), [p('C', 7, 6), p('A', 7, 7), p('T', 7, 8)]);
    expect(words).toHaveLength(1);
    expect(words[0].word).toBe('CAT');
    expect(total).toBe(10);
  });

  it('letter premium applies before word premium', () => {
    // QI at (7,7),(7,8): center DW doubles the word; no letter premium there.
    // Q=10, I=1 -> 22
    expect(scoreMove(createEmptyBoard(), [p('Q', 7, 7), p('I', 7, 8)]).total).toBe(22);
  });

  it('premiums do not count for previously placed tiles', () => {
    const b = createEmptyBoard();
    put(b, 'C', 7, 6); put(b, 'A', 7, 7); put(b, 'T', 7, 8);
    // Hook S at (7,9): CATS = 3+1+1+1 = 6, no premium at (7,9)... actually (7,9) is plain.
    const { total, words } = scoreMove(b, [p('S', 7, 9)]);
    expect(words[0].word).toBe('CATS');
    expect(total).toBe(6);
  });

  it('scores cross-words', () => {
    const b = createEmptyBoard();
    put(b, 'C', 7, 6); put(b, 'A', 7, 7); put(b, 'T', 7, 8);
    // Play AN vertically: A(6,7) already? no — place N(8,7) and use existing A(7,7)?
    // Place 'N' at (8,7) plus 'O' at (8,8): forms NO (main, row 8) + AN (cross at col 7) + TO (cross at col 8)
    const { words, total } = scoreMove(b, [p('N', 8, 7), p('O', 8, 8)]);
    const found = words.map(w => w.word).sort();
    expect(found).toEqual(['AN', 'NO', 'TO']);
    // NO: N1+O1=2 (8,8 is TL for O? premiumAt(8,8)='DL') -> O doubled: N1+O2=3
    // AN: A1+N1=2 ; TO: T1+O2=3 (same DL applies to its cross-word)
    expect(total).toBe(3 + 2 + 3);
  });

  it('blank tiles score zero but form words', () => {
    const b = createEmptyBoard();
    const { total, words } = scoreMove(b, [p('C', 7, 6), p('A', 7, 7, true), p('T', 7, 8)]);
    expect(words[0].word).toBe('CAT');
    expect(total).toBe((3 + 0 + 1) * 2);
  });

  it('awards 50-point bingo for using 7 tiles', () => {
    const placements = 'AEROBIC'.split('').map((l, i) => p(l, 7, 4 + i));
    const { total, bingo } = scoreMove(createEmptyBoard(), placements);
    expect(bingo).toBe(true);
    // A1 E1 R1 O1 B3 I1 C3 = 11; DL at (7,3)? no. (7,7) DW; (7,11) DL under C.
    // letters: A(7,4) E(7,5) R(7,6) O(7,7 DW) B(7,8) I(7,9) C(7,10)
    // sum = 11, word x2 = 22, +50 = 72
    expect(total).toBe(72);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -w packages/shared`
Expected: FAIL — `scoring.js` missing.

- [ ] **Step 3: Implement `scoring.ts`**

```ts
import { BOARD_SIZE, premiumAt } from './board.js';
import { RACK_SIZE } from './tiles.js';
import type { Board, Placement, Tile } from './types.js';

export interface WordFormed {
  word: string;
  score: number;
  cells: { row: number; col: number }[];
}

const letterOf = (t: Tile): string => (t.isBlank ? (t.assignedLetter ?? '?') : t.letter);

/** Board overlaid with the new placements, plus a set of the new cells. */
function overlay(board: Board, placements: Placement[]) {
  const grid: (Tile | null)[][] = board.map(row => [...row]);
  const fresh = new Set<string>();
  for (const { tile, row, col } of placements) {
    grid[row][col] = tile;
    fresh.add(`${row},${col}`);
  }
  return { grid, fresh };
}

function scanWord(
  grid: (Tile | null)[][], fresh: Set<string>,
  row: number, col: number, dr: number, dc: number,
): WordFormed {
  // rewind to start of word
  while (row - dr >= 0 && col - dc >= 0 && grid[row - dr][col - dc] !== null) { row -= dr; col -= dc; }
  let word = '';
  let score = 0;
  let multiplier = 1;
  const cells: { row: number; col: number }[] = [];
  while (row < BOARD_SIZE && col < BOARD_SIZE && grid[row][col] !== null) {
    const tile = grid[row][col]!;
    let tileScore = tile.value;
    if (fresh.has(`${row},${col}`)) {
      const prem = premiumAt(row, col);
      if (prem === 'DL') tileScore *= 2;
      if (prem === 'TL') tileScore *= 3;
      if (prem === 'DW') multiplier *= 2;
      if (prem === 'TW') multiplier *= 3;
    }
    word += letterOf(tile);
    score += tileScore;
    cells.push({ row, col });
    row += dr; col += dc;
  }
  return { word, score: score * multiplier, cells };
}

export function findWordsFormed(board: Board, placements: Placement[]): WordFormed[] {
  const { grid, fresh } = overlay(board, placements);
  const isRow = new Set(placements.map(pl => pl.row)).size === 1 && placements.length > 1
    ? true
    : new Set(placements.map(pl => pl.col)).size === 1 && placements.length > 1
      ? false
      : true; // single tile: pick row axis as "main", cross scan covers the other
  const [mr, mc] = isRow ? [0, 1] : [1, 0];
  const words: WordFormed[] = [];
  const main = scanWord(grid, fresh, placements[0].row, placements[0].col, mr, mc);
  if (main.word.length >= 2) words.push(main);
  for (const { row, col } of placements) {
    const cross = scanWord(grid, fresh, row, col, mc, mr);
    if (cross.word.length >= 2) words.push(cross);
  }
  return words;
}

export function scoreMove(board: Board, placements: Placement[]) {
  const words = findWordsFormed(board, placements);
  const bingo = placements.length === RACK_SIZE;
  const total = words.reduce((s, w) => s + w.score, 0) + (bingo ? 50 : 0);
  return { total, words, bingo };
}
```

- [ ] **Step 4: Run tests, fix expectations against the real premium map**

Run: `npm test -w packages/shared`
Expected: PASS. If a premium-dependent expectation fails, verify against `premiumAt` (the board layout is authoritative) and correct the arithmetic comment + expected number in the test.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(shared): word extraction and scoring with premiums, cross-words, bingo"
```

---

### Task 6: Game engine — turns, moves, swaps, passes, endgame

**Files:**
- Create: `packages/shared/src/engine.ts`
- Modify: `packages/shared/src/index.ts` (add `export * from './engine.js';`)
- Test: `packages/shared/src/engine.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 2–5.
- Produces (all pure — take a `GameState`, return a new one or an error):
  - `createGame(players: { id: string; name: string; avatar: string }[], settings: GameSettings, rng?: () => number): GameState`
  - `type EngineResult = { ok: true; state: GameState } | { ok: false; reason: string }`
  - `applyPlay(state: GameState, playerId: string, placements: Placement[]): EngineResult` — validates turn + rack ownership + placement, scores, refills rack, records `lastMove`, advances turn, resets `consecutivePasses`, detects endgame.
  - `applySwap(state: GameState, playerId: string, tileIds: string[]): EngineResult` — honors `freeSwaps` setting for turn consumption; standard swap always consumes the turn; requires bag ≥ tiles swapped.
  - `applyPass(state: GameState, playerId: string): EngineResult` — increments `consecutivePasses`; ends game when every player has passed twice consecutively (`consecutivePasses >= players.length * 2`).
  - `applyTakeBack(state: GameState, playerId: string): EngineResult` — only if `settings.takeBacks`, only the `lastMove` owner, only before the next player has acted (i.e., `lastMove` still present); restores board/rack/score/turn.
  - `retractLastMove(state: GameState): GameState` — shared internals for take-back and lost challenges (challenge retraction does NOT return the turn).
  - `finalizeGame(state: GameState): GameState` — rack deductions, went-out bonus, sets `phase: 'ended'` and `winnerIds`.

- [ ] **Step 1: Write failing tests**

`packages/shared/src/engine.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createGame, applyPlay, applyPass, applySwap, applyTakeBack, finalizeGame } from './engine.js';
import type { GameSettings, GameState, Placement } from './types.js';

const settings: GameSettings = { dictionaryMode: 'off', takeBacks: true, freeSwaps: 'unlimited', freeSwapLimit: 0 };
const players = [
  { id: 'p1', name: 'Amy', avatar: '🦊' },
  { id: 'p2', name: 'Ben', avatar: '🐸' },
];

/** Place the first N letters of the current player's rack in a row through center. */
function firstMovePlacements(state: GameState, count: number): Placement[] {
  const rack = state.players[state.currentPlayerIndex].rack;
  return rack.slice(0, count).map((tile, i) => ({
    tile: tile.isBlank ? { ...tile, assignedLetter: 'E' } : tile,
    row: 7, col: 7 + i - Math.floor(count / 2),
  }));
}

describe('engine', () => {
  it('createGame deals 7 tiles to each player', () => {
    const g = createGame(players, settings, () => 0.42);
    expect(g.players.every(p => p.rack.length === 7)).toBe(true);
    expect(g.bag).toHaveLength(100 - 14);
    expect(g.phase).toBe('playing');
    expect(g.currentPlayerIndex).toBe(0);
  });

  it('applyPlay rejects out-of-turn and foreign tiles', () => {
    const g = createGame(players, settings, () => 0.42);
    expect(applyPlay(g, 'p2', firstMovePlacements(g, 2)).ok).toBe(false);
    const stolen = { ...firstMovePlacements(g, 2)[0], tile: { id: 'nope', letter: 'A', value: 1, isBlank: false } };
    expect(applyPlay(g, 'p1', [stolen, firstMovePlacements(g, 2)[1]]).ok).toBe(false);
  });

  it('applyPlay scores, refills the rack, advances the turn', () => {
    const g = createGame(players, settings, () => 0.42);
    const res = applyPlay(g, 'p1', firstMovePlacements(g, 3));
    if (!res.ok) throw new Error(res.reason);
    expect(res.state.players[0].score).toBeGreaterThan(0);
    expect(res.state.players[0].rack).toHaveLength(7);
    expect(res.state.currentPlayerIndex).toBe(1);
    expect(res.state.lastMove?.playerId).toBe('p1');
    expect(res.state.board[7][7]).not.toBeNull();
  });

  it('take-back restores everything and returns the turn', () => {
    const g = createGame(players, settings, () => 0.42);
    const played = applyPlay(g, 'p1', firstMovePlacements(g, 3));
    if (!played.ok) throw new Error(played.reason);
    const undone = applyTakeBack(played.state, 'p1');
    if (!undone.ok) throw new Error(undone.reason);
    expect(undone.state.players[0].score).toBe(0);
    expect(undone.state.currentPlayerIndex).toBe(0);
    expect(undone.state.board[7][7]).toBeNull();
    expect(undone.state.players[0].rack.map(t => t.id).sort())
      .toEqual(g.players[0].rack.map(t => t.id).sort());
  });

  it('take-back rejected when disabled or not the last mover', () => {
    const strict = { ...settings, takeBacks: false };
    const g = createGame(players, strict, () => 0.42);
    const played = applyPlay(g, 'p1', firstMovePlacements(g, 3));
    if (!played.ok) throw new Error(played.reason);
    expect(applyTakeBack(played.state, 'p1').ok).toBe(false);
    expect(applyTakeBack(played.state, 'p2').ok).toBe(false);
  });

  it('free swap keeps the turn; standard swap consumes it', () => {
    const g = createGame(players, settings, () => 0.42);
    const free = applySwap(g, 'p1', g.players[0].rack.slice(0, 2).map(t => t.id));
    if (!free.ok) throw new Error(free.reason);
    expect(free.state.currentPlayerIndex).toBe(0); // unlimited free swaps
    const strictSettings = { ...settings, freeSwaps: 'off' as const };
    const g2 = createGame(players, strictSettings, () => 0.42);
    const paid = applySwap(g2, 'p1', g2.players[0].rack.slice(0, 2).map(t => t.id));
    if (!paid.ok) throw new Error(paid.reason);
    expect(paid.state.currentPlayerIndex).toBe(1);
  });

  it('limited free swaps run out', () => {
    const lim = { ...settings, freeSwaps: 'limited' as const, freeSwapLimit: 1 };
    const g = createGame(players, lim, () => 0.42);
    const one = applySwap(g, 'p1', [g.players[0].rack[0].id]);
    if (!one.ok) throw new Error(one.reason);
    expect(one.state.currentPlayerIndex).toBe(0);
    const two = applySwap(one.state, 'p1', [one.state.players[0].rack[0].id]);
    if (!two.ok) throw new Error(two.reason);
    expect(two.state.currentPlayerIndex).toBe(1); // second swap is no longer free
  });

  it('game ends after everyone passes twice in a row', () => {
    const g = createGame(players, settings, () => 0.42);
    let s = g;
    for (const pid of ['p1', 'p2', 'p1', 'p2']) {
      const r = applyPass(s, pid);
      if (!r.ok) throw new Error(r.reason);
      s = r.state;
    }
    expect(s.phase).toBe('ended');
  });

  it('finalizeGame deducts racks and pays the out-player', () => {
    const g = createGame(players, settings, () => 0.42);
    const s: GameState = {
      ...g,
      bag: [],
      players: [
        { ...g.players[0], rack: [], score: 100 },
        { ...g.players[1], rack: [{ id: 'z', letter: 'Q', value: 10, isBlank: false }], score: 100 },
      ],
    };
    const done = finalizeGame(s);
    expect(done.players[0].score).toBe(110); // +10 from Ben's rack
    expect(done.players[1].score).toBe(90);
    expect(done.winnerIds).toEqual(['p1']);
    expect(done.phase).toBe('ended');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -w packages/shared`
Expected: FAIL — `engine.js` missing.

- [ ] **Step 3: Implement `engine.ts`**

```ts
import { createEmptyBoard } from './board.js';
import { validatePlacement } from './placement.js';
import { scoreMove } from './scoring.js';
import { createTileBag, drawTiles, RACK_SIZE } from './tiles.js';
import type { GameSettings, GameState, Placement, PlayerState } from './types.js';

export type EngineResult = { ok: true; state: GameState } | { ok: false; reason: string };
const fail = (reason: string): EngineResult => ({ ok: false, reason });

export function createGame(
  seats: { id: string; name: string; avatar: string }[],
  settings: GameSettings,
  rng: () => number = Math.random,
): GameState {
  let bag = createTileBag(seats.length, rng);
  const players: PlayerState[] = seats.map(seat => {
    const { drawn, bag: rest } = drawTiles(bag, RACK_SIZE);
    bag = rest;
    return { ...seat, rack: drawn, score: 0, connected: true, swapsUsed: 0 };
  });
  return {
    board: createEmptyBoard(), bag, players, currentPlayerIndex: 0,
    phase: 'playing', settings, consecutivePasses: 0,
    lastMove: null, pendingVote: null, winnerIds: [],
  };
}

function guardTurn(state: GameState, playerId: string): EngineResult | null {
  if (state.phase !== 'playing') return fail('Game is not accepting moves right now.');
  if (state.players[state.currentPlayerIndex].id !== playerId) return fail('Not your turn.');
  return null;
}

const nextIndex = (state: GameState) => (state.currentPlayerIndex + 1) % state.players.length;

export function applyPlay(state: GameState, playerId: string, placements: Placement[]): EngineResult {
  const guard = guardTurn(state, playerId);
  if (guard) return guard;
  const player = state.players[state.currentPlayerIndex];

  const rackIds = new Set(player.rack.map(t => t.id));
  if (!placements.every(pl => rackIds.has(pl.tile.id))) return fail('Tile not in your rack.');
  if (placements.some(pl => pl.tile.isBlank && !/^[A-Z]$/.test(pl.tile.assignedLetter ?? '')))
    return fail('Blank tile needs a letter.');

  const valid = validatePlacement(state.board, placements);
  if (!valid.ok) return fail(valid.reason);

  const { total, words } = scoreMove(state.board, placements);
  const board = state.board.map(r => [...r]);
  for (const { tile, row, col } of placements) board[row][col] = tile;

  const usedIds = new Set(placements.map(pl => pl.tile.id));
  const { drawn, bag } = drawTiles(state.bag, usedIds.size);
  const players = state.players.map((p, i) =>
    i === state.currentPlayerIndex
      ? { ...p, rack: [...p.rack.filter(t => !usedIds.has(t.id)), ...drawn], score: p.score + total }
      : p,
  );

  const next: GameState = {
    ...state, board, bag, players,
    consecutivePasses: 0,
    lastMove: { playerId, placements, score: total, words: words.map(w => w.word) },
    currentPlayerIndex: nextIndex(state),
  };

  // Endgame: bag empty and the mover's rack is empty.
  if (next.bag.length === 0 && players[state.currentPlayerIndex].rack.length === 0) {
    return { ok: true, state: finalizeGame(next) };
  }
  return { ok: true, state: next };
}

export function applySwap(state: GameState, playerId: string, tileIds: string[]): EngineResult {
  const guard = guardTurn(state, playerId);
  if (guard) return guard;
  if (tileIds.length === 0) return fail('Pick tiles to swap.');
  if (state.bag.length < tileIds.length) return fail('Not enough tiles left in the bag.');

  const idx = state.currentPlayerIndex;
  const player = state.players[idx];
  const ids = new Set(tileIds);
  const giving = player.rack.filter(t => ids.has(t.id));
  if (giving.length !== tileIds.length) return fail('Tile not in your rack.');

  const { drawn, bag: afterDraw } = drawTiles(state.bag, tileIds.length);
  const bag = [...afterDraw, ...giving]; // returned tiles go to the back; server reshuffles on its own clock — order is invisible to clients

  const s = state.settings;
  const isFree = s.freeSwaps === 'unlimited' || (s.freeSwaps === 'limited' && player.swapsUsed < s.freeSwapLimit);

  const players = state.players.map((p, i) =>
    i === idx
      ? { ...p, rack: [...p.rack.filter(t => !ids.has(t.id)), ...drawn], swapsUsed: p.swapsUsed + 1 }
      : p,
  );

  return {
    ok: true,
    state: {
      ...state, bag, players,
      consecutivePasses: 0,
      lastMove: null, // a swap invalidates challenge/take-back windows
      currentPlayerIndex: isFree ? state.currentPlayerIndex : nextIndex(state),
    },
  };
}

export function applyPass(state: GameState, playerId: string): EngineResult {
  const guard = guardTurn(state, playerId);
  if (guard) return guard;
  const consecutivePasses = state.consecutivePasses + 1;
  const next: GameState = {
    ...state, consecutivePasses, lastMove: null,
    currentPlayerIndex: nextIndex(state),
  };
  if (consecutivePasses >= state.players.length * 2) {
    return { ok: true, state: finalizeGame(next) };
  }
  return { ok: true, state: next };
}

/** Remove lastMove's tiles from the board and refund tiles/score. Does not change the turn. */
export function retractLastMove(state: GameState): GameState {
  const move = state.lastMove;
  if (!move) return state;
  const board = state.board.map(r => [...r]);
  for (const { row, col } of move.placements) board[row][col] = null;
  const returned = move.placements.map(pl =>
    pl.tile.isBlank ? { ...pl.tile, assignedLetter: undefined } : pl.tile,
  );
  const moverIdx = state.players.findIndex(p => p.id === move.playerId);
  const mover = state.players[moverIdx];
  // Give back the played tiles; return the same number of drawn tiles to the bag.
  const drawnCount = returned.length;
  const giveBack = mover.rack.slice(mover.rack.length - drawnCount);
  const keep = mover.rack.slice(0, mover.rack.length - drawnCount);
  const players = state.players.map((p, i) =>
    i === moverIdx ? { ...p, rack: [...keep, ...returned], score: p.score - move.score } : p,
  );
  return { ...state, board, players, bag: [...state.bag, ...giveBack], lastMove: null };
}

export function applyTakeBack(state: GameState, playerId: string): EngineResult {
  if (!state.settings.takeBacks) return fail('Take-backs are disabled.');
  if (!state.lastMove || state.lastMove.playerId !== playerId) return fail('Nothing to take back.');
  const moverIdx = state.players.findIndex(p => p.id === playerId);
  const retracted = retractLastMove(state);
  return { ok: true, state: { ...retracted, currentPlayerIndex: moverIdx } };
}

export function finalizeGame(state: GameState): GameState {
  const rackValue = (p: PlayerState) => p.rack.reduce((s, t) => s + t.value, 0);
  const totalRemaining = state.players.reduce((s, p) => s + rackValue(p), 0);
  const players = state.players.map(p => {
    const mine = rackValue(p);
    const score = mine === 0 ? p.score + (totalRemaining - mine) : p.score - mine;
    return { ...p, score };
  });
  const top = Math.max(...players.map(p => p.score));
  return {
    ...state, players, phase: 'ended',
    winnerIds: players.filter(p => p.score === top).map(p => p.id),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -w packages/shared`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(shared): game engine - turns, plays, swaps, passes, take-backs, endgame"
```

---

### Task 7: GameMode interface + ClassicMode, challenge & override votes

**Files:**
- Create: `packages/shared/src/modes.ts`
- Create: `packages/shared/src/votes.ts`
- Modify: `packages/shared/src/index.ts` (add both exports)
- Test: `packages/shared/src/votes.test.ts`

**Interfaces:**
- Consumes: engine functions from Task 6, `PendingVote`, `GameState`.
- Produces:
  - `modes.ts`: `interface GameMode { id: string; validateMove(state: GameState, playerId: string, placements: Placement[]): EngineResult; play: typeof applyPlay; swap: typeof applySwap; pass: typeof applyPass; takeBack: typeof applyTakeBack }` and `export const ClassicMode: GameMode` (delegates straight to the engine functions). `export const MODES: Record<string, GameMode> = { classic: ClassicMode }`.
  - `votes.ts`:
    - `startChallenge(state: GameState, challengerId: string): EngineResult` — needs a `lastMove` not owned by the challenger, dictionaryMode `'off'`, phase `'playing'`; sets `phase: 'voting'`, `pendingVote` of kind `'challenge'` with `eligibleVoterIds` = everyone except the mover.
    - `startOverrideVote(state: GameState, word: string, playerId: string, placements: Placement[]): GameState` — used by the server when the dictionary rejects a word; stores the pending move inside the vote via a `pendingPlacements` field (add `pendingPlacements?: Placement[]` to `PendingVote` in `types.ts`).
    - `castVote(state: GameState, voterId: string, allow: boolean): EngineResult` — records vote; when all eligible voters have voted, resolves: challenge with majority "disallow" → `retractLastMove` (turn is NOT returned; mover loses the turn); override with majority "allow" → `applyPlay` runs with the stored placements; ties count as "allow" (leniency). Returns to `phase: 'playing'` and clears `pendingVote`.

- [ ] **Step 1: Add `pendingPlacements` to `PendingVote` in `types.ts`**

```ts
export interface PendingVote {
  kind: 'challenge' | 'override';
  word: string;
  targetPlayerId: string;
  votes: Record<string, boolean>;
  eligibleVoterIds: string[];
  pendingPlacements?: Placement[];
}
```

- [ ] **Step 2: Write failing tests**

`packages/shared/src/votes.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createGame, applyPlay } from './engine.js';
import { startChallenge, startOverrideVote, castVote } from './votes.js';
import type { GameSettings, GameState, Placement } from './types.js';

const settings: GameSettings = { dictionaryMode: 'off', takeBacks: false, freeSwaps: 'off', freeSwapLimit: 0 };
const seats = [
  { id: 'p1', name: 'Amy', avatar: '🦊' },
  { id: 'p2', name: 'Ben', avatar: '🐸' },
  { id: 'p3', name: 'Cy', avatar: '🐼' },
];

function playFirstWord(g: GameState) {
  const rack = g.players[0].rack;
  const placements: Placement[] = rack.slice(0, 3).map((tile, i) => ({
    tile: tile.isBlank ? { ...tile, assignedLetter: 'E' } : tile, row: 7, col: 6 + i,
  }));
  const r = applyPlay(g, 'p1', placements);
  if (!r.ok) throw new Error(r.reason);
  return r.state;
}

describe('challenge votes', () => {
  it('challenger opens a vote; mover cannot challenge self', () => {
    const s = playFirstWord(createGame(seats, settings, () => 0.42));
    expect(startChallenge(s, 'p1').ok).toBe(false);
    const c = startChallenge(s, 'p2');
    if (!c.ok) throw new Error(c.reason);
    expect(c.state.phase).toBe('voting');
    expect(c.state.pendingVote?.eligibleVoterIds.sort()).toEqual(['p2', 'p3']);
  });

  it('majority disallow retracts the move and the mover loses the turn', () => {
    const s = playFirstWord(createGame(seats, settings, () => 0.42));
    const moverScore = s.players[0].score;
    expect(moverScore).toBeGreaterThan(0);
    const c = startChallenge(s, 'p2');
    if (!c.ok) throw new Error(c.reason);
    let v = castVote(c.state, 'p2', false);
    if (!v.ok) throw new Error(v.reason);
    expect(v.state.phase).toBe('voting'); // p3 hasn't voted
    v = castVote(v.state, 'p3', false);
    if (!v.ok) throw new Error(v.reason);
    expect(v.state.phase).toBe('playing');
    expect(v.state.players[0].score).toBe(0);
    expect(v.state.board[7][7]).toBeNull();
    expect(v.state.currentPlayerIndex).toBe(1); // turn stays advanced
  });

  it('tie counts as allow (leniency)', () => {
    const s = playFirstWord(createGame(seats, settings, () => 0.42));
    const c = startChallenge(s, 'p2');
    if (!c.ok) throw new Error(c.reason);
    let v = castVote(c.state, 'p2', false);
    if (!v.ok) throw new Error(v.reason);
    v = castVote(v.state, 'p3', true);
    if (!v.ok) throw new Error(v.reason);
    expect(v.state.players[0].score).toBeGreaterThan(0); // move stands
  });
});

describe('override votes', () => {
  it('majority allow applies the rejected play', () => {
    const g = createGame(seats, { ...settings, dictionaryMode: 'override' }, () => 0.42);
    const rack = g.players[0].rack;
    const placements: Placement[] = rack.slice(0, 3).map((tile, i) => ({
      tile: tile.isBlank ? { ...tile, assignedLetter: 'E' } : tile, row: 7, col: 6 + i,
    }));
    const voting = startOverrideVote(g, 'XYZZY', 'p1', placements);
    expect(voting.phase).toBe('voting');
    let v = castVote(voting, 'p2', true);
    if (!v.ok) throw new Error(v.reason);
    v = castVote(v.state, 'p3', true);
    if (!v.ok) throw new Error(v.reason);
    expect(v.state.board[7][7]).not.toBeNull();
    expect(v.state.currentPlayerIndex).toBe(1);
  });

  it('majority deny drops the move; player keeps the turn', () => {
    const g = createGame(seats, { ...settings, dictionaryMode: 'override' }, () => 0.42);
    const rack = g.players[0].rack;
    const placements: Placement[] = rack.slice(0, 3).map((tile, i) => ({
      tile: tile.isBlank ? { ...tile, assignedLetter: 'E' } : tile, row: 7, col: 6 + i,
    }));
    const voting = startOverrideVote(g, 'XYZZY', 'p1', placements);
    let v = castVote(voting, 'p2', false);
    if (!v.ok) throw new Error(v.reason);
    v = castVote(v.state, 'p3', false);
    if (!v.ok) throw new Error(v.reason);
    expect(v.state.board[7][7]).toBeNull();
    expect(v.state.currentPlayerIndex).toBe(0); // retries their turn
    expect(v.state.phase).toBe('playing');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -w packages/shared`
Expected: FAIL — `votes.js` missing.

- [ ] **Step 4: Implement `votes.ts` and `modes.ts`**

`packages/shared/src/votes.ts`:
```ts
import { applyPlay, retractLastMove, type EngineResult } from './engine.js';
import type { GameState, Placement } from './types.js';

const fail = (reason: string): EngineResult => ({ ok: false, reason });

export function startChallenge(state: GameState, challengerId: string): EngineResult {
  if (state.phase !== 'playing') return fail('Cannot challenge right now.');
  if (state.settings.dictionaryMode !== 'off') return fail('Challenges are only for no-dictionary games.');
  if (!state.lastMove) return fail('No move to challenge.');
  if (state.lastMove.playerId === challengerId) return fail('You cannot challenge your own word.');
  return {
    ok: true,
    state: {
      ...state,
      phase: 'voting',
      pendingVote: {
        kind: 'challenge',
        word: state.lastMove.words[0] ?? '',
        targetPlayerId: state.lastMove.playerId,
        votes: {},
        eligibleVoterIds: state.players.filter(p => p.id !== state.lastMove!.playerId).map(p => p.id),
      },
    },
  };
}

export function startOverrideVote(
  state: GameState, word: string, playerId: string, placements: Placement[],
): GameState {
  return {
    ...state,
    phase: 'voting',
    pendingVote: {
      kind: 'override',
      word,
      targetPlayerId: playerId,
      votes: {},
      eligibleVoterIds: state.players.filter(p => p.id !== playerId).map(p => p.id),
      pendingPlacements: placements,
    },
  };
}

export function castVote(state: GameState, voterId: string, allow: boolean): EngineResult {
  const vote = state.pendingVote;
  if (state.phase !== 'voting' || !vote) return fail('No vote in progress.');
  if (!vote.eligibleVoterIds.includes(voterId)) return fail('You cannot vote on this.');

  const votes = { ...vote.votes, [voterId]: allow };
  if (Object.keys(votes).length < vote.eligibleVoterIds.length) {
    return { ok: true, state: { ...state, pendingVote: { ...vote, votes } } };
  }

  const allowCount = Object.values(votes).filter(Boolean).length;
  const allowed = allowCount * 2 >= vote.eligibleVoterIds.length; // tie -> allow (leniency)
  const base: GameState = { ...state, phase: 'playing', pendingVote: null };

  if (vote.kind === 'challenge') {
    return { ok: true, state: allowed ? base : retractLastMove(base) };
  }
  // override
  if (!allowed) return { ok: true, state: base }; // move dropped, same player's turn
  const played = applyPlay(base, vote.targetPlayerId, vote.pendingPlacements ?? []);
  return played.ok ? played : { ok: true, state: base };
}
```

`packages/shared/src/modes.ts`:
```ts
import { applyPass, applyPlay, applySwap, applyTakeBack, type EngineResult } from './engine.js';
import { validatePlacement } from './placement.js';
import type { GameState, Placement } from './types.js';

export interface GameMode {
  id: string;
  validateMove(state: GameState, playerId: string, placements: Placement[]): EngineResult;
  play: typeof applyPlay;
  swap: typeof applySwap;
  pass: typeof applyPass;
  takeBack: typeof applyTakeBack;
}

export const ClassicMode: GameMode = {
  id: 'classic',
  validateMove(state, _playerId, placements) {
    const v = validatePlacement(state.board, placements);
    return v.ok ? { ok: true, state } : { ok: false, reason: v.reason };
  },
  play: applyPlay,
  swap: applySwap,
  pass: applyPass,
  takeBack: applyTakeBack,
};

export const MODES: Record<string, GameMode> = { classic: ClassicMode };
```

Add to `index.ts`: `export * from './votes.js'; export * from './modes.js';`

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -w packages/shared`
Expected: PASS (full shared suite).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(shared): GameMode extension point, challenge and override voting"
```

---

### Task 8: Server — rooms, dictionary, snapshots

**Files:**
- Create: `packages/server/src/rooms.ts`
- Create: `packages/server/src/dictionary.ts`
- Create: `packages/server/src/snapshot.ts`
- Test: `packages/server/src/rooms.test.ts`, `packages/server/src/snapshot.test.ts`

**Interfaces:**
- Consumes: `GameState`, `GameSettings`, `createGame`, `Tile` from `@scrabble/shared`.
- Produces:
  - `rooms.ts`:
    - `interface Seat { playerId: string; token: string; name: string; avatar: string; socketId: string | null }`
    - `interface Room { code: string; hostToken: string; seats: Seat[]; settings: GameSettings; game: GameState | null; modeId: string }`
    - `class RoomManager` with `createRoom(settings: GameSettings): Room` (unique 4-letter code), `getRoom(code: string): Room | undefined`, `joinRoom(code, name, avatar): { seat: Seat } | { error: string }` (max 8 seats, rejects joins after game start, rejects duplicate names), `findSeatByToken(code, token): Seat | undefined`, `removeSeat(code, playerId): void`.
  - `dictionary.ts`: `loadDictionary(): Promise<Set<string>>` (reads the `word-list` package's file, uppercased), `isWordValid(dict: Set<string>, word: string): boolean`.
  - `snapshot.ts`: `snapshotFor(room: Room, playerId: string | null): ClientSnapshot` where `ClientSnapshot` mirrors `GameState` but each player's `rack` is replaced by `rackCount: number` except the recipient's own, and `bag` is replaced by `bagCount: number`. `playerId === null` produces the spectator (big-screen) snapshot: all racks hidden. Export `interface ClientSnapshot` — the client's single source of truth for render state (also includes `roomCode`, `seats` name/avatar/connected, `phase`, `settings`, `modeId`).

- [ ] **Step 1: Write failing tests**

`packages/server/src/rooms.test.ts`:
```ts
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
```

`packages/server/src/snapshot.test.ts`:
```ts
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
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -w packages/server`
Expected: FAIL — modules missing.

- [ ] **Step 3: Implement the three modules**

`packages/server/src/rooms.ts`:
```ts
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
```

`packages/server/src/dictionary.ts`:
```ts
import { readFile } from 'node:fs/promises';
import wordListPath from 'word-list';

export async function loadDictionary(): Promise<Set<string>> {
  const raw = await readFile(wordListPath, 'utf8');
  return new Set(raw.split('\n').map(w => w.trim().toUpperCase()).filter(Boolean));
}

export function isWordValid(dict: Set<string>, word: string): boolean {
  return dict.has(word.toUpperCase());
}
```

`packages/server/src/snapshot.ts`:
```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -w packages/server`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(server): room manager, ENABLE dictionary, per-recipient snapshots"
```

---

### Task 9: Server — Socket.IO wiring and startup

**Files:**
- Create: `packages/server/src/sockets.ts`
- Create: `packages/server/src/main.ts`
- Create: `packages/shared/src/events.ts` (socket contract) + export from `index.ts`
- Test: `packages/server/src/sockets.test.ts` (integration, real Socket.IO server + client)

**Interfaces:**
- Consumes: `RoomManager`, `snapshotFor`, `loadDictionary`, `isWordValid`, engine + votes + `MODES` from shared.
- Produces (`packages/shared/src/events.ts` — the wire contract used verbatim by the client in Tasks 10–13):
```ts
import type { GameSettings, Placement } from './types.js';
// ClientSnapshot and SnapshotPlayer also live in this file (moved here in Step 1
// from packages/server/src/snapshot.ts so both packages share one definition).

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
}
export interface ServerToClient {
  'game:state': (snapshot: ClientSnapshot) => void;
  'game:toast': (msg: { kind: 'info' | 'error' | 'party'; text: string }) => void;
}
```
  Note: the `ClientSnapshot`/`SnapshotPlayer` interfaces defined in Task 8's `packages/server/src/snapshot.ts` move into `packages/shared/src/events.ts` (Step 1 below), and `snapshot.ts` imports them from `@scrabble/shared`, so server and client share one definition.
- Produces (`sockets.ts`): `registerSockets(io: Server, rooms: RoomManager, dict: Set<string>): void` implementing every event above. Behavior:
  - Every state change → `broadcast(room)`: for each seat with a live socket, emit `game:state` with `snapshotFor(room, seat.playerId)`; sockets in the `watch:<code>` Socket.IO room get `snapshotFor(room, null)`.
  - `game:start` requires `hostToken`, ≥2 seats; builds `createGame` from seats with the room's settings.
  - `move:play` with `dictionaryMode === 'override'`: run `MODES[room.modeId].validateMove` first, then check every formed word (`findWordsFormed`) against the dictionary; if any word is invalid, call `startOverrideVote` for the first invalid word instead of applying, and broadcast. With `dictionaryMode === 'off'`: apply directly.
  - Disconnect: mark `seat.socketId = null`, broadcast (shows "away"). Reconnect via `room:reconnect` re-binds the socket and emits a fresh snapshot.
- Produces (`main.ts`): Express app serving `packages/client/dist` statically, Socket.IO attached, listening on `0.0.0.0:3000`, printing `http://<lan-ip>:3000` + `qrcode-terminal` QR for that URL.

- [ ] **Step 1: Move the snapshot types into shared**

Move `ClientSnapshot` and `SnapshotPlayer` interface declarations from `packages/server/src/snapshot.ts` into `packages/shared/src/events.ts` (alongside the event maps above, with the `events-snapshot.js` note resolved: `'game:state': (snapshot: ClientSnapshot) => void`). Update `snapshot.ts` to `import type { ClientSnapshot, SnapshotPlayer } from '@scrabble/shared';`. Add `export * from './events.js';` to shared `index.ts`.

Run: `npm test -w packages/server` — Expected: still PASS.

- [ ] **Step 2: Write a failing integration test**

`packages/server/src/sockets.test.ts`:
```ts
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

    const statePromise = nextState(amy);
    await emit(host, 'game:start', { code, hostToken });
    const snap = await statePromise;
    expect(snap.phase).toBe('playing');

    const me = snap.players.find(p => p.id === joinA.playerId)!;
    expect(me.rack).toHaveLength(7);
    const other = snap.players.find(p => p.id !== joinA.playerId)!;
    expect(other.rack).toBeNull();

    // First player plays two tiles through center.
    const current = snap.currentPlayerId === joinA.playerId
      ? { sock: amy, token: joinA.token, snap }
      : { sock: ben, token: joinB.token, snap: await new Promise<ClientSnapshot>(r => ben.once('game:state', r)) };
    // Ask for a fresh personal snapshot by reconnect if rack unknown:
    const rack = current.snap.players.find(p => p.id === current.snap.currentPlayerId)!.rack!;
    const placements = rack.slice(0, 2).map((tile, i) => ({
      tile: tile.isBlank ? { ...tile, assignedLetter: 'E' } : tile, row: 7, col: 7 + i,
    }));
    const played = await emit<{ ok: boolean; error?: string }>(current.sock, 'move:play',
      { code, token: current.token, placements });
    expect(played.ok).toBe(true);
  });
});
```

Note for the implementer: `game:start` broadcasts to every player socket — both `amy` and `ben` receive personalized snapshots, so grab each side's own snapshot from its own socket (the test above shows the pattern; if the ternary's second branch races, restructure to listen on both sockets before emitting `game:start`).

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -w packages/server`
Expected: FAIL — `sockets.js` missing.

- [ ] **Step 4: Implement `sockets.ts`**

```ts
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
      // RoomManager doesn't index by socket, so scan rooms lazily via a registry:
      for (const room of roomsOf(rooms)) {
        const seat = room.seats.find(s => s.socketId === socket.id);
        if (seat) {
          seat.socketId = null;
          broadcast(room);
        }
      }
    });
  });
}

// Expose iteration for disconnect handling; add this method to RoomManager instead
// if you prefer: `allRooms(): Iterable<Room>` returning this.rooms.values().
function roomsOf(rooms: RoomManager): Iterable<Room> {
  return (rooms as unknown as { rooms: Map<string, Room> }).rooms.values();
}
```

Implementation note: replace the `roomsOf` hack with a real `allRooms(): Room[]` method on `RoomManager` (`return [...this.rooms.values()];`) and call `rooms.allRooms()` — the function above documents intent, not the final shape.

`packages/server/src/main.ts`:
```ts
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from 'socket.io';
import qrcode from 'qrcode-terminal';
import { RoomManager } from './rooms.js';
import { loadDictionary } from './dictionary.js';
import { registerSockets } from './sockets.js';

const PORT = 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');

function lanIP(): string {
  for (const nets of Object.values(networkInterfaces())) {
    for (const net of nets ?? []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return '127.0.0.1';
}

const app = express();
app.use(express.static(clientDist));
app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));

const httpServer = createServer(app);
const io = new Server(httpServer);

const dict = await loadDictionary();
registerSockets(io, new RoomManager(), dict);

httpServer.listen(PORT, '0.0.0.0', () => {
  const url = `http://${lanIP()}:${PORT}`;
  console.log(`\n🎉 Scrabble Party is up!\n\n   ${url}\n`);
  qrcode.generate(url, { small: true });
  console.log('Point phones at the QR code or type the URL.\n');
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -w packages/server`
Expected: PASS (rooms, snapshot, and socket-flow tests).

- [ ] **Step 6: Verify startup by hand**

Run: `npm run dev -w packages/server`
Expected: banner with a LAN URL and a QR code (client 404s are fine — no build yet). Ctrl-C to stop.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(server): socket handlers, dictionary override votes, LAN startup banner"
```

---

### Task 10: Client foundation — socket store, theme, routing

**Files:**
- Create: `packages/client/src/store.ts`
- Create: `packages/client/src/theme.css`
- Modify: `packages/client/src/App.tsx`, `packages/client/src/main.tsx`, `packages/client/index.html`, `packages/client/vite.config.ts`
- Delete: Vite scaffold cruft (`App.css`, `assets/react.svg`, default `index.css` content)

**Interfaces:**
- Consumes: `ClientSnapshot` and event payload types from `@scrabble/shared`.
- Produces (used by every screen in Tasks 11–13):
  - `store.ts`: a Zustand store `useGame` with state `{ snapshot: ClientSnapshot | null; playerId: string | null; token: string | null; roomCode: string | null; hostToken: string | null; toast: { kind: string; text: string } | null }` and actions `connect(): void`, `createRoom(settings: GameSettings): Promise<string>` (returns code), `joinRoom(code, name, avatar): Promise<{ ok: boolean; error?: string }>`, `watchRoom(code): Promise<boolean>`, `startGame(): Promise<{ ok: boolean; error?: string }>`, `play(placements): Promise<{ ok: boolean; error?: string }>`, `swap(tileIds)`, `pass()`, `takeBack()`, `challenge()`, `vote(allow)`. Persists `{ code, token, playerId }` in `localStorage['scrabble-seat']` and auto-reconnects on load.
  - `theme.css`: CSS custom properties for the cartoon look (colors, radii, shadows, fonts) applied app-wide.
  - `App.tsx`: hash-based view switch — `#/` join screen, `#/host` host setup + big screen, `#/play` player game screen. (Hash routing avoids server-side route handling beyond the SPA fallback.)

- [ ] **Step 1: Configure Vite dev proxy**

`packages/client/vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: { '/socket.io': { target: 'http://localhost:3000', ws: true } },
  },
});
```

- [ ] **Step 2: Write the theme**

`packages/client/src/theme.css`:
No external fonts (closed network) — the display font uses a playful system stack.

```css
:root {
  --bg: #fdf6e3;
  --bg-board: #8ecfb0;
  --tile: #ffd97a;
  --tile-edge: #e0a839;
  --ink: #3d2b1f;
  --pop-pink: #ff6b9d;
  --pop-blue: #4dabf7;
  --pop-purple: #9775fa;
  --prem-dl: #a5d8ff;
  --prem-tl: #4dabf7;
  --prem-dw: #ffc9de;
  --prem-tw: #ff6b9d;
  --radius: 14px;
  --shadow: 0 4px 0 rgba(61, 43, 31, 0.25);
  --font-display: 'Comic Sans MS', 'Chalkboard SE', 'Segoe Print', system-ui, sans-serif;
  --font-body: system-ui, -apple-system, 'Segoe UI', sans-serif;
}

* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
html, body, #root { margin: 0; height: 100%; }
body {
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-body);
  overscroll-behavior: none;
}
h1, h2, h3, .display { font-family: var(--font-display); }

.btn {
  font-family: var(--font-display);
  font-size: 1.1rem;
  border: 3px solid var(--ink);
  border-radius: var(--radius);
  padding: 0.6rem 1.2rem;
  background: var(--pop-blue);
  color: white;
  box-shadow: var(--shadow);
  cursor: pointer;
  transition: transform 0.08s ease;
}
.btn:active { transform: translateY(3px); box-shadow: none; }
.btn.primary { background: var(--pop-pink); }
.btn.ghost { background: white; color: var(--ink); }
.btn:disabled { opacity: 0.45; cursor: default; }

.card {
  background: white;
  border: 3px solid var(--ink);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 1rem;
}

input.jolly {
  font-family: var(--font-display);
  font-size: 1.2rem;
  border: 3px solid var(--ink);
  border-radius: var(--radius);
  padding: 0.6rem 0.9rem;
  width: 100%;
}
```

- [ ] **Step 3: Implement the store**

`packages/client/src/store.ts`:
```ts
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
      if (res.ok) {
        set({ roomCode: code, token: res.token, playerId: res.playerId });
        localStorage.setItem(SEAT_KEY, JSON.stringify({ code, token: res.token, playerId: res.playerId }));
      }
      return res.ok ? { ok: true } : { ok: false, error: res.error };
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
```

- [ ] **Step 4: Wire up App shell and routing**

`packages/client/src/main.tsx`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './theme.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>,
);
```

`packages/client/src/App.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { useGame } from './store';

function useHashRoute(): string {
  const [hash, setHash] = useState(window.location.hash || '#/');
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

export default function App() {
  const connect = useGame(s => s.connect);
  const route = useHashRoute();
  useEffect(() => { connect(); }, [connect]);

  if (route.startsWith('#/host')) return <div className="display">Host view (Task 13)</div>;
  if (route.startsWith('#/play')) return <div className="display">Player view (Task 12)</div>;
  return <div className="display">Join view (Task 11)</div>;
}
```

`packages/client/index.html` — set `<title>Scrabble Party 🎉</title>` and viewport meta:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
```

Delete `packages/client/src/App.css` and `packages/client/src/assets/react.svg`; empty out `index.css` if the scaffold references it (or delete it and remove the import).

- [ ] **Step 5: Verify build + typecheck**

Run: `npm run build -w packages/client`
Expected: Vite build succeeds with no TS errors.

- [ ] **Step 6: Verify against the dev server**

Run `npm run dev -w packages/server` and `npm run dev -w packages/client` (two terminals). Open the Vite URL, check the placeholder text renders for `#/`, `#/host`, `#/play` and the browser console shows a connected socket (no errors).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(client): socket store, cartoon theme, hash routing shell"
```

---

### Task 11: Client — join screen and lobby

**Files:**
- Create: `packages/client/src/screens/JoinScreen.tsx`
- Create: `packages/client/src/screens/Lobby.tsx`
- Create: `packages/client/src/components/AvatarPicker.tsx`
- Modify: `packages/client/src/App.tsx`

**Interfaces:**
- Consumes: `useGame` store (Task 10), `ClientSnapshot.seats`.
- Produces: `JoinScreen` (renders when route is `#/` and no seat), `Lobby` (renders once seated and `snapshot.phase === 'lobby'`), `AVATARS: string[]` exported from `AvatarPicker.tsx` (also used by host view). Route logic in `App.tsx` final form: `#/host*` → host stack (Task 13); otherwise: no seat → `JoinScreen`, seat + phase `lobby` → `Lobby`, seat + phase `playing|voting|ended` → `PlayerScreen` (Task 12 placeholder until then).

- [ ] **Step 1: Implement AvatarPicker**

`packages/client/src/components/AvatarPicker.tsx`:
```tsx
export const AVATARS = ['🦊', '🐸', '🐼', '🦄', '🐙', '🦁', '🐨', '🤖', '👻', '🦖', '🍕', '🌵'];

export function AvatarPicker({ value, onChange }: { value: string; onChange: (a: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
      {AVATARS.map(a => (
        <button
          key={a}
          onClick={() => onChange(a)}
          aria-label={`avatar ${a}`}
          style={{
            fontSize: '1.8rem', padding: 6, borderRadius: 12, cursor: 'pointer',
            border: a === value ? '3px solid var(--pop-pink)' : '3px solid transparent',
            background: a === value ? '#fff0f6' : 'transparent',
          }}
        >
          {a}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Implement JoinScreen**

`packages/client/src/screens/JoinScreen.tsx`:
```tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../store';
import { AvatarPicker, AVATARS } from '../components/AvatarPicker';

export function JoinScreen() {
  const joinRoom = useGame(s => s.joinRoom);
  const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  const [code, setCode] = useState(params.get('room') ?? '');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const res = await joinRoom(code.trim().toUpperCase(), name, avatar);
    setBusy(false);
    if (!res.ok) setError(res.error ?? 'Could not join.');
  }

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '2rem 1rem', display: 'grid', gap: 16 }}>
      <motion.h1
        initial={{ rotate: -3, scale: 0.9 }} animate={{ rotate: 3, scale: 1 }}
        transition={{ repeat: Infinity, repeatType: 'mirror', duration: 1.6 }}
        style={{ textAlign: 'center', fontSize: '2.4rem', margin: 0 }}
      >
        🎉 Scrabble Party
      </motion.h1>
      <div className="card" style={{ display: 'grid', gap: 12 }}>
        <input className="jolly" placeholder="ROOM CODE" maxLength={4} value={code}
          onChange={e => setCode(e.target.value.toUpperCase())} style={{ textAlign: 'center', letterSpacing: '0.4em' }} />
        <input className="jolly" placeholder="Your name" maxLength={16} value={name}
          onChange={e => setName(e.target.value)} />
        <AvatarPicker value={avatar} onChange={setAvatar} />
        {error && <div style={{ color: 'var(--pop-pink)', fontWeight: 700 }}>{error}</div>}
        <button className="btn primary" disabled={busy || code.length !== 4 || !name.trim()} onClick={submit}>
          Jump in! 🚀
        </button>
      </div>
      <a href="#/host" style={{ textAlign: 'center', color: 'var(--pop-blue)' }}>I’m the host — set up a game</a>
    </div>
  );
}
```

- [ ] **Step 3: Implement Lobby**

`packages/client/src/screens/Lobby.tsx`:
```tsx
import { motion } from 'framer-motion';
import { useGame } from '../store';

export function Lobby() {
  const snapshot = useGame(s => s.snapshot);
  const playerId = useGame(s => s.playerId);
  if (!snapshot) return null;

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '2rem 1rem', display: 'grid', gap: 16 }}>
      <h1 style={{ textAlign: 'center' }}>Room {snapshot.roomCode}</h1>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Who’s here ({snapshot.seats.length}/8)</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          {snapshot.seats.map((s, i) => (
            <motion.div key={s.playerId}
              initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.2rem' }}>
              <span style={{ fontSize: '1.6rem' }}>{s.avatar}</span>
              <b>{s.name}</b>
              {s.playerId === playerId && <span style={{ color: 'var(--pop-purple)' }}>(you)</span>}
              {!s.connected && <span title="away">💤</span>}
            </motion.div>
          ))}
        </div>
      </div>
      <p className="display" style={{ textAlign: 'center' }}>Waiting for the host to start… 🍿</p>
    </div>
  );
}
```

- [ ] **Step 4: Update App routing**

`packages/client/src/App.tsx` — replace the placeholder branches:
```tsx
import { useEffect, useState } from 'react';
import { useGame } from './store';
import { JoinScreen } from './screens/JoinScreen';
import { Lobby } from './screens/Lobby';

function useHashRoute(): string {
  const [hash, setHash] = useState(window.location.hash || '#/');
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

export default function App() {
  const connect = useGame(s => s.connect);
  const snapshot = useGame(s => s.snapshot);
  const playerId = useGame(s => s.playerId);
  const route = useHashRoute();
  useEffect(() => { connect(); }, [connect]);

  if (route.startsWith('#/host')) return <div className="display">Host view (Task 13)</div>;
  if (!playerId || !snapshot) return <JoinScreen />;
  if (snapshot.phase === 'lobby') return <Lobby />;
  return <div className="display">Player view (Task 12)</div>;
}
```

- [ ] **Step 5: Verify in the browser**

With both dev servers running, create a room over the socket from the browser console on `#/host` is not possible yet — instead verify via two browser tabs after Task 13, and for now check: `npm run build -w packages/client` passes, join screen renders, entering a bogus code shows "Room not found." (server running).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(client): join screen with avatar picker and animated lobby"
```

---

### Task 12: Client — player game screen (board, rack, actions, voting, game over)

**Files:**
- Create: `packages/client/src/screens/PlayerScreen.tsx`
- Create: `packages/client/src/components/BoardView.tsx`
- Create: `packages/client/src/components/Rack.tsx`
- Create: `packages/client/src/components/VoteSheet.tsx`
- Create: `packages/client/src/components/GameOver.tsx`
- Modify: `packages/client/src/App.tsx` (route `PlayerScreen` for phases `playing|voting|ended`)

**Interfaces:**
- Consumes: `useGame` store, `ClientSnapshot`, `Placement`, `premiumAt` from `@scrabble/shared`.
- Produces:
  - `BoardView({ board, staged, onCellTap, highlight })` — renders the 15×15 grid inside a horizontally/vertically scrollable, pinch-zoomable container (`touch-action: pinch-zoom; overflow: auto`). Premium squares tinted via `premiumAt`; `staged: Placement[]` rendered as translucent "pending" tiles; `highlight` marks the last move's cells.
  - `Rack({ tiles, selectedId, onSelect, swapSelection, onToggleSwap, mode })` — bottom-docked tile row; `mode: 'place' | 'swap'`.
  - Interaction model (tap-first, mobile-first): tap a rack tile to select it, tap an empty board square to stage it; tap a staged tile to return it to the rack. A blank tile prompts for its letter with `window.prompt('Which letter?')` normalized to A–Z. "Play" sends staged placements; "Clear" unstages all.
  - `VoteSheet` — bottom sheet shown when `snapshot.pendingVote` exists: shows the word, 👍/👎 for eligible voters, tally progress for everyone else.
  - `GameOver` — winner banner with confetti (framer-motion animated emoji burst), final scoreboard, "Play again" hint (host starts a new room).

- [ ] **Step 1: Implement BoardView**

`packages/client/src/components/BoardView.tsx`:
```tsx
import { motion } from 'framer-motion';
import { premiumAt, BOARD_SIZE, CENTER } from '@scrabble/shared';
import type { Cell, Placement } from '@scrabble/shared';

const PREM_BG: Record<string, string> = {
  DL: 'var(--prem-dl)', TL: 'var(--prem-tl)', DW: 'var(--prem-dw)', TW: 'var(--prem-tw)',
};
const PREM_LABEL: Record<string, string> = { DL: '2L', TL: '3L', DW: '2W', TW: '3W' };

export function BoardView({ board, staged, onCellTap, highlight }: {
  board: Cell[][];
  staged: Placement[];
  onCellTap?: (row: number, col: number) => void;
  highlight: Set<string>;
}) {
  const stagedAt = new Map(staged.map(p => [`${p.row},${p.col}`, p.tile]));
  return (
    <div style={{ overflow: 'auto', touchAction: 'pan-x pan-y pinch-zoom', flex: 1 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${BOARD_SIZE}, 34px)`,
        gap: 2, padding: 8, background: 'var(--bg-board)',
        borderRadius: 'var(--radius)', width: 'max-content', margin: '0 auto',
      }}>
        {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => {
          const row = Math.floor(i / BOARD_SIZE), col = i % BOARD_SIZE;
          const placed = board[row][col];
          const pending = stagedAt.get(`${row},${col}`);
          const prem = premiumAt(row, col);
          const tile = placed ?? pending ?? null;
          const letter = tile ? (tile.isBlank ? tile.assignedLetter ?? '?' : tile.letter) : null;
          return (
            <div key={i} onClick={() => !placed && onCellTap?.(row, col)}
              style={{
                width: 34, height: 34, borderRadius: 6, position: 'relative',
                background: tile ? undefined : prem ? PREM_BG[prem] : '#d5ecdf',
                display: 'grid', placeItems: 'center',
                fontSize: 9, fontWeight: 700, color: 'rgba(61,43,31,0.55)',
              }}>
              {!tile && prem && PREM_LABEL[prem]}
              {!tile && !prem && row === CENTER && col === CENTER && '★'}
              {tile && (
                <motion.div layout initial={{ scale: 0.6 }} animate={{ scale: 1 }}
                  style={{
                    position: 'absolute', inset: 0, borderRadius: 6,
                    background: 'var(--tile)', border: '2px solid var(--tile-edge)',
                    display: 'grid', placeItems: 'center',
                    fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--ink)',
                    opacity: pending && !placed ? 0.75 : 1,
                    outline: highlight.has(`${row},${col}`) ? '3px solid var(--pop-purple)' : 'none',
                  }}>
                  {letter}
                  <sub style={{ fontSize: 7, position: 'absolute', right: 2, bottom: 1 }}>{tile.value}</sub>
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement Rack**

`packages/client/src/components/Rack.tsx`:
```tsx
import { motion } from 'framer-motion';
import type { Tile } from '@scrabble/shared';

export function Rack({ tiles, selectedId, onSelect, swapSelection, mode }: {
  tiles: Tile[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  swapSelection: Set<string>;
  mode: 'place' | 'swap';
}) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', padding: '10px 6px' }}>
      {tiles.map(t => {
        const active = mode === 'swap' ? swapSelection.has(t.id) : selectedId === t.id;
        return (
          <motion.button key={t.id} onClick={() => onSelect(t.id)} whileTap={{ scale: 0.9 }}
            animate={{ y: active ? -10 : 0, rotate: active ? -4 : 0 }}
            style={{
              width: 44, height: 48, borderRadius: 8, cursor: 'pointer', position: 'relative',
              background: 'var(--tile)', border: '3px solid var(--tile-edge)',
              boxShadow: active ? '0 6px 0 var(--pop-purple)' : 'var(--shadow)',
              fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--ink)',
            }}>
            {t.isBlank ? '★' : t.letter}
            <sub style={{ fontSize: 9, position: 'absolute', right: 3, bottom: 2 }}>{t.value}</sub>
          </motion.button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Implement VoteSheet and GameOver**

`packages/client/src/components/VoteSheet.tsx`:
```tsx
import { motion } from 'framer-motion';
import { useGame } from '../store';

export function VoteSheet() {
  const snapshot = useGame(s => s.snapshot);
  const playerId = useGame(s => s.playerId);
  const vote = useGame(s => s.vote);
  const pending = snapshot?.pendingVote;
  if (!pending) return null;

  const canVote = playerId != null
    && pending.eligibleVoterIds.includes(playerId)
    && !(playerId in pending.votes);
  const voted = Object.keys(pending.votes).length;
  const needed = pending.eligibleVoterIds.length;
  const mover = snapshot!.players.find(p => p.id === pending.targetPlayerId);

  return (
    <motion.div initial={{ y: 200 }} animate={{ y: 0 }}
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50,
        background: 'white', borderTop: '3px solid var(--ink)',
        borderRadius: '20px 20px 0 0', padding: '1rem', textAlign: 'center',
      }}>
      <h2 style={{ margin: '0 0 4px' }}>
        {pending.kind === 'challenge' ? '⚔️ Word challenged!' : '📖 Not in the dictionary!'}
      </h2>
      <p style={{ margin: '0 0 10px' }}>
        Does <b className="display" style={{ fontSize: '1.4rem' }}>{pending.word}</b> by {mover?.avatar} {mover?.name} count?
      </p>
      {canVote ? (
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button className="btn" onClick={() => vote(true)}>👍 Let it stand</button>
          <button className="btn primary" onClick={() => vote(false)}>👎 No way</button>
        </div>
      ) : (
        <p>Votes in: {voted}/{needed} 🗳️</p>
      )}
    </motion.div>
  );
}
```

`packages/client/src/components/GameOver.tsx`:
```tsx
import { motion } from 'framer-motion';
import { useGame } from '../store';

const CONFETTI = ['🎉', '✨', '🎊', '⭐', '💛'];

export function GameOver() {
  const snapshot = useGame(s => s.snapshot);
  if (!snapshot) return null;
  const ranked = [...snapshot.players].sort((a, b) => b.score - a.score);
  const winners = ranked.filter(p => snapshot.winnerIds.includes(p.id));

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center', position: 'relative' }}>
      {Array.from({ length: 24 }, (_, i) => (
        <motion.span key={i}
          initial={{ y: -40, x: Math.random() * 320 - 160, opacity: 1 }}
          animate={{ y: 600, rotate: Math.random() * 720 }}
          transition={{ duration: 2.5 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
          style={{ position: 'absolute', left: '50%', fontSize: 22, pointerEvents: 'none' }}>
          {CONFETTI[i % CONFETTI.length]}
        </motion.span>
      ))}
      <h1 style={{ fontSize: '2.2rem' }}>
        🏆 {winners.map(w => `${w.avatar} ${w.name}`).join(' & ')} win{winners.length === 1 ? 's' : ''}!
      </h1>
      <div className="card" style={{ display: 'grid', gap: 8 }}>
        {ranked.map((p, i) => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem' }}>
            <span>{i + 1}. {p.avatar} {p.name}</span><b>{p.score}</b>
          </div>
        ))}
      </div>
      <p style={{ marginTop: 16 }}>Host can start a fresh room for a rematch! 🔁</p>
    </div>
  );
}
```

- [ ] **Step 4: Implement PlayerScreen**

`packages/client/src/screens/PlayerScreen.tsx`:
```tsx
import { useMemo, useState } from 'react';
import type { Placement } from '@scrabble/shared';
import { useGame } from '../store';
import { BoardView } from '../components/BoardView';
import { Rack } from '../components/Rack';
import { VoteSheet } from '../components/VoteSheet';
import { GameOver } from '../components/GameOver';

export function PlayerScreen() {
  const snapshot = useGame(s => s.snapshot);
  const playerId = useGame(s => s.playerId);
  const { play, swap, pass, takeBack, challenge } = useGame(s => ({
    play: s.play, swap: s.swap, pass: s.pass, takeBack: s.takeBack, challenge: s.challenge,
  }));
  const toast = useGame(s => s.toast);
  const clearToast = useGame(s => s.clearToast);

  const [staged, setStaged] = useState<Placement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<'place' | 'swap'>('place');
  const [swapSel, setSwapSel] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  const me = snapshot?.players.find(p => p.id === playerId);
  const myTurn = snapshot?.currentPlayerId === playerId;
  const stagedIds = useMemo(() => new Set(staged.map(p => p.tile.id)), [staged]);
  const rackTiles = (me?.rack ?? []).filter(t => !stagedIds.has(t.id));
  const highlight = useMemo(
    () => new Set((snapshot?.lastMove?.placements ?? []).map(p => `${p.row},${p.col}`)),
    [snapshot?.lastMove],
  );

  if (!snapshot || !me) return null;
  if (snapshot.phase === 'ended') return <GameOver />;

  function onCellTap(row: number, col: number) {
    const existing = staged.find(p => p.row === row && p.col === col);
    if (existing) { setStaged(staged.filter(p => p !== existing)); return; }
    if (!selectedId) return;
    const tile = me!.rack!.find(t => t.id === selectedId);
    if (!tile) return;
    let placed = tile;
    if (tile.isBlank) {
      const letter = (window.prompt('Blank tile — which letter?') ?? '').trim().toUpperCase();
      if (!/^[A-Z]$/.test(letter)) return;
      placed = { ...tile, assignedLetter: letter };
    }
    setStaged([...staged, { tile: placed, row, col }]);
    setSelectedId(null);
  }

  function onRackTap(id: string) {
    if (mode === 'swap') {
      const next = new Set(swapSel);
      next.has(id) ? next.delete(id) : next.add(id);
      setSwapSel(next);
    } else {
      setSelectedId(selectedId === id ? null : id);
    }
  }

  async function act(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError('');
    const res = await fn();
    if (!res.ok) setError(res.error ?? 'That didn’t work.');
    else { setStaged([]); setSwapSel(new Set()); setMode('place'); }
  }

  const current = snapshot.players.find(p => p.id === snapshot.currentPlayerId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <header style={{ display: 'flex', gap: 8, padding: '6px 10px', alignItems: 'center', overflowX: 'auto' }}>
        {snapshot.players.map(p => (
          <div key={p.id} className="display" style={{
            whiteSpace: 'nowrap', padding: '2px 8px', borderRadius: 10,
            background: p.id === snapshot.currentPlayerId ? 'var(--pop-pink)' : 'transparent',
            color: p.id === snapshot.currentPlayerId ? 'white' : 'var(--ink)',
          }}>
            {p.avatar} {p.name}: {p.score}{!p.connected && ' 💤'}
          </div>
        ))}
        <div style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>🎒 {snapshot.bagCount}</div>
      </header>

      <div className="display" style={{ textAlign: 'center', padding: 2 }}>
        {myTurn ? '✨ Your turn!' : `${current?.avatar} ${current?.name} is thinking…`}
      </div>

      <BoardView board={snapshot.board!} staged={staged} onCellTap={myTurn && mode === 'place' ? onCellTap : undefined} highlight={highlight} />

      {(error || toast) && (
        <div onClick={clearToast} style={{ color: 'var(--pop-pink)', textAlign: 'center', fontWeight: 700, padding: 4 }}>
          {error || toast?.text}
        </div>
      )}

      <Rack tiles={rackTiles} selectedId={selectedId} onSelect={onRackTap} swapSelection={swapSel} mode={mode} />

      <div style={{ display: 'flex', gap: 8, padding: '0 8px 10px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {mode === 'place' ? (
          <>
            <button className="btn primary" disabled={!myTurn || staged.length === 0} onClick={() => act(() => play(staged))}>Play ✅</button>
            <button className="btn ghost" disabled={staged.length === 0} onClick={() => setStaged([])}>Clear</button>
            <button className="btn" disabled={!myTurn} onClick={() => setMode('swap')}>Swap 🔄</button>
            <button className="btn ghost" disabled={!myTurn} onClick={() => act(pass)}>Pass 😴</button>
            {snapshot.settings.takeBacks && snapshot.lastMove?.playerId === playerId && (
              <button className="btn ghost" onClick={() => act(takeBack)}>Undo ↩️</button>
            )}
            {snapshot.settings.dictionaryMode === 'off' && snapshot.lastMove && snapshot.lastMove.playerId !== playerId && (
              <button className="btn" onClick={() => act(challenge)}>Challenge ⚔️</button>
            )}
          </>
        ) : (
          <>
            <button className="btn primary" disabled={swapSel.size === 0} onClick={() => act(() => swap([...swapSel]))}>
              Swap {swapSel.size} tile{swapSel.size === 1 ? '' : 's'} 🔄
            </button>
            <button className="btn ghost" onClick={() => { setMode('place'); setSwapSel(new Set()); }}>Cancel</button>
          </>
        )}
      </div>

      <VoteSheet />
    </div>
  );
}
```

Implementation note: the `useGame(s => ({ ... }))` object selector re-renders every store change; if that bothers you, select each action individually (`const play = useGame(s => s.play)` etc.) — actions are stable references.

- [ ] **Step 5: Route it in App.tsx**

Replace the final placeholder branch:
```tsx
import { PlayerScreen } from './screens/PlayerScreen';
// ...
if (snapshot.phase === 'lobby') return <Lobby />;
return <PlayerScreen />;
```

- [ ] **Step 6: Verify build**

Run: `npm run build -w packages/client`
Expected: build succeeds. Full interactive verification happens in Task 14.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(client): player game screen - board, rack, actions, votes, game over"
```

---

### Task 13: Client — host setup and big-screen view

**Files:**
- Create: `packages/client/src/screens/HostSetup.tsx`
- Create: `packages/client/src/screens/BigScreen.tsx`
- Modify: `packages/client/src/App.tsx`

**Interfaces:**
- Consumes: `useGame` store (`createRoom`, `startGame`, `watchRoom`, `hostToken`, `snapshot`), `BoardView`, `GameOver`, `qrcode.react`.
- Produces: `#/host` route → `HostSetup` when no room exists, `BigScreen` once created. `BigScreen` shows: pre-game — giant room code, QR of `http://<host>:<port>/#/?room=CODE`, live seat list, Start button (host only, enabled at 2+ players); in game — read-only `BoardView` (scaled up), scoreboard sidebar (stacks below the board under 800px width), animated turn indicator, `VoteSheet` tally (read-only), `GameOver` on end.

- [ ] **Step 1: Implement HostSetup**

`packages/client/src/screens/HostSetup.tsx`:
```tsx
import { useState } from 'react';
import type { GameSettings } from '@scrabble/shared';
import { useGame } from '../store';

export function HostSetup() {
  const createRoom = useGame(s => s.createRoom);
  const [settings, setSettings] = useState<GameSettings>({
    dictionaryMode: 'off', takeBacks: true, freeSwaps: 'limited', freeSwapLimit: 3,
  });
  const set = <K extends keyof GameSettings>(k: K, v: GameSettings[K]) =>
    setSettings({ ...settings, [k]: v });

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '2rem 1rem', display: 'grid', gap: 16 }}>
      <h1 style={{ textAlign: 'center' }}>🎪 Host a game</h1>
      <div className="card" style={{ display: 'grid', gap: 14 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <b>📖 Word checking</b>
          <select className="jolly" value={settings.dictionaryMode}
            onChange={e => set('dictionaryMode', e.target.value as GameSettings['dictionaryMode'])}>
            <option value="off">Anything goes — challenge & vote</option>
            <option value="override">Dictionary, group can override</option>
          </select>
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" checked={settings.takeBacks} onChange={e => set('takeBacks', e.target.checked)} />
          <b>↩️ Allow take-backs</b> (undo before the next player moves)
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <b>🔄 Free tile swaps</b>
          <select className="jolly" value={settings.freeSwaps}
            onChange={e => set('freeSwaps', e.target.value as GameSettings['freeSwaps'])}>
            <option value="off">Off — swapping costs your turn</option>
            <option value="limited">A few freebies per player</option>
            <option value="unlimited">Unlimited freebies</option>
          </select>
        </label>
        {settings.freeSwaps === 'limited' && (
          <label style={{ display: 'grid', gap: 4 }}>
            <b>How many freebies?</b>
            <input className="jolly" type="number" min={1} max={10} value={settings.freeSwapLimit}
              onChange={e => set('freeSwapLimit', Math.max(1, Number(e.target.value) || 1))} />
          </label>
        )}
        <button className="btn primary" onClick={() => createRoom(settings)}>Open the room! 🎉</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement BigScreen**

`packages/client/src/screens/BigScreen.tsx`:
```tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { useGame } from '../store';
import { BoardView } from '../components/BoardView';
import { GameOver } from '../components/GameOver';
import { VoteSheet } from '../components/VoteSheet';

export function BigScreen() {
  const snapshot = useGame(s => s.snapshot);
  const hostToken = useGame(s => s.hostToken);
  const startGame = useGame(s => s.startGame);
  const [error, setError] = useState('');
  if (!snapshot) return <div className="display" style={{ padding: 40 }}>Setting up…</div>;

  const joinUrl = `${window.location.origin}/#/?room=${snapshot.roomCode}`;

  if (snapshot.phase === 'lobby') {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh', gap: 20, padding: 20, textAlign: 'center' }}>
        <motion.h1 animate={{ rotate: [-2, 2] }} transition={{ repeat: Infinity, repeatType: 'mirror', duration: 1.4 }}
          style={{ fontSize: 'clamp(2rem, 6vw, 4rem)', margin: 0 }}>
          🎉 Scrabble Party
        </motion.h1>
        <div className="card" style={{ display: 'grid', gap: 12, placeItems: 'center' }}>
          <div className="display" style={{ fontSize: 'clamp(3rem, 10vw, 6rem)', letterSpacing: '0.3em' }}>
            {snapshot.roomCode}
          </div>
          <QRCodeSVG value={joinUrl} size={220} />
          <div>{joinUrl}</div>
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', fontSize: '1.5rem' }}>
          {snapshot.seats.map(s => (
            <motion.div key={s.playerId} initial={{ scale: 0 }} animate={{ scale: 1 }} className="display">
              {s.avatar} {s.name}
            </motion.div>
          ))}
          {snapshot.seats.length === 0 && <span>Waiting for players… 📱</span>}
        </div>
        {hostToken && (
          <button className="btn primary" style={{ fontSize: '1.4rem' }}
            disabled={snapshot.seats.length < 2}
            onClick={async () => {
              const res = await startGame();
              if (!res.ok) setError(res.error ?? 'Could not start.');
            }}>
            Start the game! 🚀 ({snapshot.seats.length}/8)
          </button>
        )}
        {error && <div style={{ color: 'var(--pop-pink)', fontWeight: 700 }}>{error}</div>}
      </div>
    );
  }

  if (snapshot.phase === 'ended') return <GameOver />;

  const current = snapshot.players.find(p => p.id === snapshot.currentPlayerId);
  const highlight = new Set((snapshot.lastMove?.placements ?? []).map(p => `${p.row},${p.col}`));

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, padding: 16, minHeight: '100dvh', justifyContent: 'center' }}>
      <div style={{ flex: '1 1 500px', maxWidth: 700, display: 'flex' }}>
        <BoardView board={snapshot.board!} staged={[]} highlight={highlight} />
      </div>
      <div style={{ flex: '0 1 300px', display: 'grid', gap: 12, alignContent: 'start' }}>
        <motion.div key={snapshot.currentPlayerId ?? ''} className="card display"
          initial={{ scale: 0.8 }} animate={{ scale: 1 }}
          style={{ textAlign: 'center', fontSize: '1.4rem', background: 'var(--pop-pink)', color: 'white' }}>
          {current?.avatar} {current?.name}’s turn
        </motion.div>
        <div className="card" style={{ display: 'grid', gap: 8 }}>
          {[...snapshot.players].sort((a, b) => b.score - a.score).map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem' }}>
              <span>{p.avatar} {p.name}{!p.connected && ' 💤'}</span>
              <b>{p.score}</b>
            </div>
          ))}
        </div>
        {snapshot.lastMove && (
          <div className="card">
            Last: <b>{snapshot.lastMove.words.join(', ')}</b> for <b>{snapshot.lastMove.score}</b> 🎯
          </div>
        )}
        <div className="card">🎒 Bag: {snapshot.bagCount} tiles</div>
      </div>
      <VoteSheet />
    </div>
  );
}
```

- [ ] **Step 3: Route host views in App.tsx**

```tsx
import { HostSetup } from './screens/HostSetup';
import { BigScreen } from './screens/BigScreen';
// ...
if (route.startsWith('#/host')) {
  return useGame.getState().roomCode ? <BigScreen /> : <HostSetup />;
}
```

Correct reactive form (the snippet above won't re-render — use the hook):
```tsx
const roomCode = useGame(s => s.roomCode);
// ...
if (route.startsWith('#/host')) return roomCode ? <BigScreen /> : <HostSetup />;
```

- [ ] **Step 4: End-to-end smoke test in browsers**

1. `npm run dev -w packages/server` and `npm run dev -w packages/client`.
2. Tab A: open `#/host`, create a room → room code + QR shown.
3. Tabs B and C (or an incognito window for C so localStorage seats don't collide): join with names.
4. Tab A: Start → B/C show racks; play a word from whichever tab has the turn; watch it animate on A.
5. Verify: swap UI, pass, take-back button, challenge → vote sheet on all screens, scores update.

Expected: full loop works with no console errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(client): host setup with leniency options and big-screen party view"
```

---

### Task 14: Production build, LAN verification, README

**Files:**
- Create: `README.md`
- Modify: anything the verification below shakes out.

**Interfaces:**
- Consumes: everything.
- Produces: a `npm run build && npm start` flow that serves the whole game from `http://<lan-ip>:3000` for real phones.

- [ ] **Step 1: Full build and test sweep**

Run: `npm run build && npm test`
Expected: shared + server test suites pass; client and server build clean. Fix anything that fails before proceeding.

- [ ] **Step 2: Production smoke test**

Run: `npm start`. On the host PC browser: `http://localhost:3000/#/host` → create room. On a phone on the same Wi-Fi: scan the terminal QR (or the big-screen QR after room creation) → join → play a turn.

Windows note: if the phone can't reach the PC, allow Node through the firewall — when the Windows Defender prompt appears on first `npm start`, tick "Private networks". Document this in the README.

Expected: a phone completes join → play → see the move on the big screen.

- [ ] **Step 3: Reconnect check**

Lock the phone mid-game, wait 15 seconds, unlock. Expected: big screen briefly shows 💤 next to the player; the phone auto-rejoins with rack intact.

- [ ] **Step 4: Write README.md**

```markdown
# 🎉 Scrabble Party

Browser Scrabble for 2–8 players on your Wi-Fi. One PC runs the server;
everyone else joins from their phone. No internet needed.

## Run it

```bash
npm install
npm run build
npm start
```

The terminal prints a QR code and a URL like `http://192.168.1.20:3000`.

1. On the PC (the "big screen"): open `http://localhost:3000/#/host`,
   pick your house rules, and open the room.
2. Players: scan the QR on the big screen (or type the URL and the
   4-letter room code).
3. Hit **Start the game!** with 2+ players.

## House rules (leniency options)

- **Word checking:** anything goes (with challenges + group vote), or
  dictionary with group override.
- **Take-backs:** undo your move before the next player acts.
- **Free swaps:** off / N per player / unlimited.

## Windows firewall

First launch: when Windows asks, allow Node.js on **Private networks**,
or phones won't be able to connect.

## Development

```bash
npm run dev -w packages/server   # API + sockets on :3000
npm run dev -w packages/client   # Vite dev server with proxy
npm test                         # rules engine + server tests
```
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: README with party setup instructions; verified LAN play"
```

---

## Verification checklist (manual, after Task 14)

- [ ] 3+ devices (PC + 2 phones) complete a full game to the end screen.
- [ ] 5-player game draws from a 200-tile bag (bag count starts at 200 − 35).
- [ ] Challenge vote retracts a word; scores revert on every screen.
- [ ] Dictionary-override game rejects gibberish, vote allows it anyway.
- [ ] Take-back restores rack and turn; disabled when host turned it off.
- [ ] Phone screen-lock + unlock reconnects with the same rack.
- [ ] Board is playable one-handed on a ~375px-wide phone (scroll + tap-to-place).
