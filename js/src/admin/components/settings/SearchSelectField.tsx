import Component from 'flarum/common/Component';
import AutocompleteDropdown from 'flarum/common/components/AutocompleteDropdown';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';
import type Mithril from 'mithril';

export type SearchSelectItem = {
  id: string;
  label: string;
  sublabel?: string;
};

export type SearchSelectChip = {
  id: number;
  label: string;
};

type DropdownAttrs = {
  query: string;
  onchange: (value: string) => void;
  items: SearchSelectItem[];
  loading: boolean;
  minChars: number;
  onSelectItem: (id: string) => void;
};

/**
 * Presentational suggestions list, built on Flarum's own AutocompleteDropdown
 * (flarum/common/components/AutocompleteDropdown) — the same base class core
 * uses for its own search-as-you-type dropdowns — instead of a bespoke one.
 */
class ResultsDropdown extends AutocompleteDropdown<DropdownAttrs> {
  suggestions(): Mithril.Vnode<any, any>[] {
    const { items, loading, query, minChars } = this.attrs;

    if (query.trim().length < minChars) return [];

    if (loading) {
      return [
        <li className="Dropdown-header" key="loading">
          <LoadingIndicator size="small" display="inline" />
        </li>,
      ];
    }

    if (!items.length) {
      return [
        <li className="Dropdown-header" key="empty">
          Ничего не найдено
        </li>,
      ];
    }

    return items.map((item, index) => (
      <li data-index={index} key={item.id}>
        <button type="button" className="Dropdown-item RolevayaSearchResult" onclick={() => this.attrs.onSelectItem(item.id)}>
          <span className="RolevayaSearchResult-label">{item.label}</span>
          {item.sublabel ? <span className="RolevayaSearchResult-sublabel">{item.sublabel}</span> : null}
        </button>
      </li>
    ));
  }
}

type FieldAttrs = {
  placeholder: string;
  minChars?: number;
  chips: SearchSelectChip[];
  search: (query: string) => Promise<SearchSelectItem[]>;
  onAdd: (id: string, label: string) => void;
  onRemove: (id: number) => void;
};

/**
 * Search-as-you-type input with a chip list underneath. Used for both
 * "ID Хранителей" (search() looks up character discussions) and
 * "ID Кураторов" (search() looks up users) — see GuardianCharacterField and
 * CuratorUserField.
 */
export default class SearchSelectField extends Component<FieldAttrs> {
  private query = '';
  private results: SearchSelectItem[] = [];
  private loading = false;
  private token = 0;

  private handleInput(value: string) {
    this.query = value;

    const minChars = this.attrs.minChars ?? 3;
    if (value.trim().length < minChars) {
      this.results = [];
      this.loading = false;
      m.redraw();
      return;
    }

    const token = ++this.token;
    this.loading = true;
    m.redraw();

    this.attrs
      .search(value.trim())
      .then((items) => {
        if (token !== this.token) return;
        this.results = items;
        this.loading = false;
        m.redraw();
      })
      .catch(() => {
        if (token !== this.token) return;
        this.results = [];
        this.loading = false;
        m.redraw();
      });
  }

  private select(id: string) {
    const item = this.results.find((r) => r.id === id);
    if (!item) return;

    this.attrs.onAdd(id, item.label);
    this.query = '';
    this.results = [];
    m.redraw();
  }

  view() {
    return (
      <div className="RolevayaSearchSelect">
        {this.attrs.chips.length > 0 && (
          <div className="RolevayaSearchSelect-chips">
            {this.attrs.chips.map((chip) => (
              <span className="RolevayaChip" key={chip.id}>
                {chip.label}
                <button
                  type="button"
                  className="RolevayaChip-remove"
                  aria-label="Удалить"
                  onclick={() => this.attrs.onRemove(chip.id)}
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}

        <ResultsDropdown
          query={this.query}
          onchange={(value) => this.handleInput(value)}
          items={this.results}
          loading={this.loading}
          minChars={this.attrs.minChars ?? 3}
          onSelectItem={(id) => this.select(id)}
        >
          <input
            className="FormControl"
            type="text"
            value={this.query}
            oninput={(e: any) => this.handleInput(e.target.value)}
            placeholder={this.attrs.placeholder}
          />
        </ResultsDropdown>
      </div>
    );
  }
}
