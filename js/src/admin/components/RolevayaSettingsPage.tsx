import app from 'flarum/admin/app';
import ExtensionPage from 'flarum/admin/components/ExtensionPage';
import Button from 'flarum/common/components/Button';
import Switch from 'flarum/common/components/Switch';
import type m from 'mithril';

type BestBonusSetting = {
  enabled: boolean;
  label: string;
  icon: string;
  color: string;
  description: string;
};

type ManualPerk = {
  key: string;
  label: string;
  icon: string;
  color: string;
  description: string;
};

type ManualPerkGroup = {
  discussion_id: number;
  perks: ManualPerk[];
};

function Section(iconClass: string, title: string, description: string, content: m.Children) {
  return (
    <section className="RolevayaAdminSection">
      <div className="RolevayaAdminSection-header">
        <div className="RolevayaAdminSection-titleWrap">
          <div className="RolevayaAdminSection-icon">
            <i className={iconClass} aria-hidden="true" />
          </div>

          <div className="RolevayaAdminSection-titleText">
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
        </div>
      </div>

      <div className="RolevayaAdminSection-content">{content}</div>
    </section>
  );
}

function renderInlineMarkdown(text: string): m.Children[] {
  const nodes: m.Children[] = [];
  const pattern = /(\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[2] !== undefined || match[3] !== undefined) {
      nodes.push(<strong>{match[2] ?? match[3]}</strong>);
    } else if (match[4] !== undefined || match[5] !== undefined) {
      nodes.push(<em>{match[4] ?? match[5]}</em>);
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function renderMarkdownPreview(text: string): m.Children[] {
  return text.split('\n').reduce<m.Children[]>((acc, line, index) => {
    if (index > 0) {
      acc.push(<br />);
    }

    acc.push(...renderInlineMarkdown(line));

    return acc;
  }, []);
}

export default class RolevayaSettingsPage extends ExtensionPage {
  bestBonus: BestBonusSetting = {
    enabled: true,
    label: 'Бонус Лучшего',
    icon: 'fa-duotone fa-regular fa-crown',
    color: '#a855f7',
    description: 'Один раз за арку получите доброе предсказание, которое точно сбудется в ближайшем будущем.',
  };

  bestBonusCollapsed = true;

  manualPerkGroups: ManualPerkGroup[] = [];
  collapsedGroups: Record<number, boolean> = {};
  discussionTitles: Record<number, string> = {};
  newDiscussionId = '';

  guardianDiscussionIdsText = '';
  curatorUserIdsText = '';
  excludeCharacterDiscussionIdsText = '';
  activityPeriodDaysText = '0';

  oninit(vnode: any) {
    super.oninit(vnode);

    this.bestBonus = this.parseBestBonusSetting(this.setting('forumaker-rolevaya.bestBonus')());
    this.manualPerkGroups = this.parseManualPerksSetting(this.setting('forumaker-rolevaya.manualPerks')());

    this.manualPerkGroups.forEach((group) => {
      this.collapsedGroups[group.discussion_id] = true;
      this.fetchDiscussionTitle(group.discussion_id);
    });

    this.guardianDiscussionIdsText = this.parseIdListSetting('forumaker-rolevaya.guardianDiscussionIds');
    this.curatorUserIdsText = this.parseIdListSetting('forumaker-rolevaya.curatorUserIds');
    this.excludeCharacterDiscussionIdsText = this.parseIdListSetting('forumaker-rolevaya.excludeCharacterDiscussionIds');
    this.activityPeriodDaysText = String(parseInt(this.setting('forumaker-rolevaya.activityPeriodDays')() || '0', 10) || 0);
  }

  className() {
    return 'RolevayaAdmin';
  }

  private fetchDiscussionTitle(id: number) {
    if (this.discussionTitles[id]) return;

    app.store.find('discussions', id).then((discussion: any) => {
      this.discussionTitles[id] = discussion.title?.() ?? String(id);
      m.redraw();
    }).catch(() => {
      this.discussionTitles[id] = String(id);
      m.redraw();
    });
  }

  private parseBestBonusSetting(raw: string | null | undefined): BestBonusSetting {
    if (!raw) {
      return {
        enabled: true,
        label: 'Бонус Лучшего',
        icon: 'fa-duotone fa-regular fa-crown',
        color: '#a855f7',
        description: 'Один раз за арку получите доброе предсказание, которое точно сбудется в ближайшем будущем.',
      };
    }

    try {
      const parsed = JSON.parse(raw);

      return {
        enabled: parsed?.enabled !== false,
        label: String(parsed?.label || 'Бонус Лучшего'),
        icon: String(parsed?.icon || 'fa-duotone fa-regular fa-crown'),
        color: String(parsed?.color || '#a855f7'),
        description: String(parsed?.description || ''),
      };
    } catch {
      return {
        enabled: true,
        label: 'Бонус Лучшего',
        icon: 'fa-solid fa-stars',
        color: '#a855f7',
        description: 'Один раз за арку получите доброе предсказание, которое точно сбудется в ближайшем будущем.',
      };
    }
  }

  private parseManualPerksSetting(raw: string | null | undefined): ManualPerkGroup[] {
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      return parsed
        .map((group: any) => {
          const discussionId = Number(group?.discussion_id);

          if (!discussionId || !Array.isArray(group?.perks)) return null;

          return {
            discussion_id: discussionId,
            perks: group.perks.map((perk: any, index: number) => ({
              key: String(perk?.key || `manual_${discussionId}_${index + 1}`),
              label: String(perk?.label || ''),
              icon: String(perk?.icon || 'fa-solid fa-star'),
              color: String(perk?.color || '#a855f7'),
              description: String(perk?.description || ''),
            })),
          } as ManualPerkGroup;
        })
        .filter(Boolean) as ManualPerkGroup[];
    } catch {
      return [];
    }
  }

  private parseIdListSetting(key: string): string {
    const raw = this.setting(key)();
    if (!raw) return '';

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return '';
      return parsed.map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id)).join(', ');
    } catch {
      return '';
    }
  }

  private updateIdListSetting(key: string, text: string) {
    const ids = text
      .split(',')
      .map((part) => parseInt(part.trim(), 10))
      .filter((id) => Number.isFinite(id));

    this.setting(key)(JSON.stringify(ids));
    m.redraw();
  }

  private updateActivityPeriodDaysSetting(text: string) {
    const days = Math.max(0, parseInt(text, 10) || 0);
    this.setting('forumaker-rolevaya.activityPeriodDays')(String(days));
    m.redraw();
  }

  private syncBestBonusSetting() {
    this.setting('forumaker-rolevaya.bestBonus')(JSON.stringify(this.bestBonus, null, 2));
  }

  private syncManualPerksSetting() {
    this.setting('forumaker-rolevaya.manualPerks')(JSON.stringify(this.manualPerkGroups, null, 2));
  }

  private updateBestBonus(field: keyof BestBonusSetting, value: any) {
    this.bestBonus = {
      ...this.bestBonus,
      [field]: value,
    };

    this.syncBestBonusSetting();
    m.redraw();
  }

  private sortGroups() {
    this.manualPerkGroups = [...this.manualPerkGroups].sort((a, b) => a.discussion_id - b.discussion_id);
  }

  private toggleGroup(discussionId: number) {
    this.collapsedGroups[discussionId] = !this.collapsedGroups[discussionId];
    m.redraw();
  }

  private addDiscussionGroup() {
    const discussionId = Number(this.newDiscussionId);

    if (!discussionId) return;

    const exists = this.manualPerkGroups.some((group) => Number(group.discussion_id) === discussionId);
    if (exists) {
      this.newDiscussionId = '';
      m.redraw();
      return;
    }

    this.manualPerkGroups.push({
      discussion_id: discussionId,
      perks: [],
    });

    this.collapsedGroups[discussionId] = true;
    this.fetchDiscussionTitle(discussionId);
    this.sortGroups();
    this.syncManualPerksSetting();
    this.newDiscussionId = '';
    m.redraw();
  }

  private removeDiscussionGroup(groupIndex: number) {
    const group = this.manualPerkGroups[groupIndex];
    if (group) {
      delete this.collapsedGroups[group.discussion_id];
      delete this.discussionTitles[group.discussion_id];
    }

    this.manualPerkGroups.splice(groupIndex, 1);
    this.syncManualPerksSetting();
    m.redraw();
  }

  private addPerkToGroup(groupIndex: number) {
    const group = this.manualPerkGroups[groupIndex];
    if (!group) return;

    group.perks.push({
      key: `manual_${group.discussion_id}_${Date.now()}`,
      label: '',
      icon: 'fa-solid fa-star',
      color: '#a855f7',
      description: '',
    });

    this.collapsedGroups[group.discussion_id] = false;
    this.syncManualPerksSetting();
    m.redraw();
  }

  private updateManualPerk(groupIndex: number, perkIndex: number, field: keyof ManualPerk, value: any) {
    const group = this.manualPerkGroups[groupIndex];
    if (!group || !group.perks[perkIndex]) return;

    group.perks[perkIndex] = {
      ...group.perks[perkIndex],
      [field]: value,
    };

    this.syncManualPerksSetting();
    m.redraw();
  }

  private removeManualPerk(groupIndex: number, perkIndex: number) {
    const group = this.manualPerkGroups[groupIndex];
    if (!group) return;

    group.perks.splice(perkIndex, 1);

    if (group.perks.length === 0) {
      delete this.collapsedGroups[group.discussion_id];
      this.manualPerkGroups.splice(groupIndex, 1);
    }

    this.syncManualPerksSetting();
    m.redraw();
  }

  private renderPerkPreview(label: string, icon: string, color: string, description: string) {
    return (
      <div className="RolevayaPreviewCard">
        <div className="RolevayaPreviewCard-top">
          <div className="RolevayaPreviewCard-icon" style={{ color }}>
            <i className={icon || 'fa-solid fa-star'} aria-hidden="true" />
          </div>

          <div className="RolevayaPreviewCard-meta">
            <div className="RolevayaPreviewCard-title">{label || 'Название дара'}</div>
            <div className="RolevayaPreviewCard-subtitle">Предпросмотр карточки</div>
          </div>
        </div>

        <div className="RolevayaPreviewCard-body">
          {description ? renderMarkdownPreview(description) : 'Описание дара появится здесь. Можно использовать Markdown.'}
        </div>
      </div>
    );
  }

  content() {
    return (
      <div className="RolevayaAdmin">
        <div className="RolevayaAdmin-shell">
          <div className={'RolevayaGroupCard' + (this.bestBonusCollapsed ? ' is-collapsed' : '')}>
            <div className="RolevayaGroupCard-header">
              <button
                className="RolevayaGroupCard-toggle"
                type="button"
                aria-expanded={this.bestBonusCollapsed ? 'false' : 'true'}
                onclick={() => { this.bestBonusCollapsed = !this.bestBonusCollapsed; m.redraw(); }}
              >
                <i
                  className={this.bestBonusCollapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-down'}
                  aria-hidden="true"
                />
                <span className="RolevayaGroupCard-titleWrap">
                  <span className="RolevayaGroupCard-title">Бонус Лучшего</span>
                  <span className="RolevayaGroupCard-subtitle">
                    {this.bestBonus.enabled ? 'Включён' : 'Выключен'}
                  </span>
                </span>
              </button>
            </div>

            {!this.bestBonusCollapsed && (
              <div className="RolevayaAdminGrid RolevayaAdminGrid--bonus">
                <div className="RolevayaAdminPanel">
                  <div className="Form-group RolevayaToggleGroup">
                    {Switch.component(
                      {
                        state: this.bestBonus.enabled,
                        onchange: (value: boolean) => this.updateBestBonus('enabled', value),
                      },
                      'Показывать Бонус Лучшего в Зале Славы'
                    )}
                  </div>

                  <div className="Form-group">
                    <label>Название</label>
                    <input
                      className="FormControl"
                      value={this.bestBonus.label}
                      oninput={(e: any) => this.updateBestBonus('label', e.target.value)}
                      placeholder="Бонус Лучшего"
                    />
                  </div>

                  <div className="Form-group">
                    <label>Иконка Font Awesome</label>
                    <input
                      className="FormControl RolevayaInput--medium"
                      value={this.bestBonus.icon}
                      oninput={(e: any) => this.updateBestBonus('icon', e.target.value)}
                      placeholder="fa-duotone fa-regular fa-crown"
                    />
                  </div>

                  <div className="Form-group">
                    <label>Цвет иконки</label>
                    <input
                      className="FormControl RolevayaInput--colorText"
                      value={this.bestBonus.color}
                      oninput={(e: any) => this.updateBestBonus('color', e.target.value)}
                      placeholder="#a855f7"
                    />
                  </div>

                  <div className="Form-group">
                    <label>Описание</label>
                    <textarea
                      className="FormControl"
                      rows={5}
                      value={this.bestBonus.description}
                      oninput={(e: any) => this.updateBestBonus('description', e.target.value)}
                      placeholder="Описание дара"
                    />
                  </div>
                </div>

                <div className="RolevayaAdminAside">
                  {this.renderPerkPreview(
                    this.bestBonus.label,
                    this.bestBonus.icon,
                    this.bestBonus.color,
                    this.bestBonus.description
                  )}
                </div>
              </div>
            )}
          </div>

          {Section(
            'fas fa-wand-sparkles',
            'Дары',
            'Ручные перки для конкретных анкет',
            <div className="RolevayaAdminStack">
              <div className="RolevayaAdminToolbar">
                <div className="RolevayaAdminToolbar-main">
                  <div className="Form-group RolevayaAdminToolbar-field">
                    <label>ID темы анкеты</label>

                    <div className="RolevayaInlineRow">
                      <input
                        className="FormControl RolevayaInput--medium"
                        type="number"
                        min="1"
                        value={this.newDiscussionId}
                        oninput={(e: any) => {
                          this.newDiscussionId = e.target.value;
                        }}
                        placeholder="Например: 123"
                      />

                      <Button className="Button Button--primary" type="button" onclick={() => this.addDiscussionGroup()}>
                        Добавить карточку
                      </Button>
                    </div>

                    <p className="helpText">
                      Число из ссылки на анкету
                      <br />
                      Пример: <code>/d/123-imya-personazha</code> → ID темы = <strong>123</strong>
                    </p>
                  </div>
                </div>
              </div>

              {this.manualPerkGroups.length === 0 ? (
                <div className="RolevayaEmptyState">
                  <div className="RolevayaEmptyState-icon">
                    <i className="fas fa-sparkles" aria-hidden="true" />
                  </div>
                  <div className="RolevayaEmptyState-title">Пока нет ни одной карточки</div>
                  <div className="RolevayaEmptyState-text">Добавь ID темы, чтобы создать первую карточку с дарами.</div>
                </div>
              ) : null}

              {this.manualPerkGroups.map((group, groupIndex) => {
                const isCollapsed = this.collapsedGroups[group.discussion_id] !== false;
                const title = this.discussionTitles[group.discussion_id] ?? `#${group.discussion_id}…`;

                return (
                  <div
                    className={'RolevayaGroupCard' + (isCollapsed ? ' is-collapsed' : '')}
                    key={`group-${group.discussion_id}`}
                  >
                    <div className="RolevayaGroupCard-header">
                      <button
                        className="RolevayaGroupCard-toggle"
                        type="button"
                        aria-expanded={isCollapsed ? 'false' : 'true'}
                        onclick={() => this.toggleGroup(group.discussion_id)}
                      >
                        <i
                          className={isCollapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-down'}
                          aria-hidden="true"
                        />
                        <span className="RolevayaGroupCard-titleWrap">
                          <span className="RolevayaGroupCard-title">{title}</span>
                          <span className="RolevayaGroupCard-subtitle">
                            {group.perks.length === 0 ? 'Даров пока нет' : `Даров: ${group.perks.length}`}
                          </span>
                        </span>
                      </button>

                      <div className="RolevayaGroupCard-actions">
                        <Button className="Button Button--primary" type="button" onclick={() => this.addPerkToGroup(groupIndex)}>
                          Добавить дар
                        </Button>

                        <Button className="Button Button--danger" type="button" onclick={() => this.removeDiscussionGroup(groupIndex)}>
                          Удалить карточку
                        </Button>
                      </div>
                    </div>

                    {!isCollapsed && (
                      <>
                        {group.perks.length === 0 ? <p className="helpText">У этой карточки пока нет даров.</p> : null}

                        <div className="RolevayaPerksList">
                          {group.perks.map((perk, perkIndex) => (
                            <div className="RolevayaPerkCard" key={`${perk.key}-${perkIndex}`}>
                              <div className="RolevayaPerkCard-header">
                                <div className="RolevayaPerkCard-heading">
                                  <span className="RolevayaPerkCard-badge">Дар #{perkIndex + 1}</span>
                                  <strong>{perk.label || 'Без названия'}</strong>
                                </div>

                                <Button
                                  className="Button Button--danger"
                                  type="button"
                                  onclick={() => this.removeManualPerk(groupIndex, perkIndex)}
                                >
                                  Удалить дар
                                </Button>
                              </div>

                              <div className="RolevayaAdminGrid RolevayaAdminGrid--perk">
                                <div className="RolevayaAdminPanel">
                                  <div className="Form-group">
                                    <label>Название</label>
                                    <input
                                      className="FormControl"
                                      value={perk.label}
                                      oninput={(e: any) => this.updateManualPerk(groupIndex, perkIndex, 'label', e.target.value)}
                                      placeholder="Название дара"
                                    />
                                  </div>

                                  <div className="Form-group">
                                    <label>Иконка Font Awesome</label>
                                    <input
                                      className="FormControl RolevayaInput--medium"
                                      value={perk.icon}
                                      oninput={(e: any) => this.updateManualPerk(groupIndex, perkIndex, 'icon', e.target.value)}
                                      placeholder="fa-solid fa-spider"
                                    />
                                  </div>

                                  <div className="Form-group">
                                    <label>Цвет иконки</label>
                                    <input
                                      className="FormControl RolevayaInput--colorText"
                                      value={perk.color}
                                      oninput={(e: any) => this.updateManualPerk(groupIndex, perkIndex, 'color', e.target.value)}
                                      placeholder="#a855f7"
                                    />
                                  </div>

                                  <div className="Form-group">
                                    <label>Описание</label>
                                    <textarea
                                      className="FormControl"
                                      rows={5}
                                      value={perk.description}
                                      oninput={(e: any) => this.updateManualPerk(groupIndex, perkIndex, 'description', e.target.value)}
                                      placeholder="Описание дара"
                                    />
                                  </div>
                                </div>

                                <div className="RolevayaAdminAside">
                                  {this.renderPerkPreview(perk.label, perk.icon, perk.color, perk.description)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {Section(
            'fas fa-users-slash',
            'Исключения и период активности',
            'ID тем Хранителей и ID Кураторов, скрываемых по кнопкам "Без Хранителей"/"Без Кураторов", и окно расчёта активности',
            <div className="RolevayaAdminPanel">
              <div className="Form-group">
                <label>ID тем Хранителей (через запятую)</label>
                <input
                  className="FormControl"
                  value={this.guardianDiscussionIdsText}
                  oninput={(e: any) => {
                    this.guardianDiscussionIdsText = e.target.value;
                  }}
                  onchange={() => this.updateIdListSetting('forumaker-rolevaya.guardianDiscussionIds', this.guardianDiscussionIdsText)}
                  placeholder="52, 61, 55, 59"
                />
              </div>

              <div className="Form-group">
                <label>ID пользователей-Кураторов (через запятую)</label>
                <input
                  className="FormControl"
                  value={this.curatorUserIdsText}
                  oninput={(e: any) => {
                    this.curatorUserIdsText = e.target.value;
                  }}
                  onchange={() => this.updateIdListSetting('forumaker-rolevaya.curatorUserIds', this.curatorUserIdsText)}
                  placeholder="10, 27, 14"
                />
              </div>

              <div className="Form-group">
                <label>Исключённые ID тем анкет (через запятую)</label>
                <input
                  className="FormControl"
                  value={this.excludeCharacterDiscussionIdsText}
                  oninput={(e: any) => {
                    this.excludeCharacterDiscussionIdsText = e.target.value;
                  }}
                  onchange={() => this.updateIdListSetting('forumaker-rolevaya.excludeCharacterDiscussionIds', this.excludeCharacterDiscussionIdsText)}
                  placeholder="33"
                />
              </div>

              <div className="Form-group">
                <label>Окно расчёта активности, дней (0 = за всё время)</label>
                <input
                  className="FormControl RolevayaInput--medium"
                  type="number"
                  min="0"
                  value={this.activityPeriodDaysText}
                  oninput={(e: any) => {
                    this.activityPeriodDaysText = e.target.value;
                  }}
                  onchange={() => this.updateActivityPeriodDaysSetting(this.activityPeriodDaysText)}
                  placeholder="0"
                />
              </div>
            </div>
          )}

          <div className="RolevayaAdminSubmit">
            {this.submitButton()}
          </div>
        </div>
      </div>
    );
  }
}