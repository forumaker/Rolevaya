export type RowIdentity = {
  user_id: number;
  username?: string | null;
  nickname?: string | null;
  avatar_url?: string | null;
};

export type CachePayload<T> = {
  ts: number;
  rows: T[];
};

/**
 * sessionStorage-backed cache plus an in-memory mirror for one
 * HomepageActivitySlider tab (roleplay or arena). Extracted out of the old
 * monolithic HomepageActivitySlider.tsx so the caching/staleness concern can
 * be read and changed without wading through carousel or rendering code too.
 *
 * Each tab creates exactly ONE instance of this class at module scope (not
 * inside a component's oninit()) so that data survives the
 * RoleplaySlider/ArenaSlider component instance being unmounted and
 * remounted — e.g. navigating away from the homepage and back — the same
 * way the original sharedState/arenaSharedState module-level objects did.
 */
export class SliderCache<T> {
  rows: T[] = [];
  ts = 0;
  loadedOnce = false;
  inflight: Promise<T[]> | null = null;

  constructor(private readonly cacheKey: string) {}

  readCache(): CachePayload<T> | null {
    if (typeof window === 'undefined') return null;

    const raw = window.sessionStorage.getItem(this.cacheKey);
    if (!raw) return null;

    try {
      const cached = JSON.parse(raw) as CachePayload<T>;

      if (!cached || !Array.isArray(cached.rows) || typeof cached.ts !== 'number') {
        return null;
      }

      return cached;
    } catch {
      return null;
    }
  }

  writeCache(rows: T[]) {
    if (typeof window === 'undefined') return;

    try {
      const payload: CachePayload<T> = {
        ts: Date.now(),
        rows,
      };

      window.sessionStorage.setItem(this.cacheKey, JSON.stringify(payload));
    } catch {}
  }

  clearCache() {
    if (typeof window === 'undefined') return;

    try {
      window.sessionStorage.removeItem(this.cacheKey);
    } catch {}
  }

  /** Resets both the sessionStorage cache and the in-memory mirror — used
   *  when something external (e.g. a recalculation elsewhere on the page)
   *  makes the cached rows stale. */
  invalidate() {
    this.clearCache();
    this.rows = [];
    this.ts = 0;
    this.loadedOnce = false;
    this.inflight = null;
  }
}

/**
 * Row-equality check shared by both tabs' "did anything actually change"
 * comparison before swapping in freshly-fetched rows (avoids an unnecessary
 * carousel re-clamp/redraw when a background refetch comes back identical).
 * Identity fields (user_id/nickname/username/avatar_url) are common to both
 * row shapes; each tab supplies its own comparison for its own stat fields.
 */
export function rowsEqual<T extends RowIdentity>(a: T[], b: T[], statsEqual: (x: T, y: T) => boolean): boolean {
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    const left = a[i];
    const right = b[i];

    if (
      left.user_id !== right.user_id ||
      (left.nickname || '') !== (right.nickname || '') ||
      (left.username || '') !== (right.username || '') ||
      (left.avatar_url || '') !== (right.avatar_url || '') ||
      !statsEqual(left, right)
    ) {
      return false;
    }
  }

  return true;
}
