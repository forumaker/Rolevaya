import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import CharactersTab from './stats/CharactersTab';
import ActivityTab from './stats/ActivityTab';
import ArenaTab from './stats/ArenaTab';

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

            {app.forum.attribute('canRecalculateRolevaya') && (
              <button
                className="Button RolevayaRefreshBtn"
                onclick={() => void this.recalcActiveTab()}
                disabled={updateDisabled}
                title="Пересчитать и обновить данные"
              >
                <i className={'fa-solid fa-arrows-rotate' + (updateDisabled ? ' is-spinning' : '')} aria-hidden="true" />
                <span>{this.activeUpdateLoading ? 'Пересчёт…' : 'Обновить'}</span>
              </button>
            )}
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
