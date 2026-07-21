import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Link from 'flarum/common/components/Link';
import User from 'flarum/common/models/User';
import Avatar from 'flarum/common/components/Avatar';
import { apiUrl, avatarUrl, ensureUsersLoaded, forumBaseUrl, formatNumber, playerName, userProfilePath } from '../stats/statsShared';
import { CarouselController } from './CarouselController';
import { RowIdentity, SliderCache, rowsEqual } from './sliderCache';

export type ActivityRow = RowIdentity & {
  posts_count: number;
  total_chars: number;
  avg_chars: number;
  active_weeks: number;
};

function statsEqual(a: ActivityRow, b: ActivityRow) {
  return (
    a.posts_count === b.posts_count &&
    a.total_chars === b.total_chars &&
    a.avg_chars === b.avg_chars &&
    a.active_weeks === b.active_weeks
  );
}

const softRefreshMs = 60 * 1000;

const cache = new SliderCache<ActivityRow>('forumaker-rolevaya-home-slider-v3');

interface Attrs {
  active: boolean;
}

export default class RoleplaySlider extends Component<Attrs> {
  loading = true;
  error: string | null = null;
  rows: ActivityRow[] = [];

  carousel = new CarouselController();

  oninit(vnode: any) {
    super.oninit(vnode);

    this.carousel.updateVisibleCount();
    this.bootstrapFromMemoryOrCache();
    void this.load();

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.handleResize);
      window.addEventListener('focus', this.handleFocus);
      window.addEventListener('rolevaya:invalidate-home-slider-cache', this.handleInvalidate as EventListener);
    }
  }

  onremove() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.handleResize);
      window.removeEventListener('focus', this.handleFocus);
      window.removeEventListener('rolevaya:invalidate-home-slider-cache', this.handleInvalidate as EventListener);
    }
  }

  private bootstrapFromMemoryOrCache() {
    if (cache.rows.length) {
      this.rows = cache.rows.slice();
      this.loading = false;
      this.carousel.clamp(this.rows.length);
      return;
    }

    const cached = cache.readCache();
    if (cached?.rows?.length) {
      this.rows = cached.rows.slice();
      this.loading = false;
      this.carousel.clamp(this.rows.length);

      cache.rows = cached.rows.slice();
      cache.ts = cached.ts;
      cache.loadedOnce = true;
    }
  }

  private handleResize = () => {
    const prevVisible = this.carousel.visibleCount;
    this.carousel.updateVisibleCount();

    if (prevVisible !== this.carousel.visibleCount) {
      this.carousel.clamp(this.rows.length);
      m.redraw();
    }
  };

  private handleFocus = () => {
    const ts = cache.ts || cache.readCache()?.ts || 0;
    if (ts && Date.now() - ts >= softRefreshMs) {
      void this.fetchFresh(false);
    }
  };

  private handleInvalidate = () => {
    cache.invalidate();
    void this.fetchFresh(this.rows.length === 0);
  };

  private handleTouchEnd = () => {
    const direction = this.carousel.resolveTouchEnd();
    if (!direction) return;

    if (direction === 'next') this.carousel.next(this.rows.length);
    else this.carousel.prev(this.rows.length);

    m.redraw();
  };

  private async requestRows(): Promise<ActivityRow[]> {
    if (cache.inflight) {
      return cache.inflight;
    }

    cache.inflight = app
      .request<any>({
        method: 'GET',
        url: apiUrl('/rolevaya/activity'),
        params: {
          sort: 'posts_count',
          limit: 10,
        },
      })
      .then((res) => (res?.data || []) as ActivityRow[])
      .finally(() => {
        cache.inflight = null;
      });

    return cache.inflight;
  }

  private async fetchFresh(showLoader: boolean) {
    if (showLoader && !this.rows.length) {
      this.loading = true;
      this.error = null;
      m.redraw();
    }

    try {
      const freshRows = await this.requestRows();

      if (!rowsEqual(this.rows, freshRows, statsEqual)) {
        this.rows = freshRows.slice();
        this.carousel.clamp(this.rows.length);
      }

      cache.rows = freshRows.slice();
      cache.ts = Date.now();
      cache.loadedOnce = true;

      cache.writeCache(freshRows);
      await ensureUsersLoaded(this.rows.map((r) => r.user_id));
      this.error = null;
    } catch (e: any) {
      if (!this.rows.length) {
        this.error = e?.message || 'Похоже, Гримуар опять что-то сломал';
        this.rows = [];
      }
    } finally {
      this.loading = false;
      m.redraw();
    }
  }

  private async load() {
    const now = Date.now();

    if (cache.rows.length) {
      this.rows = cache.rows.slice();
      this.carousel.clamp(this.rows.length);
      this.loading = false;
      m.redraw();

      await ensureUsersLoaded(this.rows.map((r) => r.user_id));
      m.redraw();

      if (now - cache.ts >= softRefreshMs) {
        void this.fetchFresh(false);
      }

      return;
    }

    const cached = cache.readCache();

    if (cached && cached.rows.length) {
      this.rows = cached.rows.slice();
      this.carousel.clamp(this.rows.length);
      this.loading = false;

      cache.rows = cached.rows.slice();
      cache.ts = cached.ts;
      cache.loadedOnce = true;

      m.redraw();
      await ensureUsersLoaded(this.rows.map((r) => r.user_id));
      m.redraw();

      if (now - cached.ts >= softRefreshMs) {
        void this.fetchFresh(false);
      }

      return;
    }

    cache.clearCache();
    await this.fetchFresh(true);
  }

  private hallOfFameUrl() {
    return `${forumBaseUrl()}/top`;
  }

  private charactersTagUrl() {
    const slug = (app.forum.attribute('forumaker-rolevaya.tagCharacters') as string | undefined) || 'characters';
    return `${forumBaseUrl()}/t/${slug}`;
  }

  private renderStats(row: ActivityRow) {
    return (
      <div className="RolevayaHomeCard-stats">
        <div className="RolevayaHomeCard-stat">
          <span className="RolevayaHomeCard-statLabel">Постов</span>
          <strong className="RolevayaHomeCard-statValue">{formatNumber(row.posts_count)}</strong>
        </div>

        <div className="RolevayaHomeCard-stat">
          <span className="RolevayaHomeCard-statLabel">Средняя длина</span>
          <strong className="RolevayaHomeCard-statValue">{formatNumber(row.avg_chars)}</strong>
        </div>

        <div className="RolevayaHomeCard-stat">
          <span className="RolevayaHomeCard-statLabel">Символов</span>
          <strong className="RolevayaHomeCard-statValue">{formatNumber(row.total_chars)}</strong>
        </div>

        <div className="RolevayaHomeCard-stat">
          <span className="RolevayaHomeCard-statLabel">Недель актива</span>
          <strong className="RolevayaHomeCard-statValue">{formatNumber(row.active_weeks)}</strong>
        </div>
      </div>
    );
  }

  view() {
    const rows = this.rows;
    const { loading, error } = this;
    const currentIndex = this.carousel.index;
    const visibleCount = this.carousel.visibleCount;

    const trackWidth = rows.length ? (rows.length * 100) / visibleCount : 100;
    const slideWidth = rows.length ? 100 / rows.length : 100;
    const translate = rows.length ? currentIndex * (100 / rows.length) : 0;
    const showNav = !loading && !error && rows.length > visibleCount;

    return (
      <>
        {loading && !rows.length ? <p className="RolevayaHomeWidget-state">Творим магию...</p> : null}
        {error && !rows.length ? <p className="RolevayaHomeWidget-state">{error}</p> : null}

        {!loading && !error && rows.length > 0 ? (
          <>
            <div className="RolevayaHomeWidget-stage">
              {showNav ? (
                <button
                  className="Button Button--secondary RolevayaHomeWidget-arrow RolevayaHomeWidget-arrow--desktop RolevayaHomeWidget-arrow--prev"
                  type="button"
                  onclick={() => {
                    this.carousel.prev(rows.length);
                    m.redraw();
                  }}
                  aria-label="Показать предыдущую карточку"
                >
                  <i className="fa-solid fa-chevron-left" aria-hidden="true" />
                </button>
              ) : null}

              <div
                className="RolevayaHomeWidget-viewport"
                ontouchstart={(e: TouchEvent) => this.carousel.handleTouchStart(e)}
                ontouchmove={(e: TouchEvent) => this.carousel.handleTouchMove(e)}
                ontouchend={() => this.handleTouchEnd()}
                ontouchcancel={() => this.handleTouchEnd()}
              >
                <div
                  className="RolevayaHomeWidget-track"
                  style={{
                    width: `${trackWidth}%`,
                    transform: `translateX(-${translate}%)`,
                  }}
                >
                  {rows.map((row, index) => {
                    const player = playerName(row);
                    const profile = userProfilePath(row.user_id, row.username);
                    const userModel = app.store.getById('users', String(row.user_id)) as User | null;
                    const fallbackAvatar = userModel ? null : avatarUrl(row);

                    return (
                      <div
                        className="RolevayaHomeWidget-slide"
                        key={`rolevaya-home-rp-${row.user_id}-${index}`}
                        style={{ width: `${slideWidth}%` }}
                      >
                        <article className="RolevayaHomeCard">
                          <div className="RolevayaHomeCard-top">
                            <div className="RolevayaHomeCard-rank">{index + 1}</div>

                            <div className="RolevayaHomeCard-user">
                              <Link href={profile} className="RolevayaHomeCard-avatarLink" title={player}>
                                {userModel ? (
                                  <Avatar user={userModel} className="RolevayaHomeCard-avatar" />
                                ) : fallbackAvatar ? (
                                  <img className="RolevayaHomeCard-avatar" src={fallbackAvatar} alt={player} loading="lazy" />
                                ) : (
                                  <span className="RolevayaHomeCard-avatar RolevayaHomeCard-avatar--placeholder" aria-hidden="true" />
                                )}
                              </Link>

                              <div className="RolevayaHomeCard-userMeta">
                                <div className="RolevayaHomeCard-name">
                                  <Link href={profile}>{player}</Link>
                                </div>
                              </div>
                            </div>
                          </div>

                          {this.renderStats(row)}
                        </article>
                      </div>
                    );
                  })}
                </div>
              </div>

              {showNav ? (
                <button
                  className="Button Button--secondary RolevayaHomeWidget-arrow RolevayaHomeWidget-arrow--desktop RolevayaHomeWidget-arrow--next"
                  type="button"
                  onclick={() => {
                    this.carousel.next(rows.length);
                    m.redraw();
                  }}
                  aria-label="Показать следующую карточку"
                >
                  <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                </button>
              ) : null}

              {showNav ? (
                <div className="RolevayaHomeWidget-arrowWrap">
                  <button
                    className="Button Button--secondary RolevayaHomeWidget-arrow RolevayaHomeWidget-arrow--mobile"
                    type="button"
                    onclick={() => {
                      this.carousel.prev(rows.length);
                      m.redraw();
                    }}
                    aria-label="Показать предыдущую карточку"
                  >
                    <i className="fa-solid fa-chevron-left" aria-hidden="true" />
                  </button>

                  <button
                    className="Button Button--secondary RolevayaHomeWidget-arrow RolevayaHomeWidget-arrow--mobile"
                    type="button"
                    onclick={() => {
                      this.carousel.next(rows.length);
                      m.redraw();
                    }}
                    aria-label="Показать следующую карточку"
                  >
                    <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                  </button>
                </div>
              ) : null}
            </div>

            <div className="RolevayaHomeWidget-actions RolevayaHomeWidget-actions--desktop">
              <a className="RolevayaHomeWidget-hallLink RolevayaHomeWidget-hallLink--desktop" href={this.hallOfFameUrl()}>
                <i className="fas fa-building-columns RolevayaHomeWidget-hallLinkIcon" aria-hidden="true" />
                В Зал Славы
              </a>
              <a className="RolevayaHomeWidget-hallLink RolevayaHomeWidget-hallLink--desktop" href={this.charactersTagUrl()}>
                <i className="fas fa-person-fairy RolevayaHomeWidget-hallLinkIcon" aria-hidden="true" />
                Посмотреть анкеты
              </a>
            </div>

            <div className="RolevayaHomeWidget-actions RolevayaHomeWidget-actions--mobile">
              <a className="RolevayaHomeWidget-hallLink RolevayaHomeWidget-hallLink--mobile" href={this.hallOfFameUrl()}>
                <i className="fas fa-building-columns RolevayaHomeWidget-hallLinkIcon" aria-hidden="true" />
                В Зал Славы
              </a>
              <a className="RolevayaHomeWidget-hallLink RolevayaHomeWidget-hallLink--mobile" href={this.charactersTagUrl()}>
                <i className="fas fa-person-fairy RolevayaHomeWidget-hallLinkIcon" aria-hidden="true" />
                Посмотреть анкеты
              </a>
            </div>
          </>
        ) : null}
      </>
    );
  }
}
