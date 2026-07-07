import type { StrapiApp } from '@strapi/strapi/admin';
import { Play } from '@strapi/icons';

const PERMISSIONS = [{ action: 'plugin::radio-control.read', subject: null }];

export default {
  register(app: StrapiApp) {
    app.addMenuLink({
      to: 'plugins/radio-control',
      icon: Play,
      intlLabel: {
        id: 'radio-control.plugin.name',
        defaultMessage: 'Radio Control',
      },
      Component: () =>
        import('./pages/RadioControlPage').then((mod) => ({
          default: mod.ProtectedRadioControlPage,
        })),
      permissions: PERMISSIONS,
    });

    app.registerPlugin({
      id: 'radio-control',
      name: 'Radio Control',
    });
  },
};