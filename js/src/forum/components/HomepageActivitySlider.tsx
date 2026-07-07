import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Link from 'flarum/common/components/Link';
import User from 'flarum/common/models/User';
// The real Flarum core `Avatar` component (a class, not the standalone
// `flarum/common/helpers/avatar` function — that one isn't registered in
// this forum's build and crashes on import). Rendering through this
// component is also the exact hook Point System's avatar-frame feature
// patches (`extend(Avatar.prototype, 'view', ...)` in its forum/index.tsx),
// so using it here is what makes decorations show up in this widget too.
import Avatar from 'flarum/common/components/Avatar';
import { apiUrl, avatarUrl, ensureUsersLoaded, forumBaseUrl, userProfilePath } from './stats/statsShared';

type RowIdentity = {
  user_id: number;
  username?: string | null;
  nickname?: string | null;
  avatar_url?: string | null;
};

type ActivityRow = RowIdentity & {
  posts_count: number;
  total_chars: number;
  avg_chars: number;
  active_weeks: number;
};

type ArenaRow = RowIdentity & {
  wins: number;
  losses: number;
  draws: number;
  win_rate: number;
};

type HomeTab = 'roleplay' | 'arena';

type CachePayload<T> = {
  ts: number;
  rows: T[];
};

type SharedState<T> = {
  rows: T[];
  ts: number;
  loadedOnce: boolean;
  inflight: Promise<T[]> | null;
};

const sharedState: SharedState<ActivityRow> = {
  rows: [],
  ts: 0,
  loadedOnce: false,
  inflight: null,
};

const arenaSharedState: SharedState<ArenaRow> = {
  rows: [],
  ts: 0,
  loadedOnce: false,
  inflight: null,
};

export default class HomepageActivitySlider extends Component {
  activeTab: HomeTab = 'roleplay';

  loading = true;
  error: string | null = null;
  rows: ActivityRow[] = [];
  currentIndex = 0;

  arenaLoading = false;
  arenaError: string | null = null;
  arenaRows: ArenaRow[] = [];
  arenaCurrentIndex = 0;

  visibleCount = 3;

  private readonly cacheKey = 'forumaker-rolevaya-home-slider-v3';
  private readonly arenaCacheKey = 'forumaker-rolevaya-home-slider-arena-v1';
  private readonly cacheTtlMs = 5 * 60 * 1000;
  private readonly softRefreshMs = 60 * 1000;

  private touchStartX: number | null = null;
  private touchCurrentX: number | null = null;
  private readonly swipeThreshold = 40;

