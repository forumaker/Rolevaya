import app from 'flarum/forum/app';
import User from 'flarum/common/models/User';
import Link from 'flarum/common/components/Link';

/**
 * Types and helpers shared by CharactersTab/ActivityTab/ArenaTab. Split out
 * of the old single 999-line StatsTabs.tsx so each tab can be read and
 * changed in isolation.
 */

export type CharacterRow = {
  discussion_id: number;
  discussion_title: string;
  discussion_slug?: string | null;
  user_id: number;
  username: string | null;
  nickname: string | null;
  avatar_url?: string | null;
  physiology: number;
  dexterity: number;
  magic: number;
  charisma: number;
  roleplay_experience: number;
  sum: number;
  source_post_id: number;
  parsed_at: string | null;
  updated_at: string | null;
};

export type ActivityRow = {
  user_id: number;
  username?: string | null;
  nickname?: string | null;
  avatar_url?: string | null;
  period_days: number;
  scope_tag: string;
  posts_count: number;
  total_chars: number;
  avg_chars: number;
  active_weeks: number;
  stability_ratio: number;
  calculated_at: string | null;
  updated_at: string | null;
  completed_arcs_count?: number;
  completed_episodes_count?: number;
};

export type ArenaRow = {
  user_id: number;
  username?: string | null;
  nickname?: string | null;
  avatar_url?: string | null;
  wins: number;
  losses: number;
  draws: number;
  win_rate: number;
};

export type PlayerRow = { nickname?: string | null; username?: string | null; user_id: number };

export function cacheBust() {
  return Date.now();
}

export function invalidateHomeSliderCache() {
  if (typeof window === 'undefined') return;

  try {
    window.dispatchEvent(new Event('rolevaya:invalidate-home-slider-cache'));
  } catch {}
}

export function apiUrl(path: string) {
  const base = app.forum.attribute('apiUrl') as string;
  return base.replace(/\/$/, '') + path;
}

export function forumBaseUrl() {
  const base = (app.forum.attribute('baseUrl') as string) || '';
  return base.replace(/\/$/, '');
}

export function playerName(row: PlayerRow) {
  return row.nickname || row.username || `#${row.user_id}`;
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('ru-RU').format(Number(value) || 0);
}

export function userProfilePath(userId: number, username?: string | null) {
  const user = app.store.getById('users', String(userId)) as User | null;

  if (user) {
    try {
      const routed = app.route.user(user);
      if (routed && typeof routed === 'string') return routed;
    } catch {}

    const profileUrl =
      (user.attribute('profileUrl') as string | null) ||
      (user.attribute('url') as string | null) ||
      null;

    if (profileUrl && String(profileUrl).trim()) {
      return profileUrl;
    }

    const slug =
      (user.attribute('slug') as string | null) ||
      (user.attribute('username') as string | null) ||
      username ||
      null;

    if (slug && String(slug).trim()) {
      return `/u/${slug}`;
    }
  }

  const fallbackSlug = (username || '').trim();
  if (fallbackSlug) return `/u/${fallbackSlug}`;

  return `/u/${userId}`;
}

export function userLink(userId: number, label: string, username?: string | null) {
  return (
    <Link className="RolevayaPlayerLink" href={userProfilePath(userId, username)} title={label}>
      {label}
    </Link>
  );
}

export function avatarUrl(row: { avatar_url?: string | null; user_id?: number }) {
  const raw = (row.avatar_url || '').trim();

  if (raw) {
    if (/^(data:|blob:)/i.test(raw)) return raw;
    if (/^https?:\/\//i.test(raw)) return raw;

    const base = forumBaseUrl();
    if (raw.startsWith('/')) return `${base}${raw}`;
    return `${base}/assets/avatars/${raw}`;
  }

  const userId = row.user_id;
  if (!userId) return null;

  const user = app.store.getById('users', String(userId)) as User | null;
  const storeUrl = (user?.attribute('avatarUrl') as string | null) || null;
  return storeUrl && String(storeUrl).trim() ? storeUrl : null;
}

export function rankClass(i: number) {
  const suffix = i === 0 ? '1' : i === 1 ? '2' : i === 2 ? '3' : i === 3 ? '4' : '';
  return 'RolevayaRank ' + (suffix ? `RolevayaRank--${suffix}` : '');
}

// Shared across all three tabs so the same user isn't fetched twice just
// because they show up on e.g. both the activity and arena leaderboards.
const ensuredUserIds = new Set<number>();

// IDs that have been requested but not yet fetched. When StatsTabs mounts all
// three tabs at once, each calls ensureUsersLoaded() as soon as its own data
// loads; a plain boolean "inflight" guard used to make the second/third call
// bail out immediately, dropping any user IDs unique to those tabs. Now every
// call merges its IDs into this pending set, and whichever call is already
// running drains the set in a loop until it's empty — so IDs added while a
// fetch is in progress still get picked up before the run finishes, instead
// of being silently skipped.
const pendingUserIds = new Set<number>();
let inflightRun: Promise<void> | null = null;

export async function ensureUsersLoaded(userIds: number[]) {
  const ids = Array.from(new Set(userIds)).filter((id) => id && !ensuredUserIds.has(id) && !app.store.getById('users', String(id)));

  ids.forEach((id) => pendingUserIds.add(id));

  if (!pendingUserIds.size) return;

  if (inflightRun) {
    await inflightRun;
    return;
  }

  inflightRun = (async () => {
    try {
      // Flarum's /api/users list endpoint has no real "id" filter gambit, so
      // filter:{id:...} silently returns an ambient default listing instead
      // of the requested users. Per-ID singular fetches (app.store.find) are
      // what Flarum actually supports for arbitrary IDs, and — importantly —
      // they go through Flarum's real serializer pipeline, so every other
      // installed extension's attribute contributions (e.g. Point System's
      // avatar-frame data) are present on the resulting User model.
      //
      // A previous version of this function called a hand-rolled
      // /rolevaya/users batch endpoint instead, to cut this down to one
      // request per (up to 200-id) batch. That backend endpoint had two
      // problems in production: it depended on Flarum 1.x API classes that
      // no longer exist in Flarum 2.x (500 error), and once rewritten to
      // avoid those, it could only emit the handful of attributes this
      // extension itself knows about — losing every other extension's
      // (e.g. Point System's) attribute contributions, which broke avatar
      // frames and profile links. Round-tripping through Flarum's own
      // /api/users/{id} endpoint per user is slower but is guaranteed to
      // produce fully correct, fully decorated User models.
      //
      // Leaderboards here can list up to 50 rows, so firing 50 requests at
      // once (Promise.all over the whole list) would overwhelm the browser's
      // per-origin connection limit and the server. Fetching in small
      // concurrent batches, with a redraw after each, keeps things reliable
      // while showing frames progressively instead of all-or-nothing at the
      // end.
      const concurrency = 4;

      // Re-check pendingUserIds.size on every iteration (not just once up
      // front): a concurrent tab's ensureUsersLoaded() call can add more IDs
      // to the set while this loop is awaiting a batch, and those need to be
      // drained too before this run finishes.
      while (pendingUserIds.size) {
        const batch = Array.from(pendingUserIds).slice(0, 200);
        batch.forEach((id) => {
          pendingUserIds.delete(id);
          ensuredUserIds.add(id);
        });

        for (let i = 0; i < batch.length; i += concurrency) {
          const chunk = batch.slice(i, i + concurrency);
          await Promise.all(chunk.map((id) => app.store.find('users', String(id)).catch(() => null)));
          m.redraw();
        }
      }
    } finally {
      inflightRun = null;
    }
  })();

  await inflightRun;
}
