# Scrabble Party — Design Spec

**Date:** 2026-07-06
**Status:** Approved

## Overview

A browser-based, n-player Scrabble game for parties on a closed network (typically Wi-Fi).
One machine (the host's Windows PC) runs the server; players join from phones, tablets, or
laptops by browsing to the server's LAN IP. No internet required. Fun, jolly, cartoonish UI,
designed mobile-first.

## Goals

- 2–8 players per game, joining from any modern browser on the LAN.
- Faithful classic Scrabble rules with host-configurable leniency options.
- A shared "big screen" spectator view on the host machine as the party centerpiece.
- Architecture that admits future game modes without rework.

## Non-Goals (v1)

- Accounts, authentication, or internet play.
- Persistence across server restarts (a crashed server means a restarted game).
- AI opponents.
- Additional game modes beyond classic (the extension point ships; modes do not).

## Architecture

**Approach:** single authoritative Node server + React client, TypeScript monorepo
(npm workspaces).

```
packages/
  shared/   — game types + pure rules engine (used by server and client)
  server/   — Node + Express + Socket.IO; serves built client as static files
  client/   — React + Vite + Zustand + framer-motion
```

- The server binds `0.0.0.0` on port 3000 and prints its LAN IP and a join QR code in the
  terminal on startup.
- Server memory holds all game state (no database). Reconnect tokens stored in each
  client's localStorage keep a player's seat across disconnects/screen locks.
- Clients send **intents** (e.g., "play these tiles at these squares"); the server validates
  against the rules engine and broadcasts a **full state snapshot** to the room on every
  change. Snapshots are per-recipient: a player's own rack is included; other racks are
  hidden (tile counts only).
- Rooms are identified by 4-letter codes; multiple concurrent games are supported.

## Game Rules Engine (`packages/shared`)

Pure, side-effect-free functions with full unit test coverage.

- **Board:** 15×15 with standard premium squares (DL, TL, DW, TW, center star).
- **Tile bag:** standard 100-tile English distribution for 2–4 players; doubled (200 tiles)
  for 5–8 players so racks stay at 7 tiles and the game keeps a sensible length.
- **Move validation:** tiles in one row/column, contiguous with existing tiles, connected to
  the existing board (first move must cover the center star), racks must contain the
  played tiles.
- **Scoring:** letter/word premiums (applied only on newly placed tiles), all cross-words
  scored, 50-point bonus for playing all 7 tiles (bingo).
- **Endgame:** bag empty and one player uses their last tile, or all players pass twice in
  a row. Final scoring: each player's remaining rack value is deducted; the player who
  went out gains the sum of everyone else's racks.
- **GameMode interface:** the engine exposes a pluggable `GameMode` contract (setup,
  validate-move, score-move, turn-advance, end-condition hooks). `ClassicMode` is the only
  v1 implementation; timed/duplicate/variant modes can be added later without touching the
  core loop.

## Leniency Options (host sets at game creation)

| Option | Values | Behavior |
|---|---|---|
| Dictionary | Off / On-with-override | Off: any word accepted; any opponent may challenge, group votes, failed play is retracted and the turn is lost (classic challenge penalty applies only if the host enables it). On: words checked against a bundled ENABLE/SOWPODS-style word list; a rejected word triggers a group vote that may allow it anyway. |
| Take-backs | On / Off | A player may undo their own last move until the next player acts. |
| Free swaps | Off / Limited (N per game) / Unlimited | Swap any tiles with the bag without losing the turn. |

## Client Views (mobile-first)

1. **Join & lobby:** enter room code (or arrive via QR), pick a name and a cartoon avatar,
   see who's in, host configures leniency options and starts the game.
2. **Player game screen:** rack docked at the bottom (drag-and-drop or tap-square-then-tap-
   tile), pinch/zoom + pan board, compact score strip, action bar (Play / Swap / Pass /
   Challenge / Undo where enabled), turn notification with sound and vibration.
3. **Big-screen host view:** board-dominant layout showing live tile placement with
   animation, scoreboard, turn indicator, join QR code before game start, celebration
   effects (confetti) on bingos and game end. Read-only.

**Visual language:** rounded chunky tiles, bouncy framer-motion animations, saturated
playful palette, rounded display typography, wobbly/playful turn indicators. Layout is
mobile-first with responsive scaling up to desktop.

## Error Handling & Resilience

- Server is the single source of truth; invalid intents get a friendly rejection message,
  never a client-side crash.
- Disconnects: seat held via reconnect token; board shows the player as "away"; host can
  skip or remove an absent player.
- Full-snapshot broadcasting makes reconnection trivial (rejoin → receive current state).

## Testing

- **Unit (Vitest):** rules engine — scoring tables, premium application, cross-words,
  bingo, placement validation, endgame arithmetic, scaled tile bag.
- **Integration:** Socket.IO flows — join, play, challenge/vote, reconnect, endgame —
  against a real server instance.
- **Manual:** UI passes on a phone (small viewport, touch) and a desktop browser.
