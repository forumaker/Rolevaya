import Component from 'flarum/common/Component';
import CharactersTab from './stats/CharactersTab';
import ActivityTab from './stats/ActivityTab';
import ArenaTab from './stats/ArenaTab';

/**
 * Зал Славы tab switcher. Each tab (characters/activity/arena) used to be a
 * ~330-line slice of a single 999-line component with all three tabs'
 * loading state, error state, and render methods mixed together. They're
 * now separate Component subclasses (see ./stats/*) that can be read and
 * changed in isolation; this component only owns which tab is active and
 * the shared toolbar (tab buttons + the single "Обновить" button, which
 * delegates to whichever tab is currently active).
 *
 * All three tabs are mounted at once (just hidden via CSS when inactive)
 * rather than created on demand, so switching tabs is instant and doesn't
 * re-fetch data that's already loaded — matching the original component's
 * behavior of preloading all three leaderboards up front.
 */
export default class StatsTabs extends Component {
  activeTab: 'characters' | 'activity' | 'arena' = 'characters';

  private charactersTab?: CharactersTab;
  private activityTab?: ActivityTab;
  private arenaTab?: ArenaTab;

  private get activeTabComponent(): CharactersTab | ActivityTab | ArenaTab | undefined {
    if (this.activeTab === 'characters') return this.charactersTab;
    if (this.activeTab === 'activity') return this.activityTab;
    return this.arenaTab;
  }

  private get activeUpdateLoading() {
    const tab = this.activeTabComponent as any;
    if (!tab) return false;

    if (this.activeTab === 'characters' || this.activeTab === 'activity') {
      return !!tab.recalcLoading;
    }

    return !!tab.loading;
  }

  private get activeTabLoading() {
    const tab = this.activeTabComponent as any;
    return tab ? !!tab.loading : false;
  }

  private async recalcActiveTab() {
    const tab = this.activeTabComponent;
    if (tab) await tab.recalc();
  }

  view() {
    const updateDisabled = this.activeUpdateLoading || this.activeTabLoading;

    return (
      <div className="RolevayaTabs">
        <div className="RolevayaToolbar">
          <div className="RolevayaToolbar-group RolevayaToolbar-group--tabs">
            <button
              className={'Button RolevayaFilterBtn' + (this.activeTab === 'characters' ? ' active' : '')}
              onclick={() => {
                this.activeTab = 'characters';
                m.redraw();
              }}
            >
              Персонажи
            </button>

            <button
              className={'Button RolevayaFilterBtn' + (this.activeTab === 'activity' ? ' active' : '')}
              onclick={() => {
                this.activeTab = 'activity';
                m.redraw();
              }}
            >
              Ролевики
            </button>

            <button
              className={'Button RolevayaFilterBtn' + (this.activeTab === 'arena' ? ' active' : '')}
              onclick={() => {
                this.activeTab = 'arena';
                m.redraw();
              }}
            >
              Арена
            </button>

            <button
              className="Button RolevayaRefreshBtn"
              onclick={() => void this.recalcActiveTab()}
              disabled={updateDisabled}
              title="Пересчитать и обновить данные"
            >
              <i className={'fa-solid fa-arrows-rotate' + (updateDisabled ? ' is-spinning' : '')} aria-hidden="true" />
              <span>{this.activeUpdateLoading ? 'Пересчёт…' : 'Обновить'}</span>
            </button>
          </div>

          {this.activeTabComponent?.renderControls()}
        </div>

        <div className="RolevayaTabs-content">
          <div style={{ display: this.activeTab === 'characters' ? 'block' : 'none' }}>
            <CharactersTab oncreate={(vnode: any) => { this.charactersTab = vnode.state; }} />
          </div>

          <div style={{ display: this.activeTab === 'activity' ? 'block' : 'none' }}>
            <ActivityTab oncreate={(vnode: any) => { this.activityTab = vnode.state; }} />
          </div>

          <div style={{ display: this.activeTab === 'arena' ? 'block' : 'none' }}>
            <ArenaTab oncreate={(vnode: any) => { this.arenaTab = vnode.state; }} />
          </div>
        </div>
      </div>
    );
  }
}
