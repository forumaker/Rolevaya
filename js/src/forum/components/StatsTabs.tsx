import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import User from 'flarum/common/models/User';
import Link from 'flarum/common/components/Link';
import CardPerkIcons, { CardPerk } from './CardPerkIcons';
import CompletedEntriesModal from './CompletedEntriesModal';

type CharacterRow = {
  discussion_id: number;
  discussion_title: string;
  discussion_slug?: string | null;
  user_id: number;
  username: string | null;
  nickname: string | null;
  avatar_url?: string | null;
  physiology: number;
  dexterity: number;
  magic: number;
  charisma: number;
  roleplay_experience: number;
  sum: number;
  source_post_id: number;
  parsed_at: string | null;
  updated_at: string | null;
};

type ActivityRow = {
  user_id: number;
  username?: string | null;
  nickname?: string | null;
  avatar_url?: string | null;
  period_days: number;
  scope_tag: string;
  posts_count: number;
  total_chars: number;
  avg_chars: number;
  active_weeks: number;
  stability_ratio: number;
  calculated_at: string | null;
  updated_at: string | null;
  completed_arcs_count?: number;
  completed_episodes_count?: number;
};

type ArenaRow = {
  user_id: number;
  username?: string | null;
  nickname?: string | null;
  avatar_url?: string | null;
  wins: number;
  losses: number;
  draws: number;
  win_rate: number;
};

type PlayerRow = { nickname?: string | null; username?: string | null; user_id: number };

type BestBonusSetting = {
  enabled?: boolean;
  label?: string;
  icon?: string;
  color?: string;
  description?: string;
};

type ManualPerkSetting = {
  key?: string;
  label?: string;
  icon?: string;
  color?: string;
  description?: string;
};

type ManualPerkGroup = {
  discussion_id?: number;
  perks?: ManualPerkSetting[];
};

export default class StatsTabs extends Component {
  activeTab: 'characters' | 'activity' | 'arena' = 'characters';

  // Sourced from admin settings (forumaker-rolevaya.curatorUserIds),
  // serialized to the forum frontend — this is the same source of truth the
  // server-side filter uses, instead of a second hardcoded copy that could
  // drift out of sync. (Guardian exclusion for characters is now applied
  // entirely server-side — see loadCharacters — so no client-side set is
  // needed for it.)
  private readonly curatorUserIds = this.parseIdSetting('forumaker-rolevaya.curatorUserIds', [10, 27, 14]);

