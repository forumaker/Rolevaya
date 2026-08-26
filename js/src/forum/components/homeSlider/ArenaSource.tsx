import app from 'flarum/forum/app';
import type Mithril from 'mithril';
import { apiUrl, ensureUsersLoaded, forumBaseUrl, formatNumber } from '../stats/statsShared';
import { CarouselController } from './CarouselController';
import { RowIdentity, SliderCache, rowsEqual } from './sliderCache';

export type ArenaRow = RowIdentity & {
  wins: number;
  losses: number;
  draws: number;
  win_rate: number;
  rating: number;
};

function statsEqual(a: ArenaRow, b: ArenaRow) {
  return a.wins === b.wins && a.losses === b.losses && a.draws === b.draws && a.rating === b.rating;
}

const softRefreshMs = 60 * 1000;

/**
 * Данные и карусель вкладки «Арена» на главной — см. класс-докблок
 * RoleplaySource для объяснения, почему это не компонент Mithril.
 *
 * В отличие от Ролевой, загружается лениво: `active` выставляет владелец
 * (HomepageActivitySlider) при каждом переключении вкладки, а `activate()`
 * запускает первую загрузку только один раз, когда вкладка Арена впервые
 * становится активной — незачем дёргать лидерборд боёв, если посетитель
 * его вообще не открывал.
 */
export class ArenaSource {
  loading = false;
  error: string | null = null;
  rows: ArenaRow[] = [];
  active = false;

  carousel = new CarouselController();

  private cache = new SliderCache<ArenaRow>('forumaker-rolevaya-home-slider-arena-v2');
  private activated = false;
  private focusListenerEnabled = false;

  init() {
    this.carousel.updateVisibleCount();

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.handleResize);
    }
  }

  dispose() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.handleResize);
      window.removeEventListener('focus', this.handleFocus);
    }
  }

  activate() {
    if (this.activated) return;
    this.activated = true;

    if (!this.focusListenerEnabled && typeof window !== 'undefined') {
      this.focusListenerEnabled = true;
      window.addEventListener('focus', this.handleFocus);
    }

    void this.load();
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
    if (!this.active) return;

    const ts = this.cache.ts || this.cache.readCache()?.ts || 0;
    if (ts && Date.now() - ts >= softRefreshMs) {
      void this.fetchFresh(false);
    }
  };

  handleTouchEnd = () => {
    const direction = this.carousel.resolveTouchEnd();
    if (!direction) return;

    if (direction === 'next') this.carousel.next(this.rows.length);
    else this.carousel.prev(this.rows.length);

    m.redraw();
  };

  private async requestRows(): Promise<ArenaRow[]> {
    if (this.cache.inflight) {
      return this.cache.inflight;
    }

    this.cache.inflight = app
      .request<any>({
        method: 'GET',
        url: apiUrl('/rolevaya/arena-leaderboard'),
        params: {
          sort: 'rating',
          limit: 10,
        },
      })
      .then((res: any) => (res?.data || []) as ArenaRow[])
      .finally(() => {
        this.cache.inflight = null;
      });

    return this.cache.inflight;
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

      this.cache.rows = freshRows.slice();
      this.cache.ts = Date.now();
      this.cache.loadedOnce = true;

      this.cache.writeCache(freshRows);
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

    if (this.cache.rows.length) {
      this.rows = this.cache.rows.slice();
      this.carousel.clamp(this.rows.length);
      this.loading = false;
      m.redraw();

      await ensureUsersLoaded(this.rows.map((r) => r.user_id));
      m.redraw();

      if (now - this.cache.ts >= softRefreshMs) {
        void this.fetchFresh(false);
      }

      return;
    }

    const cached = this.cache.readCache();

    if (cached && cached.rows.length) {
      this.rows = cached.rows.slice();
      this.carousel.clamp(this.rows.length);
      this.loading = false;

      this.cache.rows = cached.rows.slice();
      this.cache.ts = cached.ts;
      this.cache.loadedOnce = true;

      m.redraw();
      await ensureUsersLoaded(this.rows.map((r) => r.user_id));
      m.redraw();

      if (now - cached.ts >= softRefreshMs) {
        void this.fetchFresh(false);
      }

      return;
    }

    this.cache.clearCache();
    await this.fetchFresh(true);
  }

  private arenaTagUrl() {
    const slug = (app.forum.attribute('forumaker-rolevaya.arenaTagSlug') as string | undefined) || 'arena';
    return `${forumBaseUrl()}/t/${slug}`;
  }

  renderStats(row: ArenaRow): Mithril.Children {
    return (
      <div className="RolevayaHomeCard-stats">
        <div className="RolevayaHomeCard-stat">
          <span className="RolevayaHomeCard-statLabel">Победы</span>
          <strong className="RolevayaHomeCard-statValue">{formatNumber(row.wins)}</strong>
        </div>

        <div className="RolevayaHomeCard-stat">
          <span className="RolevayaHomeCard-statLabel">Поражения</span>
          <strong className="RolevayaHomeCard-statValue">{formatNumber(row.losses)}</strong>
        </div>

        <div className="RolevayaHomeCard-stat">
          <span className="RolevayaHomeCard-statLabel">Ничьи</span>
          <strong className="RolevayaHomeCard-statValue">{formatNumber(row.draws)}</strong>
        </div>

        <div className="RolevayaHomeCard-stat">
          <span className="RolevayaHomeCard-statLabel">Рейтинг</span>
          <strong className="RolevayaHomeCard-statValue">{row.rating}</strong>
        </div>
      </div>
    );
  }

  renderActions(className: string): Mithril.Children {
    const howToPlayUrl = (app.forum.attribute('arenaHowToPlayUrl') as string | undefined) || '';

    return [
      <a className={className} href={this.arenaTagUrl()}>
        <i className="fas fa-swords RolevayaHomeWidget-hallLinkIcon" aria-hidden="true" />
        На Арену
      </a>,
      howToPlayUrl ? (
        <a className={className} href={howToPlayUrl}>
          <i className="fas fa-question-circle RolevayaHomeWidget-hallLinkIcon" aria-hidden="true" />
          {app.translator.trans('forumaker-arena.forum.how_to_play.btn')}
        </a>
      ) : null,
    ];
  }
}
