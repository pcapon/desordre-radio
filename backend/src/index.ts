import type { Core } from '@strapi/strapi';
import { reconcileShows, showSyncMiddleware } from './azuracast/shows';

/**
 * Content types the frontend may read without authentication.
 * We grant the public role `find` + `findOne` on each of these at boot so the
 * site works immediately after `strapi develop` without manual clicking in the
 * admin Users & Permissions screen.
 */
const PUBLIC_READ: Array<{ uid: string; actions: Array<string> }> = [
  { uid: 'api::article.article', actions: ['find', 'findOne'] },
  { uid: 'api::author.author', actions: ['find', 'findOne'] },
  { uid: 'api::category.category', actions: ['find', 'findOne'] },
  { uid: 'api::show.show', actions: ['find', 'findOne'] },
  { uid: 'api::episode.episode', actions: ['find', 'findOne'] },
];

async function grantPublicReadPermissions(strapi: Core.Strapi) {
  const publicRole = await strapi
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'public' } });

  if (!publicRole) return;

  for (const { uid, actions } of PUBLIC_READ) {
    for (const action of actions) {
      const permissionAction = `${uid}.${action}`;
      const existing = await strapi
        .query('plugin::users-permissions.permission')
        .findOne({ where: { action: permissionAction, role: publicRole.id } });

      if (!existing) {
        await strapi.query('plugin::users-permissions.permission').create({
          data: { action: permissionAction, role: publicRole.id },
        });
      }
    }
  }
}

export default {
  /**
   * Runs before the app is initialized: install the show ↔ AzuraCast
   * playlist sync on the Document Service (see src/azuracast/shows.ts).
   */
  register({ strapi }: { strapi: Core.Strapi }) {
    strapi.documents.use(showSyncMiddleware(strapi) as Parameters<typeof strapi.documents.use>[0]);
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    try {
      await grantPublicReadPermissions(strapi);
    } catch (error) {
      strapi.log.warn(
        `desordre-radio: could not grant public read permissions: ${error}`,
      );
    }

    // Link existing shows to their playlists and repair drift; never blocks boot.
    reconcileShows(strapi).catch((error) =>
      strapi.log.warn(`azuracast: reconcile failed: ${error}`),
    );
  },
};
