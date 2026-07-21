import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Link from 'flarum/common/components/Link';
import CardPerkIcons, { CardPerk } from '../CardPerkIcons';
import {
  CharacterRow,
  apiUrl,
  avatarUrl,
  cacheBust,
  ensureUsersLoaded,
  forumBaseUrl,
  invalidateHomeSliderCache,
  playerName,
  rankClass,
  userLink,
  userProfilePath,
} from './statsShared';

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

export default class CharactersTab extends Component {
  private readonly statIcons: Record<string, string> = {
    physiology:          'fa-solid fa-hand-fist',
    dexterity:           'fa-solid fa-user-ninja',
    magic:               'fa-solid fa-wand-sparkles',
    charisma:            'fa-solid fa-mandolin',
    roleplay_experience: 'fa-solid fa-gem',
    sum:                 'fa-solid fa-sigma',
  };

  excludeGuardians = false;
  sort: 'roleplay_experience' | 'sum' | 'physiology' | 'dexterity' | 'magic' | 'charisma' = 'roleplay_experience';

  limit = 24;
  private readonly pageSize = 24;
  private readonly maxLimit = 200;

  loading = false;
  recalcLoading = false;
  error: string | null = null;
  rows: CharacterRow[] = [];

  private cachedBestBonus: BestBonusSetting = { enabled: false };
  private cachedManualPerksMap: Map<number, CardPerk[]> = new Map();

  oninit(vnode: any) {
    super.oninit(vnode);

    this.cachedBestBonus = this.parseBestBonusSetting();
    this.cachedManualPerksMap = this.parseManualPerksMap();

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
        url: apiUrl('/rolevaya/characters'),
        params: {
          sort: this.sort,
          limit: this.limit,
          exclude_guardians: this.excludeGuardians ? 1 : 0,
          _ts: force ? cacheBust() : undefined,
        },
      });

      this.rows = (res?.data || []) as CharacterRow[];
      void ensureUsersLoaded(this.rows.map((r) => r.user_id));
    } catch (e: any) {
      this.error = e?.message || 'Failed to load characters leaderboard';
      this.rows = [];
    } finally {
      this.loading = false;
      m.redraw();
    }
  }

  get canLoadMore() {
    return !this.loading && this.rows.length >= this.limit && this.limit < this.maxLimit;
  }

  async loadMore() {
    if (!this.canLoadMore) return;

    this.limit = Math.min(this.maxLimit, this.limit + this.pageSize);
    await this.load(true);
  }

  async recalc() {
    this.recalcLoading = true;
    this.error = null;
    m.redraw();

    try {
      await app.request<any>({
        method: 'POST',
        url: apiUrl('/rolevaya/recalculate-characters'),
        body: {},
      });

      await this.load(true);
      invalidateHomeSliderCache();
    } catch (e: any) {
      this.error = e?.message || 'Failed to recalculate character sheets';
    } finally {
      this.recalcLoading = false;
      m.redraw();
    }
  }

  private discussionUrl(row: CharacterRow) {
    const base = forumBaseUrl();
    const id = row.discussion_id;
    const slug = (row.discussion_slug || '').trim();
    return slug ? `${base}/d/${id}-${slug}` : `${base}/d/${id}`;
  }

  private renderStatIcon(stat: string, title: string) {
    const faClass = this.statIcons[stat];
    return (
      <div className="RolevayaStatLabel RolevayaStatLabel--icon" title={title}>
        {faClass ? <i className={faClass} aria-hidden="true" /> : null}
      </div>
    );
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

    const bestBonus = this.cachedBestBonus;
    const manualPerksMap = this.cachedManualPerksMap;

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
          className={'Button RolevayaFilterBtn' + (this.excludeGuardians ? ' active' : '')}
          onclick={() => {
            this.excludeGuardians = !this.excludeGuardians;
            void this.load(true);
          }}
        >
          Без Хранителей
        </button>
      </div>
    );
  }

  view() {
    const displayedRows = this.rows;

    return (
      <div className="RolevayaTabPanel">
        {(this.loading || this.recalcLoading) && <p>Поиск героев...</p>}

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
              const player = playerName(r);
              const url = this.discussionUrl(r);
              const profilePath = userProfilePath(r.user_id, r.username);
              const perks = this.resolveCharacterPerks(r, displayedRows);

              return (
                <div className="RolevayaCard" key={`c-${r.discussion_id}-${r.source_post_id}`} style={{ position: 'relative' }}>
                  <div className="RolevayaCardHeader RolevayaCardHeader--stack">
                    <div className="RolevayaHeaderRow RolevayaHeaderRow--top">
                      <div className={rankClass(i)}>{i + 1}</div>

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
                          {userLink(r.user_id, player, r.username)}
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
