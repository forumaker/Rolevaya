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

  invalidate() {
    this.clearCache();
    this.rows = [];
    this.ts = 0;
    this.loadedOnce = false;
    this.inflight = null;
  }
}

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
