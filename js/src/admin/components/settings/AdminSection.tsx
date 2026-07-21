import type m from 'mithril';

export function Section(iconClass: string, title: string, description: string, content: m.Children) {
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
