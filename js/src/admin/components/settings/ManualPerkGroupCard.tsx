import Button from 'flarum/common/components/Button';
import PerkPreviewCard from './PerkPreviewCard';
import type { ManualPerk, ManualPerkGroup } from './types';

type Attrs = {
  group: ManualPerkGroup;
  title: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onAddPerk: () => void;
  onRemoveGroup: () => void;
  onRemovePerk: (perkIndex: number) => void;
  onUpdatePerk: (perkIndex: number, field: keyof ManualPerk, value: any) => void;
};

/**
 * One "discussion → its perks" card inside the Дары section.
 *
 * Mithril calls plain-function components with the vnode (props at
 * vnode.attrs), not with attrs directly, so props are read from `attrs`.
 */
export default function ManualPerkGroupCard({ attrs }: { attrs: Attrs }) {
  const { group, title, collapsed, onToggleCollapse, onAddPerk, onRemoveGroup, onRemovePerk, onUpdatePerk } = attrs;

  return (
    <div className={'RolevayaGroupCard' + (collapsed ? ' is-collapsed' : '')}>
      <div className="RolevayaGroupCard-header">
        <button
          className="RolevayaGroupCard-toggle"
          type="button"
          aria-expanded={collapsed ? 'false' : 'true'}
          onclick={onToggleCollapse}
        >
          <i className={collapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-down'} aria-hidden="true" />
          <span className="RolevayaGroupCard-titleWrap">
            <span className="RolevayaGroupCard-title">{title}</span>
            <span className="RolevayaGroupCard-subtitle">
              {group.perks.length === 0 ? 'Даров пока нет' : `Даров: ${group.perks.length}`}
            </span>
          </span>
        </button>

        <div className="RolevayaGroupCard-actions">
          <Button className="Button Button--primary" type="button" onclick={onAddPerk}>
            Добавить дар
          </Button>

          <Button className="Button Button--danger" type="button" onclick={onRemoveGroup}>
            Удалить карточку
          </Button>
        </div>
      </div>

      {!collapsed && (
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

                  <Button className="Button Button--danger" type="button" onclick={() => onRemovePerk(perkIndex)}>
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
                        oninput={(e: any) => onUpdatePerk(perkIndex, 'label', e.target.value)}
                        placeholder="Название дара"
                      />
                    </div>

                    <div className="Form-group">
                      <label>Иконка Font Awesome</label>
                      <input
                        className="FormControl RolevayaInput--medium"
                        value={perk.icon}
                        oninput={(e: any) => onUpdatePerk(perkIndex, 'icon', e.target.value)}
                        placeholder="fa-solid fa-spider"
                      />
                    </div>

                    <div className="Form-group">
                      <label>Цвет иконки</label>
                      <input
                        className="FormControl RolevayaInput--colorText"
                        value={perk.color}
                        oninput={(e: any) => onUpdatePerk(perkIndex, 'color', e.target.value)}
                        placeholder="#a855f7"
                      />
                    </div>

                    <div className="Form-group">
                      <label>Описание</label>
                      <textarea
                        className="FormControl"
                        rows={5}
                        value={perk.description}
                        oninput={(e: any) => onUpdatePerk(perkIndex, 'description', e.target.value)}
                        placeholder="Описание дара"
                      />
                    </div>
                  </div>

                  <div className="RolevayaAdminAside">
                    <PerkPreviewCard label={perk.label} icon={perk.icon} color={perk.color} description={perk.description} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
