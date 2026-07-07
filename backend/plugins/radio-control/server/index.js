'use strict';

const PLUGIN_ID = 'radio-control';

const ACTIONS = [
  {
    section: 'plugins',
    displayName: 'Access Radio Control',
    uid: 'read',
    pluginName: PLUGIN_ID,
  },
  {
    section: 'plugins',
    displayName: 'Operate Radio Control',
    uid: 'update',
    pluginName: PLUGIN_ID,
  },
];

module.exports = {
  register: async ({ strapi }) => {
    await strapi.service('admin::permission').actionProvider.registerMany(ACTIONS);
  },
  routes: {
    admin: require('./routes/admin'),
  },
  controllers: {
    'radio-control': require('./controllers/radio-control'),
  },
  services: {
    'radio-control': require('./services/radio-control'),
  },
  contentTypes: {
    'radio-control-action': {
      schema: require('./content-types/radio-control-action/schema.json'),
    },
  },
};