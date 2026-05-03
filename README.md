# Knight's Gauntlet

A browser **turn-based RPG**: pick a hero class, follow a branching journey map, fight monsters, earn loot and XP, manage moves and gear, and finish the run. **Auth, saves, and game data** (monsters, moves, map, items) live on the server so balance and content can change without rebuilding the game client.

There's plenty of room to expand and polish the project—especially visually—but with limited time, this is the version that shipped, and as my first game project, I'm quite proud of it.

## Services

| Service | Role |
|--------|------|
| **PostgreSQL** | Stores players, saves, and tunable game config (Prisma). |
| **API** (`server`) | Express REST: auth, run config, battle AI move, saves, admin endpoints. |
| **Game client** (`client`) | React + Vite — the player-facing app (default **http://localhost:5173**). |
| **Admin** (`admin`) | React + Vite — operators tune config and inspect users/saves/battles (**http://localhost:5174**). |

## Tech stack (high level)

**Frontend:** React, Vite, plain CSS. **Backend:** Node.js, Express, Prisma, JWT auth. **Database:** PostgreSQL. **Containers:** Docker Compose for the full stack or DB-only.

## Start with Docker

From the **repository root**:

```bash
docker compose up -d --build
```

Waits for Postgres, runs migrations and seed on the API container, then starts all services.

- **Game:** http://localhost:5173  
- **API:** http://localhost:3001 (e.g. `GET /health`, `GET /run/config`)  
- **Admin:** http://localhost:5174  

Promote a player to admin (after you register that user in the game). Use `server/.env` with a `DATABASE_URL` that matches your Compose Postgres (e.g. `localhost:5433` from the host).

```bash
cd server
npm install
npm run admin:promote -- <username>
```

Stop everything:

```bash
docker compose down
```

### Database only (local API + Vite on your machine)

```bash
docker compose -f docker-compose.db.yml up -d
```

Point `server/.env` at Postgres on **localhost:5433** (see `server/.env.example`), then from `server/` run migrations/seed if needed and `npm run dev`; run `client` and `admin` with `npm run dev` as usual. Set `VITE_API_BASE_URL=http://localhost:3001` if the client is not using the default.

## Asset credits

Ability icons: [Game-icons.net](https://game-icons.net/) (CC BY 3.0 / CC0). Music: [Glizzy Elf Forest RPG Music Pack](https://opengameart.org/content/glizzy-elf-forest-rpg-music-pack) (CC0). UI/SFX: [Kenney RPG Audio](https://opengameart.org/content/50-rpg-sound-effects) (CC0).
