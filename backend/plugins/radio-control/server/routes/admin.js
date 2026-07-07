'use strict';

const readPolicies = [
  'admin::isAuthenticatedAdmin',
  {
    name: 'admin::hasPermissions',
    config: {
      actions: ['plugin::radio-control.read'],
    },
  },
];

const updatePolicies = [
  'admin::isAuthenticatedAdmin',
  {
    name: 'admin::hasPermissions',
    config: {
      actions: ['plugin::radio-control.update'],
    },
  },
];

module.exports = {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/state',
      handler: 'radio-control.state',
      config: {
        policies: readPolicies,
      },
    },
    {
      method: 'GET',
      path: '/tracks',
      handler: 'radio-control.tracks',
      config: {
        policies: readPolicies,
      },
    },
    {
      method: 'POST',
      path: '/play-now',
      handler: 'radio-control.playNow',
      config: {
        policies: updatePolicies,
      },
    },
    {
      method: 'POST',
      path: '/skip',
      handler: 'radio-control.skip',
      config: {
        policies: updatePolicies,
      },
    },
  ],
};