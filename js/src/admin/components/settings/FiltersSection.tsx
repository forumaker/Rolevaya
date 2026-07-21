import GuardianCharacterField from './GuardianCharacterField';
import CuratorUserField from './CuratorUserField';

type Attrs = {
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

/** "Игроки и ID" section: leaderboard exclusion filters. */
export default function FiltersSection({
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
}: Attrs) {
  return (
    <div className="RolevayaAdminPanel">
      <div className="Form-group">
        <label>ID Хранителей</label>
        <GuardianCharacterField
          tagSlug={tagCharacters}
          ids={guardianDiscussionIds}
          titles={guardianTitles}
          onAdd={onAddGuardian}
          onRemove={onRemoveGuardian}
        />
        <p className="helpText">Найдите анкету по названию и выберите её — можно добавить несколько.</p>
      </div>

      <div className="Form-group">
        <label>ID Кураторов</label>
        <CuratorUserField ids={curatorUserIds} usernames={curatorUsernames} onAdd={onAddCurator} onRemove={onRemoveCurator} />
        <p className="helpText">Найдите пользователя по имени и выберите его — можно добавить несколько.</p>
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
