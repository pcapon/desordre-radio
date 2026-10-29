import type { Core } from '@strapi/strapi';

// Media is stored on local disk (public/uploads, a Docker volume in prod).
const config = (_: Core.Config.Shared.ConfigParams) => ({});

export default config;
