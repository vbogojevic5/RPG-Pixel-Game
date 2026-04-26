# RPG Game — TODO Checklist

Live progress tracker. Mirrors the checklist from `instructions.md`, reorganized phase-first.

**Legend:** `[x]` done · `[ ]` pending

---

## Phase 1 — Core Base

Deliverable: Main Menu (Start / Load / Exit) -> Run Map (5 nodes, first unlocked) -> first battle vs Goblin Warrior with full fight logic and live HP -> Post-Battle result -> back to map. No animations.

### Project Setup & Scaffold
- [x] Initialize server project (`npm init`, install `express`, `cors`, `nodemon`)
- [x] Initialize client project (Vite + React 19)
- [x] Create `/server/config.js` (single file with `hero`, `monsters`, `moves`, `constants` exports)
- [x] Create `/server/models/` — `Move.js`, `Monster.js`, `Hero.js`, `BattleState.js` (empty shells)
- [x] Create `/server/routes/` — `index.js`, `run.routes.js`, `battle.routes.js`
- [x] Create `/server/controllers/` — `run.controller.js`, `battle.controller.js`
- [x] Create `/server/logic/` — `combat.js`, `ai.js`, `levelUp.js` (empty), `moveResolver.js` (empty)
- [x] Create `/server/middleware/` — `errorHandler.js`, `validateBattleState.js`
- [x] Create `/server/index.js` and `/server/server.js`
- [x] Create `/client/src/components/screens/` — `MainMenu.jsx`, `RunMap.jsx`, `BattleScreen.jsx`, `PostBattle.jsx`, `MoveManager.jsx` (stub), `VictoryScreen.jsx` (stub)
- [x] Create `/client/src/components/ui/` — `HPBar.jsx`, `MoveButton.jsx`, `StatBlock.jsx` (stub), `BattleLog.jsx` (stub), `Tooltip.jsx` (stub), `LevelUpModal.jsx` (stub)
- [x] Create `/client/src/hooks/` — `useGameState.js`, `useBattle.js`, `useRunConfig.js`
- [x] Create `/client/src/services/api.js`
- [x] Create `/client/src/constants/gameConstants.js`
- [x] Create `/client/src/styles/` — `global.css`, `ui.css`, `battle.css`, `map.css`
- [x] Root-level `README.md` and `.gitignore`
- [x] All files created with no lint/build errors (client ESLint + Vite production build both clean)
- [x] Server runs on `localhost:3001` (`npm run dev` / `npm start` in `/server`)
- [x] Client runs on Vite default port `5173` (`npm run dev` in `/client`)
- [x] Server CORS enabled so client can fetch from it

### Server — Phase 1
- [x] `config.js` with all move definitions (24 moves across hero + 5 monster movesets)
- [x] `config.js` with all 5 monster configs (ordered, scaled difficulty, XP rewards)
- [x] `config.js` with hero base stats + constants (max equipped moves, XP thresholds, level-up gains)
- [x] `GET /run/config` endpoint returning full config (hero + monsters sorted by order + moves dict + constants)
- [x] Smoke-tested: `/run/config` returns all 5 monsters and 24 move IDs
- [x] `ai.js` with random move selection
- [x] `GET /battle/monster-move?state=<base64-json>` endpoint (decodes state, returns `{ move }`)
- [x] Smoke-tested: 6 sequential calls returned varied moves from the monster's moveset
- [x] `validateBattleState` middleware: rejects missing/invalid base64, unknown monsterId, illegal moves
- [x] Smoke-tested: malformed/empty state both return `400` with error JSON
- [x] Global `errorHandler` middleware wired into `server.js`
- [x] `GET /health` utility endpoint

### Client — Main Menu
- [x] `MainMenu.jsx` renders with three buttons: Start Game, Load Game, Exit
- [x] Start Game calls `/run/config`, stores result, transitions to Run Map
- [x] Load Game is a visible placeholder that does nothing (shows a brief note)
- [x] Exit is a visible placeholder that does nothing (shows a brief note)
- [x] Loading + error states surfaced on the button / below the card

### Client — Run Map
- [x] `RunMap.jsx` renders 5 encounter nodes from run config
- [x] Only the first node (Goblin Warrior) is clickable
- [x] Nodes 2-5 render as visibly locked (dimmed, disabled button labelled "Locked")
- [x] Click on first node transitions into the Battle Screen
- [x] Shows hero name + current HP at the top of the map
- [x] Back-to-Menu button returns to Main Menu

