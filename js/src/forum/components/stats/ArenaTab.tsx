import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Link from 'flarum/common/components/Link';
import {
  ArenaRow,
  apiUrl,
  avatarUrl,
  cacheBust,
  ensureUsersLoaded,
  playerName,
  rankClass,
  userLink,
  userProfilePath,
} from './statsShared';

export default class ArenaTab extends Component {
  sort: 'rating' | 'wins' | 'winrate' | 'losses' | 'draws' = 'rating';

  limit = 24;
  private readonly pageSize = 24;
  private readonly maxLimit = 200;

  loading = false;
  error: string | null = null;
  rows: ArenaRow[] = [];

  oninit(vnode: any) {
    super.oninit(vnode);

    void this.load(true);
  }

  get isBusy() {
    return this.loading;
  }

  private async load(force = false) {
    this.loading = true;
    this.error = null;
    m.redraw();

    try {
      const res = await app.request<any>({
        method: 'GET',
        url: apiUrl('/rolevaya/arena-leaderboard'),
        params: {
          sort: this.sort,
          limit: this.limit,
          _ts: force ? cacheBust() : undefined,
        },
      });

      this.rows = (res?.data || []) as ArenaRow[];
      void ensureUsersLoaded(this.rows.map((r) => r.user_id));
    } catch (e: any) {
      this.error = e?.message || 'Failed to load arena leaderboard';
      this.rows = [];
    } finally {
      this.loading = false;
      m.redraw();
    }
  }

  async recalc() {
    await this.load(true);
  }

  get canLoadMore() {
    return !this.loading && this.rows.length >= this.limit && this.limit < this.maxLimit;
  }

  async loadMore() {
    if (!this.canLoadMore) return;

    this.limit = Math.min(this.maxLimit, this.limit + this.pageSize);
    await this.load(true);
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
            <option value="rating">Рейтинг</option>
            <option value="wins">Победы</option>
            <option value="winrate">Винрейт</option>
            <option value="losses">Поражения</option>
            <option value="draws">Ничьи</option>
          </select>
        </label>
      </div>
    );
  }

  view() {
    const displayedRows = this.rows;

    return (
      <div className="RolevayaTabPanel">
        {this.loading && <p>Поиск бойцов...</p>}

        {this.error && (
          <p className="helpText" style={{ opacity: 0.9 }}>
            {this.error}
          </p>
        )}

        {!this.loading && !this.error && displayedRows.length === 0 && (
          <p>Магический шар не нашёл совпадений</p>
        )}

        {!this.loading && !this.error && displayedRows.length > 0 && (
          <div className="RolevayaCards">
            {displayedRows.map((r, i) => {
              const avatar = avatarUrl({ avatar_url: r.avatar_url, user_id: r.user_id });
              const player = playerName({ nickname: r.nickname, username: r.username, user_id: r.user_id });
              const profilePath = userProfilePath(r.user_id, r.username);

              return (
                <div className="RolevayaCard" key={`ar-${r.user_id}-${i}`}>
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
                    <div className="RolevayaStat">
                      <div className="RolevayaStatLabel">Победы</div>
                      <div className="RolevayaStatValue">{r.wins}</div>
                    </div>

                    <div className="RolevayaStat">
                      <div className="RolevayaStatLabel">Поражения</div>
                      <div className="RolevayaStatValue">{r.losses}</div>
                    </div>

                    <div className="RolevayaStat">
                      <div className="RolevayaStatLabel">Ничьи</div>
                      <div className="RolevayaStatValue">{r.draws}</div>
                    </div>

                    <div className="RolevayaStat">
                      <div className="RolevayaStatLabel">Винрейт</div>
                      <div className="RolevayaStatValue">{r.win_rate}%</div>
                    </div>

                    <div className="RolevayaStat RolevayaStat--primary RolevayaStat--wideFull">
                      <div className="RolevayaStatLabel">Рейтинг</div>
                      <div className="RolevayaStatValue">{r.rating}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {this.canLoadMore && (
          <div className="RolevayaLoadMore">
            <button type="button" className="Button" onclick={() => this.loadMore()}>
              Показать ещё
            </button>
          </div>
        )}
      </div>
    );
  }
}
