import app from 'flarum/forum/app';
import type Mithril from 'mithril';
import { apiUrl, ensureUsersLoaded, forumBaseUrl, formatNumber } from '../stats/statsShared';
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

/**
 * Данные и карусель вкладки «Ролевая» на главной. Не компонент Mithril —
 * рендерит их общий HomepageActivitySlider.renderTabPanel(), один и тот же
 * набор DOM-узлов что для «Ролевой», что для «Арены» (см. его же
 * комментарий: раньше каждая вкладка была отдельным компонентом, скрываемым
 * через display:none/block, и при переключении это давало на мгновение
 * полностью пропадающий/появляющийся виджет — что вместе с SVG-картинками
 * виджета Fresh над ним читалось как мерцание на всю страницу). Теперь при
 * переключении вкладки меняются только данные внутри тех же узлов.
 */
export class RoleplaySource {
  loading = true;
  error: string | null = null;
  rows: ActivityRow[] = [];

  carousel = new CarouselController();

  private cache = new SliderCache<ActivityRow>('forumaker-rolevaya-home-slider-v3');

  init() {
    this.carousel.updateVisibleCount();
    this.bootstrapFromMemoryOrCache();
    void this.load();

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.handleResize);
      window.addEventListener('focus', this.handleFocus);
      window.addEventListener('rolevaya:invalidate-home-slider-cache', this.handleInvalidate as EventListener);
    }
  }

  dispose() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.handleResize);
      window.removeEventListener('focus', this.handleFocus);
      window.removeEventListener('rolevaya:invalidate-home-slider-cache', this.handleInvalidate as EventListener);
    }
  }

  private bootstrapFromMemoryOrCache() {
    if (this.cache.rows.length) {
      this.rows = this.cache.rows.slice();
      this.loading = false;
      this.carousel.clamp(this.rows.length);
      return;
    }

    const cached = this.cache.readCache();
    if (cached?.rows?.length) {
      this.rows = cached.rows.slice();
      this.loading = false;
      this.carousel.clamp(this.rows.length);

      this.cache.rows = cached.rows.slice();
      this.cache.ts = cached.ts;
      this.cache.loadedOnce = true;
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
    const ts = this.cache.ts || this.cache.readCache()?.ts || 0;
    if (ts && Date.now() - ts >= softRefreshMs) {
      void this.fetchFresh(false);
    }
  };

  private handleInvalidate = () => {
    this.cache.invalidate();
    void this.fetchFresh(this.rows.length === 0);
  };

  handleTouchEnd = () => {
    const direction = this.carousel.resolveTouchEnd();
    if (!direction) return;

    if (direction === 'next') this.carousel.next(this.rows.length);
    else this.carousel.prev(this.rows.length);

    m.redraw();
  };

  private async requestRows(): Promise<ActivityRow[]> {
    if (this.cache.inflight) {
      return this.cache.inflight;
    }

    this.cache.inflight = app
      .request<any>({
        method: 'GET',
        url: apiUrl('/rolevaya/activity'),
        params: {
          sort: 'posts_count',
          limit: 10,
        },
      })
      .then((res: any) => (res?.data || []) as ActivityRow[])
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

  private hallOfFameUrl() {
    return `${forumBaseUrl()}/top`;
  }

  private charactersTagUrl() {
    const slug = (app.forum.attribute('forumaker-rolevaya.tagCharacters') as string | undefined) || 'characters';
    return `${forumBaseUrl()}/t/${slug}`;
  }

  renderStats(row: ActivityRow): Mithril.Children {
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

  renderActions(className: string): Mithril.Children {
    return [
      <a className={className} href={this.hallOfFameUrl()}>
        <i className="fas fa-building-columns RolevayaHomeWidget-hallLinkIcon" aria-hidden="true" />
        В Зал Славы
      </a>,
      <a className={className} href={this.charactersTagUrl()}>
        <i className="fas fa-person-fairy RolevayaHomeWidget-hallLinkIcon" aria-hidden="true" />
        Посмотреть анкеты
      </a>,
    ];
  }
}