### Client — Battle Screen (first fight)
- [x] `BattleScreen.jsx` displays hero name + HP bar + HP number
- [x] Displays monster name + HP bar + HP number
- [x] Displays 4 move buttons with names and type-colored accents
- [x] Click a move: sends battle state to `/battle/monster-move` (base64-encoded)
- [x] Applies hero move first (damage/heal/buff/debuff/lifesteal/self-damage)
- [x] Applies monster move second
- [x] Live HP updates on screen (numeric + bar, no animations)
- [x] Displays active buffs/debuffs for both sides with turns remaining
- [x] Detects KO after hero move (monster HP <= 0) and ends the battle
- [x] Detects KO after monster move (hero HP <= 0) and ends the battle
- [x] Buttons disabled while the server is deciding the monster's move
- [x] Rolling inline log shows the last ~6 actions

### Client — Post-Battle Screen
- [x] Shows outcome (Victory / Defeat) with themed coloring
- [x] On victory: shows a randomly learned move (name, type, description) from the monster's moveset
- [x] Continue button returns to Run Map with hero HP reset

### Client — Game Logic
- [x] Physical damage formula: `floor((base * atk/10) - def)` min 1
- [x] Magic damage formula: `floor(base * mag/10)` min 1
- [x] Healing formula: `floor(base * mag/10)`
- [x] Buff application (stat multiplier for N turns, stacked per combatant)
- [x] Debuff application applied to the opponent's buff list
- [x] Buff/debuff turn countdown at end of each round, expired entries removed
- [x] Hero move resolved first, monster move second
- [x] KO detection correctly ends the battle at either resolution step
- [x] Effective stats applied through buffs during damage math (both sides)
- [x] Lifesteal on Drain Life
- [x] Self-damage cost on Dark Pact

### Styling
- [x] `global.css` with dark-fantasy theme, CSS variables, reset
- [x] `ui.css` with buttons, HP bar, move buttons, main menu card, post-battle card
- [x] `map.css` with run map layout, locked/available node states, responsive tweaks
- [x] `battle.css` with combatant panels, move grid, buff chips, battle log, responsive tweaks

### Phase 1 Acceptance
- [x] Manual browser playtest: Main Menu -> Map -> Goblin Warrior fight -> Post-Battle -> Map
- [x] All Goblin Warrior moves observed working (Rusty Blade, Dirty Kick, Frenzy, Headbutt)
- [x] All hero default moves work (Slash, Shield Up, Battle Cry, Second Wind)
- [x] Buffs expire after 2 turns as expected
- [x] Back-to-Map from Post-Battle resets HP correctly
- [x] Any runtime bugs found during playtest are fixed

---

## Phase 2 — Progression, Map & Sprites

Deliverable: a fixed illustrated "journey map" with one winding path through the 5 encounters; an arena-style battle screen inspired by Ninja Saga with fighters standing on a painted backdrop, floating HP plates, and an ability toolbar; hero state (HP, XP, level, known/equipped moves) persists across every fight in the run; monsters unlock in order after the previous is beaten; beaten monsters can be re-fought; Move Manager lets the player rearrange their loadout between fights; Victory Screen summarises the run once all 5 are down.

### Assets & Sprite System
- [x] Created `client/public/assets/32rogues/` containing the extracted 32rogues 0.5.0 sheets
- [x] `client/public/assets/README.md` documents the sheet layout + how to override cells
- [x] Central sprite registry `client/src/constants/sprites.js` with **sheet+cell coords** for hero + all 5 monsters, tiles + emoji fallbacks
- [x] `components/ui/Sprite.jsx` renders either a single PNG or one cell of a sprite sheet via CSS scale transform, with `image-rendering: pixelated` and emoji fallback when the sheet is missing

### Client — Journey Map (revised from walkable overworld)
- [x] `constants/overworld.js` — fixed node positions (% coords) + SVG path connecting them
- [x] `RunMap.jsx` rewritten as a static illustrated journey map:
  - [x] Single winding parchment path drawn in SVG, growing "traveled" as monsters fall
  - [x] 5 monster sprite nodes with order badges and scene captions
  - [x] Next-to-fight node pulses; defeated nodes are grey with a skull overlay
  - [x] Locked nodes are disabled, defeated nodes still clickable for re-fights
  - [x] No walking, no keyboard input — pure click-to-fight
