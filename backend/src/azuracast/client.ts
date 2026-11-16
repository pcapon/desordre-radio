/**
 * Minimal AzuraCast API client for the Strapi ↔ AzuraCast sync.
 *
 * Configured by AZURACAST_API_URL (how Strapi reaches AzuraCast, e.g.
 * http://host.docker.internal:8080), AZURACAST_STATION (station short name)
 * and AZURACAST_API_KEY (AzuraCast → My Account → API Keys). Without all
 * three the sync is off and Strapi behaves as a plain CMS.
 */

export type AzuraPlaylist = { id: number; name: string };

export type AzuraScheduleItem = {
  type: 'playlist' | 'streamer';
  name: string;
  start: string;
  end: string;
  is_now: boolean;
};

function config() {
  return {
    url: (process.env.AZURACAST_API_URL ?? '').replace(/\/+$/, ''),
    station: process.env.AZURACAST_STATION ?? '',
    key: process.env.AZURACAST_API_KEY ?? '',
  };
}

export function isEnabled(): boolean {
  const { url, station, key } = config();
  return Boolean(url && station && key);
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T | null> {
  const { url, station, key } = config();
  const res = await fetch(`${url}/api/station/${station}${path}`, {
    method,
    headers: {
      'X-API-Key': key,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(5000),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${method} ${path} → HTTP ${res.status} ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export async function listPlaylists(): Promise<Array<AzuraPlaylist>> {
  return (await request<Array<AzuraPlaylist>>('GET', '/playlists')) ?? [];
}

/** The playlist, or null if it doesn't exist (deleted in AzuraCast). */
export function getPlaylist(id: number): Promise<AzuraPlaylist | null> {
  return request<AzuraPlaylist>('GET', `/playlist/${id}`);
}

/**
 * A new show playlist: sequential order, and at its scheduled time it
 * interrupts whatever is playing and plays a single track (the next one in
 * order). Its schedule is set in AzuraCast.
 */
export async function createPlaylist(name: string): Promise<AzuraPlaylist> {
  const playlist = await request<AzuraPlaylist>('POST', '/playlists', {
    name,
    type: 'default',
    source: 'songs',
    order: 'sequential',
    backend_options: ['interrupt', 'single_track'],
    is_enabled: true,
  });
  if (!playlist) throw new Error('POST /playlists → 404 (station not found?)');
  return playlist;
}

export async function renamePlaylist(id: number, name: string): Promise<void> {
  await request('PUT', `/playlist/${id}`, { name });
}

export async function getSchedule(): Promise<Array<AzuraScheduleItem>> {
  return (await request<Array<AzuraScheduleItem>>('GET', '/schedule')) ?? [];
}
