# Désordre Radio — project context

A 24/7 webradio: a single Icecast stream (autoDJ + live override), a Strapi CMS
that owns all the data, a Hono worker that bridges Strapi → Liquidsoap, and a
TanStack Start frontend whose **player is docked at the bottom of every page**
and keeps playing across navigation.

This file is the durable source of truth for the project. The frontend has its
own `frontend/AGENTS.md` containing the **TanStack Intent skill map** — read it
before changing TanStack Router/Start code.

---

## Repository layout

```
desordre-radio/
├── frontend/      TanStack Start (React 19, SSR via Nitro node-server)
├── backend/       Strapi 5 CMS — all content & broadcast data
├── worker/        Hono service — scheduler + Liquidsoap bridge + now-playing SSE
├── radio/
│   ├── caddy/     Caddyfile — reverse proxy + automatic TLS (the entrypoint)
│   ├── icecast/   Icecast config (envsubst template + Dockerfile)
│   └── liquidsoap/ radio.liq audio engine + Dockerfile
├── media/fallback/ evergreen audio Liquidsoap plays if everything else is down
├── docker-compose.yml   single-VPS stack (Caddy, Postgres, MinIO, …)
└── .env.example         all secrets / domains / public URLs
```

Frontend and backend are intentionally separated (per request) and each builds
independently. The worker and radio engine are additional services.

---

## Architecture (single VPS)

```
                                  ┌──────────────────────────────┐
                                  │            STRAPI            │
                                  │  tracks (rotation + scheduled)│
                                  │  live-sessions · now-playing  │
                                  │  shows · episodes · articles  │
                                  └───────▲─────────────┬─────────┘
                          read (REST)     │             │ read (REST, public)
                                          │             │
                  ┌───────────────────────┴──┐          │
                  │        HONO WORKER        │          │
                  │  • GET /next  (autoDJ pick)│         │
                  │  • POST /metadata (←LS)    │         │
                  │  • scheduler loop (poll)   │         │
                  │  • PUT now-playing (→Strapi)         │
                  └──▲──────────────┬─────────┘          │
        HTTP /next   │              │ telnet             │
        (track URI)  │              │ autodj.skip        │
                     │              ▼                    │
   ┌─────────────────┴───────────────────────┐          │
   │              LIQUIDSOAP                  │          │
   │  autodj = request.dynamic(→worker /next) │          │
   │  live   = input.harbor(:8005, mount/live)│◀───── OBS / butt (live show)
   │  radio  = fallback([live, autodj])       │          │
   │  on_metadata → POST worker /metadata      │         │
   └───────────────────┬──────────────────────┘         │
                        │ source (MP3) → mount /stream    │
                        ▼                                 │
                 ┌────────────┐                           │
                 │  ICECAST   │  :8000/stream  ───────────┼──────────┐
                 └────────────┘                           │          │
                                                          │          │
                        audio stream ────────────┐        │          │
                                                  ▼        ▼          ▼
                                       ┌───────────────────────────────────┐
                                       │             FRONTEND              │
                                       │  TanStack Start SSR + bottom player│
                                       │  <audio> ← Icecast /stream        │
                                       │  now-playing ← Strapi API (poll)  │
                                       │  replay/journal ← Strapi REST     │
                                       └───────────────────────────────────┘
```

### Data flow
1. Editors manage **tracks, live-sessions** and editorial content
   (shows/episodes/articles) in Strapi. A track is either a normal **rotation**
   track or, if it has a `scheduledAt`, a **scheduled** track pinned to a time;
   a track may belong to a **show**.
2. The **worker** polls Strapi (`/tracks`, with `show` populated) every
   `POLL_INTERVAL_MS` and splits them into the rotation pool (weighted random)
   and the scheduled set. A separate faster loop (`SCHEDULE_CHECK_MS`) fires any
   track whose `scheduledAt` has arrived.
3. **Liquidsoap's** `request.dynamic` autoDJ calls the worker's `GET /next`,
   which returns one `annotate:...:<audio-url>` request URI — a queued
   scheduled/forced track first, else a rotation pick.
4. To make a scheduled track (or an operator **Play Now**) cut in immediately,
   the worker queues it and sends `autodj.skip` over **telnet** so Liquidsoap
   drops the current track and re-pulls `GET /next`.

### Audio flow
1. Liquidsoap builds `fallback([live, autodj])` — when a live encoder connects
   to the harbor (`:8005`, mount `/live`) it **overrides** the autoDJ
   (`track_sensitive=false` → cuts in immediately); on disconnect it falls back.