- [x] Top bar: hero portrait, level, HP bar, XP bar, "Moves" and "Menu" buttons

### Client — Ninja-Saga-style Battle Arena
- [x] `BattleScreen.jsx` rebuilt as a single framed arena scene:
  - [x] Painted backdrop (sky, mountains, stone floor, pillars) via layered CSS
  - [x] Hero sprite stands on the left ground, monster on the right (mirrored), with ground shadows
  - [x] Floating VS flare in the centre; win/lose banner pops on battle end
- [x] Corner name-plates (top-left hero, top-right monster):
  - [x] Circular portrait, name + level/tag, slim HP bar with tiered colour, numeric HP, buff/debuff chips
- [x] Bottom ability toolbar with 4 icon-style move buttons embedded in the arena
- [x] Compact in-arena log showing the last few actions

### Client — Progression (useGameState)
- [x] Tracks `hero.level`, `hero.xp`, `hero.stats` (live stats separate from `baseStats`)
- [x] Tracks `hero.knownMoves` (pool that grows as moves are learned)
- [x] `applyBattleOutcome(payload)` — single entry point from the battle screen:
  - [x] Awards XP (full on win, half on loss)
  - [x] Runs a level-up loop (can catch up multiple levels in one battle)
  - [x] Applies `constants.LEVEL_UP_STAT_GAINS` and heals the health gain
  - [x] Persists end-of-battle HP across fights (min 1 after a win)
  - [x] Picks a random unknown move from the monster's moveset as the learned reward
  - [x] Marks already-known case when the hero has every move in the pool
  - [x] Adds monsterId to `defeatedMonsterIds`
- [x] `runStats` aggregates battles fought / won / lost for the Victory screen
- [x] `updateEquippedMoves(nextEquipped)` writes the Move Manager's loadout back to hero
- [x] `fullHealHero()` restores HP (used after a defeat Continue)

### Client — PostBattle (Phase 2 rewards)
- [x] Shows monster portrait
- [x] Shows XP gained badge
- [x] Shows `<LevelUpModal>` with new level + stat gains when `summary.leveledUp`
- [x] Shows learned move card, or "No new move learned" when `alreadyKnown`
- [x] Continue auto-routes: defeat → Overworld (full heal), victory + all 5 cleared → Victory Screen, otherwise → Overworld (HP preserved)

### Client — Move Manager
- [x] New `MoveManager.jsx` screen reachable via the Moves button on the overworld top bar
- [x] Lists every known move as a type-coloured card with description
- [x] Click toggles equip/unequip
- [x] Enforces `max 4` (from `constants.MAX_EQUIPPED_MOVES`) and `min 1`
- [x] Save writes back via `updateEquippedMoves`; Cancel discards changes
- [x] Dirty-check disables Save until something actually changed

### Client — Victory Screen
- [x] Shown after all 5 monsters are in `defeatedMonsterIds`
- [x] Displays final level, battles fought/won/lost
- [x] Lists every monster defeated with portrait
- [x] Lists every move mastered during the run
- [x] Back to Menu resets the run

### Client — Retry
- [x] Any defeated monster can be bumped again to re-enter that fight (XP farm / move reroll)
- [x] Already-known move branch gracefully handles the re-roll case in PostBattle

### Styling
- [x] `map.css` rewritten for the journey map (parchment backdrop, SVG path, node pins, captions)
- [x] `battle.css` rewritten for the arena scene (sky/floor/pillar layers, name-plates, toolbar, log)
- [x] `manager.css` — Move Manager cards, Victory Screen, LevelUp badge, post-battle additions
- [x] Dark fantasy palette preserved

### Phase 2 Acceptance
- [x] Client ESLint clean
- [x] Vite production build clean
- [ ] Manual browser playtest: Main Menu → Journey Map → click Goblin Warrior → arena fight → PostBattle → next node → ... → Victory
- [ ] Hero HP persists between back-to-back fights
- [ ] Hero level-up fires when XP threshold is crossed, stats go up, HP gain is added
- [ ] Move Manager respects 1 ≤ equipped ≤ 4
- [ ] Re-fighting a defeated monster still awards XP
- [ ] Victory screen appears after dragon is defeated
- [ ] 32rogues sprites visibly render for hero + all 5 monsters on the journey map and in the arena

---

## Phase 3 — Polish & Bonus

