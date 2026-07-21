import app from 'flarum/admin/app';
import Component from 'flarum/common/Component';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';

type UserSuggestion = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

type Attrs = {
  ids: number[];
  usernames: Record<number, string>;
  onAdd: (id: number, username: string) => void;
  onRemove: (id: number) => void;
};

/**
 * "ID Кураторов" field: search users by display name (3+ letters) instead
 * of typing a raw user ID.
 *
 * The search logic here is ported 1-to-1 from forumaker/arena's
 * ChallengeModal (js/src/forum/components/ChallengeModal.tsx, the battle
 * creation modal's opponent search) per explicit request: a raw
 * app.request GET against /users with filter[q]/page[limit] params, a
 * 350ms debounce, and a plain <ul> suggestions list — instead of the
 * previous app.store.find + Flarum's AutocompleteDropdown abstract class
 * (SearchSelectField), which required typing the full username to match.
 *
 * This is a real Component class (not a plain function called inline like
 * most of this settings page's other pieces) because it owns non-trivial
 * internal state — see RolevayaSettingsPage.tsx's notes on why plain
 * functions can't be used as JSX tags for stateful pieces.
 */
export default class CuratorUserField extends Component<Attrs> {
  private username = '';
  private searching = false;
  private suggestions: UserSuggestion[] = [];
  private showSuggestions = false;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  onremove() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  private onInput(value: string) {
    this.username = value;
    this.showSuggestions = false;

    if (this.searchTimer) clearTimeout(this.searchTimer);

    if (value.trim().length >= 3) {
      this.searching = true;
      m.redraw();
      this.searchTimer = setTimeout(() => this.searchUsers(value.trim()), 350);
    } else {
      this.suggestions = [];
      this.searching = false;
    }
  }

  private async searchUsers(query: string) {
    try {
      const response = await app.request<any>({
        method: 'GET',
        url: `${app.forum.attribute('apiUrl')}/users`,
        params: { 'filter[q]': query, 'page[limit]': 8 },
      });

      const data = response?.data ?? [];
      const currentIds = new Set(this.attrs.ids);

      this.suggestions = data
        .map((u: any) => ({
          id: u.id,
          username: u.attributes?.username ?? '',
          displayName: u.attributes?.displayName ?? u.attributes?.username ?? '',
          avatarUrl: u.attributes?.avatarUrl ?? null,
        }))
        .filter((u: UserSuggestion) => !currentIds.has(Number(u.id)));

      this.showSuggestions = this.suggestions.length > 0;
    } catch {
      this.suggestions = [];
      this.showSuggestions = false;
    }

    this.searching = false;
    m.redraw();
  }

  private selectUser(user: UserSuggestion) {
    this.attrs.onAdd(Number(user.id), user.displayName || user.username);
    this.username = '';
    this.suggestions = [];
    this.showSuggestions = false;
    m.redraw();
  }

  view() {
    const { ids, usernames, onRemove } = this.attrs;

    return (
      <div className="RolevayaSearchSelect">
        {ids.length > 0 && (
          <div className="RolevayaSearchSelect-chips">
            {ids.map((id) => (
              <span className="RolevayaChip" key={id}>
                {usernames[id] ?? `#${id}…`}
                <button
                  type="button"
                  className="RolevayaChip-remove"
                  aria-label="Удалить"
                  onclick={() => onRemove(id)}
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="RolevayaSearchSelect-inputWrap">
          <input
            className="FormControl"
            type="text"
            value={this.username}
            oninput={(e: any) => this.onInput(e.target.value)}
            onkeydown={(e: KeyboardEvent) => {
              if (e.key === 'Escape') {
                this.showSuggestions = false;
                m.redraw();
              }
            }}
            placeholder="Введите отображаемое имя"
          />

          {this.searching && (
            <span className="RolevayaSearchSelect-spinner">
              <LoadingIndicator size="small" display="inline" />
            </span>
          )}

          {this.showSuggestions && this.suggestions.length > 0 && (
            <ul className="RolevayaSearchSelect-suggestions">
              {this.suggestions.map((user) => (
                <li
                  key={user.id}
                  className="RolevayaUserResult"
                  onmousedown={(e: MouseEvent) => {
                    e.preventDefault();
                    this.selectUser(user);
                  }}
                >
                  {user.avatarUrl ? (
                    <img className="RolevayaUserResult-avatar" src={user.avatarUrl} alt="" />
                  ) : (
                    <span className="RolevayaUserResult-avatarFallback">
                      {(user.displayName[0] ?? '?').toUpperCase()}
                    </span>
                  )}
                  <span className="RolevayaUserResult-text">
                    <span className="RolevayaUserResult-label">{user.displayName}</span>
                    {user.displayName !== user.username && (
                      <span className="RolevayaUserResult-sublabel">@{user.username}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }
}
