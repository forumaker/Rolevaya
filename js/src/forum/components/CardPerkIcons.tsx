import Component from 'flarum/common/Component';
import type m from 'mithril';
import { renderMarkdownParagraphs } from '../../common/markdown';

export type CardPerk = {
  key: string;
  label: string;
  icon?: string;
  color?: string;
  description?: string;
};

type PopPos = {
  top: number;
  left: number;
  placement: 'bottom' | 'top';
};

type Attrs = {
  perks: CardPerk[];
};

export default class CardPerkIcons extends Component<Attrs> {
  private openKey: string | null = null;
  private pinned = false;

  private btnEls: Record<string, HTMLElement | null> = {};
  private pos: PopPos | null = null;
  private raf = 0;

  private portalHost: HTMLElement | null = null;

  oninit(vnode: any) {
    super.oninit(vnode);

    const onDocPointerDown = (e: any) => {
      if (!this.openKey) return;

      const t = e?.target as HTMLElement | null;
      if (!t) return;

      if (t.closest?.('.RolevayaPerkIconButton')) return;
      if (t.closest?.('.RolevayaPerkPopover')) return;

      this.close();
    };

    const onDocKeyDown = (e: KeyboardEvent) => {
      if (!this.openKey) return;
      if (e.key === 'Escape') this.close();
    };

    const onWinScroll = () => {
      if (!this.openKey) return;
      this.scheduleReposition();
    };

    const onWinResize = () => {
      if (!this.openKey) return;
      this.scheduleReposition();
    };

    document.addEventListener('pointerdown', onDocPointerDown, { capture: true });
    document.addEventListener('keydown', onDocKeyDown);
    window.addEventListener('scroll', onWinScroll, true);
    window.addEventListener('resize', onWinResize);

    (this as any)._cleanup = () => {
      document.removeEventListener('pointerdown', onDocPointerDown, { capture: true } as any);
      document.removeEventListener('keydown', onDocKeyDown);
      window.removeEventListener('scroll', onWinScroll, true as any);
      window.removeEventListener('resize', onWinResize);

      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = 0;

      this.renderPortal(false);

      if (this.portalHost && this.portalHost.parentElement) {
        this.portalHost.parentElement.removeChild(this.portalHost);
      }

      this.portalHost = null;
    };
  }

  onremove(vnode: any) {
    const cleanup = (this as any)._cleanup;
    if (typeof cleanup === 'function') cleanup();
    super.onremove(vnode);
  }

  close() {
    this.openKey = null;
    this.pinned = false;
    this.pos = null;
    this.renderPortal(false);
    m.redraw();
  }

  private openPopover(perkKey: string, pinned: boolean) {
    this.openKey = perkKey;
    this.pinned = pinned;
    this.scheduleReposition();
    this.renderPortal(true);
    m.redraw();
  }

  private ensurePortalHost() {
    if (this.portalHost && document.body.contains(this.portalHost)) return;

    const el = document.createElement('div');
    el.className = 'RolevayaPerkPortalHost';
    el.style.position = 'fixed';
    el.style.inset = '0';
    el.style.pointerEvents = 'none';
    el.style.zIndex = '100000';
    document.body.appendChild(el);
    this.portalHost = el;
  }

