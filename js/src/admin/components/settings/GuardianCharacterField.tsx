import app from 'flarum/admin/app';
import SearchSelectField, { SearchSelectItem } from './SearchSelectField';

type Attrs = {
  tagSlug: string;
  ids: number[];
  titles: Record<number, string>;
  onAdd: (id: number, title: string) => void;
  onRemove: (id: number) => void;
};

export default function GuardianCharacterField(attrs: Attrs) {
  const { tagSlug, ids, titles, onAdd, onRemove } = attrs;

  const search = (query: string): Promise<SearchSelectItem[]> => {
    const filterQ = tagSlug ? `${query} tag:${tagSlug}` : query;

    return app.store
      .find<any>('discussions', { filter: { q: filterQ }, page: { limit: 8 } })
      .then((result: any) => {
        const list = Array.isArray(result) ? result : [result];
        const currentIds = new Set(ids);

        return list
          .filter((discussion) => discussion && !currentIds.has(Number(discussion.id())))
          .map((discussion) => ({
            id: String(discussion.id()),
            label: discussion.title(),
            sublabel: `#${discussion.id()}`,
          }));
      })
      .catch(() => []);
  };

  return (
    <SearchSelectField
      placeholder="Введите название анкеты"
      chips={ids.map((id) => ({ id, label: titles[id] ?? `#${id}…` }))}
      search={search}
      onAdd={(id, label) => onAdd(Number(id), label)}
      onRemove={onRemove}
    />
  );
}
