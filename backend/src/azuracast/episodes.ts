/**
 * Draft episode per airing: while a show's scheduled playlist is on air,
 * make sure a draft Episode exists for that slot (show + airedAt filled in).
 * The editor then adds the SoundCloud URL and publishes. Runs from cron.
 */
import type { Core } from '@strapi/strapi';
import * as azuracast from './client';

const SHOW = 'api::show.show';
const EPISODE = 'api::episode.episode';

/** "4 novembre 2026" from the slot's station-local date (no TZ conversion). */
function frenchDate(isoStart: string): string {
  const ymd = isoStart.slice(0, 10);
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(`${ymd}T12:00:00Z`),
  );
}

const slugify = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export async function createAiringDrafts(strapi: Core.Strapi): Promise<void> {
  if (!azuracast.isEnabled()) return;

  const onAir = (await azuracast.getSchedule()).filter((s) => s.is_now && s.type === 'playlist');
  if (onAir.length === 0) return;

  const shows = await strapi.documents(SHOW).findMany({
    status: 'draft',
    fields: ['title', 'slug', 'azuracastPlaylist'],
  });

  for (const slot of onAir) {
    const key = slot.name.trim().toLowerCase();
    const show = shows.find((s) => s.azuracastPlaylist?.trim().toLowerCase() === key);
    if (!show) continue;

    const airedAt = new Date(slot.start).toISOString();
    const existing = await strapi.documents(EPISODE).findFirst({
      status: 'draft',
      filters: { show: { documentId: show.documentId }, airedAt },
    });
    if (existing) continue;

    const ymd = slot.start.slice(0, 10);
    let slug = `${show.slug || slugify(show.title)}-${ymd}`;
    if (await strapi.documents(EPISODE).findFirst({ status: 'draft', filters: { slug } })) {
      slug += `-${slot.start.slice(11, 16).replace(':', '')}`;
    }

    // No soundcloudUrl yet: Strapi only enforces `required` when publishing.
    const data = { title: `${show.title} — ${frenchDate(slot.start)}`, slug, airedAt, show: show.documentId };
    await strapi.documents(EPISODE).create({ data: data as typeof data & { soundcloudUrl: string } });
    strapi.log.info(`azuracast: draft episode "${slug}" created for the airing of "${show.title}"`);
  }
}
