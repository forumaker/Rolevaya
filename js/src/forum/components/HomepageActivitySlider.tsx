import Component from 'flarum/common/Component';
import RoleplaySlider from './homeSlider/RoleplaySlider';
import ArenaSlider from './homeSlider/ArenaSlider';

type HomeTab = 'roleplay' | 'arena';

/**
 * Homepage activity widget: a tab switcher (Ролевая / Арена) composing two
 * self-contained sliders. Each tab's data loading, caching, carousel, and
 * rendering lives in its own component (RoleplaySlider / ArenaSlider) — this
 * component only owns which tab is currently shown.
 *
 * Both sliders are always mounted (never conditionally removed from the
 * tree) and toggled with plain CSS visibility instead. That's what lets
 * each one keep its own in-memory state (carousel position, loaded rows)
 * across tab switches without this parent having to coordinate anything —
 * ArenaSlider itself knows to defer its first data fetch until its `active`
 * prop first becomes true, so switching tabs is still what triggers Арена's
 * lazy load, exactly as before the split.
 */
export default class HomepageActivitySlider extends Component {
  activeTab: HomeTab = 'roleplay';

  private switchTab(tab: HomeTab) {
    if (this.activeTab === tab) return;

    this.activeTab = tab;
    m.redraw();
  }

  private renderTabs() {
    return (
      <div className="RolevayaHomeWidget-tabs">
        <button
          type="button"
          className={'Button RolevayaFilterBtn' + (this.activeTab === 'roleplay' ? ' active' : '')}
          onclick={() => this.switchTab('roleplay')}
        >
          Ролевая
        </button>

        <button
          type="button"
          className={'Button RolevayaFilterBtn' + (this.activeTab === 'arena' ? ' active' : '')}
          onclick={() => this.switchTab('arena')}
        >
          Арена
        </button>
      </div>
    );
  }

  view() {
    return (
      <section className="RolevayaHomeWidget">
        <div className="RolevayaHomeWidget-box">
          {this.renderTabs()}

          <div style={{ display: this.activeTab === 'roleplay' ? 'block' : 'none' }}>
            <RoleplaySlider active={this.activeTab === 'roleplay'} />
          </div>

          <div style={{ display: this.activeTab === 'arena' ? 'block' : 'none' }}>
            <ArenaSlider active={this.activeTab === 'arena'} />
          </div>
        </div>
      </section>
    );
  }
}
