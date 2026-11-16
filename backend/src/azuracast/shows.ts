/**
 * Show ↔ AzuraCast playlist sync. Strapi owns the link:
 * - a show saved without `azuracastPlaylistId` gets a new playlist named after
 *   its title;
 * - a show saved with an ID links that playlist and renames it to the title;
 * - `azuracastPlaylist` always mirrors the title. It is the key the frontend
 *   matches against now-playing and the schedule, which only expose names.
 * Playlists are never deleted from here (they hold the media).
 */
import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import * as azuracast from './client';

const SHOW = 'api::show.show';

type ShowRow = {
  id: number;
  documentId: string;
  title: string;
  azuracastPlaylist: string | null;
  azuracastPlaylistId: number | null;
};

/** Write the link on every row (draft + published) of a show, bypassing the middleware. */
function writeLink(strapi: Core.Strapi, documentId: string, title: string, id: number | null) {
  return strapi.db.query(SHOW).updateMany({
    where: { documentId },
    data: { azuracastPlaylist: title, azuracastPlaylistId: id },
  });
}

/** The draft row: it holds the latest edits (every document has one). */
function findDraft(strapi: Core.Strapi, documentId: string): Promise<ShowRow | null> {
  return strapi.db.query(SHOW).findOne({ where: { documentId, publishedAt: null } });
}

/** Link or create the playlist for `title`; returns its ID. Throws if `id` is unknown. */
async function ensurePlaylist(title: string, id: number | null): Promise<number> {
  if (id == null) return (await azuracast.createPlaylist(title)).id;
  const playlist = await azuracast.getPlaylist(id);
  if (!playlist) throw new Error(`no playlist with ID ${id} in AzuraCast`);
  if (playlist.name !== title) await azuracast.renamePlaylist(id, title);
  return id;
}

/** Document Service middleware: sync the playlist on every show create/update. */
export function showSyncMiddleware(strapi: Core.Strapi) {
  return async (ctx: { uid: string; action: string; params: unknown }, next: () => Promise<unknown>) => {
    if (ctx.uid !== SHOW || (ctx.action !== 'create' && ctx.action !== 'update')) return next();
    if (!azuracast.isEnabled()) return next();

    const params = ctx.params as { documentId?: string; data?: Record<string, unknown> };
    const data = params.data ?? {};
    const current = params.documentId ? await findDraft(strapi, params.documentId) : null;

    const title = String(data.title ?? current?.title ?? '').trim();
    if (!title) return next();
    const rawId = 'azuracastPlaylistId' in data ? data.azuracastPlaylistId : current?.azuracastPlaylistId;
    const wantedId = rawId == null || rawId === '' ? null : Number(rawId);

    let id: number;
    try {
      id = await ensurePlaylist(title, wantedId);
    } catch (err) {
      throw new errors.ApplicationError(
        `AzuraCast: ${err instanceof Error ? err.message : err}. The show was not saved.`,
      );
    }

    params.data = { ...data, azuracastPlaylist: title, azuracastPlaylistId: id };
    const result = (await next()) as { documentId?: string } | null;
    const documentId = params.documentId ?? result?.documentId;
    if (documentId) await writeLink(strapi, documentId, title, id);
    return result;
  };
}

/**
 * Repair drift once at boot: link shows that have no playlist ID yet (by
 * existing playlist name, else create one), rename playlists renamed in
 * AzuraCast back to the show title, and unlink playlists deleted there.
 */
export async function reconcileShows(strapi: Core.Strapi): Promise<void> {
  if (!azuracast.isEnabled()) {
    strapi.log.info('azuracast: sync disabled (AZURACAST_API_URL/STATION/API_KEY not set)');
    return;
  }

  const shows: Array<ShowRow> = await strapi.db.query(SHOW).findMany({ where: { publishedAt: null } });
  let playlists: Array<azuracast.AzuraPlaylist> | undefined;

  for (const show of shows) {
    const title = show.title.trim();
    try {
      if (show.azuracastPlaylistId != null) {
        const playlist = await azuracast.getPlaylist(show.azuracastPlaylistId);
        if (!playlist) {
          strapi.log.warn(
            `azuracast: playlist ${show.azuracastPlaylistId} of show "${title}" was deleted; unlinked (saving the show creates a new one)`,
          );
          await writeLink(strapi, show.documentId, title, null);
          continue;
        }
        if (playlist.name !== title) {
          await azuracast.renamePlaylist(playlist.id, title);
          strapi.log.info(`azuracast: renamed playlist "${playlist.name}" → "${title}"`);
        }
        if (show.azuracastPlaylist !== title) await writeLink(strapi, show.documentId, title, playlist.id);
        continue;
      }

      playlists ??= await azuracast.listPlaylists();
      const wanted = (show.azuracastPlaylist || title).toLowerCase();
      const existing = playlists.find((p) => p.name.trim().toLowerCase() === wanted);
      const id = await ensurePlaylist(title, existing?.id ?? null);
      await writeLink(strapi, show.documentId, title, id);
      strapi.log.info(`azuracast: show "${title}" ${existing ? 'linked to' : 'created'} playlist ${id}`);
    } catch (err) {
      strapi.log.warn(`azuracast: could not sync show "${title}": ${err}`);
    }
  }
}