  oninit(vnode: any) {
    super.oninit(vnode);

    this.updateVisibleCount();
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

  private switchTab(tab: HomeTab) {
    if (this.activeTab === tab) return;

    this.activeTab = tab;

    if (tab === 'arena') {
      void this.loadArena();
    }

    m.redraw();
  }

  private bootstrapFromMemoryOrCache() {
    if (sharedState.rows.length) {
      this.rows = sharedState.rows.slice();
      this.loading = false;
      this.clampIndexFor('roleplay');
      return;
    }

    const cached = this.readCache(this.cacheKey);
    if (cached?.rows?.length) {
      this.rows = cached.rows.slice();
      this.loading = false;
      this.clampIndexFor('roleplay');

      sharedState.rows = cached.rows.slice();
      sharedState.ts = cached.ts;
      sharedState.loadedOnce = true;
    }
  }

  private handleResize = () => {
    const prev = this.visibleCount;
    this.updateVisibleCount();

    if (prev !== this.visibleCount) {
      this.clampIndex();
      m.redraw();
    }
  };

  private handleFocus = () => {
    const ts = sharedState.ts || this.readCache(this.cacheKey)?.ts || 0;
    if (ts && Date.now() - ts >= this.softRefreshMs) {
      void this.fetchFresh(false);
    }

    const arenaTs = arenaSharedState.ts || this.readCache<ArenaRow>(this.arenaCacheKey)?.ts || 0;
    if (this.activeTab === 'arena' && arenaTs && Date.now() - arenaTs >= this.softRefreshMs) {
      void this.fetchArenaFresh(false);
    }
  };

  private handleInvalidate = () => {
    this.clearCache(this.cacheKey);
    sharedState.rows = [];
    sharedState.ts = 0;
    sharedState.loadedOnce = false;
    sharedState.inflight = null;
    void this.fetchFresh(this.rows.length === 0);
  };

  private handleTouchStart = (event: TouchEvent) => {
    if (!event.touches || !event.touches.length) return;

    this.touchStartX = event.touches[0].clientX;
    this.touchCurrentX = this.touchStartX;
  };

  private handleTouchMove = (event: TouchEvent) => {
    if (!event.touches || !event.touches.length) return;
    this.touchCurrentX = event.touches[0].clientX;
  };

  private handleTouchEnd = () => {
    if (this.touchStartX === null || this.touchCurrentX === null) {
      this.touchStartX = null;
      this.touchCurrentX = null;
      return;
    }

    const deltaX = this.touchCurrentX - this.touchStartX;

    if (Math.abs(deltaX) >= this.swipeThreshold) {
      if (deltaX < 0) {
        this.next();
      } else {
        this.prev();
      }

      m.redraw();
    }

    this.touchStartX = null;
    this.touchCurrentX = null;
  };

  private updateVisibleCount() {
    if (typeof window === 'undefined') {
      this.visibleCount = 3;
      return;
    }

    this.visibleCount = window.innerWidth <= 768 ? 1 : 3;
  }

  /** Clamps a specific tab's carousel index against its own row count — used
   *  by data-loading flows so a background refresh of one tab never stomps on
   *  the index of whichever tab the visitor currently has open. */
  private clampIndexFor(tab: HomeTab) {
    if (tab === 'arena') {
      const max = Math.max(0, this.arenaRows.length - this.visibleCount);
      if (!this.arenaRows.length) { this.arenaCurrentIndex = 0; return; }
      if (this.arenaCurrentIndex > max) this.arenaCurrentIndex = 0;
      if (this.arenaCurrentIndex < 0) this.arenaCurrentIndex = 0;
      return;
    }

    if (!this.rows.length) { this.currentIndex = 0; return; }
    const max = Math.max(0, this.rows.length - this.visibleCount);
    if (this.currentIndex > max) this.currentIndex = 0;
    if (this.currentIndex < 0) this.currentIndex = 0;
  }

  /** Clamps whichever tab is currently visible — used by UI-driven handlers
   *  (resize, swipe, arrow clicks) where "the carousel on screen" is what's
   *  meant. */
  private clampIndex() {
    this.clampIndexFor(this.activeTab);
  }

  private playerName(row: RowIdentity) {
    return row.nickname || row.username || `#${row.user_id}`;
  }

  private formatNumber(value: number) {
    return new Intl.NumberFormat('ru-RU').format(Number(value) || 0);
  }

  private readCache<T = ActivityRow>(key: string): CachePayload<T> | null {
    if (typeof window === 'undefined') return null;

    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;

    try {
      const cached = JSON.parse(raw) as CachePayload<T>;

      if (!cached || !Array.isArray(cached.rows) || typeof cached.ts !== 'number') {
        return null;
      }

      return cached;
    } catch {
      return null;
    }
  }

  private writeCache<T>(key: string, rows: T[]) {
    if (typeof window === 'undefined') return;

    try {
      const payload: CachePayload<T> = {
        ts: Date.now(),
        rows,
      };

      window.sessionStorage.setItem(key, JSON.stringify(payload));
    } catch {}
  }

  private clearCache(key: string) {
    if (typeof window === 'undefined') return;

    try {
      window.sessionStorage.removeItem(key);
    } catch {}
  }

  private sameRows(a: ActivityRow[], b: ActivityRow[]) {
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; i++) {
      const left = a[i];
      const right = b[i];

      if (
        left.user_id !== right.user_id ||
        left.posts_count !== right.posts_count ||
        left.total_chars !== right.total_chars ||
        left.avg_chars !== right.avg_chars ||
        left.active_weeks !== right.active_weeks ||
        (left.nickname || '') !== (right.nickname || '') ||
        (left.username || '') !== (right.username || '') ||
        (left.avatar_url || '') !== (right.avatar_url || '')
      ) {
        return false;
      }
    }

    return true;
  }

  private sameArenaRows(a: ArenaRow[], b: ArenaRow[]) {
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; i++) {
      const left = a[i];
      const right = b[i];

      if (
        left.user_id !== right.user_id ||
        left.wins !== right.wins ||
        left.losses !== right.losses ||
        left.draws !== right.draws ||
        left.win_rate !== right.win_rate ||
        (left.nickname || '') !== (right.nickname || '') ||
        (left.username || '') !== (right.username || '') ||
        (left.avatar_url || '') !== (right.avatar_url || '')
      ) {
        return false;
      }
    }