2. Liquidsoap encodes a single **MP3** and pushes it to Icecast mount `/stream`.
3. Icecast serves `http://host:8000/stream` to every listener.
4. The frontend `<audio>` plays that mount. On each track change Liquidsoap's
   `on_metadata` POSTs `{title, artist, source, trackDocumentId}` to the worker
   (with a shared-secret header). The worker waits `STREAM_BUFFER_DELAY_MS`
   (so the update lands when the track is actually *audible*, not when queued),
   then: writes the Strapi `now-playing` single type, appends a
   `now-playing-history` row, and pushes the change to all connected **SSE**
   clients (`GET /now-playing/stream`). The frontend seeds from the JSON
   endpoint then subscribes via `EventSource` for live updates.

### Edge / TLS
All public traffic enters through **Caddy** (auto-TLS): `SITE_DOMAIN` → frontend
(with `/now-playing*` proxied to the worker SSE, buffering disabled),
`CMS_DOMAIN` → Strapi, `STREAM_DOMAIN` → Icecast, `MEDIA_DOMAIN` → MinIO. Only
ports 80/443 (Caddy) and 8005 (live encoder harbor) are published.

---

## Stack & how it was scaffolded

- **Frontend:** React 19 + TanStack Start/Router/Query (blog starter) + Strapi
  client + Tailwind v4. Default CLI toolchain (Vite 8, Vitest), pnpm. Production
  server = **Nitro** node-server (`.output/server/index.mjs`).
- **Backend:** Strapi 5.49 (TypeScript), Postgres in prod / sqlite in dev. Media
  via S3-compatible object storage (self-hosted MinIO or a European provider).
- **Worker:** Hono + `@hono/node-server`, run with `tsx`. Serves now-playing
  over **SSE** (`hono/streaming`).
- **Audio:** Liquidsoap 2.3 (savonet image) + Icecast (alpine).
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
- Domains/TLS: `CADDY_EMAIL`, `SITE_DOMAIN`, `CMS_DOMAIN`, `STREAM_DOMAIN`,
  `MEDIA_DOMAIN`.
- Strapi secrets: `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`,
  `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY` (`openssl rand -base64 32`).
- DB: `DATABASE_NAME/USERNAME/PASSWORD`.
- Object storage (S3-compatible, **not AWS**): `S3_BUCKET`, `S3_ACCESS_KEY_ID`,
  `S3_SECRET_ACCESS_KEY`, `S3_REGION`, `S3_ENDPOINT`, `CDN_URL`. Default points
  at the in-compose MinIO (data on your EU VPS); swap the endpoint for a
  European provider (Scaleway/OVH/Exoscale/Hetzner/Infomaniak). Empty
  `S3_BUCKET` → Strapi local disk uploads.
- Icecast: `ICECAST_SOURCE_PASSWORD`, `ICECAST_RELAY_PASSWORD`,
  `ICECAST_ADMIN_PASSWORD`, `ICECAST_HOSTNAME`, `ICECAST_MOUNT`.
- Live: `LIVE_SOURCE_PASSWORD`.
- Worker: `STRAPI_API_TOKEN` (read tracks + shows + create/update
  now-playing & history), `RADIO_TIMEZONE`, `STREAM_BUFFER_DELAY_MS`,
  `METADATA_SECRET` (shared with Liquidsoap).
- Public (baked into the frontend at build): `PUBLIC_STRAPI_URL`,
  `PUBLIC_STREAM_URL`, `PUBLIC_NOW_PLAYING_URL`, `PUBLIC_NOW_PLAYING_SSE_URL`.

### Frontend `.env.local` (local dev, inlined at build by Vite)
- `VITE_STRAPI_URL`, `VITE_RADIO_STREAM_URL`, `VITE_NOW_PLAYING_URL`,
  `VITE_NOW_PLAYING_SSE_URL`.

---

## Running

### Local dev (no Docker)
```bash
# Backend
cd backend && npm install && npm run develop        # http://localhost:1337/admin
# Frontend
cd frontend && pnpm install && pnpm dev              # http://localhost:3000
# Worker (needs Strapi + a Liquidsoap telnet to be fully useful)
cd worker && pnpm install && pnpm dev
```
The frontend works **without any backend**: every route falls back to sample
data (`frontend/src/data/sample.ts`) and the player streams a public demo
stream, so the UI is fully browsable before the stack is wired up.