### Infrastructure — Database (PostgreSQL + Prisma)
- [x] `docker-compose.yml` with a `postgres:16` service on host port `5433` → container `5432`
- [x] Server deps: `@prisma/client`, `prisma` (v6), `bcryptjs`, `jsonwebtoken`, `dotenv`
- [x] `.env` / `.env.example` with `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`
- [x] `prisma/schema.prisma` with models: `Player`, `Move`, `Monster`, `MonsterMove` (join), `HeroConfig`, `Constant`, `GameSave`
- [x] Prisma scripts in `server/package.json`: `db:migrate`, `db:generate`, `db:studio`, `db:seed`, `db:reset`
- [x] Initial migration applied (`rpg_game` schema live in Docker)
- [x] Idempotent seed (`prisma/seed.js`) — upserts every move / monster / hero config / constant from the canonical `server/config.js`
- [x] `server/db.js` — singleton Prisma client
- [x] `services/config.service.js` — DB-backed loader that reshapes rows into the original in-memory `config` object (zero client-side changes)
- [x] `run.controller.js` + `middleware/validateBattleState.js` refactored to read from DB

### Auth (JWT + bcrypt)
- [x] `services/auth.service.js` — register / login / token sign / verify, bcrypt hashing
- [x] `middleware/requireAuth.js` — verifies `Authorization: Bearer <jwt>` and attaches `req.player`
- [x] `POST /auth/register` (201 + token), `POST /auth/login`, `GET /auth/me`
- [x] `client/src/hooks/useAuth.js` — localStorage persistence, boot-time revalidation against `/auth/me`
- [x] `client/src/components/screens/AuthScreen.jsx` — combined login / register panel, shown before the main menu
- [x] `MainMenu` shows logged-in username and a Log out button

### Game saves (server-backed save slots)
- [x] `GameSave` model (playerId FK, name, heroState JSON, defeatedMonsterIds JSON, runStats JSON, lastScreen, timestamps)
- [x] `controllers/saves.controller.js` + `routes/saves.routes.js` behind `requireAuth`
- [x] `GET /saves`, `GET /saves/:id`, `POST /saves`, `PUT /saves/:id`, `DELETE /saves/:id`
- [x] Per-player cap of 10 saves; 40-char name limit
- [x] `client/src/hooks/useSaves.js` — list / create / overwrite / delete
- [x] `client/src/hooks/useGameState.js` — `snapshotForSave(name)` and `loadRun(save, config)`
- [x] `LoadGameScreen.jsx` — lists every save with meta, delete button, click-to-load
- [x] `SaveGameModal.jsx` — create a new slot or overwrite an existing one from the journey map
- [x] RunMap has a "Save" button in the top bar

### Status effects (DoT on moves)
- [x] `statusEffect` column on `Move` (JSON: `{ kind, chance, damage, turns }`)
- [x] Seed data flags `shadowBolt` (poison), `bite` / `pounce` (bleed), `flameBreath` / `firebolt` (burn), `clawSwipe` (bleed), `headbutt` (stun-lite)
- [x] `useBattle.js` — per-combatant `statuses`, `maybeApplyStatus` on hit, `tickStatuses` at turn start, `tickStatusDurations` at round end
- [x] Name-plate chips render each active status with remaining turns

### UI polish
- [x] `components/ui/Tooltip.jsx` — real hover tooltip wrapper
- [x] `MoveTooltipCard` — type, base value, description, status-effect preview; wired onto every `MoveButton`
- [x] `components/ui/BattleLog.jsx` — scrollable collapsible side panel (replaces the inline last-4 log)
- [x] Stat-choice level-up: `StatChoiceModal` with 10-archetype boost pool, 3 random picks per level, queue supports multi-level catch-up
- [x] `useGameState.applyLevelUpChoice(gains)` + `countLevelUps(...)` so PostBattle waits on the player's choice before unlocking Continue

### Phase 3 Acceptance
- [x] `npm run lint` clean on the client
- [x] Server endpoints smoke-tested end-to-end: `/run/config`, `/auth/register`, `/auth/me`, `/saves` (list / create / get / update / delete)
- [ ] Manual browser playtest: register → login → start run → status effect fires in battle → level up + pick boost → save → logout → login → load → continue → victory

### Still deferred (not required for Phase 3 sign-off)
- [ ] Smarter monster AI on server (heal low, debuff high, telegraph/combo)
- [ ] Battle animations (hit shake, flash, slide)
- [ ] Balance pass (3 full runs)
- [ ] Optional: hero-class selection from `rogues.png` at character creation
