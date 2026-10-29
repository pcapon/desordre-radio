# Désordre Radio — project context

A 24/7 webradio. **AzuraCast** (installed separately with its official
installer) runs everything on air. **Strapi** holds editorial content. A
**TanStack Start** frontend has a **player docked at the bottom of every page**
that keeps playing across navigation.

This file is the durable source of truth for the project. The frontend has its
own `frontend/AGENTS.md` containing the **TanStack Intent skill map** — read it
before changing TanStack Router/Start code.

---

## Repository layout

```
desordre-radio/
├── frontend/            TanStack Start (React 19, SSR via Nitro node-server)
├── backend/             Strapi 5 CMS — shows, episodes, articles, authors, categories
├── Caddyfile            reverse proxy + automatic TLS (the only HTTP entrypoint)
├── docker-compose.yml   site stack: caddy + strapi + frontend
├── docker-compose.dev.yml  local dev: Strapi in develop mode on :1337
└── .env.example         domains, AzuraCast station, Strapi secrets
```

There is **no custom radio code**. Do not reintroduce a worker, Liquidsoap
scripts or Icecast config. Scheduling, rotation, live and fallback are all
configured in the AzuraCast UI.

---

## Architecture (single VPS)

```
  Caddy :80/:443 (TLS)
   ├── SITE_DOMAIN   → frontend:3000   (TanStack Start SSR)
   ├── CMS_DOMAIN    → strapi:1337     (admin + REST, SQLite, local uploads)
   └── RADIO_DOMAIN  → host:8080       (AzuraCast: admin, API, SSE, /listen/)

  AzuraCast (/var/azuracast, own compose project, own updates)
   ├── Liquidsoap autoDJ: playlists (rotation, scheduled, once-at-time), fallback file
   ├── Streamers/DJs → harbor :8005 → overrides autoDJ automatically
   ├── Icecast → /listen/<station>/radio.mp3 (via AzuraCast web proxy)
   └── Now playing → /api/nowplaying/<station> + Centrifugo SSE /api/live/nowplaying/sse

  Browser
   ├── <audio> ← RADIO_DOMAIN/listen/<station>/radio.mp3
   ├── now-playing ← AzuraCast REST seed, then SSE push (use-now-playing.ts)
   └── shows/replays/journal ← Strapi REST
```

### Frontend ↔ AzuraCast
- `frontend/src/lib/player/radio-config.ts` builds the stream URL from
  `VITE_AZURACAST_URL` + `VITE_AZURACAST_STATION` (or `VITE_RADIO_STREAM_URL`
  override). Without AzuraCast it falls back to a public demo stream.
- `frontend/src/lib/player/use-now-playing.ts` seeds from
  `/api/nowplaying/<station>`, then subscribes to the Centrifugo SSE channel
  `station:<station>`. Frames are `{connect: {subs: {…: {publications}}}}` on
  connect and `{pub: {data: {np}}}` on change; `np` is AzuraCast's NowPlaying
  payload (`now_playing.song`, `now_playing.playlist`, `live.is_live`,
  `live.streamer_name`, …). The player shows it even before playback starts.
- `frontend/src/lib/player/use-on-air-show.ts` matches the on-air playlist to a
  Strapi show's `azuracastPlaylist` field (case-insensitive). A match brings the
  show's title and cover into the player. AzuraCast has no per-playlist art.

---

## Stack & how it was scaffolded

- **Frontend:** React 19 + TanStack Start/Router/Query (blog starter) + Strapi
  client + Tailwind v4. Default CLI toolchain (Vite 8, Vitest), pnpm. Production
  server = **Nitro** node-server (`.output/server/index.mjs`).
- **Backend:** Strapi 5.49 (TypeScript), **SQLite** (`/app/data/strapi.db`
  volume) and local uploads (`/app/public/uploads` volume). `config/database.ts`
  still switches on `DATABASE_CLIENT` if Postgres is ever needed (add `pg`).
- **Radio:** AzuraCast (official Docker install, not in this repo).
- **Edge:** Caddy (auto-TLS reverse proxy).

