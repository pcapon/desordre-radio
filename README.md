# Désordre Radio

A 24/7 webradio platform — one Icecast stream (autoDJ + live override), a Strapi
CMS, a Hono scheduler/bridge, and a TanStack Start site whose **player stays
docked at the bottom of every page** and keeps playing across navigation.

```
frontend/   TanStack Start (React 19, SSR) — site + persistent player + replay/journal
backend/    Strapi 5 CMS — tracks, playlists, schedule, live-sessions, now-playing, editorial
worker/     Hono — scheduler + Liquidsoap bridge + now-playing
radio/      Liquidsoap (audio engine) + Icecast (stream)
```

## Quick start

**Just the site (no backend needed):**
```bash
cd frontend && pnpm install && pnpm dev   # http://localhost:3000
```
Every page falls back to sample data and a public demo stream, so the UI is
fully browsable immediately.

**Local development with real data (Strapi in develop mode):**
```bash
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres minio minio-init strapi worker icecast liquidsoap
cd frontend && pnpm install && pnpm dev
```
This dev compose layer exposes Strapi on `localhost:1337`, the worker on
`localhost:3001`, and Icecast on `localhost:8000`. It also runs Strapi with
`strapi develop`, so content-type editing is enabled locally.

Open these URLs in local development:
- Frontend: `http://localhost:3000`
- Strapi admin: `http://localhost:1337/admin`
- Worker health: `http://localhost:3001/health`
- Icecast status: `http://localhost:8000/status-json.xsl`

Notes:
- The frontend reads real local services from `frontend/.env.local`.
- The production Caddy/domain setup is not used for day-to-day development.
- If `docker compose` still says permission denied after joining the `docker` group, start a new shell session first.

**Full stack on one VPS:**
```bash
cp .env.example .env       # fill secrets (openssl rand -base64 32) + domains
docker compose up -d --build
```
Caddy terminates TLS and routes by domain. Open `https://CMS_DOMAIN/admin`,
publish tracks/playlists/schedule, create a Strapi API token → `STRAPI_API_TOKEN`
in `.env`, then `docker compose up -d worker`. Drop evergreen audio into
`./media/fallback/` so the stream never goes silent.

Live shows: point OBS/butt at `icecast://SERVER:8005`, mount `/live`.

## Documentation
- **[AGENTS.md](./AGENTS.md)** — architecture, data/audio flow, env vars,
  decisions, gotchas, exact scaffold commands.
- **[frontend/AGENTS.md](./frontend/AGENTS.md)** — TanStack Intent skill map.

## Published ports (production)
Only the edge proxy and the live encoder input are exposed; everything else is
internal to the compose network.

| Service    | Port    | What                                   |
|------------|---------|----------------------------------------|
| caddy      | 80/443  | TLS entry → site / CMS / stream / media |
| liquidsoap | 8005    | Live encoder input (Icecast harbor)    |

Internal: frontend `3000` (SSR), strapi `1337`, icecast `8000`, worker `3001`
(now-playing SSE via Caddy), minio `9000/9001`.

## Compose files
- `docker-compose.yml` — production-oriented stack (Caddy + built frontend + Strapi start)
- `docker-compose.dev.yml` — local development overrides (Strapi develop + localhost ports, Caddy/frontend disabled by default)
