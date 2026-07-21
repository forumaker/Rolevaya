import type m from 'mithril';

/**
 * Shared collapsible-section chrome used by every block on
 * RolevayaSettingsPage (Дары, Теги, Игроки и ID, ...). Pulled out of the old
 * monolithic content() method so each section's own file only has to render
 * its inner content.
 */
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
