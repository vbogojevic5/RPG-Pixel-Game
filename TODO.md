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

---

## Phase 4 — Current Handoff: Game Feel, Audio & Final Polish

Use this section as the starting point for the next chat/tab.

### Recently completed in Phase 4
- [x] Battle arena upgraded into a forest-ruins scene with mist, moonlight, torches, ruins, impact bursts, and floating damage/heal/status text.
- [x] Battle turn pacing added: hero action resolves, then a short delay before the monster acts.
- [x] Active fighter nameplate highlight added with an "On turn" badge.
- [x] Hero now starts every battle at full HP; HP no longer carries between battles.
- [x] Hero moved to the right side of the arena, monster to the left, with facing preserved.
- [x] Ability toolbar moved below the arena so it does not cover fighters.
- [x] Arena controls changed to vertical layout: Menu on top, Battle Log below.
- [x] Battle Log opens as a large overlay via portal so it is not clipped by the arena.
- [x] Battle Log rows restyled with indexes, stronger card styling, and latest-entry highlight.
- [x] Latest battle log is available on defeat PostBattle screen.
- [x] Full run battle log is available on Victory screen.
- [x] Journey map enlarged and vertically centered.
- [x] Journey map got a darker forest/biome background with localized biome glows around monsters.
- [x] Journey map no longer shows player HP in the top bar.
- [x] Monster hover stat cloud added on journey map: HP, DMG, DEF, AP.
- [x] Monster stat cloud border radius made consistent on all corners.
- [x] Footstep-style path segments added: grey locked, yellow available, green cleared.
- [x] Removed journey hint text: "Click the pulsing banner..."
- [x] Move Arsenal improved visually with equipped slot row and richer cards.
- [x] Equipped ability slots are clickable to remove moves back to the known-moves pool.
- [x] Known ability cards only equip moves; equipped cards no longer toggle off from the list.
- [x] Physical/damaging move cards are styled red with stronger borders.
- [x] `ATK` display labels renamed to `DMG`.
- [x] PostBattle learned move layout improved: move name left, type aligned right on the same row.
- [x] Save overwrite confirmation moved from browser `confirm()` into custom save-modal UI.
- [x] Game-icons.net SVG ability icons approved and wired into ability buttons/cards.
- [x] Game-icons.net attribution added to `README.md`.
- [x] Client `npm run lint` and `npm run build` passed after the latest UI changes.

### Approved audio direction
- [x] Music source approved: **Glizzy Elf Forest [RPG MUSIC PACK]** from OpenGameArt.
- [x] UI sound source approved: **Kenney RPG Audio**.

### Audio implementation TODO
- [x] Download/import **Glizzy Elf Forest [RPG MUSIC PACK]** into `client/public/assets/audio/music/`.
- [x] Download/import **Kenney RPG Audio** UI sounds into `client/public/assets/audio/sfx/`.
- [x] Add `client/public/assets/audio/README.md` with source URLs, licenses, and attribution notes.
- [x] Add a central audio registry, e.g. `client/src/constants/audio.js`, for music and SFX paths.
- [x] Add an audio manager hook, e.g. `client/src/hooks/useAudio.js`, that supports:
  - [x] background music playback
  - [x] smooth music switching/fade-out/fade-in
  - [x] one-shot sound effects
  - [x] mute/unmute state
  - [x] volume controls
  - [x] browser autoplay-safe start after first user interaction
- [x] Add music by screen/context:
  - [x] Auth/Main Menu: calm title/menu loop
  - [x] Journey Map: forest exploration loop from Glizzy Elf Forest
  - [x] Battle Screen: battle loop
  - [x] PostBattle victory: victory sting/loop
  - [x] PostBattle defeat: short defeat/low tension cue if available
  - [x] Victory Screen: victory/end-run loop
- [x] Add Kenney UI SFX:
  - [x] button hover/click
  - [x] ability click
  - [x] save/load confirm
  - [x] move equip/unequip
  - [x] modal open/close
- [x] Add battle SFX if available in Kenney pack:
  - [x] physical hit
  - [x] magic cast
  - [x] heal
  - [x] buff/debuff
  - [x] status tick
  - [x] KO/victory
- [x] Add audio controls to UI:
  - [x] global mute button, probably in Main Menu and Journey top bar
  - [x] volume slider or simple Music/SFX toggles
  - [x] persist audio preferences in `localStorage`

