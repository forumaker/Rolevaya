import app from 'flarum/admin/app';

export { default as extend } from './extend';

app.initializers.add('forumaker-rolevaya-admin', () => {
  app.registry.for('forumaker-rolevaya').registerPermission(
    {
      permission: 'forumaker-rolevaya.recalculate',
      icon: 'fas fa-arrows-rotate',
      label: app.translator.trans('forumaker-rolevaya.admin.permissions.recalculate'),
    },
    'moderate',
    95
  );
});