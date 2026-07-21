import Switch from 'flarum/common/components/Switch';
import PerkPreviewCard from './PerkPreviewCard';

export type BestBonusSetting = {
  enabled: boolean;
  label: string;
  icon: string;
  color: string;
  description: string;
};

type Attrs = {
  bestBonus: BestBonusSetting;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onUpdate: (field: keyof BestBonusSetting, value: any) => void;
};

export default function BestBonusSection(attrs: Attrs) {
  const { bestBonus, collapsed, onToggleCollapse, onUpdate } = attrs;

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
            <span className="RolevayaGroupCard-title">Бонус Лучшего</span>
            <span className="RolevayaGroupCard-subtitle">{bestBonus.enabled ? 'Включён' : 'Выключен'}</span>
          </span>
        </button>
      </div>

      {!collapsed && (
        <div className="RolevayaAdminGrid RolevayaAdminGrid--bonus">
          <div className="RolevayaAdminPanel">
            <div className="Form-group RolevayaToggleGroup">
              {Switch.component(
                {
                  state: bestBonus.enabled,
                  onchange: (value: boolean) => onUpdate('enabled', value),
                },
                'Показывать Бонус Лучшего в Зале Славы'
              )}
            </div>

            <div className="Form-group">
              <label>Название</label>
              <input
                className="FormControl"
                value={bestBonus.label}
                oninput={(e: any) => onUpdate('label', e.target.value)}
                placeholder="Бонус Лучшего"
              />
            </div>

            <div className="Form-group">
              <label>Иконка Font Awesome</label>
              <input
                className="FormControl RolevayaInput--medium"
                value={bestBonus.icon}
                oninput={(e: any) => onUpdate('icon', e.target.value)}
                placeholder="fa-duotone fa-regular fa-crown"
              />
            </div>

            <div className="Form-group">
              <label>Цвет иконки</label>
              <input
                className="FormControl RolevayaInput--colorText"
                value={bestBonus.color}
                oninput={(e: any) => onUpdate('color', e.target.value)}
                placeholder="#a855f7"
              />
            </div>

            <div className="Form-group">
              <label>Описание</label>
              <textarea
                className="FormControl"
                rows={5}
                value={bestBonus.description}
                oninput={(e: any) => onUpdate('description', e.target.value)}
                placeholder="Описание дара"
              />
            </div>
          </div>

          <div className="RolevayaAdminAside">
            {PerkPreviewCard({ label: bestBonus.label, icon: bestBonus.icon, color: bestBonus.color, description: bestBonus.description })}
          </div>
        </div>
      )}
    </div>
  );
}
