import Button from 'flarum/common/components/Button';
import ManualPerkGroupCard from './ManualPerkGroupCard';
import type { ManualPerk, ManualPerkGroup } from './types';

type Attrs = {
  groups: ManualPerkGroup[];
  collapsedGroups: Record<number, boolean>;
  discussionTitles: Record<number, string>;
  newDiscussionId: string;
  onNewDiscussionIdChange: (value: string) => void;
  onAddGroup: () => void;
  onToggleGroup: (discussionId: number) => void;
  onAddPerk: (groupIndex: number) => void;
  onRemoveGroup: (groupIndex: number) => void;
  onRemovePerk: (groupIndex: number, perkIndex: number) => void;
  onUpdatePerk: (groupIndex: number, perkIndex: number, field: keyof ManualPerk, value: any) => void;
};

/** "Дары" section: add a discussion, then attach one or more perk cards to it. */
export default function ManualPerksSection({
  groups,
  collapsedGroups,
  discussionTitles,
  newDiscussionId,
  onNewDiscussionIdChange,
  onAddGroup,
  onToggleGroup,
  onAddPerk,
  onRemoveGroup,
  onRemovePerk,
  onUpdatePerk,
}: Attrs) {
  return (
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
                value={newDiscussionId}
                oninput={(e: any) => onNewDiscussionIdChange(e.target.value)}
                placeholder="Например: 123"
              />

              <Button className="Button Button--primary" type="button" onclick={onAddGroup}>
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

      {groups.length === 0 ? (
        <div className="RolevayaEmptyState">
          <div className="RolevayaEmptyState-icon">
            <i className="fas fa-sparkles" aria-hidden="true" />
          </div>
          <div className="RolevayaEmptyState-title">Пока нет ни одной карточки</div>
          <div className="RolevayaEmptyState-text">Добавь ID темы, чтобы создать первую карточку с дарами.</div>
        </div>
      ) : null}

      {groups.map((group, groupIndex) => (
        <ManualPerkGroupCard
          key={`group-${group.discussion_id}`}
          group={group}
          title={discussionTitles[group.discussion_id] ?? `#${group.discussion_id}…`}
          collapsed={collapsedGroups[group.discussion_id] !== false}
          onToggleCollapse={() => onToggleGroup(group.discussion_id)}
          onAddPerk={() => onAddPerk(groupIndex)}
          onRemoveGroup={() => onRemoveGroup(groupIndex)}
          onRemovePerk={(perkIndex) => onRemovePerk(groupIndex, perkIndex)}
          onUpdatePerk={(perkIndex, field, value) => onUpdatePerk(groupIndex, perkIndex, field, value)}
        />
      ))}
    </div>
  );
}
