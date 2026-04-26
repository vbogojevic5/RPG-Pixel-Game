# Knight's Gauntlet — Full Stack RPG (Phase 1)

Turn-based RPG where a Knight fights through a gauntlet of 5 monsters.
Game logic (monster configs, AI, move definitions) lives on the server so the
Game Designer can rebalance without a client rebuild.

See [`instructions.md`](./instructions.md) for the full spec and
[`TODO.md`](./TODO.md) for phase-by-phase progress.

## What Phase 1 ships

- **Main Menu** with Start Game (functional), Load Game / Exit (no-op placeholders).
- **Run Map** showing all 5 encounter nodes. Only the first (Goblin Warrior) is playable.
- **Battle Screen** with full fight logic — physical / magic / heal / buff / debuff, damage formulas, turn-based HP updates (no animations).
- **Post-Battle** screen with outcome + randomly learned move on victory.
- **Server** with `GET /run/config` and `GET /battle/monster-move?state=<base64-json>` (random monster AI).

## Stack

- **Server**: Node.js + Express 5 (ES modules)
- **Client**: React 19 + Vite 8 + plain CSS
- **No database, no auth, no game engine.** Just two REST endpoints and a stateful React app.

## Run it locally

You'll need two terminals, one per process.

### 1. Server (port 3001)

```bash
cd server
npm install
npm run dev     # or: npm start
```

Sanity check:
```
GET http://localhost:3001/health       -> { "ok": true, "service": "rpg-server" }
GET http://localhost:3001/run/config   -> full hero + monsters + moves JSON
```

### 2. Client (port 5173, Vite default)

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173/` in a browser. The client talks to the server at
`http://localhost:3001` by default — override via the `VITE_API_BASE_URL`
environment variable if you host them elsewhere.

## Project layout

```
/server
  config.js                ← hero + monsters + moves + constants (single source of truth)
  index.js, server.js      ← Express app boot
  routes/                  ← run + battle route files
  controllers/             ← request handlers
  logic/                   ← ai.js (random), combat.js (pure math)
  middleware/              ← errorHandler, validateBattleState (decodes base64)
  models/                  ← empty shells, fleshed out in Phase 2

/client/src
  App.jsx                  ← top-level screen router
  components/screens/      ← MainMenu, RunMap, BattleScreen, PostBattle
  components/ui/           ← HPBar, MoveButton (+ Phase 2+ stubs)
  hooks/                   ← useRunConfig, useGameState, useBattle (fight engine)
  services/api.js          ← all fetch() calls
  constants/               ← screen names, API base URL
  styles/                  ← global, ui, map, battle CSS
```

## What's NOT in Phase 1 (see TODO.md)

- Monsters 2–5 (visually locked on the map)
- XP / leveling
- Move Manager (equip/unequip)
- Victory Screen (full run completion)
- Battle log panel, tooltips, animations
- Save & Exit via localStorage
- Smarter monster AI
