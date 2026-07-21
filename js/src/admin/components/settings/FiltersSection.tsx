import LoadingIndicator from 'flarum/common/components/LoadingIndicator';
import GuardianCharacterField from './GuardianCharacterField';
import CuratorUserField from './CuratorUserField';

type Attrs = {
  // True until every guardian discussion title / curator username has
  // been fetched at least once — see RolevayaSettingsPage.oninit. Used to
  // show a loading indicator instead of the pickers, so a page reload
  // doesn't flash raw "#id…" chip labels before swapping in real titles.
  loading: boolean;
  tagCharacters: string;
  guardianDiscussionIds: number[];
  guardianTitles: Record<number, string>;
  onAddGuardian: (id: number, title: string) => void;
  onRemoveGuardian: (id: number) => void;

  curatorUserIds: number[];
  curatorUsernames: Record<number, string>;
  onAddCurator: (id: number, username: string) => void;
  onRemoveCurator: (id: number) => void;

  excludeCharacterDiscussionIdsText: string;
  onExcludeCharacterDiscussionIdsInput: (value: string) => void;
  onExcludeCharacterDiscussionIdsCommit: () => void;

  activityPeriodDaysText: string;
  onActivityPeriodDaysInput: (value: string) => void;
  onActivityPeriodDaysCommit: () => void;
};

/**
 * "Игроки и ID" section: leaderboard exclusion filters.
 *
 * Called directly as FiltersSection(attrs), not used as a JSX tag — see
 * PerkPreviewCard.tsx for why.
 */
export default function FiltersSection(attrs: Attrs) {
  const {
    loading,
    tagCharacters,
    guardianDiscussionIds,
    guardianTitles,
    onAddGuardian,
    onRemoveGuardian,
    curatorUserIds,
    curatorUsernames,
    onAddCurator,
    onRemoveCurator,
    excludeCharacterDiscussionIdsText,
    onExcludeCharacterDiscussionIdsInput,
    onExcludeCharacterDiscussionIdsCommit,
    activityPeriodDaysText,
    onActivityPeriodDaysInput,
    onActivityPeriodDaysCommit,
  } = attrs;

  return (
    <div className="RolevayaAdminPanel">
      <div className="Form-group">
        <label>ID Хранителей</label>
        {loading ? (
          <div className="RolevayaSearchSelect-loading">
            <LoadingIndicator size="small" display="inline" />
          </div>
        ) : (
          GuardianCharacterField({
            tagSlug: tagCharacters,
            ids: guardianDiscussionIds,
            titles: guardianTitles,
            onAdd: onAddGuardian,
            onRemove: onRemoveGuardian,
          })
        )}
      </div>

      <div className="Form-group">
        <label>ID Кураторов</label>
        {loading ? (
          <div className="RolevayaSearchSelect-loading">
            <LoadingIndicator size="small" display="inline" />
          </div>
        ) : (
          <CuratorUserField ids={curatorUserIds} usernames={curatorUsernames} onAdd={onAddCurator} onRemove={onRemoveCurator} />
        )}
      </div>

      <div className="Form-group">
        <label>ID исключенных анкет</label>
        <input
          className="FormControl"
          value={excludeCharacterDiscussionIdsText}
          oninput={(e: any) => onExcludeCharacterDiscussionIdsInput(e.target.value)}
          onchange={onExcludeCharacterDiscussionIdsCommit}
          placeholder="Например: 12, 45"
        />
        <p className="helpText">Укажите через запятую ID тем, которые нужно исключить из Зала Славы</p>
      </div>

      <div className="Form-group">
        <label>Дни активности. 0 — за всё время</label>
        <input
          className="FormControl RolevayaInput--medium"
          type="number"
          min="0"
          value={activityPeriodDaysText}
          oninput={(e: any) => onActivityPeriodDaysInput(e.target.value)}
          onchange={onActivityPeriodDaysCommit}
          placeholder="0"
        />
      </div>
    </div>
  );
}
