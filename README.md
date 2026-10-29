# Désordre Radio

A 24/7 webradio: **AzuraCast** runs the radio (autoDJ, scheduling, live DJs,
stream, now-playing), **Strapi** holds the editorial content (shows, replays,
articles), and a **TanStack Start** site has a player that **stays docked at the
bottom of every page** and keeps playing across navigation.

```
frontend/   TanStack Start (React 19, SSR) — site + persistent player + replay/journal
backend/    Strapi 5 CMS — shows, episodes, articles (SQLite + local uploads)
Caddyfile   TLS + routing for site / CMS / AzuraCast
```

## Local development
```bash
cd frontend && pnpm install && pnpm dev   # http://localhost:3000
```
Every page falls back to sample data and a public demo stream, so the UI works
with nothing else running. For real content, start Strapi too:
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up strapi   # http://localhost:1337/admin
```
To get live now-playing in dev, set `VITE_AZURACAST_URL` in
`frontend/.env.local` to your AzuraCast instance (its API is public).

## Deploy (one VPS)

DNS: point `SITE_DOMAIN`, `CMS_DOMAIN` and `RADIO_DOMAIN` at the server.

**1. Install AzuraCast** (official installer) on HTTP port **8080** / HTTPS
**8443**, so Caddy can own 80/443:
```bash
sudo mkdir -p /var/azuracast && cd /var/azuracast
sudo curl -fsSL https://raw.githubusercontent.com/AzuraCast/AzuraCast/main/docker.sh > docker.sh
sudo chmod a+x docker.sh
sudo ./docker.sh install        # answer "yes" to customize ports: HTTP 8080, HTTPS 8443
```
If you missed the prompt, set `AZURACAST_HTTP_PORT=8080` and
`AZURACAST_HTTPS_PORT=8443` in `/var/azuracast/.env`, then
`docker compose down && docker compose up -d` in that folder.

**2. Start the site stack:**
```bash
git clone … && cd desordre-radio
cp .env.example .env            # domains + Strapi secrets (openssl rand -base64 32)
docker compose up -d --build
```

**3. Configure AzuraCast** at `https://RADIO_DOMAIN`:
- Create the admin account and a station whose **short name** matches
  `AZURACAST_STATION` in `.env`.
- *System Settings*: Base URL `https://RADIO_DOMAIN`; keep **Use Web Proxy for
  Radio** and **High-Performance Now Playing Updates** on; leave LetsEncrypt
  off (Caddy handles TLS).
- Upload music, build playlists (general rotation, scheduled shows), add a
  fallback file, and create **Streamer/DJ** accounts for live shows.

**4. Strapi**: create the admin at `https://CMS_DOMAIN/admin`, then add shows,
episodes and articles.

Live shows: DJs connect their encoder (butt, OBS, Mixxx) to `RADIO_DOMAIN`
on the station's DJ port (**8005** for the first station) with their streamer
credentials. AzuraCast switches to them automatically.

### Ports
Open **80, 443** (Caddy) and **8005** (DJ input). AzuraCast also publishes its
own ports (8080/8443, 8000+ for direct Icecast, 2022 SFTP). Docker bypasses
`ufw`, so filter these at your provider's firewall if you want them closed.

### Updates & backups
- AzuraCast: `cd /var/azuracast && sudo ./docker.sh update`; backups are in
  *Administration → Backups* (schedule them there).
- Site: `git pull && docker compose up -d --build`. Back up the `strapi_data`
  (SQLite file) and `strapi_uploads` Docker volumes.

## Documentation
- **[AGENTS.md](./AGENTS.md)**: architecture, decisions and gotchas.
- **[frontend/AGENTS.md](./frontend/AGENTS.md)**: TanStack Intent skill map.