### Current manual QA TODO
- [ ] Confirm Battle Log overlay is visible during arena combat after latest portal fix.
- [ ] Confirm Battle Log button still works from defeat PostBattle screen.
- [ ] Confirm Battle Log button works from Victory screen and shows the full run log.
- [ ] Confirm arena controls are vertical with Menu above Battle Log.
- [ ] Confirm ability toolbar under arena does not overlap fighters on desktop and mobile.
- [ ] Confirm active-turn highlight is obvious enough and the "On turn" badge has enough spacing.
- [ ] Confirm journey biome background still keeps monster nodes readable.
- [ ] Confirm monster hover stat clouds do not clip near map edges.
- [ ] Confirm Move Arsenal equip/remove behavior feels correct:
  - [ ] click known move → equip if slot exists
  - [ ] click equipped slot → unequip unless it is the last equipped move
  - [ ] max 4 equipped
  - [ ] min 1 equipped
- [ ] Full browser playtest: register → login → start run → battle → learn move → manage moves → save → overwrite with custom confirmation → logout → login → load → continue → victory.

### Recommended next gameplay expansion after audio
- [ ] Balance pass: complete at least 3 full runs and tune monster stats, XP, move base values, status chances, and level-up gains.
- [ ] Add hero class selection:
  - [ ] Knight
  - [ ] Rogue
  - [ ] Mage
  - [ ] Ranger
- [ ] Add post-battle reward choice instead of only automatic learned move:
  - [ ] learn monster move
  - [ ] heal/recover
  - [ ] stat boost
  - [ ] item/equipment reward
- [ ] Add item/equipment system using available item sprites later.

---

## Product Decision — Battle Logic Split

- [x] Keep the current project-brief architecture:
  - [x] `GET /run/config` returns full tunable battle configuration from the server.
  - [x] `GET /battle/monster-move` returns the monster's next move from the server.
  - [x] The client applies the selected monster move and resolves the battle UI/state.
- [x] Do **not** move full combat simulation server-side unless future requirements add multiplayer, leaderboards, anti-cheat, or server-verified competitive results.
- [ ] Update stale docs/README wording later so all docs agree on this split.
- [ ] Keep current post-battle rewards as-is: automatic learned move, XP, and stat-choice level-up when triggered.

---

## Phase 5 — Admin & Data Observability

Deliverable: admins can log in to a separate `/admin` app, inspect players/saves/battle logs, and tune core game configuration without a client rebuild.

### Server — Admin Auth & Permissions
- [x] Add a `role` field to `Player` (`player` / `admin`) in Prisma.
- [x] Seed or document a way to promote the first admin account.
- [x] Add `requireAdmin` middleware that builds on `requireAuth`.
- [x] Protect all admin routes behind `requireAdmin`.

### Server — Admin Data Endpoints
- [x] Add `/admin/users` endpoint: list users with created date, save count, and aggregate run stats.
- [x] Add `/admin/users/:id` endpoint: user detail with saves and recent battle summaries.
- [x] Add `/admin/saves` endpoint: list/search all saves across players.
- [x] Add `/admin/config` endpoint: full current hero, monster, move, and constants config.
- [x] Add update endpoints for:
  - [x] monsters
  - [x] moves
  - [x] constants
  - [x] hero config
- [x] Validate admin config updates so broken stats/movesets cannot be saved.

### Server — Battle Logs & Audit Trail
- [x] Add `BattleRun` model: player, monster, outcome, XP, turns, startedAt, endedAt.
- [x] Add `BattleLogEntry` model or JSON field for structured battle log entries.
- [x] Persist battle result/log from the client after battle end.
- [x] Add admin endpoint to list/filter battle runs.
- [x] Add admin endpoint to inspect one battle transcript.
- [x] Add `AdminAuditLog` model for config changes: admin, entity type, entity id, before, after, timestamp.

### Admin App
- [x] Create `/admin` frontend folder/app.
- [x] Add admin login/session handling.
- [x] Add dashboard overview page.
- [x] Add users page.
- [x] Add saves page.
- [x] Add battle logs page.
- [x] Add monster/move tuning pages.
- [x] Add constants/hero config page.

### Phase 5 Acceptance
- [x] Non-admin users cannot access admin endpoints.
- [x] Admin can view all users and saves.
- [x] Admin can view battle summaries/logs after fights.
- [x] Admin can edit a monster stat and see `/run/config` return the updated value.
- [x] Admin changes are recorded in audit logs.
- [x] Client and server lint/build pass after admin work.

---

## Phase 6 — Combat Resources, Statuses & Hero Classes

Deliverable: players choose a hero class before starting a run, mana/HP costs are part of combat, and status/effect data is configurable enough for admin tuning.

### Server / Config
- [x] Extend move config with optional `cost` data:
  - [x] HP cost
  - [x] mana cost