### Exact commands used
```bash
# Frontend scaffold (run in a scratch dir, then merged into frontend/):
npx @tanstack/cli@latest create my-tanstack-app --agent \
    --package-manager pnpm --tailwind --add-ons strapi,tanstack-query

# TanStack Intent (run inside frontend/):
npx @tanstack/intent@latest install   # writes frontend/AGENTS.md skill map
npx @tanstack/intent@latest list      # lists available skills

# Backend scaffold:
npx create-strapi@latest backend --no-run --typescript --use-npm \
    --skip-cloud --no-example --no-git-init --non-interactive --dbclient sqlite
```
> The `--tailwind` flag is deprecated/ignored (Tailwind is always on in Start).
> `zod` was NOT installed by the scaffold; routes use plain `validateSearch`
> functions instead of zod schemas.

---

## Environment variables

### Root `.env` (docker-compose) — see `.env.example`
- Domains/TLS: `CADDY_EMAIL`, `SITE_DOMAIN`, `CMS_DOMAIN`, `RADIO_DOMAIN`.
- AzuraCast: `AZURACAST_STATION` (station short name), `AZURACAST_UPSTREAM`
  (where Caddy reaches AzuraCast, default `host.docker.internal:8080`).
- Strapi secrets: `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`,
  `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY` (`openssl rand -base64 32`).

The frontend build args (`VITE_STRAPI_URL`, `VITE_AZURACAST_URL`,
`VITE_AZURACAST_STATION`) are derived from those in `docker-compose.yml`.

### Frontend `.env.local` (local dev, inlined by Vite)
- `VITE_STRAPI_URL`, `VITE_AZURACAST_URL`, `VITE_AZURACAST_STATION`,
  optional `VITE_RADIO_STREAM_URL`.

---

## Running
See `README.md` for local dev and the full deploy procedure (AzuraCast install
on ports 8080/8443, then `docker compose up -d --build`, then AzuraCast settings).

---

## Key decisions
- **AzuraCast owns all broadcast logic.** It replaced a custom Hono worker,
  Liquidsoap script, Icecast config, Strapi track/live-session/now-playing types
  and a Strapi "radio control" plugin. Operators use the AzuraCast UI.
- **AzuraCast is installed with its official `docker.sh`, not inlined in our
  compose**, so it keeps its supported update and backup path.
- **Caddy is the single TLS edge**; AzuraCast runs on 8080 with LetsEncrypt off.
- **Strapi is editorial only**, on SQLite + local uploads: one file and one
  folder to back up, no Postgres/MinIO to run.
- **Player audio element lives in `PlayerProvider`** (above the router Outlet)
  so playback survives route changes — this is what keeps it docked everywhere.
- **Nitro node-server** for the frontend (canonical TanStack Start deploy).

## Gotchas
- `VITE_*` are **build-time** for the browser bundle; the frontend image takes
  them as Docker **build args**, so rebuild after changing domains.
- **Streams and SSE must not be buffered**: the Caddyfile sets
  `flush_interval -1` on the AzuraCast route.
- **CORS**: the site reads AzuraCast cross-origin. Caddy sets
  `Access-Control-Allow-Origin: https://SITE_DOMAIN` on `/api/nowplaying*` and
  `/api/live/*`, replacing whatever AzuraCast sends.
- Enable **High-Performance Now Playing Updates** in AzuraCast or the SSE feed
  is absent (the player then only shows the seeded value).
- The station **short name** must equal `AZURACAST_STATION`; the stream path
  assumes the default mount `radio.mp3`.
- Docker-published ports bypass `ufw`; filter AzuraCast's extra ports at the
  provider firewall.
- pnpm 11 reads build-script approvals from `frontend/pnpm-workspace.yaml`
  (`allowBuilds`), **not** the old `package.json` `pnpm` field.
- Strapi public read permissions are granted at boot in `backend/src/index.ts`.
- Strapi trusts proxy headers (`config/server.ts`, `proxy.koa`) so secure admin
  cookies work behind Caddy.

## Next steps / TODO
- Install AzuraCast on the VPS, create the station, upload music, build playlists.
- "Recently played" UI from the NowPlaying payload's `song_history`.
- Schedule UI from AzuraCast's `/api/station/<id>/schedule`.
- Backups: AzuraCast scheduled backups + `strapi_data`/`strapi_uploads` volumes.
