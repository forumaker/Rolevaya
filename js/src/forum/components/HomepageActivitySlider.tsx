import Component from 'flarum/common/Component';
import RoleplaySlider from './homeSlider/RoleplaySlider';
import ArenaSlider from './homeSlider/ArenaSlider';

type HomeTab = 'roleplay' | 'arena';

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
