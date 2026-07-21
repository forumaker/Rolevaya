import app from 'flarum/admin/app';
import ExtensionPage from 'flarum/admin/components/ExtensionPage';

import { Section } from './settings/AdminSection';
import BestBonusSection, { BestBonusSetting } from './settings/BestBonusSection';
import ManualPerksSection from './settings/ManualPerksSection';
import TagsSection from './settings/TagsSection';
import FiltersSection from './settings/FiltersSection';
import type { ManualPerk, ManualPerkGroup } from './settings/types';

type TagKind = 'characters' | 'role' | 'episodes' | 'arena';

/**
 * Admin settings page for the Rolevaya extension. Each section's markup
 * lives in its own file under ./settings/ — this class is left holding the
 * page's state and the mutation methods those sections call back into,
 * which is what content() composes on every redraw.
 */
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

  guardianDiscussionIds: number[] = [];
  curatorUserIds: number[] = [];
  curatorUsernames: Record<number, string> = {};

  excludeCharacterDiscussionIdsText = '';
  activityPeriodDaysText = '0';

  tagCharacters = 'characters';
  tagRole = 'role';
  tagEpisodes = 'episodes';
  arenaTagSlug = 'arena';

  tagCharactersTag: any = null;
  tagRoleTag: any = null;
  tagEpisodesTag: any = null;
  arenaTagSlugTag: any = null;
  tagsLoaded = false;

  oninit(vnode: any) {
    super.oninit(vnode);

    this.bestBonus = this.parseBestBonusSetting(this.setting('forumaker-rolevaya.bestBonus')());
    this.manualPerkGroups = this.parseManualPerksSetting(this.setting('forumaker-rolevaya.manualPerks')());

    this.manualPerkGroups.forEach((group) => {
      this.collapsedGroups[group.discussion_id] = true;
      this.fetchDiscussionTitle(group.discussion_id);
    });

    this.guardianDiscussionIds = this.parseIdArraySetting('forumaker-rolevaya.guardianDiscussionIds');
    this.guardianDiscussionIds.forEach((id) => this.fetchDiscussionTitle(id));

    this.curatorUserIds = this.parseIdArraySetting('forumaker-rolevaya.curatorUserIds');
    this.curatorUserIds.forEach((id) => this.fetchUsername(id));

    this.excludeCharacterDiscussionIdsText = this.parseIdListSettingText('forumaker-rolevaya.excludeCharacterDiscussionIds');
    this.activityPeriodDaysText = String(parseInt(this.setting('forumaker-rolevaya.activityPeriodDays')() || '0', 10) || 0);

    this.tagCharacters = this.setting('forumaker-rolevaya.tagCharacters')() || 'characters';
    this.tagRole = this.setting('forumaker-rolevaya.tagRole')() || 'role';
    this.tagEpisodes = this.setting('forumaker-rolevaya.tagEpisodes')() || 'episodes';
    this.arenaTagSlug = this.setting('forumaker-rolevaya.arenaTagSlug')() || 'arena';

    this.loadTags();
  }

  className() {
    return 'RolevayaAdmin';
  }

  // --- lookups -------------------------------------------------------

  private fetchDiscussionTitle(id: number) {
    if (this.discussionTitles[id]) return;

    app.store
      .find('discussions', id)
      .then((discussion: any) => {
        this.discussionTitles[id] = discussion.title?.() ?? String(id);
        m.redraw();
      })
      .catch(() => {
        this.discussionTitles[id] = String(id);
        m.redraw();
      });
  }

  private fetchUsername(id: number) {
    if (this.curatorUsernames[id]) return;

    app.store
      .find('users', String(id))
      .then((user: any) => {
        this.curatorUsernames[id] = user.username?.() ?? `#${id}`;
        m.redraw();
      })
      .catch(() => {
        this.curatorUsernames[id] = `#${id}`;
        m.redraw();
      });
  }

  private loadTags() {
    const tagList = (app as any).tagList;

    if (!tagList) {
      // flarum/tags isn't booted in this admin session for some reason —
      // fall back to showing raw slugs rather than blocking the page.
      this.tagsLoaded = true;
      return;
    }

    tagList
      .load(['parent'])
      .then((tags: any[]) => {
        this.tagCharactersTag = tags.find((t) => t.slug() === this.tagCharacters) || null;
        this.tagRoleTag = tags.find((t) => t.slug() === this.tagRole) || null;
        this.tagEpisodesTag = tags.find((t) => t.slug() === this.tagEpisodes) || null;
        this.arenaTagSlugTag = tags.find((t) => t.slug() === this.arenaTagSlug) || null;
        this.tagsLoaded = true;
        m.redraw();
      })
      .catch(() => {
        this.tagsLoaded = true;
        m.redraw();
      });
  }

  // --- setting (de)serialization -------------------------------------

  private parseBestBonusSetting(raw: string | null | undefined): BestBonusSetting {
    const fallback: BestBonusSetting = {
      enabled: true,
      label: 'Бонус Лучшего',
      icon: 'fa-duotone fa-regular fa-crown',
      color: '#a855f7',
      description: 'Один раз за арку получите доброе предсказание, которое точно сбудется в ближайшем будущем.',
    };

    if (!raw) return fallback;

    try {
      const parsed = JSON.parse(raw);

      return {
        enabled: parsed?.enabled !== false,
        label: String(parsed?.label || fallback.label),
        icon: String(parsed?.icon || fallback.icon),
        color: String(parsed?.color || fallback.color),
        description: String(parsed?.description || ''),
      };
    } catch {
      return fallback;
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

  /** Only still used for excludeCharacterDiscussionIds, which stays a free-text comma list. */
  private parseIdListSettingText(key: string): string {
    const raw = this.setting(key)();
    if (!raw) return '';

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return '';
      return parsed
        .map((id: any) => Number(id))
        .filter((id: number) => Number.isFinite(id))
        .join(', ');
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

  private parseIdArraySetting(key: string): number[] {
    const raw = this.setting(key)();
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      return Array.from(new Set(parsed.map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id))));
    } catch {
      return [];
    }
  }

  private updateActivityPeriodDaysSetting(text: string) {
    const days = Math.max(0, parseInt(text, 10) || 0);
    this.setting('forumaker-rolevaya.activityPeriodDays')(String(days));
    m.redraw();
  }

  // --- Бонус Лучшего ---------------------------------------------------

  private syncBestBonusSetting() {
    this.setting('forumaker-rolevaya.bestBonus')(JSON.stringify(this.bestBonus, null, 2));
  }

  private updateBestBonus(field: keyof BestBonusSetting, value: any) {
    this.bestBonus = { ...this.bestBonus, [field]: value };
    this.syncBestBonusSetting();
    m.redraw();
  }

  // --- Дары (manual perks) --------------------------------------------

  private syncManualPerksSetting() {
    this.setting('forumaker-rolevaya.manualPerks')(JSON.stringify(this.manualPerkGroups, null, 2));
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

    this.manualPerkGroups.push({ discussion_id: discussionId, perks: [] });
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

    group.perks[perkIndex] = { ...group.perks[perkIndex], [field]: value };
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

  // --- Теги (tag picker) ------------------------------------------------

  private pickTag(kind: TagKind, tag: any) {
    const slug = tag?.slug?.();
    if (!slug) return;

    if (kind === 'characters') {
      this.tagCharacters = slug;
      this.tagCharactersTag = tag;
      this.setting('forumaker-rolevaya.tagCharacters')(slug);
    } else if (kind === 'role') {
      this.tagRole = slug;
      this.tagRoleTag = tag;
      this.setting('forumaker-rolevaya.tagRole')(slug);
    } else if (kind === 'episodes') {
      this.tagEpisodes = slug;
      this.tagEpisodesTag = tag;
      this.setting('forumaker-rolevaya.tagEpisodes')(slug);
    } else if (kind === 'arena') {
      this.arenaTagSlug = slug;
      this.arenaTagSlugTag = tag;
      this.setting('forumaker-rolevaya.arenaTagSlug')(slug);
    }

    m.redraw();
  }

  // --- Игроки и ID (guardians / curators) ------------------------------

  private addGuardianDiscussion(id: number, title: string) {
    if (!id || this.guardianDiscussionIds.includes(id)) return;

    this.guardianDiscussionIds = [...this.guardianDiscussionIds, id];
    this.discussionTitles[id] = title;
    this.setting('forumaker-rolevaya.guardianDiscussionIds')(JSON.stringify(this.guardianDiscussionIds));
    m.redraw();
  }

  private removeGuardianDiscussion(id: number) {
    this.guardianDiscussionIds = this.guardianDiscussionIds.filter((x) => x !== id);
    this.setting('forumaker-rolevaya.guardianDiscussionIds')(JSON.stringify(this.guardianDiscussionIds));
    m.redraw();
  }

  private addCurator(id: number, username: string) {
    if (!id || this.curatorUserIds.includes(id)) return;

    this.curatorUserIds = [...this.curatorUserIds, id];
    this.curatorUsernames[id] = username;
    this.setting('forumaker-rolevaya.curatorUserIds')(JSON.stringify(this.curatorUserIds));
    m.redraw();
  }

  private removeCurator(id: number) {
    this.curatorUserIds = this.curatorUserIds.filter((x) => x !== id);
    this.setting('forumaker-rolevaya.curatorUserIds')(JSON.stringify(this.curatorUserIds));
    m.redraw();
  }

  // --- render ------------------------------------------------------------

  content() {
    return (
      <div className="RolevayaAdmin">
        <div className="RolevayaAdmin-shell">
          {this.renderBestBonus()}
          {this.renderManualPerks()}
          {this.renderTags()}
          {this.renderFilters()}
          <div className="RolevayaAdminSubmit">{this.submitButton()}</div>
        </div>
      </div>
    );
  }

  private renderBestBonus() {
    return (
      <BestBonusSection
        bestBonus={this.bestBonus}
        collapsed={this.bestBonusCollapsed}
        onToggleCollapse={() => {
          this.bestBonusCollapsed = !this.bestBonusCollapsed;
          m.redraw();
        }}
        onUpdate={(field, value) => this.updateBestBonus(field, value)}
      />
    );
  }

  private renderManualPerks() {
    return Section(
      'fas fa-wand-sparkles',
      'Дары',
      'Ручные перки для конкретных анкет',
      <ManualPerksSection
        groups={this.manualPerkGroups}
        collapsedGroups={this.collapsedGroups}
        discussionTitles={this.discussionTitles}
        newDiscussionId={this.newDiscussionId}
        onNewDiscussionIdChange={(value) => {
          this.newDiscussionId = value;
        }}
        onAddGroup={() => this.addDiscussionGroup()}
        onToggleGroup={(id) => this.toggleGroup(id)}
        onAddPerk={(groupIndex) => this.addPerkToGroup(groupIndex)}
        onRemoveGroup={(groupIndex) => this.removeDiscussionGroup(groupIndex)}
        onRemovePerk={(groupIndex, perkIndex) => this.removeManualPerk(groupIndex, perkIndex)}
        onUpdatePerk={(groupIndex, perkIndex, field, value) => this.updateManualPerk(groupIndex, perkIndex, field, value)}
      />
    );
  }

  private renderTags() {
    return Section(
      'fas fa-tags',
      'Теги',
      'Откуда Зал Славы собирает статистику',
      <TagsSection
        loaded={this.tagsLoaded}
        tagCharacters={this.tagCharacters}
        tagCharactersTag={this.tagCharactersTag}
        tagRole={this.tagRole}
        tagRoleTag={this.tagRoleTag}
        tagEpisodes={this.tagEpisodes}
        tagEpisodesTag={this.tagEpisodesTag}
        arenaTagSlug={this.arenaTagSlug}
        arenaTag={this.arenaTagSlugTag}
        onPickCharacters={(tag) => this.pickTag('characters', tag)}
        onPickRole={(tag) => this.pickTag('role', tag)}
        onPickEpisodes={(tag) => this.pickTag('episodes', tag)}
        onPickArena={(tag) => this.pickTag('arena', tag)}
      />
    );
  }

  private renderFilters() {
    return Section(
      'fas fa-users-slash',
      'Игроки и ID',
      'Фильтры Зала Славы',
      <FiltersSection
        tagCharacters={this.tagCharacters}
        guardianDiscussionIds={this.guardianDiscussionIds}
        guardianTitles={this.discussionTitles}
        onAddGuardian={(id, title) => this.addGuardianDiscussion(id, title)}
        onRemoveGuardian={(id) => this.removeGuardianDiscussion(id)}
        curatorUserIds={this.curatorUserIds}
        curatorUsernames={this.curatorUsernames}
        onAddCurator={(id, username) => this.addCurator(id, username)}
        onRemoveCurator={(id) => this.removeCurator(id)}
        excludeCharacterDiscussionIdsText={this.excludeCharacterDiscussionIdsText}
        onExcludeCharacterDiscussionIdsInput={(value) => {
          this.excludeCharacterDiscussionIdsText = value;
        }}
        onExcludeCharacterDiscussionIdsCommit={() =>
          this.updateIdListSetting('forumaker-rolevaya.excludeCharacterDiscussionIds', this.excludeCharacterDiscussionIdsText)
        }
        activityPeriodDaysText={this.activityPeriodDaysText}
        onActivityPeriodDaysInput={(value) => {
          this.activityPeriodDaysText = value;
        }}
        onActivityPeriodDaysCommit={() => this.updateActivityPeriodDaysSetting(this.activityPeriodDaysText)}
      />
    );
  }
}
