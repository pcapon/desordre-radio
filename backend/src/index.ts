import type { Core } from '@strapi/strapi';

/**
 * Content types the frontend / worker may read without authentication.
 * We grant the public role `find` + `findOne` on each of these at boot so the
 * site works immediately after `strapi develop` without manual clicking in the
 * admin Users & Permissions screen.
 */
const PUBLIC_READ: Array<{ uid: string; actions: Array<string> }> = [
  { uid: 'api::track.track', actions: ['find', 'findOne'] },
  { uid: 'api::playlist.playlist', actions: ['find', 'findOne'] },
  { uid: 'api::schedule.schedule', actions: ['find', 'findOne'] },
  { uid: 'api::live-session.live-session', actions: ['find', 'findOne'] },
  { uid: 'api::now-playing.now-playing', actions: ['find'] },
  { uid: 'api::now-playing-history.now-playing-history', actions: ['find'] },
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
   * An asynchronous register function that runs before
   * your application is initialized.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

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
  },
};
