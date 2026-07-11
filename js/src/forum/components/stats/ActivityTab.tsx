import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Link from 'flarum/common/components/Link';
import CompletedEntriesModal from '../CompletedEntriesModal';
import {
  ActivityRow,
  apiUrl,
  avatarUrl,
  cacheBust,
  ensureUsersLoaded,
  invalidateHomeSliderCache,
  playerName,
  rankClass,
  userLink,
  userProfilePath,
} from './statsShared';

/**
 * "Ролевики" (activity) tab of the Зал Славы page. Split out of the old
 * monolithic StatsTabs.tsx so the activity leaderboard's data loading and
 * rendering can be understood without reading the characters/arena tabs
 * too.
 */
export default class ActivityTab extends Component {
  excludeCurators = false;
  sort: 'posts_count' | 'avg_chars' | 'completed_arcs_count' | 'completed_episodes_count' = 'posts_count';
  minPosts = 0;
  limit = 50;

  loading = false;
  recalcLoading = false;
  error: string | null = null;
  rows: ActivityRow[] = [];

  oninit(vnode: any) {
    super.oninit(vnode);

    void this.load(true);
  }

  get isBusy() {
    return this.recalcLoading || this.loading;
  }

  private async load(force = false) {
    this.loading = true;
    this.error = null;
    m.redraw();

    try {
      const res = await app.request<any>({
        method: 'GET',
        url: apiUrl('/rolevaya/activity'),
        params: {
          sort: this.sort,
          min_posts: this.minPosts,
          limit: this.limit,
          exclude_curators: this.excludeCurators ? 1 : 0,
          _ts: force ? cacheBust() : undefined,
        },
      });

      this.rows = (res?.data || []) as ActivityRow[];
      void ensureUsersLoaded(this.rows.map((r) => r.user_id));
    } catch (e: any) {
      this.error = e?.message || 'Failed to load activity leaderboard';
      this.rows = [];
    } finally {
      this.loading = false;
      m.redraw();
    }
  }

  /**
   * Called by the parent's shared "Обновить" button when this tab is
   * active. Recalculates activity, completed arcs, and completed episodes
   * together since they're all shown on this tab.
   */
  async recalc() {
    this.recalcLoading = true;
    this.error = null;
    m.redraw();

    try {
      await Promise.all([
        app.request<any>({
          method: 'POST',
          url: apiUrl('/rolevaya/recalculate-activity'),
          body: {},
        }),
        app.request<any>({
          method: 'POST',
          url: apiUrl('/rolevaya/recalculate-arcs'),
          body: {},
        }),
        app.request<any>({
          method: 'POST',
          url: apiUrl('/rolevaya/recalculate-episodes'),
          body: {},
        }),
      ]);

      await this.load(true);
      invalidateHomeSliderCache();
    } catch (e: any) {
      this.error = e?.message || 'Failed to recalculate activity';
    } finally {
      this.recalcLoading = false;
      m.redraw();
    }
  }

  renderControls() {
    return (
      <div className="RolevayaToolbar-group RolevayaToolbar-group--filters">
        <label className="RolevayaSortPill">
          <span>Сортировка</span>
          <select
            className="FormControl"
            value={this.sort}
            onchange={(e: any) => {
              this.sort = e.target.value;
              void this.load(true);
            }}
          >
            <option value="posts_count">Посты</option>
            <option value="avg_chars">Средняя длина</option>
            <option value="completed_arcs_count">Завершённые арки</option>
            <option value="completed_episodes_count">Завершённые эпизоды</option>
          </select>
        </label>

        <button
          type="button"
          className={'Button RolevayaFilterBtn' + (this.excludeCurators ? ' active' : '')}
          onclick={() => {
            this.excludeCurators = !this.excludeCurators;
            void this.load(true);
          }}
        >
          Без Кураторов
        </button>
      </div>
    );
  }

  view() {
    // exclude_curators is sent to the server (see load), so this.rows
    // already reflects the filter.
    const displayedRows = this.rows;

    return (
      <div className="RolevayaTabPanel">
        {(this.loading || this.recalcLoading) && <p>Поиск ролевиков...</p>}

        {this.error && (
          <p className="helpText" style={{ opacity: 0.9 }}>
            {this.error}
          </p>
        )}

        {!this.loading && !this.recalcLoading && !this.error && displayedRows.length === 0 && (
          <p>Магический шар не нашёл совпадений</p>
        )}

        {!this.loading && !this.recalcLoading && !this.error && displayedRows.length > 0 && (
          <div className="RolevayaCards">
            {displayedRows.map((r, i) => {
              const avatar = avatarUrl({ avatar_url: r.avatar_url, user_id: r.user_id });
              const player = playerName({ nickname: r.nickname, username: r.username, user_id: r.user_id });
              const profilePath = userProfilePath(r.user_id, r.username);

              return (
                <div className="RolevayaCard" key={`a-${r.user_id}-${r.period_days}-${i}`}>
                  <div className="RolevayaCardHeader RolevayaCardHeader--stack RolevayaCardHeader--activity">
                    <div className="RolevayaHeaderRow RolevayaHeaderRow--top">
                      <div className={rankClass(i)}>{i + 1}</div>
                    </div>

                    <div className="RolevayaHeaderRow RolevayaHeaderRow--player">
                      <div className="RolevayaMeta">
                        {avatar ? (
                          <Link className="RolevayaAvatarLink" href={profilePath} title={player}>
                            <img className="RolevayaAvatar" src={avatar} alt={player} loading="lazy" />
                          </Link>
                        ) : (
                          <Link className="RolevayaAvatarLink" href={profilePath} title={player}>
                            <span className="RolevayaAvatar RolevayaAvatar--placeholder" aria-hidden="true" />
                          </Link>
                        )}

                        <div className="RolevayaPlayer" title={player}>
                          {userLink(r.user_id, player, r.username)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="RolevayaStatsGrid">
                    <div className="RolevayaStat RolevayaStat--primary">
                      <div className="RolevayaStatLabel">Количество постов</div>
                      <div className="RolevayaStatValue">{r.posts_count}</div>
                    </div>

                    <div className="RolevayaStat">
                      <div className="RolevayaStatLabel">Средняя длина</div>
                      <div className="RolevayaStatValue">{r.avg_chars}</div>
                    </div>

                    <div className="RolevayaStat">
                      <div className="RolevayaStatLabel">Всего символов</div>
                      <div className="RolevayaStatValue">{r.total_chars}</div>
                    </div>

                    <div className="RolevayaStat">
                      <div className="RolevayaStatLabel">Недель актива</div>
                      <div className="RolevayaStatValue">{r.active_weeks}</div>
                    </div>
                  </div>

                  <div className="RolevayaCardFooter">
                    <button
                      type="button"
                      className="Button RolevayaArcsBtn"
                      onclick={() => {
                        app.modal.show(CompletedEntriesModal, {
                          kind: 'arcs',
                          userId: r.user_id,
                          playerName: player,
                        });
                      }}
                    >
                      <i className="fa-solid fa-scroll" aria-hidden="true" /> Арки
                    </button>

                    <button
                      type="button"
                      className="Button RolevayaArcsBtn"
                      onclick={() => {
                        app.modal.show(CompletedEntriesModal, {
                          kind: 'episodes',
                          userId: r.user_id,
                          playerName: player,
                        });
                      }}
                    >
                      <i className="fa-solid fa-book-open" aria-hidden="true" /> Эпизоды
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
}
