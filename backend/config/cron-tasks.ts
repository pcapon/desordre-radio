import type { Core } from '@strapi/strapi';
import { createAiringDrafts } from '../src/azuracast/episodes';

export default {
  // While a show's scheduled playlist is on air, make sure it has a draft episode.
  azuracastAiringDrafts: {
    task: async ({ strapi }: { strapi: Core.Strapi }) => {
      try {
        await createAiringDrafts(strapi);
      } catch (err) {
        strapi.log.warn(`azuracast: airing drafts failed: ${err}`);
      }
    },
    options: { rule: '*/5 * * * *' },
  },
};
