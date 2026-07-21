import app from 'flarum/admin/app';
import SearchSelectField, { SearchSelectItem } from './SearchSelectField';

type Attrs = {
  ids: number[];
  usernames: Record<number, string>;
  onAdd: (id: number, username: string) => void;
  onRemove: (id: number) => void;
};

/**
 * "ID Кураторов" field: search users by display name (3+ letters) instead
 * of typing a raw user ID, using Flarum's own user search filter.
 *
 * Called directly as CuratorUserField(attrs), not used as a JSX tag — see
 * PerkPreviewCard.tsx for why. The SearchSelectField it renders IS a real
 * Flarum Component (class-based), so that one stays as a JSX tag.
 */
export default function CuratorUserField(attrs: Attrs) {
  const { ids, usernames, onAdd, onRemove } = attrs;

  const search = (query: string): Promise<SearchSelectItem[]> => {
    return app.store
      .find<any>('users', { filter: { q: query }, page: { limit: 8 } })
      .then((result: any) => {
        const list = Array.isArray(result) ? result : [result];
        const currentIds = new Set(ids);

        return list
          .filter((user) => user && !currentIds.has(Number(user.id())))
          .map((user) => ({
            id: String(user.id()),
            label: user.username(),
          }));
      })
      .catch(() => []);
  };

  return (
    <SearchSelectField
      placeholder="Введите отображаемое имя"
      chips={ids.map((id) => ({ id, label: usernames[id] ?? `#${id}…` }))}
      search={search}
      onAdd={(id, label) => onAdd(Number(id), label)}
      onRemove={onRemove}
    />
  );
}
