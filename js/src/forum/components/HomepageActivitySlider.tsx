import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Link from 'flarum/common/components/Link';
import User from 'flarum/common/models/User';
import Avatar from 'flarum/common/components/Avatar';
import type Mithril from 'mithril';
import { avatarUrl, playerName, userProfilePath } from './stats/statsShared';
import type { CarouselController } from './homeSlider/CarouselController';
import type { RowIdentity } from './homeSlider/sliderCache';
import { RoleplaySource } from './homeSlider/RoleplaySource';
import { ArenaSource } from './homeSlider/ArenaSource';

type HomeTab = 'roleplay' | 'arena';

interface TabSource<T extends RowIdentity> {
  rows: T[];
  loading: boolean;
  error: string | null;
  carousel: CarouselController;
  handleTouchEnd(): void;
  renderStats(row: T): Mithril.Children;
  renderActions(className: string): Mithril.Children;
}

/**
 * Обе вкладки («Ролевая» и «Арена») рендерятся ОДНИМ и тем же деревом узлов
 * ниже (renderTabPanel) — раньше это были два отдельных компонента,
 * постоянно смонтированных и переключаемых через display:none/block. При
 * переключении вкладки такой скрытый блок мгновенно схлопывался в 0 высоты
 * и тут же разворачивался обратно — судя по всему, вместе со SVG-картинками
 * виджета Fresh над ним это давало на мгновение мерцание всей страницы, а
 * не только самого виджета.
 *
 * Теперь при смене вкладки Mithril просто патчит один и тот же набор
 * div/article-узлов новыми данными (в .RolevayaHomeWidget-track реально
 * пересоздаются только карточки строк — обычная keyed-диффовка списка, а не
 * весь виджет), никакого display:none/block переключения целиком поддерева
 * больше нет.
 */
export default class HomepageActivitySlider extends Component {
  activeTab: HomeTab = 'roleplay';

  private roleplay = new RoleplaySource();
  private arena = new ArenaSource();

  oninit(vnode: Mithril.Vnode) {
    super.oninit(vnode);

    this.roleplay.init();
    this.arena.init();
  }

  onremove() {
    this.roleplay.dispose();
    this.arena.dispose();
  }

  private switchTab(tab: HomeTab) {
    if (this.activeTab === tab) return;

    this.activeTab = tab;
    this.arena.active = tab === 'arena';
    if (tab === 'arena') this.arena.activate();

    m.redraw();
  }

  private renderTabs() {
    return (
      <div className="RolevayaHomeWidget-tabs">
        <button
          type="button"
          className={'Button RolevayaFilterBtn' + (this.activeTab === 'roleplay' ? ' active' : '')}
          onclick={() => this.switchTab('roleplay')}
        >
          Ролевая
        </button>

        <button
          type="button"
          className={'Button RolevayaFilterBtn' + (this.activeTab === 'arena' ? ' active' : '')}
          onclick={() => this.switchTab('arena')}
        >
          Арена
        </button>
      </div>
    );
  }

