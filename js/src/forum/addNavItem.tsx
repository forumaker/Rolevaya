import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import IndexSidebar from 'flarum/forum/components/IndexSidebar';
import LinkButton from 'flarum/common/components/LinkButton';

app.initializers.add('forumaker-rolevaya-nav', () => {
  extend(IndexSidebar.prototype, 'navItems', function (items: any) {
    items.add(
      'rolevayaHallOfFame',
      <LinkButton icon="fas fa-building-columns" href={app.route('top')}>
        Зал Славы
      </LinkButton>,
      -9
    );
  });
});