    return true;
  }

  private async requestRows(): Promise<ActivityRow[]> {
    if (sharedState.inflight) {
      return sharedState.inflight;
    }

    sharedState.inflight = app
      .request<any>({
        method: 'GET',
        url: apiUrl('/rolevaya/activity'),
        params: {
          sort: 'posts_count',
          limit: 10,
        },
      })
      .then((res) => ((res?.data || []) as ActivityRow[]))
      .finally(() => {
        sharedState.inflight = null;
      });

    return sharedState.inflight;
  }

  private async requestArenaRows(): Promise<ArenaRow[]> {
    if (arenaSharedState.inflight) {
      return arenaSharedState.inflight;
    }

    arenaSharedState.inflight = app
      .request<any>({
        method: 'GET',
        url: apiUrl('/rolevaya/arena-leaderboard'),
        params: {
          sort: 'wins',
          limit: 10,
        },
      })
      .then((res) => ((res?.data || []) as ArenaRow[]))
      .finally(() => {
        arenaSharedState.inflight = null;
      });

    return arenaSharedState.inflight;
  }

  private async fetchFresh(showLoader: boolean) {
    if (showLoader && !this.rows.length) {
      this.loading = true;
      this.error = null;
      m.redraw();
    }

    try {
      const freshRows = await this.requestRows();

      if (!this.sameRows(this.rows, freshRows)) {
        this.rows = freshRows.slice();
        this.clampIndexFor('roleplay');
      }

      sharedState.rows = freshRows.slice();
      sharedState.ts = Date.now();
      sharedState.loadedOnce = true;

      this.writeCache(this.cacheKey, freshRows);
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

  private async fetchArenaFresh(showLoader: boolean) {
    if (showLoader && !this.arenaRows.length) {
      this.arenaLoading = true;
      this.arenaError = null;
      m.redraw();
    }

    try {
      const freshRows = await this.requestArenaRows();

      if (!this.sameArenaRows(this.arenaRows, freshRows)) {
        this.arenaRows = freshRows.slice();
        this.clampIndexFor('arena');
      }

      arenaSharedState.rows = freshRows.slice();
      arenaSharedState.ts = Date.now();
      arenaSharedState.loadedOnce = true;

      this.writeCache(this.arenaCacheKey, freshRows);
      await ensureUsersLoaded(this.arenaRows.map((r) => r.user_id));
      this.arenaError = null;
    } catch (e: any) {
      if (!this.arenaRows.length) {
        this.arenaError = e?.message || 'Похоже, Гримуар опять что-то сломал';
        this.arenaRows = [];
      }
    } finally {
      this.arenaLoading = false;
      m.redraw();
    }
  }

  private async load() {
    const now = Date.now();

    if (sharedState.rows.length) {
      this.rows = sharedState.rows.slice();
      this.clampIndexFor('roleplay');
      this.loading = false;
      m.redraw();

      // Row data can be "fresh" (< softRefreshMs old, from sessionStorage)
      // while the actual User models needed for Avatar rendering — and
      // therefore Point System's decoration frames — are completely absent:
      // app.store is a fresh, empty, in-memory map on every hard page
      // reload, independent of our own row cache. Without this call, a
      // reload landing in this fast path (the common case, since our own
      // earlier reload just wrote this cache) never fetched any User model
      // at all, so no frame could ever show up until something else (like
      // switching tabs) happened to trigger a real load elsewhere.
      // ensureUsersLoaded() already skips ids already present in the store,
      // so this is a no-op once everything is warm.
      await ensureUsersLoaded(this.rows.map((r) => r.user_id));
      m.redraw();

      if (now - sharedState.ts >= this.softRefreshMs) {
        void this.fetchFresh(false);
      }

      return;
    }

    const cached = this.readCache(this.cacheKey);

    if (cached && cached.rows.length) {
      this.rows = cached.rows.slice();
      this.clampIndexFor('roleplay');
      this.loading = false;

      sharedState.rows = cached.rows.slice();
      sharedState.ts = cached.ts;
      sharedState.loadedOnce = true;

      m.redraw();
      await ensureUsersLoaded(this.rows.map((r) => r.user_id));
      // Redraw again once the full User models (and therefore any avatar
      // decoration a plugin applies to them) have actually landed in the
      // store — the m.redraw() above only reflects the cached row data.
      m.redraw();

      if (now - cached.ts >= this.softRefreshMs) {
        void this.fetchFresh(false);
      }

      return;
    }

    this.clearCache(this.cacheKey);
    await this.fetchFresh(true);
  }

  /** Lazily loads the Арена leaderboard the first time the visitor switches
   *  to that tab — unlike the roleplay rows, it's not needed on every
   *  homepage view, so there's no point fetching it eagerly in oninit(). */
  private async loadArena() {
    const now = Date.now();

    if (arenaSharedState.rows.length) {
      this.arenaRows = arenaSharedState.rows.slice();
      this.clampIndexFor('arena');
      this.arenaLoading = false;
      m.redraw();

      // Same fix as load(): fresh row data doesn't mean the User models are
      // hydrated in a just-booted store. No-ops once everyone's loaded.
      await ensureUsersLoaded(this.arenaRows.map((r) => r.user_id));
      m.redraw();

      if (now - arenaSharedState.ts >= this.softRefreshMs) {
        void this.fetchArenaFresh(false);
      }

      return;
    }

    const cached = this.readCache<ArenaRow>(this.arenaCacheKey);

    if (cached && cached.rows.length) {
      this.arenaRows = cached.rows.slice();
      this.clampIndexFor('arena');
      this.arenaLoading = false;

      arenaSharedState.rows = cached.rows.slice();
      arenaSharedState.ts = cached.ts;
      arenaSharedState.loadedOnce = true;

      m.redraw();
      await ensureUsersLoaded(this.arenaRows.map((r) => r.user_id));
      m.redraw();

      if (now - cached.ts >= this.softRefreshMs) {
        void this.fetchArenaFresh(false);
      }

      return;
    }

    this.clearCache(this.arenaCacheKey);
    await this.fetchArenaFresh(true);
  }

  private prev() {
    const tab = this.activeTab;
    const rows: RowIdentity[] = tab === 'arena' ? this.arenaRows : this.rows;
    if (rows.length <= this.visibleCount) return;

    const max = Math.max(0, rows.length - this.visibleCount);

    if (tab === 'arena') {
      this.arenaCurrentIndex = this.arenaCurrentIndex <= 0 ? max : this.arenaCurrentIndex - 1;
    } else {
      this.currentIndex = this.currentIndex <= 0 ? max : this.currentIndex - 1;
    }
  }

  private next() {
    const tab = this.activeTab;
    const rows: RowIdentity[] = tab === 'arena' ? this.arenaRows : this.rows;
    if (rows.length <= this.visibleCount) return;

    const max = Math.max(0, rows.length - this.visibleCount);

    if (tab === 'arena') {
      this.arenaCurrentIndex = this.arenaCurrentIndex >= max ? 0 : this.arenaCurrentIndex + 1;
    } else {
      this.currentIndex = this.currentIndex >= max ? 0 : this.currentIndex + 1;
    }
  }

  /** This extension's own /top route (see extend.php), forum-relative so
   *  it keeps working regardless of domain — this used to be a hardcoded
   *  https://questpost.ru/top, which would have silently pointed every
   *  other install of this extension back at this forum. */
  private hallOfFameUrl() {
    return `${forumBaseUrl()}/top`;
  }

  /** Tag page URL built from the configurable characters tag slug (admin
   *  settings) rather than a hardcoded domain+slug. */
  private charactersTagUrl() {
    const slug = (app.forum.attribute('forumaker-rolevaya.tagCharacters') as string | undefined) || 'characters';
    return `${forumBaseUrl()}/t/${slug}`;
  }

  /** Tag page URL for Arena's tag, built from the configurable arena tag
   *  slug (admin settings) rather than a hardcoded domain+slug. Arena's tag
   *  slug isn't Rolevaya's to own, so this is its own setting defaulting to
   *  "arena" (the slug this forum actually uses). */
  private arenaTagUrl() {
    const slug = (app.forum.attribute('forumaker-rolevaya.arenaTagSlug') as string | undefined) || 'arena';
    return `${forumBaseUrl()}/t/${slug}`;
  }

  private renderHallOfFameLink(className: string) {
    return (
      <a className={className} href={this.hallOfFameUrl()}>
        <i className="fas fa-building-columns RolevayaHomeWidget-hallLinkIcon" aria-hidden="true" />
        В Зал Славы
      </a>
    );
  }

  /** Shown next to renderHallOfFameLink() on the Ролевая tab. */
  private renderCreateCharacterLink(className: string) {
    return (
      <a className={className} href={this.charactersTagUrl()}>
        <i className="fas fa-person-fairy RolevayaHomeWidget-hallLinkIcon" aria-hidden="true" />
        Посмотреть анкеты
      </a>
    );
  }

  /** Same slot as renderHallOfFameLink(), shown instead of it while the
   *  Арена tab is active. Opening Arena's ChallengeModal cross-extension
   *  (even via a lazy `import('ext:forumaker/arena/...')`) turned out
   *  unreliable in practice, so this just links straight to the Арена tag
   *  page — the real "Бросить вызов" button lives there, in Arena's own
   *  environment, with no cross-extension runtime involved. */
  private renderArenaTagLink(className: string) {
    return (
      <a className={className} href={this.arenaTagUrl()}>
        <i className="fas fa-swords RolevayaHomeWidget-hallLinkIcon" aria-hidden="true" />
        На Арену
      </a>
    );
  }

  /** "Как играть" — same optional link Arena itself shows next to its
   *  challenge button on the Арена tag page (see arenaButtons() in
   *  addArenaTab.tsx), reusing the same admin-configured settings so this
   *  button and that one always point to the same place. Renders nothing
   *  if the admin hasn't set a URL (same "leave it blank to hide" rule as
   *  the tag page). */
  private renderHowToPlayButton(className: string) {
    const howToPlayUrl = (app.forum.attribute('arenaHowToPlayUrl') as string | undefined) || '';
    if (!howToPlayUrl) return null;

    return (
      <a className={className} href={howToPlayUrl}>
        <i className="fas fa-question-circle RolevayaHomeWidget-hallLinkIcon" aria-hidden="true" />
        {app.translator.trans('forumaker-arena.forum.how_to_play.btn')}
      </a>
    );
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

  private renderRoleplayStats(row: ActivityRow) {
    return (
      <div className="RolevayaHomeCard-stats">
        <div className="RolevayaHomeCard-stat">
          <span className="RolevayaHomeCard-statLabel">Постов</span>
          <strong className="RolevayaHomeCard-statValue">{this.formatNumber(row.posts_count)}</strong>
        </div>

        <div className="RolevayaHomeCard-stat">
          <span className="RolevayaHomeCard-statLabel">Средняя длина</span>
          <strong className="RolevayaHomeCard-statValue">{this.formatNumber(row.avg_chars)}</strong>
        </div>

        <div className="RolevayaHomeCard-stat">
          <span className="RolevayaHomeCard-statLabel">Символов</span>
          <strong className="RolevayaHomeCard-statValue">{this.formatNumber(row.total_chars)}</strong>
        </div>

        <div className="RolevayaHomeCard-stat">
          <span className="RolevayaHomeCard-statLabel">Недель актива</span>
          <strong className="RolevayaHomeCard-statValue">{this.formatNumber(row.active_weeks)}</strong>
        </div>
      </div>
    );
  }

  private renderArenaStats(row: ArenaRow) {
    return (
      <div className="RolevayaHomeCard-stats">
        <div className="RolevayaHomeCard-stat">
          <span className="RolevayaHomeCard-statLabel">Победы</span>
          <strong className="RolevayaHomeCard-statValue">{this.formatNumber(row.wins)}</strong>
        </div>

        <div className="RolevayaHomeCard-stat">
          <span className="RolevayaHomeCard-statLabel">Поражения</span>
          <strong className="RolevayaHomeCard-statValue">{this.formatNumber(row.losses)}</strong>
        </div>

        <div className="RolevayaHomeCard-stat">
          <span className="RolevayaHomeCard-statLabel">Ничьи</span>
          <strong className="RolevayaHomeCard-statValue">{this.formatNumber(row.draws)}</strong>
        </div>

        <div className="RolevayaHomeCard-stat">
          <span className="RolevayaHomeCard-statLabel">Винрейт</span>
          <strong className="RolevayaHomeCard-statValue">{row.win_rate}%</strong>
        </div>
      </div>
    );
  }

  view() {
    const isArena = this.activeTab === 'arena';
    const rows: RowIdentity[] = isArena ? this.arenaRows : this.rows;
    const loading = isArena ? this.arenaLoading : this.loading;
    const error = isArena ? this.arenaError : this.error;
    const currentIndex = isArena ? this.arenaCurrentIndex : this.currentIndex;

    const trackWidth = rows.length ? (rows.length * 100) / this.visibleCount : 100;
    const slideWidth = rows.length ? 100 / rows.length : 100;
    const translate = rows.length ? currentIndex * (100 / rows.length) : 0;
    const showNav = !loading && !error && rows.length > this.visibleCount;

    return (
      <section className="RolevayaHomeWidget">
        <div className="RolevayaHomeWidget-box">
          {this.renderTabs()}

          {loading && !rows.length ? <p className="RolevayaHomeWidget-state">Творим магию...</p> : null}
          {error && !rows.length ? <p className="RolevayaHomeWidget-state">{error}</p> : null}

          {!loading && !error && rows.length > 0 ? (
            <>
              <div className="RolevayaHomeWidget-stage">
                {showNav ? (
                  <button
                    className="Button Button--secondary RolevayaHomeWidget-arrow RolevayaHomeWidget-arrow--desktop RolevayaHomeWidget-arrow--prev"
                    type="button"
                    onclick={() => this.prev()}
                    aria-label="Показать предыдущую карточку"
                  >
                    <i className="fa-solid fa-chevron-left" aria-hidden="true" />
                  </button>
                ) : null}

                <div
                  className="RolevayaHomeWidget-viewport"
                  ontouchstart={(e: TouchEvent) => this.handleTouchStart(e)}
                  ontouchmove={(e: TouchEvent) => this.handleTouchMove(e)}
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
                      const player = this.playerName(row);
                      const profile = userProfilePath(row.user_id, row.username);
                      // The real User model is what the Avatar component (and
                      // therefore Point System's decoration patch on it)
                      // needs — ensureUsersLoaded() is what puts it in the
                      // store. Until that resolves, fall back to a plain
                      // <img>/placeholder built from the row's own data.
                      const userModel = app.store.getById('users', String(row.user_id)) as User | null;
                      const fallbackAvatar = userModel ? null : avatarUrl(row);

                      return (
                        <div
                          className="RolevayaHomeWidget-slide"
                          key={`rolevaya-home-${isArena ? 'arena' : 'rp'}-${row.user_id}-${index}`}
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

                            {isArena ? this.renderArenaStats(row as ArenaRow) : this.renderRoleplayStats(row as ActivityRow)}
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
                    onclick={() => this.next()}
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
                      onclick={() => this.prev()}
                      aria-label="Показать предыдущую карточку"
                    >
                      <i className="fa-solid fa-chevron-left" aria-hidden="true" />
                    </button>

                    <button
                      className="Button Button--secondary RolevayaHomeWidget-arrow RolevayaHomeWidget-arrow--mobile"
                      type="button"
                      onclick={() => this.next()}
                      aria-label="Показать следующую карточку"
                    >
                      <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="RolevayaHomeWidget-actions RolevayaHomeWidget-actions--desktop">
                {isArena ? (
                  <>
                    {this.renderArenaTagLink('RolevayaHomeWidget-hallLink RolevayaHomeWidget-hallLink--desktop')}
                    {this.renderHowToPlayButton('RolevayaHomeWidget-hallLink RolevayaHomeWidget-hallLink--desktop')}
                  </>
                ) : (
                  <>
                    {this.renderHallOfFameLink('RolevayaHomeWidget-hallLink RolevayaHomeWidget-hallLink--desktop')}
                    {this.renderCreateCharacterLink('RolevayaHomeWidget-hallLink RolevayaHomeWidget-hallLink--desktop')}
                  </>
                )}
              </div>

              <div className="RolevayaHomeWidget-actions RolevayaHomeWidget-actions--mobile">
                {isArena ? (
                  <>
                    {this.renderArenaTagLink('RolevayaHomeWidget-hallLink RolevayaHomeWidget-hallLink--mobile')}
                    {this.renderHowToPlayButton('RolevayaHomeWidget-hallLink RolevayaHomeWidget-hallLink--mobile')}
                  </>
                ) : (
                  <>
                    {this.renderHallOfFameLink('RolevayaHomeWidget-hallLink RolevayaHomeWidget-hallLink--mobile')}
                    {this.renderCreateCharacterLink('RolevayaHomeWidget-hallLink RolevayaHomeWidget-hallLink--mobile')}
                  </>
                )}
              </div>
            </>
          ) : null}
        </div>
      </section>
    );
  }
}