  private parseIdSetting(key: string, fallback: number[]): Set<number> {
    const raw = app.forum.attribute(key) as string | null;

    if (!raw || !String(raw).trim()) {
      return new Set(fallback);
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return new Set(fallback);
      return new Set(parsed.map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id)));
    } catch {
      return new Set(fallback);
    }
  }

  private readonly statIcons: Record<string, string> = {
    physiology:          'fa-solid fa-hand-fist',
    dexterity:           'fa-solid fa-user-ninja',
    magic:               'fa-solid fa-wand-sparkles',
    charisma:            'fa-solid fa-mandolin',
    roleplay_experience: 'fa-solid fa-gem',
    sum:                 'fa-solid fa-sigma',
  };

  charExcludeGuardians = false;
  actExcludeCurators = false;

  charSort: 'roleplay_experience' | 'sum' | 'physiology' | 'dexterity' | 'magic' | 'charisma' = 'roleplay_experience';

  actSort: 'posts_count' | 'completed_arcs_count' | 'completed_episodes_count' = 'posts_count';

  charLimit = 50;

  charLoading = false;
  charRecalcLoading = false;
  charError: string | null = null;
  charRows: CharacterRow[] = [];

  actMinPosts = 0;
  actLimit = 50;

  actLoading = false;
  actRecalcLoading = false;
  actError: string | null = null;
  actRows: ActivityRow[] = [];

  arenaExcludeCurators = false;
  arenaSort: 'wins' | 'winrate' | 'losses' | 'draws' = 'wins';
  arenaLimit = 50;

  arenaLoading = false;
  arenaError: string | null = null;
  arenaRows: ArenaRow[] = [];

  private ensuredUserIds = new Set<number>();
  private ensureUsersInflight = false;

  oninit(vnode: any) {
    super.oninit(vnode);

    void this.loadCharacters(true);
    void this.loadActivity(true);
    void this.loadArena(true);
  }

  private cacheBust() {
    return Date.now();
  }

  private invalidateHomeSliderCache() {
    if (typeof window === 'undefined') return;

    try {
      window.dispatchEvent(new Event('rolevaya:invalidate-home-slider-cache'));
    } catch {}
  }

  private apiUrl(path: string) {
    const base = app.forum.attribute('apiUrl') as string;
    return base.replace(/\/$/, '') + path;
  }

  private forumBaseUrl() {
    const base = (app.forum.attribute('baseUrl') as string) || '';
    return base.replace(/\/$/, '');
  }

  private discussionUrl(row: CharacterRow) {
    const base = this.forumBaseUrl();
    const id = row.discussion_id;
    const slug = (row.discussion_slug || '').trim();
    return slug ? `${base}/d/${id}-${slug}` : `${base}/d/${id}`;
  }

  private playerName(row: PlayerRow) {
    return row.nickname || row.username || `#${row.user_id}`;
  }

  private userProfilePath(userId: number, username?: string | null) {
    const user = app.store.getById('users', String(userId)) as User | null;

    if (user) {
      try {
        const routed = app.route.user(user);
        if (routed && typeof routed === 'string') return routed;
      } catch {}

      const profileUrl =
        (user.attribute('profileUrl') as string | null) ||
        (user.attribute('url') as string | null) ||
        null;

      if (profileUrl && String(profileUrl).trim()) {
        return profileUrl;
      }

      const slug =
        (user.attribute('slug') as string | null) ||
        (user.attribute('username') as string | null) ||
        username ||
        null;

      if (slug && String(slug).trim()) {
        return `/u/${slug}`;
      }
    }

    const fallbackSlug = (username || '').trim();
    if (fallbackSlug) return `/u/${fallbackSlug}`;

    return `/u/${userId}`;
  }

  private userLink(userId: number, label: string, username?: string | null) {
    return (
      <Link className="RolevayaPlayerLink" href={this.userProfilePath(userId, username)} title={label}>
        {label}
      </Link>
    );
  }

  private avatarUrl(row: { avatar_url?: string | null; user_id?: number }) {
    const raw = (row.avatar_url || '').trim();

    if (raw) {
      if (/^(data:|blob:)/i.test(raw)) return raw;
      if (/^https?:\/\//i.test(raw)) return raw;

      const base = this.forumBaseUrl();
      if (raw.startsWith('/')) return `${base}${raw}`;
      return `${base}/assets/avatars/${raw}`;
    }

    const userId = row.user_id;
    if (!userId) return null;

    const user = app.store.getById('users', String(userId)) as User | null;
    const storeUrl = (user?.attribute('avatarUrl') as string | null) || null;
    return storeUrl && String(storeUrl).trim() ? storeUrl : null;
  }

  private async ensureUsersLoaded(userIds: number[]) {
    const ids = Array.from(new Set(userIds))
      .filter((id) => id && !this.ensuredUserIds.has(id) && !app.store.getById('users', String(id)))
      .slice(0, 200);

    if (!ids.length || this.ensureUsersInflight) return;

    this.ensureUsersInflight = true;
    ids.forEach((id) => this.ensuredUserIds.add(id));

    try {
      // Same fix as HomepageActivitySlider: Flarum's /api/users list
      // endpoint has no real "id" filter gambit, so filter:{id:...} was
      // silently returning an ambient default listing instead of the
      // requested users. Per-ID singular fetches are what Flarum
      // actually supports for arbitrary IDs.
      //
      // Leaderboards here can list up to 50 rows, so firing 50 requests at
      // once (Promise.all over the whole list) is what caused the big
      // delay / dropped decorations — a burst that size overwhelms the
      // browser's per-origin connection limit and the server. Fetching in
      // small concurrent batches, with a redraw after each, keeps things
      // reliable while showing frames progressively instead of all-or-
      // nothing at the end.
      const concurrency = 4;
      for (let i = 0; i < ids.length; i += concurrency) {
        const chunk = ids.slice(i, i + concurrency);
        await Promise.all(chunk.map((id) => app.store.find('users', String(id)).catch(() => null)));
        m.redraw();
      }
    } finally {
      this.ensureUsersInflight = false;
    }
  }

  private rankClass(i: number) {
    const suffix = i === 0 ? '1' : i === 1 ? '2' : i === 2 ? '3' : i === 3 ? '4' : '';
    return 'RolevayaRank ' + (suffix ? `RolevayaRank--${suffix}` : '');
  }

  private renderStatIcon(stat: string, title: string) {
    const faClass = this.statIcons[stat];
    return (
      <div className="RolevayaStatLabel RolevayaStatLabel--icon" title={title}>
        {faClass ? <i className={faClass} aria-hidden="true" /> : null}
      </div>
    );
  }

  private get activeUpdateLoading() {
    if (this.activeTab === 'characters') return this.charRecalcLoading;
    if (this.activeTab === 'activity') return this.actRecalcLoading;
    return this.arenaLoading;
  }

  private get activeTabLoading() {
    if (this.activeTab === 'characters') return this.charLoading;
    if (this.activeTab === 'activity') return this.actLoading;
    return this.arenaLoading;
  }

  private parseBestBonusSetting(): BestBonusSetting {
    const raw = app.forum.attribute('forumaker-rolevaya.bestBonus') as string | null;

    if (!raw || !String(raw).trim()) {
      return { enabled: false };
    }

    try {
      const parsed = JSON.parse(raw);

      return {
        enabled: parsed?.enabled !== false,
        label: String(parsed?.label || ''),
        icon: String(parsed?.icon || ''),
        color: String(parsed?.color || '#a855f7'),
        description: String(parsed?.description || ''),
      };
    } catch {
      return { enabled: false };
    }
  }

  private parseManualPerksMap(): Map<number, CardPerk[]> {
    const raw = app.forum.attribute('forumaker-rolevaya.manualPerks') as string | null;
    const result = new Map<number, CardPerk[]>();

    if (!raw || !String(raw).trim()) return result;

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return result;

      for (const group of parsed as ManualPerkGroup[]) {
        const discussionId = Number(group?.discussion_id);
        if (!discussionId || !Array.isArray(group?.perks)) continue;

        const perks: CardPerk[] = group.perks.map((perk: ManualPerkSetting, index: number) => ({
          key: String(perk?.key || `manual_${discussionId}_${index + 1}`),
          label: String(perk?.label || ''),
          icon: String(perk?.icon || ''),
          color: String(perk?.color || '#a855f7'),
          description: String(perk?.description || ''),
        }));

        result.set(discussionId, perks);
      }
    } catch {
      return result;
    }

    return result;
  }

  private resolveCharacterPerks(row: CharacterRow, displayedRows: CharacterRow[]): CardPerk[] {
    const result: CardPerk[] = [];

    const bestBonus = this.parseBestBonusSetting();
    const manualPerksMap = this.parseManualPerksMap();

    if (bestBonus.enabled !== false) {
      const maxExp = displayedRows.reduce(
        (acc, item) => Math.max(acc, Number(item.roleplay_experience) || 0),
        -Infinity
      );

      if (Number(row.roleplay_experience) === maxExp && maxExp !== -Infinity) {
        result.push({
          key: 'best_bonus',
          label: String(bestBonus.label || ''),
          icon: String(bestBonus.icon || ''),
          color: String(bestBonus.color || '#a855f7'),
          description: String(bestBonus.description || ''),
        });
      }
    }

    const manualPerks = manualPerksMap.get(Number(row.discussion_id)) || [];
    result.push(...manualPerks);

    return result;
  }

  private async loadCharacters(force = false) {
    this.charLoading = true;
    this.charError = null;
    m.redraw();

    try {
      const res = await app.request<any>({
        method: 'GET',
        url: this.apiUrl('/rolevaya/characters'),
        params: {
          sort: this.charSort,
          limit: this.charLimit,
          exclude_guardians: this.charExcludeGuardians ? 1 : 0,
          _ts: force ? this.cacheBust() : undefined,
        },
      });

      this.charRows = (res?.data || []) as CharacterRow[];
      void this.ensureUsersLoaded(this.charRows.map((r) => r.user_id));
    } catch (e: any) {
      this.charError = e?.message || 'Failed to load characters leaderboard';
      this.charRows = [];
    } finally {
      this.charLoading = false;
      m.redraw();
    }
  }

  private async loadActivity(force = false) {
    this.actLoading = true;
    this.actError = null;
    m.redraw();

    try {
      const res = await app.request<any>({
        method: 'GET',
        url: this.apiUrl('/rolevaya/activity'),
        params: {
          sort: this.actSort,
          min_posts: this.actMinPosts,
          limit: this.actLimit,
          exclude_curators: this.actExcludeCurators ? 1 : 0,
          _ts: force ? this.cacheBust() : undefined,
        },
      });

      this.actRows = (res?.data || []) as ActivityRow[];
      void this.ensureUsersLoaded(this.actRows.map((r) => r.user_id));
    } catch (e: any) {
      this.actError = e?.message || 'Failed to load activity leaderboard';
      this.actRows = [];
    } finally {
      this.actLoading = false;
      m.redraw();
    }
  }

  private async loadArena(force = false) {
    this.arenaLoading = true;
    this.arenaError = null;
    m.redraw();

    try {
      const res = await app.request<any>({
        method: 'GET',
        url: this.apiUrl('/rolevaya/arena-leaderboard'),
        params: {
          sort: this.arenaSort,
          limit: this.arenaLimit,
          exclude_curators: this.arenaExcludeCurators ? 1 : 0,
          _ts: force ? this.cacheBust() : undefined,
        },
      });

      this.arenaRows = (res?.data || []) as ArenaRow[];
      void this.ensureUsersLoaded(this.arenaRows.map((r) => r.user_id));
    } catch (e: any) {
      this.arenaError = e?.message || 'Failed to load arena leaderboard';
      this.arenaRows = [];
    } finally {
      this.arenaLoading = false;
      m.redraw();
    }
  }

  private async recalcCharactersAndReload() {
    this.charRecalcLoading = true;
    this.charError = null;
    m.redraw();

    try {
      await app.request<any>({
        method: 'POST',
        url: this.apiUrl('/rolevaya/recalculate-characters'),
        body: {},
      });

      await this.loadCharacters(true);
      this.invalidateHomeSliderCache();
    } catch (e: any) {
      this.charError = e?.message || 'Failed to recalculate character sheets';
    } finally {
      this.charRecalcLoading = false;
      m.redraw();
    }
  }

  private async recalcActivityAndReload() {
    this.actRecalcLoading = true;
    this.actError = null;
    m.redraw();

    try {
      await Promise.all([
        app.request<any>({
          method: 'POST',
          url: this.apiUrl('/rolevaya/recalculate-activity'),
          body: {},
        }),
        app.request<any>({
          method: 'POST',
          url: this.apiUrl('/rolevaya/recalculate-arcs'),
          body: {},
        }),
        app.request<any>({
          method: 'POST',
          url: this.apiUrl('/rolevaya/recalculate-episodes'),
          body: {},
        }),
      ]);

      await this.loadActivity(true);
      this.invalidateHomeSliderCache();
    } catch (e: any) {
      this.actError = e?.message || 'Failed to recalculate activity';
    } finally {
      this.actRecalcLoading = false;
      m.redraw();
    }
  }

  private async recalcActiveTabAndReload() {
    if (this.activeTab === 'characters') return this.recalcCharactersAndReload();
    // Arena's own stats are updated live as battles resolve — there's no
    // recalculation job to trigger here, just a fresh read.
    if (this.activeTab === 'arena') return this.loadArena(true);
    return this.recalcActivityAndReload();
  }

  private renderActiveControls() {
    if (this.activeTab === 'arena') {
      return (
        <div className="RolevayaToolbar-group RolevayaToolbar-group--filters">
          <label className="RolevayaSortPill">
            <span>Сортировка</span>
            <select
              className="FormControl"
              value={this.arenaSort}
              onchange={(e: any) => {
                this.arenaSort = e.target.value;
                void this.loadArena(true);
              }}
            >
              <option value="wins">Победы</option>
              <option value="winrate">Винрейт</option>
              <option value="losses">Поражения</option>
              <option value="draws">Ничьи</option>
            </select>
          </label>

          <button
            type="button"
            className={'Button RolevayaFilterBtn' + (this.arenaExcludeCurators ? ' active' : '')}
            onclick={() => {
              this.arenaExcludeCurators = !this.arenaExcludeCurators;
              void this.loadArena(true);
            }}
          >
            Без Кураторов
          </button>
        </div>
      );
    }

    if (this.activeTab === 'characters') {
      return (
        <div className="RolevayaToolbar-group RolevayaToolbar-group--filters">
          <label className="RolevayaSortPill">
            <span>Сортировка</span>
            <select
              className="FormControl"
              value={this.charSort}
              onchange={(e: any) => {
                this.charSort = e.target.value;
                void this.loadCharacters(true);
              }}
            >
              <option value="roleplay_experience">Опыт ролевика</option>
              <option value="sum">Сумма характеристик</option>
              <option value="physiology">Физиология</option>
              <option value="dexterity">Ловкость</option>
              <option value="magic">Магия</option>
              <option value="charisma">Харизма</option>
            </select>
          </label>

          <button
            type="button"
            className={'Button RolevayaFilterBtn' + (this.charExcludeGuardians ? ' active' : '')}
            onclick={() => {
              this.charExcludeGuardians = !this.charExcludeGuardians;
              void this.loadCharacters(true);
            }}
          >
            Без Хранителей
          </button>
        </div>
      );
    }

    return (
      <div className="RolevayaToolbar-group RolevayaToolbar-group--filters">
        <label className="RolevayaSortPill">
          <span>Сортировка</span>
          <select
            className="FormControl"
            value={this.actSort}
            onchange={(e: any) => {
              this.actSort = e.target.value;
              void this.loadActivity(true);
            }}
          >
            <option value="posts_count">Посты</option>
            <option value="completed_arcs_count">Завершённые арки</option>
            <option value="completed_episodes_count">Завершённые эпизоды</option>
          </select>
        </label>

        <button
          type="button"
          className={'Button RolevayaFilterBtn' + (this.actExcludeCurators ? ' active' : '')}
          onclick={() => {
            this.actExcludeCurators = !this.actExcludeCurators;
            void this.loadActivity(true);
          }}
        >
          Без Кураторов
        </button>
      </div>
    );
  }

  private renderCharactersBody() {
    // exclude_guardians is now sent to the server (see loadCharacters), so
    // this.charRows already reflects the filter — no need to re-filter here.
    const displayedRows = this.charRows;

    return (
      <div className="RolevayaTabPanel">
        {(this.charLoading || this.charRecalcLoading) && <p>Поиск героев...</p>}

        {this.charError && (
          <p className="helpText" style={{ opacity: 0.9 }}>
            {this.charError}
          </p>
        )}

        {!this.charLoading && !this.charRecalcLoading && !this.charError && displayedRows.length === 0 && (
          <p>Магический шар не нашёл совпадений</p>
        )}

        {!this.charLoading && !this.charRecalcLoading && !this.charError && displayedRows.length > 0 && (
          <div className="RolevayaCards">
            {displayedRows.map((r, i) => {
              const avatar = this.avatarUrl({ avatar_url: r.avatar_url, user_id: r.user_id });
              const player = this.playerName(r);
              const url = this.discussionUrl(r);
              const profilePath = this.userProfilePath(r.user_id, r.username);
              const perks = this.resolveCharacterPerks(r, displayedRows);

              return (
                <div className="RolevayaCard" key={`c-${r.discussion_id}-${r.source_post_id}`} style={{ position: 'relative' }}>
                  <div className="RolevayaCardHeader RolevayaCardHeader--stack">
                    <div className="RolevayaHeaderRow RolevayaHeaderRow--top">
                      <div className={this.rankClass(i)}>{i + 1}</div>

                      <h3 className="RolevayaTitle">
                        <a href={url}>{r.discussion_title}</a>
                      </h3>
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
                          {this.userLink(r.user_id, player, r.username)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <CardPerkIcons perks={perks} />

                  <div className="RolevayaStatsGrid">
                    <div className="RolevayaStat">
                      {this.renderStatIcon('physiology', 'Физиология')}
                      <div className="RolevayaStatValue">{r.physiology}</div>
                    </div>

                    <div className="RolevayaStat">
                      {this.renderStatIcon('dexterity', 'Ловкость')}
                      <div className="RolevayaStatValue">{r.dexterity}</div>
                    </div>

                    <div className="RolevayaStat">
                      {this.renderStatIcon('magic', 'Магия')}
                      <div className="RolevayaStatValue">{r.magic}</div>
                    </div>

                    <div className="RolevayaStat">
                      {this.renderStatIcon('charisma', 'Харизма')}
                      <div className="RolevayaStatValue">{r.charisma}</div>
                    </div>

                    <div className="RolevayaStat RolevayaStat--wide2">
                      {this.renderStatIcon('roleplay_experience', 'Опыт ролевика')}
                      <div className="RolevayaStatValue">{r.roleplay_experience}</div>
                    </div>

                    <div className="RolevayaStat RolevayaStat--wide2">
                      {this.renderStatIcon('sum', 'Сумма')}
                      <div className="RolevayaStatValue">{r.sum}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  private renderActivityBody() {
    const displayedRows = this.actExcludeCurators
      ? this.actRows.filter((r) => !this.curatorUserIds.has(Number(r.user_id)))
      : this.actRows;

    return (
      <div className="RolevayaTabPanel">
        {(this.actLoading || this.actRecalcLoading) && <p>Поиск ролевиков...</p>}

        {this.actError && (
          <p className="helpText" style={{ opacity: 0.9 }}>
            {this.actError}
          </p>
        )}

        {!this.actLoading && !this.actRecalcLoading && !this.actError && displayedRows.length === 0 && (
          <p>Магический шар не нашёл совпадений</p>
        )}

        {!this.actLoading && !this.actRecalcLoading && !this.actError && displayedRows.length > 0 && (
          <div className="RolevayaCards">
            {displayedRows.map((r, i) => {
              const avatar = this.avatarUrl({ avatar_url: r.avatar_url, user_id: r.user_id });
              const player = this.playerName({ nickname: r.nickname, username: r.username, user_id: r.user_id });
              const profilePath = this.userProfilePath(r.user_id, r.username);

              return (
                <div className="RolevayaCard" key={`a-${r.user_id}-${r.period_days}-${i}`}>
                  <div className="RolevayaCardHeader RolevayaCardHeader--stack RolevayaCardHeader--activity">
                    <div className="RolevayaHeaderRow RolevayaHeaderRow--top">
                      <div className={this.rankClass(i)}>{i + 1}</div>
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
                          {this.userLink(r.user_id, player, r.username)}
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

  private renderArenaBody() {
    const displayedRows = this.arenaExcludeCurators
      ? this.arenaRows.filter((r) => !this.curatorUserIds.has(Number(r.user_id)))
      : this.arenaRows;

    return (
      <div className="RolevayaTabPanel">
        {this.arenaLoading && <p>Поиск бойцов...</p>}

        {this.arenaError && (
          <p className="helpText" style={{ opacity: 0.9 }}>
            {this.arenaError}
          </p>
        )}

        {!this.arenaLoading && !this.arenaError && displayedRows.length === 0 && (
          <p>Магический шар не нашёл совпадений</p>
        )}

        {!this.arenaLoading && !this.arenaError && displayedRows.length > 0 && (
          <div className="RolevayaCards">
            {displayedRows.map((r, i) => {
              const avatar = this.avatarUrl({ avatar_url: r.avatar_url, user_id: r.user_id });
              const player = this.playerName({ nickname: r.nickname, username: r.username, user_id: r.user_id });
              const profilePath = this.userProfilePath(r.user_id, r.username);

              return (
                <div className="RolevayaCard" key={`ar-${r.user_id}-${i}`}>
                  <div className="RolevayaCardHeader RolevayaCardHeader--stack RolevayaCardHeader--activity">
                    <div className="RolevayaHeaderRow RolevayaHeaderRow--top">
                      <div className={this.rankClass(i)}>{i + 1}</div>
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
                          {this.userLink(r.user_id, player, r.username)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="RolevayaStatsGrid">
                    <div className="RolevayaStat RolevayaStat--primary">
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
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
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
              onclick={() => void this.recalcActiveTabAndReload()}
              disabled={updateDisabled}
              title="Пересчитать и обновить данные"
            >
              <i className={'fa-solid fa-arrows-rotate' + (updateDisabled ? ' is-spinning' : '')} aria-hidden="true" />
              <span>{this.activeUpdateLoading ? 'Пересчёт…' : 'Обновить'}</span>
            </button>
          </div>

          {this.renderActiveControls()}
        </div>

        <div className="RolevayaTabs-content">
          {this.activeTab === 'characters' && this.renderCharactersBody()}
          {this.activeTab === 'activity' && this.renderActivityBody()}
          {this.activeTab === 'arena' && this.renderArenaBody()}
        </div>
      </div>
    );
  }
}