  private renderTabPanel<T extends RowIdentity>(source: TabSource<T>, keyPrefix: string): Mithril.Children {
    const { rows, loading, error, carousel } = source;

    if (loading && !rows.length) return <p className="RolevayaHomeWidget-state">Творим магию...</p>;
    if (error && !rows.length) return <p className="RolevayaHomeWidget-state">{error}</p>;
    if (!rows.length) return null;

    const visibleCount = carousel.visibleCount;
    const trackWidth = (rows.length * 100) / visibleCount;
    const slideWidth = 100 / rows.length;
    const translate = carousel.index * (100 / rows.length);
    const showNav = rows.length > visibleCount;

    const renderArrow = (direction: 'prev' | 'next', variant: 'desktop' | 'mobile') => {
      const isPrev = direction === 'prev';

      return (
        <button
          type="button"
          className={
            'Button Button--secondary RolevayaHomeWidget-arrow RolevayaHomeWidget-arrow--' +
            variant +
            (variant === 'desktop' ? ' RolevayaHomeWidget-arrow--' + direction : '')
          }
          onclick={() => {
            if (isPrev) carousel.prev(rows.length);
            else carousel.next(rows.length);
            m.redraw();
          }}
          aria-label={isPrev ? 'Показать предыдущую карточку' : 'Показать следующую карточку'}
        >
          <i className={'fa-solid fa-chevron-' + (isPrev ? 'left' : 'right')} aria-hidden="true" />
        </button>
      );
    };

    return (
      <>
        <div className="RolevayaHomeWidget-stage">
          {showNav ? renderArrow('prev', 'desktop') : null}

          <div
            className="RolevayaHomeWidget-viewport"
            ontouchstart={(e: TouchEvent) => carousel.handleTouchStart(e)}
            ontouchmove={(e: TouchEvent) => carousel.handleTouchMove(e)}
            ontouchend={() => source.handleTouchEnd()}
            ontouchcancel={() => source.handleTouchEnd()}
          >
            <div
              className="RolevayaHomeWidget-track"
              style={{
                width: `${trackWidth}%`,
                transform: `translateX(-${translate}%)`,
              }}
            >
              {rows.map((row, index) => {
                const player = playerName(row);
                const profile = userProfilePath(row.user_id, row.username);
                const userModel = app.store.getById('users', String(row.user_id)) as User | null;
                const fallbackAvatar = userModel ? null : avatarUrl(row);

                return (
                  <div
                    className="RolevayaHomeWidget-slide"
                    key={`${keyPrefix}-${row.user_id}-${index}`}
                    style={{ width: `${slideWidth}%` }}
                  >
                    <article className="RolevayaHomeCard">
                      <div className="RolevayaHomeCard-top">
                        <div className="RolevayaHomeCard-rank">{index + 1}</div>

                        <div className="RolevayaHomeCard-user">
                          <Link href={profile} className="RolevayaHomeCard-avatarLink" title={player}>
                            {userModel ? (
                              <Avatar user={userModel} className="RolevayaHomeCard-avatar" />
                            ) : fallbackAvatar ? (
                              <img className="RolevayaHomeCard-avatar" src={fallbackAvatar} alt={player} loading="lazy" />
                            ) : (
                              <span className="RolevayaHomeCard-avatar RolevayaHomeCard-avatar--placeholder" aria-hidden="true" />
                            )}
                          </Link>

                          <div className="RolevayaHomeCard-userMeta">
                            <div className="RolevayaHomeCard-name">
                              <Link href={profile}>{player}</Link>
                            </div>
                          </div>
                        </div>
                      </div>

                      {source.renderStats(row)}
                    </article>
                  </div>
                );
              })}
            </div>
          </div>

          {showNav ? renderArrow('next', 'desktop') : null}

          {showNav ? (
            <div className="RolevayaHomeWidget-arrowWrap">
              {renderArrow('prev', 'mobile')}
              {renderArrow('next', 'mobile')}
            </div>
          ) : null}
        </div>

        <div className="RolevayaHomeWidget-actions RolevayaHomeWidget-actions--desktop">
          {source.renderActions('RolevayaHomeWidget-hallLink RolevayaHomeWidget-hallLink--desktop')}
        </div>

        <div className="RolevayaHomeWidget-actions RolevayaHomeWidget-actions--mobile">
          {source.renderActions('RolevayaHomeWidget-hallLink RolevayaHomeWidget-hallLink--mobile')}
        </div>
      </>
    );
  }

  view() {
    return (
      <section className="RolevayaHomeWidget">
        <div className="RolevayaHomeWidget-box">
          {this.renderTabs()}

          {this.activeTab === 'roleplay'
            ? this.renderTabPanel(this.roleplay, 'rolevaya-home-rp')
            : this.renderTabPanel(this.arena, 'rolevaya-home-arena')}
        </div>
      </section>
    );
  }
}
