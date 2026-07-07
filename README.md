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

## Project layout

```
packages/
  shared/   Board, tiles, scoring, move validation, vote rules (pure TS, no I/O)
  server/   Express + socket.io server: rooms, dictionary, reconnect/session state
  client/   React + Vite SPA: join screen, lobby, host setup, big screen, player screen
```

- `npm run build` builds `shared` → `client` → `server` in order (the server
  serves the client's `dist/` output as static files; `client` depends on
  `shared`'s compiled types).
- `npm test` runs the `shared` and `server` test suites (vitest).
- `npm start` runs the production server (`tsx src/main.ts`) which binds
  `0.0.0.0:3000` and serves the built client — this is the one process real
  players connect to over LAN.

## Windows firewall

First launch: when Windows asks, allow Node.js on **Private networks**,
or phones won't be able to connect. If you miss the prompt or it never
appears (e.g. it was previously dismissed), open **Windows Defender
Firewall → Allow an app through firewall**, find Node.js, and tick
**Private**. If phones still can't reach the PC, double check both
devices are on the *same* Wi-Fi network/SSID (not a guest network that
isolates clients from each other).

## Development

```bash
npm run dev -w packages/server   # API + sockets on :3000
npm run dev -w packages/client   # Vite dev server with proxy
npm test                         # rules engine + server tests
```

## Verification notes

Automated as part of building this project:
- `npm run build` (shared, client, server) and `npm test` (shared + server,
  56 tests) run clean.
- `npm start` was smoke-tested: the server serves the built client's
  `index.html` and static assets at `http://localhost:3000`, and a
  Playwright-driven browser session created a room from `#/host`, joined
  it as two players from `#/?room=<code>`, watched the lobby update live
  on the big screen as each player joined, started the game, and confirmed
  the board, racks, bag count (100-tile two-player bag minus dealt tiles),
  and turn indicator all rendered correctly.

The following need a real phone and cannot be automated from a dev machine;
they're the remaining manual checks before a real party:

- [ ] 3+ real devices (PC + 2 phones) completing a full game to the end screen.
- [ ] Scanning the QR code with a phone camera (vs. typing the URL).
- [ ] A 5-player game draws from the full 200-tile bag as expected.
- [ ] A challenge vote retracts a word and scores revert on every screen.
- [ ] A dictionary-override game rejects gibberish, then a vote allows it anyway.
- [ ] Take-back restores rack and turn, and is disabled when the host turned it off.
- [ ] Phone screen-lock + unlock reconnects with the same rack (💤 shows while away).
- [ ] The board is playable one-handed on a ~375px-wide phone (scroll + tap-to-place).
- [ ] The Windows Defender firewall prompt actually appears on first `npm start`
      and that ticking "Private networks" is sufficient (can't trigger a real
      OS security prompt from this environment).
