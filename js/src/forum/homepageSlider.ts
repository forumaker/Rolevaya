import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import TagsPage from 'ext:flarum/tags/forum/components/TagsPage';
import HomepageActivitySlider from './components/HomepageActivitySlider';

function isHomepageLikeRoute(): boolean {
  if (typeof window !== 'undefined') {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    if (path === '/' || path === '/tags') return true;
  }

  const routeName = (app as any).current?.routeName;
  return routeName === 'index' || routeName === 'tags';
}

app.initializers.add('forumaker-rolevaya-homepage-slider', () => {
  extend(TagsPage.prototype, 'view', function (output: any) {
    if (!isHomepageLikeRoute()) return;
    if (!output || !Array.isArray(output.children)) return;

    output.children.push(HomepageActivitySlider.component());
  });
});