- [x] Add mana constants / config:
  - [x] starting mana (via hero `baseStats.mana`)
  - [x] max mana (via hero `stats.mana`)
  - [x] mana regen per turn
  - [x] whether mana resets each fight
- [x] Normalize status/effect config for:
  - [x] bleed
  - [x] poison
  - [x] burn
  - [x] damage increase
  - [x] damage reduction
  - [x] stat buffs/debuffs
- [x] Add hero class configs:
  - [x] Knight
  - [x] Rogue
  - [x] Mage
  - [x] Ranger
- [x] Add class-specific base stats, default moves, and level-up growth.
- [x] Decide whether monsters use mana; default: monsters do not use mana unless a specific archetype requires it.

### Client
- [x] Add character/class selection screen before starting a new run.
- [x] Store selected hero class in run state and save payloads.
- [x] Track hero mana in battle.
- [x] Apply mana regen at the chosen point in the turn loop.
- [x] Apply HP/mana move costs before resolving moves.
- [x] Disable or clearly mark unaffordable moves.
- [x] Update move tooltips/buttons to show resource costs.
- [x] Show mana in battle nameplate/HUD.
- [x] Ensure saves/load restore class and mana-relevant state.

### Admin
- [x] Admin can view/edit hero class configs.
- [x] Admin can view/edit move resource costs.
- [x] Admin can view/edit mana constants.

### Phase 6 Acceptance
- [x] Starting a run requires choosing a class.
- [x] Each class has distinct stats and starter moves.
- [x] Mana-cost moves cannot be used without enough mana.
- [x] HP-cost moves correctly spend HP and cannot create invalid battle state.
- [x] Mana regen works consistently across turns.
- [x] Admin config changes affect new runs without a client rebuild.

---

## Phase 7 — Items, Currency, Shop & Content Expansion

Deliverable: monsters can drop currency/items in addition to current learned-move rewards, players can equip/use items, and shops create a non-grind upgrade path.

### Server / Config
- [x] Add item definitions:
  - [x] consumables
  - [x] equipment
  - [x] passive modifiers
- [x] Add item rarity and stacking rules.
- [x] Add monster drop tables for currency and items.
- [x] Add shop inventory/pricing config.
- [x] Add more monsters beyond the original 5.
- [x] Add more moves for new enemies and hero builds.
- [x] Add admin endpoints/screens for item and shop tuning.

### Client
- [x] Track in-run currency.
- [x] Track inventory.
- [x] Track equipped items.
- [x] Add item/equipment management screen.
- [x] Apply equipment modifiers to hero stats/combat.
- [x] Add consumable item use flow where appropriate.
- [x] Add shop screen.
- [x] Let players spend currency on items, recovery, or direct upgrades.
- [x] Keep current post-battle move learning intact; item/currency drops are additional rewards.

### Phase 7 Acceptance
- [x] Monsters can drop configured currency/items.
- [x] Inventory persists in saves.
- [x] Equipment modifies stats or combat behavior correctly.
- [x] Shop purchases spend currency and apply rewards.
- [x] Admin can tune item/shop data.
- [x] More than 5 enemies can exist in config without breaking existing run flow.

---

## Phase 8 — Non-Linear Map, Environments & Endless Mode

Deliverable: the fixed 5-fight gauntlet evolves into a branching run with encounter variety, environmental effects, and endless scaling.

### Server / Config
- [ ] Add encounter pools by biome/difficulty.
- [ ] Add node type config:
  - [ ] battle
  - [ ] elite battle
  - [ ] shop
  - [ ] rest/recovery
  - [ ] event
  - [ ] boss
- [ ] Add environment definitions:
  - [ ] poison swamp
  - [ ] burning ruins
  - [ ] arcane forest
  - [ ] fortified camp
- [ ] Add environment combat modifiers.
- [ ] Add enemy scaling rules for later map depths.
- [ ] Add endless mode scaling rules.

### Client
- [ ] Replace fixed path with generated branching map.
- [ ] Let player choose route between nodes.
- [ ] Render different node types clearly.
- [ ] Apply selected node/environment to battle setup.
- [ ] Show active environment effects during battle.
- [ ] Add normal-run completion with boss/final node.
- [ ] Add endless mode entry point.
- [ ] Track endless depth and best run stats.

### Admin
- [ ] Admin can tune encounter pools.
- [ ] Admin can tune environment modifiers.
- [ ] Admin can inspect map/depth performance stats.

### Phase 8 Acceptance
- [ ] New runs generate a branching map.
- [ ] Route choices affect available fights/rewards/shops/rests.
- [ ] Environment effects change battle behavior.
- [ ] Endless mode can continue past normal run completion.
- [ ] Admin tuning changes affect new generated maps.