  private scheduleReposition() {
    if (this.raf) cancelAnimationFrame(this.raf);

    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.reposition();
      this.renderPortal(!!this.openKey);
    });
  }

  private reposition() {
    if (!this.openKey) return;

    const btn = this.btnEls[this.openKey];
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const vw = window.innerWidth || document.documentElement.clientWidth || 0;
    const vh = window.innerHeight || document.documentElement.clientHeight || 0;

    const margin = 10;
    const popW = Math.min(360, Math.max(260, vw - margin * 2));
    const approxH = 260;

    let top = rect.bottom + 10;
    let placement: PopPos['placement'] = 'bottom';

    if (top + approxH > vh - margin) {
      top = rect.top - 10 - approxH;
      placement = 'top';
    }

    let left = rect.right - popW;
    left = Math.max(margin, Math.min(vw - margin - popW, left));
    top = Math.max(margin, Math.min(vh - margin - 60, top));

    this.pos = { top, left, placement };
  }

  private renderPerkDescription(text: string): m.Children {
    const rendered = renderMarkdownParagraphs(text);
    return rendered ?? 'Описание пока не добавлено';
  }

  private renderPortal(open: boolean) {
    if (!open || !this.openKey) {
      if (this.portalHost) m.render(this.portalHost, null);
      return;
    }

    this.ensurePortalHost();

    const perk = (this.attrs.perks || []).find((item) => item.key === this.openKey);
    if (!perk) return;

    const pos = this.pos;
    const margin = 10;

    const popStyle: any = {
      position: 'fixed',
      top: pos ? `${pos.top}px` : `${margin}px`,
      left: pos ? `${pos.left}px` : `${margin}px`,
      width: `min(360px, calc(100vw - ${margin * 2}px))`,
      maxWidth: `calc(100vw - ${margin * 2}px)`,
      borderRadius: '14px',
      padding: '12px 12px',
      background: 'var(--body-bg)',
      color: 'var(--text-color)',
      boxShadow: '0 14px 34px rgba(0,0,0,0.24)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      pointerEvents: 'auto',
    };

    const titleStyle: any = {
      fontWeight: 800,
      fontSize: '13px',
      letterSpacing: '0.01em',
      margin: '0 0 6px',
    };

    const textStyle: any = {
      fontSize: '12.5px',
      lineHeight: 1.5,
      opacity: 0.92,
    };

    const arrowStyle: any = {
      position: 'absolute',
      width: 10,
      height: 10,
      background: 'var(--body-bg)',
      transform: 'rotate(45deg)',
      top: pos?.placement === 'top' ? 'auto' : '-5px',
      bottom: pos?.placement === 'top' ? '-5px' : 'auto',
      right: 18,
      borderRadius: 2,
    };

    const vnode = (
      <div>
        <div
          className="RolevayaPerkPopover"
          role="dialog"
          aria-label={perk.label}
          style={popStyle}
          onclick={(e: any) => e.stopPropagation?.()}
          onmouseenter={() => {
            if (this.pinned) return;
            if (!this.openKey) return;
          }}
          onmouseleave={() => {
            if (this.pinned) return;
            this.close();
          }}
        >
          <div aria-hidden="true" style={arrowStyle} />
          <div className="RolevayaPerkTitle" style={titleStyle}>
            {perk.label}
          </div>
          <div className="RolevayaPerkDescription" style={textStyle}>
            {this.renderPerkDescription(perk.description || '')}
          </div>
        </div>
      </div>
    );

    if (this.portalHost) {
      m.render(this.portalHost, vnode as any);
    }
  }

  view() {
    const perks = this.attrs.perks || [];
    if (!perks.length) return null;

    const wrapStyle: any = {
      position: 'absolute',
      top: '12px',
      right: '12px',
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '8px',
    };

    const baseBtnStyle: any = {
      border: 0,
      padding: 0,
      background: 'transparent',
      boxShadow: 'none',
      cursor: 'pointer',
      fontSize: '18px',
      lineHeight: 1,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      WebkitTapHighlightColor: 'transparent',
      userSelect: 'none',
    };

    return (
      <div className="RolevayaCardPerksCorner" style={wrapStyle}>
        {perks.map((perk) => (
          <button
            type="button"
            key={perk.key}
            className={'RolevayaPerkIconButton' + (this.openKey === perk.key ? ' is-open' : '')}
            aria-label={perk.label}
            aria-expanded={this.openKey === perk.key ? 'true' : 'false'}
            title={perk.label}
            style={{
              ...baseBtnStyle,
              color: perk.color || '#a855f7',
            }}
            oncreate={(vnode: any) => {
              this.btnEls[perk.key] = vnode?.dom as HTMLElement | null;
              if (this.openKey === perk.key) this.scheduleReposition();
            }}
            onupdate={(vnode: any) => {
              this.btnEls[perk.key] = vnode?.dom as HTMLElement | null;
            }}
            onmouseenter={() => {
              if (this.pinned) return;
              if (this.openKey !== perk.key) this.openPopover(perk.key, false);
            }}
            onmouseleave={() => {
              if (this.pinned) return;
              this.close();
            }}
            onfocus={() => {
              if (this.pinned) return;
              if (this.openKey !== perk.key) this.openPopover(perk.key, false);
            }}
            onblur={() => {
              if (this.pinned) return;
              this.close();
            }}
            onclick={(e: any) => {
              e.preventDefault?.();
              e.stopPropagation?.();

              if (this.openKey === perk.key && this.pinned) {
                this.close();
                return;
              }

              this.openPopover(perk.key, true);
            }}
          >
            {perk.icon ? <i className={perk.icon} aria-hidden="true" /> : <span aria-hidden="true">✦</span>}
          </button>
        ))}
      </div>
    );
  }
}