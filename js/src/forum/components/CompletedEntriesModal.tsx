import app from 'flarum/forum/app';
import Modal, { IInternalModalAttrs } from 'flarum/common/components/Modal';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';
import Link from 'flarum/common/components/Link';
import type Mithril from 'mithril';
import { apiUrl, forumBaseUrl } from './stats/statsShared';

type EntryKind = 'arcs' | 'episodes';

type EntryRow = {
  id: number;
  arc_title?: string;
  discussion_id: number;
  discussion_title: string | null;
  discussion_slug: string | null;
  source_post_id: number | null;
  source_post_number: number | null;
  parsed_at: string | null;
};

type NormalizedEntry = {
  id: number;
  title: string;
  subtitle: string | null;
  url: string;
};

interface CompletedEntriesModalAttrs extends IInternalModalAttrs {
  kind: EntryKind;
  userId: number;
  playerName: string;
}

const KIND_CONFIG: Record<EntryKind, { buttonLabel: string; modalTitle: string; apiPath: string; emptyText: string }> = {
  arcs: {
    buttonLabel: 'Арки',
    modalTitle: 'Завершённые арки',
    apiPath: '/rolevaya/completed-arcs',
    emptyText: 'Завершённых арок пока нет',
  },
  episodes: {
    buttonLabel: 'Эпизоды',
    modalTitle: 'Завершённые эпизоды',
    apiPath: '/rolevaya/completed-episodes',
    emptyText: 'Завершённых эпизодов пока нет',
  },
};

export default class CompletedEntriesModal extends Modal<CompletedEntriesModalAttrs> {
  loading = true;
  error: string | null = null;
  rows: EntryRow[] = [];

  oninit(vnode: Mithril.Vnode<CompletedEntriesModalAttrs>) {
    super.oninit(vnode);

    void this.load();
  }

  className(): string {
    return 'CompletedEntriesModal Modal--small';
  }

  title(): Mithril.Children {
    return KIND_CONFIG[this.attrs.kind].modalTitle;
  }

  private discussionUrl(row: EntryRow) {
    const base = forumBaseUrl();
    const slug = (row.discussion_slug || '').trim();
    const path = slug ? `/d/${row.discussion_id}-${slug}` : `/d/${row.discussion_id}`;
    const suffix = row.source_post_number ? `/${row.source_post_number}` : '';

    return `${base}${path}${suffix}`;
  }

  private normalize(row: EntryRow): NormalizedEntry {
    const url = this.discussionUrl(row);

    if (this.attrs.kind === 'arcs') {
      return {
        id: row.id,
        title: row.arc_title || row.discussion_title || '',
        subtitle: row.discussion_title,
        url,
      };
    }

    return {
      id: row.id,
      title: row.discussion_title || KIND_CONFIG.episodes.buttonLabel,
      subtitle: null,
      url,
    };
  }

  private async load() {
    this.loading = true;
    this.error = null;
    m.redraw();

    try {
      const res = await app.request<any>({
        method: 'GET',
        url: apiUrl(KIND_CONFIG[this.attrs.kind].apiPath),
        params: {
          user_id: this.attrs.userId,
        },
      });

      this.rows = (res?.data || []) as EntryRow[];
    } catch (e: any) {
      this.error = e?.message || 'Не удалось загрузить список';
      this.rows = [];
    } finally {
      this.loading = false;
      m.redraw();
    }
  }

  content(): Mithril.Children {
    if (this.loading) {
      return (
        <div className="Modal-body CompletedEntriesModal-body">
          <LoadingIndicator />
        </div>
      );
    }

    if (this.error) {
      return (
        <div className="Modal-body CompletedEntriesModal-body">
          <p className="helpText">{this.error}</p>
        </div>
      );
    }

    if (!this.rows.length) {
      return (
        <div className="Modal-body CompletedEntriesModal-body">
          <p>{KIND_CONFIG[this.attrs.kind].emptyText}</p>
        </div>
      );
    }

    return (
      <div className="Modal-body CompletedEntriesModal-body">
        <ul className="CompletedEntriesModal-list">
          {this.rows.map((row, index) => {
            const entry = this.normalize(row);

            return (
              <li className="CompletedEntriesModal-item" key={entry.id}>
                <div className="CompletedEntriesModal-index">{index + 1}</div>

                <div className="CompletedEntriesModal-info">
                  <Link className="CompletedEntriesModal-title" href={entry.url} title={entry.title}>
                    {entry.title}
                  </Link>

                  {entry.subtitle && (
                    <div className="CompletedEntriesModal-discussion" title={entry.subtitle}>
                      {entry.subtitle}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
}