### Full stack (single VPS)
```bash
cp .env.example .env   # fill secrets + point the *_DOMAIN records at the VPS
docker compose up -d --build
# 1) https://CMS_DOMAIN/admin → create admin, publish tracks (set scheduledAt/show)
# 2) Settings → API Tokens → custom token (read tracks + shows,
#    create+update now-playing & now-playing-history) → STRAPI_API_TOKEN in .env
# 3) docker compose up -d worker   (re-run with the token)
# Drop evergreen audio into ./media/fallback so the stream never goes silent.
# Live show: point OBS/butt at  icecast://SERVER:8005  mount /live  (LIVE_SOURCE_PASSWORD)
```
> Local server smoke-tests of the Nitro frontend / SSE were not run in the dev
> sandbox (it kills long-lived bound processes); verify on the target host. The
> build artifacts, types, and the equivalent SSR handler are verified.

---

## Key decisions
- **Scheduling lives in the worker**, audio logic lives in Liquidsoap. The
  worker centralises "what plays now" so Liquidsoap stays a thin, robust engine.
- **autoDJ via `request.dynamic` + `GET /next`** (not telnet push): the worker
  returns annotated URIs so metadata + selection are in one place. A
  `/playlist.m3u` endpoint is also provided as an alternative feed.
- **now-playing via SSE push** (not WebSocket, not polling): one-way + low
  frequency, so SSE from the worker fits; the worker is already the metadata
  hub. Strapi stays the data of record (`now-playing` + `now-playing-history`).
- **Buffer-synced metadata**: the worker delays the now-playing update by
  `STREAM_BUFFER_DELAY_MS` so the UI flips when the track is *audible*, not when
  queued at the source (listeners are seconds behind the encoder).
- **Stream survival decoupled from the worker**: Liquidsoap layers
  `fallback([live, autodj, local_fallback])` so a worker outage falls back to
  `./media/fallback` audio instead of silence.
- **Player audio element lives in `PlayerProvider`** (above the router Outlet)
  so playback survives route changes — this is what keeps it docked everywhere.
- **Media on S3-compatible storage, not via Strapi** — `@strapi/provider-upload-aws-s3`
  speaks the S3 protocol; default is self-hosted MinIO (EU VPS), swappable to a
  European managed provider via `S3_ENDPOINT`.
- **Nitro node-server** for the frontend (canonical TanStack Start deploy) and
  **Caddy** for TLS — replaced the earlier hand-rolled `server.mjs`.
- **Postgres in prod, sqlite in dev** — Strapi `config/database.ts` switches on
  `DATABASE_CLIENT`; `pg` added to backend deps.

## Gotchas
- `VITE_*` are **build-time** for the browser bundle — the frontend image takes
  them as Docker **build args**, not runtime env.
- **SSE must not be buffered** by the proxy — the Caddyfile sets
  `flush_interval -1` on the `/now-playing*` route. Any proxy in front needs the
  same, or live updates stall.
- pnpm 11 reads build-script approvals from `frontend/pnpm-workspace.yaml`
  (`allowBuilds`), **not** the old `package.json` `pnpm` field — esbuild /
  lightningcss need it or `vite build` fails in the image.
- `@strapi/provider-upload-aws-s3` is the **S3 protocol**, not AWS — set
  `S3_ENDPOINT` to any European S3-compatible store.
- Icecast source password must match `ICECAST_SOURCE_PASSWORD` in Liquidsoap;
  both read it from the same `.env`. Same for `METADATA_SECRET` (Liquidsoap ↔ worker).
- Strapi public read permissions are granted at boot in `backend/src/index.ts`
  (`bootstrap`) so the frontend works without manual clicking.
- Liquidsoap is not installed locally — validate `radio.liq` inside the
  `savonet/liquidsoap` image (`docker compose up liquidsoap`).

## Next steps / TODO
- Seed Strapi with real tracks (rotation + a few scheduled) and editorial content, and
  drop evergreen audio into `./media/fallback`.
- Run the live smoke tests from the plan on the target host (Nitro server, SSE,
  worker-down fallback, live override).
- Build a "recently played" UI from `now-playing-history`.
- Optional: crossfade tuning, ReplayGain, jingles playlist between tracks.
- Optional: HLS output mount for iOS-friendly low-latency playback.
- Multi-instance scale: move SSE fan-out to Redis pub/sub; add Icecast relays
  or pull-CDN for large listener counts.
- Wire `live-session` status (planned→live→ended) updates from harbor connect.
- Backups: schedule Postgres dumps + object-storage/bucket snapshots.
