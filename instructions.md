# Full Stack RPG Game — AI Agent Instructions

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Similar Games (Research)](#similar-games-research)
3. [Technology Stack](#technology-stack)
4. [Architecture](#architecture)
5. [Game Systems Specification](#game-systems-specification)
6. [Phase Plan](#phase-plan)
7. [Step-by-Step Build Order](#step-by-step-build-order)
8. [TODO Checklist](#todo-checklist)
9. [Bonus Features](#bonus-features)
10. [Asset Sources](#asset-sources)
11. [Submission Requirements](#submission-requirements)

---

## Project Overview

A turn-based RPG web game where a hero fights through a gauntlet of 5 monsters.
The client and server are separate — **game logic lives on the server** so the Game Designer
can tweak configurations and bot behavior without a new client build.

**Core loop:**
- Hero fights monsters one by one in order
- Combat is turn-based: hero picks a move → server returns monster move → apply effects → repeat
- Beating a monster rewards XP and teaches the hero one of the monster's moves at random
- The player can replay any fight to grind XP or try to learn another move
- Beat all 5 monsters → win the run

---

## Similar Games (Research)

These games share the most mechanics with what we are building:

| Game | Relevant Mechanic |
|------|------------------|
| **Pokémon** | Turn-based combat, learning enemy moves, sequential battles, leveling up |
| **Slay the Spire** | Single-hero run, sequential enemy encounters, acquiring abilities from enemies, roguelike progression |
| **Undertale** | 1v1 turn-based combat, distinct monster abilities, narrative encounters |
| **Final Fantasy (early)** | Classic turn-based menu, move selection, HP/MP, leveling |
| **Siralim Ultimate** | Monster ability absorption, turn-based, ability loadout management |

**Conclusion:** The game is a blend of **Pokémon** (learn enemy moves) + **Slay the Spire**
(run-based, sequential encounters) + **classic JRPG combat** (menu-driven turn-based fights).

---

## Technology Stack

### Backend — Node.js + Express

**Why:**
- Same language as frontend (JavaScript) — no context switching
- Express is minimal and perfect for exactly two REST endpoints
- Easy to run locally, easy to deploy
- The entire team (one engineer) stays in one language ecosystem

**Responsibilities:**
- Monster configurations (stats, movesets, XP rewards)
- All move definitions (damage formulas, effects, types)
- Monster AI logic (random for now, smarter later as bonus)
- Damage calculation functions

### Frontend — React + plain CSS

**Why React:**
- Component model maps perfectly to game screens (each screen = one component)
- `useState` / `useReducer` handles turn state, HP, buffs cleanly without extra libraries
- No need for Redux at this scale — local component state is sufficient
- Proven in the web RPG space (react-rpg.com, multiple open-source examples)

**Why plain CSS (no Tailwind, no styled-components):**
- Full control over the dark fantasy aesthetic
- No build complexity added
- Pixel-art and RPG UIs require custom styling anyway

**No game engine (no Phaser, no Kaboom):**
- This is a menu-driven RPG, not a real-time game
- A game engine would be massive overkill
- React handles all UI needs perfectly

### Asset Sources (Free)

| Source | What It Provides |
|--------|-----------------|
| **OpenGameArt.org** | Free sprites, tilesets, character art (CC0/CC-BY) |
| **itch.io (free assets)** | RPG sprites, UI packs, monster sheets |
| **Kenney.nl** | High-quality CC0 game assets |
| **game-icons.net** | Thousands of free SVG game icons (spells, weapons, items) |
| **Emoji / Unicode** | Zero-dependency fallback — works in any browser |

---

## Architecture

All files are created at project setup — empty to start, filled in phase by phase.
The structure is designed to support future expansions (new monsters, items, maps, hero classes, etc.)
without ever needing to reorganize folders.

```
/project-root
│
├── /server
│   ├── index.js                        ← Entry point. Boots the Express app
│   ├── server.js                       ← Express app setup: middleware, route mounting, error handling
│   │
│   ├── config.js                       ← All game data (hero, monsters, moves, constants) exported as named exports
│   │
│   ├── /models
│   │   ├── Move.js                     ← Move class/schema: validates and represents a move object
│   │   ├── Monster.js                  ← Monster class/schema: validates and represents a monster object
│   │   ├── Hero.js                     ← Hero class/schema: stat structure, level up logic shape
│   │   └── BattleState.js              ← BattleState class/schema: the object passed to the AI endpoint
│   │
│   ├── /routes
│   │   ├── index.js                    ← Mounts all route files under their base paths
│   │   ├── run.routes.js               ← GET /run/config
│   │   └── battle.routes.js            ← GET /battle/monster-move
│   │
│   ├── /controllers
│   │   ├── run.controller.js           ← Handler for run config request: builds and returns full config
│   │   └── battle.controller.js        ← Handler for monster-move request: validates state, calls AI
│   │
│   ├── /logic
│   │   ├── combat.js                   ← Damage formulas, healing formulas, buff/debuff application
│   │   ├── ai.js                       ← Monster AI: receives battle state, returns move ID
│   │   ├── levelUp.js                  ← Level up logic: XP thresholds, stat increase calculations
│   │   └── moveResolver.js             ← Resolves a move's full effect given attacker/defender state
│   │
│   └── /middleware
│       ├── errorHandler.js             ← Global Express error handler
│       └── validateBattleState.js      ← Request validation for the monster-move endpoint
│
├── /client
│   ├── /public
│   │   └── /assets
│   │       ├── README.md               ← Sprite filename conventions (what to drop in)
│   │       ├── /32rogues/32rogues      ← Extracted 32rogues 0.5.0 pack (rogues.png, monsters.png, tiles.png, …)
│   │       ├── /sprites                ← Optional overrides — individual character PNGs
│   │       ├── /tiles                  ← Optional overrides — individual tile PNGs
│   │       └── /icons                  ← Move icons (from game-icons.net or similar)
│   │
│   └── /src
│       ├── index.js                    ← React DOM entry point
│       ├── App.jsx                     ← Root component, top-level screen routing
│       │
│       ├── /components
│       │   ├── /screens
│       │   │   ├── MainMenu.jsx        ← Start New Run / Exit
│       │   │   ├── RunMap.jsx          ← 5 encounter nodes, equipped moves, move manager button
│       │   │   ├── BattleScreen.jsx    ← Core combat UI: HP bars, move buttons, turn flow
│       │   │   ├── PostBattle.jsx      ← Win/lose result, move learned, retry/continue
│       │   │   ├── MoveManager.jsx     ← Equip/unequip moves from learned pool
│       │   │   └── VictoryScreen.jsx   ← End of run screen, run summary
│       │   │
│       │   └── /ui
│       │       ├── HPBar.jsx           ← Reusable HP bar component
│       │       ├── MoveButton.jsx      ← Reusable move button with tooltip
│       │       ├── StatBlock.jsx       ← Displays character stats (attack, defense, magic)
│       │       ├── BattleLog.jsx       ← Scrollable battle log panel
│       │       ├── Tooltip.jsx         ← Generic hover tooltip wrapper
│       │       ├── Sprite.jsx          ← PNG sprite renderer with emoji fallback (Phase 2)
│       │       └── LevelUpModal.jsx    ← Level up notification overlay
│       │
│       ├── /hooks
│       │   ├── useGameState.js         ← Hero state across the full run (HP, XP, level, moves learned)
│       │   ├── useBattle.js            ← Turn-by-turn battle state (HP, buffs, whose turn, log)
│       │   └── useRunConfig.js         ← Fetches and stores run config from server on run start
│       │
│       ├── /services
│       │   └── api.js                  ← All fetch() calls to the server (getRunConfig, getMonsterMove)
│       │
│       ├── /constants
│       │   ├── gameConstants.js        ← Client-side constants (max equipped moves, screen names, etc.)
│       │   ├── sprites.js              ← Sprite registry: character + tile → PNG path + emoji fallback (Phase 2)
│       │   └── overworld.js            ← Tile-map layout, hero spawn, monster positions (Phase 2)
│       │
│       └── /styles
│           ├── global.css              ← Reset, fonts, CSS variables (color palette, spacing)
│           ├── battle.css              ← Battle screen specific styles
│           ├── map.css                 ← Overworld styles (tile map, hero/monster sprites, top bar)
│           ├── manager.css             ← Move Manager, Victory Screen, LevelUp badge (Phase 2)
│           └── ui.css                 ← Shared UI component styles (buttons, bars, modals)
│
└── README.md                           ← Setup instructions, how to run server and client
```

### Why This Structure Scales

| Folder | Purpose | Expansion Example |
|--------|---------|-------------------|
| `/server/config.js` | All data lives here — change a number, change the game | Add new monsters: just add to the `monsters` export |
| `/server/models` | Enforces data shape across the codebase | Add `Item.js` model when items are introduced |
| `/server/routes` | Each feature gets its own route file | Add `items.routes.js` for a shop feature |
| `/server/controllers` | Business logic separated from routing | Add `shop.controller.js` independently |
| `/server/logic` | Pure functions, easy to test and extend | Add `statusEffects.js` for bleed/poison bonus |
| `/client/components/screens` | One file per game screen | Add `CharacterSelect.jsx` for hero classes bonus |
| `/client/components/ui` | Reusable building blocks | `MoveButton.jsx` used in battle, map, and manager |
| `/client/hooks` | State logic separated from rendering | Add `useItems.js` when items are introduced |
| `/client/styles` | One CSS file per concern | Add `shop.css` when shop is built |

---

## Game Systems Specification

### Stats

Every character (hero and monster alike) has four stats:

| Stat | Description |
|------|-------------|
| **Health** | Hit points. Reach zero → lose the fight |
| **Attack** | Scales physical damage moves |
| **Defense** | Reduces incoming physical damage |
| **Magic** | Scales magic damage and healing moves |

- Hero stats increase on level up
- Monster stats are fixed, defined in server config
- Monster difficulty should scale: monster 1 is easiest, monster 5 is hardest

### Damage Formulas

```
Physical Damage = floor((move.baseValue * attacker.Attack / 10) - target.Defense)
                  minimum 1

Magic Damage    = floor(move.baseValue * attacker.Magic / 10)
                  no Defense reduction, minimum 1

Healing         = floor(move.baseValue * caster.Magic / 10)
```

### Move Types

| Type | Effect |
|------|--------|
| Physical | Scales off Attack, reduced by target's Defense |
| Magic | Scales off Magic, bypasses Defense entirely |
| Heal | Restores HP, scales off Magic |
| Buff | Modifies a stat for N turns (no damage) |
| Debuff | Lowers target's stat for N turns (no damage) |

### Buff System

Buffs and debuffs are tracked as a modifier object per character with a turn counter.
They are just multipliers applied to the relevant stat during calculation.
Turn counter decrements at the end of each full round (hero turn + monster turn = 1 round).

```javascript
// Example buff structure
{
  stat: "attack",       // which stat is affected
  multiplier: 1.5,      // how much to multiply it by
  turnsRemaining: 2     // countdown
}
```

### Turn Structure

```
1. Hero selects a move
2. Client sends current battle state to server: GET /battle/monster-move
3. Server returns the monster's chosen move
4. Client applies hero move first → check for monster KO
5. Client applies monster move → check for hero KO
6. Decrement all buff/debuff turn counters
7. Repeat from step 1
```

### XP and Leveling

- Each battle awards XP whether the hero wins or loses (winning awards full XP)
- Enough XP triggers a level up
- Level up increases: Attack, Defense, Health, Magic (fixed amounts for now)
- XP threshold increases with each level

### Move Learning

- After winning a fight, the hero learns ONE of the monster's moves, chosen at random
- That move is now available in the Move Management screen
- The hero can equip any learned move before entering the next fight
- The hero can hold a maximum of 4 equipped moves at a time

---

## Full Moveset

### Knight (Hero Default Moveset)

| Move | Type | Effect |
|------|------|--------|
| **Slash** | Physical | Moderate damage. Scales off Attack, reduced by Defense |
| **Shield Up** | Buff | No damage. Raises knight's Defense for 2 turns |
| **Battle Cry** | Buff | No damage. Raises knight's Attack for 2 turns |
| **Second Wind** | Heal | Heals knight for moderate amount. Scales off Magic |

### Witch

| Move | Type | Effect |
|------|------|--------|
| **Shadow Bolt** | Magic | Heavy damage. Scales off Magic |
| **Drain Life** | Magic | Light damage, heals witch for same amount. Scales off Magic |
| **Curse** | Debuff | Lowers hero's Attack for 2 turns |
| **Dark Pact** | Buff/Cost | Raises witch's Magic for 2 turns, costs some of her own HP |

### Giant Spider

| Move | Type | Effect |
|------|------|--------|
| **Bite** | Physical | Moderate damage. Scales off Attack, reduced by Defense |
| **Web Throw** | Physical | Light damage, lowers hero's Defense for 2 turns |
| **Pounce** | Physical | Heavy damage. Scales off Attack, reduced by Defense |
| **Skitter** | Buff | No damage. Raises spider's Defense for 2 turns |

### Dragon

| Move | Type | Effect |
|------|------|--------|
| **Flame Breath** | Magic | Heavy damage. Scales off Magic |
| **Claw Swipe** | Physical | Moderate damage. Scales off Attack, reduced by Defense |
| **Intimidate** | Debuff | Lowers target's Attack for 2 turns |
| **Dragon Scales** | Buff | Raises user's Defense for 2 turns |

### Goblin Warrior

| Move | Type | Effect |
|------|------|--------|
| **Rusty Blade** | Physical | Moderate damage. Scales off Attack, reduced by Defense |
| **Dirty Kick** | Physical | Light damage, lowers target's Defense for 2 turns |
| **Frenzy** | Buff | Raises user's Attack for 2 turns |
| **Headbutt** | Physical | Heavy damage. Scales off Attack, reduced by Defense |

### Goblin Mage

| Move | Type | Effect |
|------|------|--------|
| **Firebolt** | Magic | Moderate damage. Scales off Magic |
| **Arcane Surge** | Buff | Raises user's Magic for 2 turns |
| **Mana Drain** | Magic | Light damage, lowers target's Magic for 2 turns |
| **Hex Shield** | Buff | Raises user's Defense for 2 turns |

---

## Server Endpoints

### GET /run/config

Called **once** at the start of a run.

Returns the full battle configuration: which 5 monsters the player will face,
their stats, movesets, XP rewards, and anything else the client needs to set up the run.

**Example response:**
```json
{
  "hero": {
    "name": "Knight",
    "baseStats": { "health": 100, "attack": 15, "defense": 10, "magic": 8 },
    "defaultMoves": ["slash", "shieldUp", "battleCry", "secondWind"]
  },
  "monsters": [
    {
      "id": "goblin_warrior",
      "name": "Goblin Warrior",
      "stats": { "health": 60, "attack": 12, "defense": 6, "magic": 3 },
      "moves": ["rustyBlade", "dirtyKick", "frenzy", "headbutt"],
      "xpReward": 50,
      "sprite": "goblin_warrior.png"
    }
  ],
  "moves": {
    "slash": {
      "id": "slash",
      "name": "Slash",
      "type": "physical",
      "baseValue": 20,
      "effect": "damage",
      "description": "A swift sword slash."
    }
  }
}
```

### GET /battle/monster-move?state=&lt;base64-json&gt;

Called **every turn** after the player makes their move.

Because HTTP GET requests should not carry a body, the battle state is JSON-stringified
and base64-encoded into a single `state` query parameter. The server decodes it,
runs the AI, and returns the monster's chosen move.

**Decoded state shape:**
```json
{
  "monsterId": "goblin_warrior",
  "monsterStats": { "health": 35, "attack": 12, "defense": 6, "magic": 3 },
  "monsterBuffs": [],
  "heroStats": { "health": 72, "attack": 15, "defense": 10, "magic": 8 },
  "heroBuffs": [],
  "availableMoves": ["rustyBlade", "dirtyKick", "frenzy", "headbutt"]
}
```

**Example request:**
```
GET /battle/monster-move?state=eyJtb25zdGVySWQiOiJnb2JsaW5fd2FycmlvciIsLi4ufQ==
```

**Response:**
```json
{
  "move": "headbutt"
}
```

---

## Phase Plan

### Phase 1 — Core (Must Work Perfectly)

Everything needed for a complete, playable game loop.

**Server:**
- Config endpoint with all 5 monsters and all moves defined
- Monster-move endpoint with random AI

**Client:**
- Main Menu (Start New Run)
- Battle Screen with HP display and move selection
- Damage formulas working correctly (physical vs magic)
- Buff/debuff system (turn counters, stat modifiers)
- Win/lose detection
- Post-battle: show learned move

**Goal:** A fully playable game from start to finish.

---

### Phase 2 — Progression & Map

**Server:**
- No changes needed

**Client:**
- XP system tracking across battles
- Level up trigger with stat increases
- Run Map showing all 5 encounters and progress
- Move Management screen (equip/unequip from learned pool)
- Hero state persistence across the full run

**Goal:** A complete run with meaningful progression.

---

### Phase 3 — Polish & Bonus Features

Based on the Game Designer's bonus backlog:

**Server:**
- Smarter monster AI (prioritize healing when low HP, debuff hero when HP is high, etc.)

**Client:**
- Move tooltips on hover (move description, type, damage range)
- Battle log (running list of all moves played)
- Attribute choice on level up (player picks which stat to boost)
- Status effects baked into moves (bleed, poison, damage reduction)
- Battle animations (hit shake, flash, slide effects)
- Save & Exit (localStorage mid-run save)

**Goal:** A polished, feature-complete submission.

---

## Step-by-Step Build Order

### Step 1 — Project Setup & Full File Scaffold

Create every file in the structure upfront — all empty, just correct exports or blank functions.
This way the project is organized from day one and nothing needs to be moved later.

**Server scaffold:**
- `npm init` in `/server`, install `express` and `cors`
- Create all folders: `/config`, `/models`, `/routes`, `/controllers`, `/logic`, `/middleware`
- Create all files listed in the architecture — empty, each with a comment describing its purpose

**Client scaffold:**
- Initialize Vite + React in `/client`
- Create all folders: `/components/screens`, `/components/ui`, `/hooks`, `/services`, `/constants`, `/styles`
- Create all files — empty components returning `null`, empty hooks, empty CSS files

**Verify:**
- Server runs on `localhost:3001` with no errors
- Client runs on `localhost:3000` with no errors
- Client can fetch from server (CORS configured and working)

### Step 2 — Server: Config Endpoint
- Define all move data in `config.js`
- Define all 5 monster configs (stats, moveset, XP reward) in `config.js`
- Implement `GET /run/config` to return the full config
- Test with a browser or Postman

### Step 3 — Server: Monster AI Endpoint
- Implement `GET /battle/monster-move` with random move selection
- Accept battle state as a base64-encoded JSON `state` query parameter
- Return selected move ID
- Test manually

### Step 4 — Client: Main Menu
- Build `MainMenu.jsx` with "Start New Run" and "Exit" buttons
- On "Start New Run": call `GET /run/config`, store result in app state
- Transition to Run Map on success

### Step 5 — Client: Battle Screen (Core Loop)
- Build `BattleScreen.jsx`
- Display hero HP and monster HP with bars
- Display hero's 4 equipped move buttons
- On move selected: send battle state to `GET /battle/monster-move`
- Apply hero move damage to monster
- Apply monster move damage to hero
- Detect and handle KO (win/lose)

### Step 6 — Damage & Buff System
- Implement damage formulas (physical vs magic) in client
- Implement buff/debuff tracking per character
- Apply stat modifiers when calculating damage
- Decrement buff timers each round

### Step 7 — Post-Battle Screen
- If hero wins: randomly select one of the monster's moves
- Display "You learned [Move Name]!"
- Add learned move to hero's known moves pool
- Show "Continue" button to return to Run Map

### Step 8 — XP and Level Up
- Track cumulative XP on hero state
- After each battle (win or lose), add XP reward
- Trigger level up when threshold reached
- Increase stats on level up
- Show level up notification to player

### Step 9 — Run Map
- Build `RunMap.jsx` showing 5 encounter nodes
- Mark encounters as: locked / available / completed
- Show current equipped moves on this screen
- "Open Move Manager" button

### Step 10 — Move Management Screen
- Build `MoveManager.jsx`
- List all learned moves
- List currently equipped moves (max 4)
- Allow drag-and-drop or click-to-swap equipping
- Validate: always keep at least 1 move equipped

### Step 11 — Win Screen
- After defeating all 5 monsters, show victory screen
- Display run summary: level reached, moves learned, battles fought

### Step 12 — Bonus: Battle Log
- Add a scrollable log panel to the Battle Screen
- Log every action: move used, damage dealt, buffs applied, HP changes

### Step 13 — Bonus: Move Tooltips
- On hover over any move button, show a tooltip card
- Include: move name, type, base value, description, effect

### Step 14 — Bonus: Smarter AI
- Update `ai.js` on server
- Add logic: if monster HP < 30% and heal move available → use heal
- Add logic: if hero has high defense → use magic moves
- Keep random as fallback

### Step 15 — Bonus: Stat Choice on Level Up
- Instead of fixed increases, present 3 random stat boost options on level up
- Player clicks to choose one

### Step 16 — Final Polish
- Add pixel-art sprite assets for all characters
- Apply consistent dark fantasy CSS theme
- Add basic hit animations (CSS shake, flash)
- Test full run start-to-finish at least 3 times
- Fix any balance issues (tweak base values in config.js)

---

## TODO Checklist

Use this list to track progress during development.
Check each item as it is completed.

### 🔧 Setup & Scaffold
- [ ] Initialize server project (`npm init`, install `express`, `cors`)
- [ ] Initialize client project (Vite + React)
- [ ] Create `/server/config.js` (single file with `hero`, `monsters`, `moves`, `constants` exports)
- [ ] Create `/server/models/` — `Move.js`, `Monster.js`, `Hero.js`, `BattleState.js`
- [ ] Create `/server/routes/` — `index.js`, `run.routes.js`, `battle.routes.js`
- [ ] Create `/server/controllers/` — `run.controller.js`, `battle.controller.js`
- [ ] Create `/server/logic/` — `combat.js`, `ai.js`, `levelUp.js`, `moveResolver.js`
- [ ] Create `/server/middleware/` — `errorHandler.js`, `validateBattleState.js`
- [ ] Create `/server/index.js` and `/server/server.js`
- [ ] Create `/client/src/components/screens/` — `MainMenu.jsx`, `RunMap.jsx`, `BattleScreen.jsx`, `PostBattle.jsx`, `MoveManager.jsx`, `VictoryScreen.jsx`
- [ ] Create `/client/src/components/ui/` — `HPBar.jsx`, `MoveButton.jsx`, `StatBlock.jsx`, `BattleLog.jsx`, `Tooltip.jsx`, `LevelUpModal.jsx`
- [ ] Create `/client/src/hooks/` — `useGameState.js`, `useBattle.js`, `useRunConfig.js`
- [ ] Create `/client/src/services/api.js`
- [ ] Create `/client/src/constants/gameConstants.js`
- [ ] Create `/client/src/styles/` — `global.css`, `battle.css`, `map.css`, `ui.css`
- [ ] All empty files created with no errors (correct exports/null returns)
- [ ] Confirm server runs on `localhost:3001`
- [ ] Confirm client runs on `localhost:3000`
- [ ] Confirm client can fetch from server (CORS working)

### 🖥️ Server
- [ ] Create `config.js` with all move definitions
- [ ] Create `config.js` with all 5 monster configs
- [ ] Implement `GET /run/config` endpoint
- [ ] Test `/run/config` returns correct JSON
- [ ] Create `ai.js` with random move selection
- [ ] Implement `GET /battle/monster-move` endpoint
- [ ] Test `/battle/monster-move` returns a valid move ID
- [ ] Validate move returned is always in monster's available moveset

### 🎮 Client — Screens
- [ ] `MainMenu.jsx` — renders with Start and Exit buttons
- [ ] `MainMenu.jsx` — Start button calls `/run/config` and stores result
- [ ] `RunMap.jsx` — renders 5 encounter nodes
- [ ] `RunMap.jsx` — nodes show locked / available / completed state
- [ ] `RunMap.jsx` — shows currently equipped moves
- [ ] `RunMap.jsx` — opens Move Manager
- [ ] `BattleScreen.jsx` — displays hero name, HP bar
- [ ] `BattleScreen.jsx` — displays monster name, HP bar
- [ ] `BattleScreen.jsx` — displays 4 move buttons
- [ ] `BattleScreen.jsx` — clicking a move triggers the turn
- [ ] `BattleScreen.jsx` — displays current buffs/debuffs for both sides
- [ ] `PostBattle.jsx` — shows outcome (win/lose)
- [ ] `PostBattle.jsx` — shows learned move on win
- [ ] `PostBattle.jsx` — Retry and Continue buttons work
- [ ] `MoveManager.jsx` — lists all learned moves
- [ ] `MoveManager.jsx` — lists equipped moves (max 4)
- [ ] `MoveManager.jsx` — equip/unequip works correctly
- [ ] Win Screen — displays after all 5 monsters defeated

### ⚔️ Client — Game Logic
- [ ] Physical damage formula implemented and tested
- [ ] Magic damage formula implemented and tested
- [ ] Healing formula implemented and tested
- [ ] Buff application working (stat multiplier for N turns)
- [ ] Debuff application working (stat multiplier for N turns)
- [ ] Buff turn countdown working (decrements each round)
- [ ] Hero move applied first each turn
- [ ] Monster move applied second each turn
- [ ] KO detection after hero move (monster HP = 0)
- [ ] KO detection after monster move (hero HP = 0)
- [ ] Battle correctly ends on KO

### 📈 Client — Progression
- [ ] XP awarded after every battle (win or lose)
- [ ] XP threshold tracking working
- [ ] Level up triggers correctly
- [ ] Stats increase on level up
- [ ] Level up message displayed to player
- [ ] Move learned randomly selected from monster moveset on win
- [ ] Learned move added to hero's known moves pool
- [ ] Hero state (HP, XP, level, moves) persists across the full run

### 🧪 Testing
- [ ] Full run completable from start to finish
- [ ] All 5 monsters can be beaten
- [ ] All move types work correctly (physical, magic, heal, buff, debuff)
- [ ] Buffs and debuffs expire correctly after 2 turns
- [ ] Move Manager does not allow fewer than 1 equipped move
- [ ] Retry fight works and resets HP correctly
- [ ] Learned moves carry over between fights

---

## Bonus Features

From the Game Designer's backlog. Implement these after Phase 1 and 2 are solid:

| Priority | Feature | Notes |
|----------|---------|-------|
| High | **Battle log** | Scrollable list of all moves played in current fight |
| High | **Move tooltips** | Hover over move → show description, type, damage |
| High | **Smarter AI** | Server-side: heal when low, debuff when appropriate |
| Medium | **Stat choice on level up** | Pick 1 of 3 stat boosts instead of fixed increase |
| Medium | **Status effects** | Bleed, Poison baked into specific moves |
| Medium | **Battle animations** | CSS shake on hit, flash on KO |
| Medium | **Save & Exit** | localStorage save of mid-run state |
| Low | **Resource costs** | Mana costs on some moves, mana regen per turn |
| Low | **Items** | Drop from monsters, equippable via same system as moves |
| Low | **Non-linear map** | Branching paths like Slay the Spire |
| Low | **Endless mode** | Infinite encounters, see how far you can go |
| Low | **Hero classes** | Character select screen, different base stats and moves |
| Low | **Environmental effects** | Battle location affects mechanics |
| Low | **A shop** | Spend in-run currency on stat upgrades |

---

## Asset Sources

| Source | URL | License |
|--------|-----|---------|
| OpenGameArt | https://opengameart.org | CC0 / CC-BY |
| itch.io free assets | https://itch.io/game-assets/free | Varies (check each) |
| Kenney.nl | https://kenney.nl/assets | CC0 |
| game-icons.net | https://game-icons.net | CC BY 3.0 |

Character sprites from the spec document can also be downloaded from the links
provided in the original challenge PDF.

---

## Important Notes for the AI Agent

1. **Always keep game logic on the server.** Damage formulas and monster AI belong in `/server`. The client only renders and sends state.
2. **Do not over-engineer.** No database, no authentication, no ORM. Two endpoints, flat config files.
3. **Complete Phase 1 fully before starting Phase 2.** A working core loop is more valuable than a half-built feature set.
4. **Balance matters.** After implementing formulas, do a test run. Tweak `baseValue` numbers in `config.js` until fights feel fair but challenging.
5. **Monster difficulty must scale.** Monster 1 should be beatable at Level 1. Monster 5 should require a leveled-up hero.
6. **The buff system is in the base moveset.** Shield Up, Battle Cry, Curse, etc. are all in Phase 1 — the buff system is not a bonus, it is required for the core moves to work.
7. **Max 4 equipped moves at all times.** The hero learns moves over time but can only equip 4. The Move Manager handles swapping.
8. **Run config comes from server, not hardcoded in client.** The whole point of the server is that the Game Designer can change monster stats without touching the client.
