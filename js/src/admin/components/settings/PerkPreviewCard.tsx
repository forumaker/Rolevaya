import { renderMarkdownInline } from '../../../common/markdown';

type Attrs = { label: string; icon: string; color: string; description: string };

/**
 * Live preview of a perk card (Бонус Лучшего or a manual perk), as it would
 * render on the forum. Shared by BestBonusSection and ManualPerkGroupCard.
 *
 * This is a plain render helper, called directly as PerkPreviewCard(attrs) —
 * NOT used as a JSX tag (<PerkPreviewCard .../>). Mithril treats a function
 * passed as a JSX/m() tag as a closure component (called once, expected to
 * return {view: ...}), which breaks on the second redraw when the function
 * instead returns JSX directly. Calling it as a normal function sidesteps
 * that whole component-lifecycle machinery.
 */
export default function PerkPreviewCard(attrs: Attrs) {
  const { label, icon, color, description } = attrs;

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
        {description ? renderMarkdownInline(description) : 'Описание дара появится здесь. Можно использовать Markdown.'}
      </div>
    </div>
  );
}
