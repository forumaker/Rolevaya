import { renderMarkdownInline } from '../../../common/markdown';

/**
 * Live preview of a perk card (Бонус Лучшего or a manual perk), as it would
 * render on the forum. Shared by BestBonusSection and ManualPerkGroupCard.
 */
export default function PerkPreviewCard(props: { label: string; icon: string; color: string; description: string }) {
  const { label, icon, color, description } = props;

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
