import app from 'flarum/forum/app';
import Page from 'flarum/common/components/Page';
import PageStructure from 'flarum/forum/components/PageStructure';
import IndexSidebar from 'flarum/forum/components/IndexSidebar';
import StatsTabs from '../components/StatsTabs';

export default class RolevayaPage extends Page {
  oninit(vnode) {
    super.oninit(vnode);

    app.setTitle('Зал Славы');
  }

  title() {
    return 'Зал Славы';
  }

  hero() {
    return (
      <header className="Hero RolevayaHero">
        <div className="container">
          <div className="containerNarrow">
            <h1 className="Hero-title">
              <i aria-hidden="true" className="icon fas fa-building-columns" /> Зал Славы
            </h1>
          </div>
        </div>
      </header>
    );
  }

  view() {
    return (
      <PageStructure className="IndexPage RolevayaPage" hero={this.hero.bind(this)} sidebar={() => <IndexSidebar />}>
        <StatsTabs />
      </PageStructure>
    );
  }
}
