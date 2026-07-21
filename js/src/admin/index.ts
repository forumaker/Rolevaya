import app from 'flarum/admin/app';

export { default as extend } from './extend';

app.initializers.add('forumaker-rolevaya-admin', () => {
  // registerPermission(config, type, priority) — type is the SECOND
  // argument, not a field inside the object (matches forumaker/arena's
  // registerPermission calls in its own admin/index.ts).
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