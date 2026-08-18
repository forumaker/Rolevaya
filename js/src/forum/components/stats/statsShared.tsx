import app from 'flarum/forum/app';
import User from 'flarum/common/models/User';
import Link from 'flarum/common/components/Link';


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
  rating: number;
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

const ensuredUserIds = new Set<number>();

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
      // Batch by filter[id] instead of one GET /api/users/:id per user (avoids an N+1 request pattern).
      const chunkSize = 200;

      while (pendingUserIds.size) {
        const batch = Array.from(pendingUserIds).slice(0, chunkSize);
        batch.forEach((id) => {
          pendingUserIds.delete(id);
          ensuredUserIds.add(id);
        });

        await app.store.find('users', { filter: { id: batch.join(',') } }).catch(() => null);
        m.redraw();
      }
    } finally {
      inflightRun = null;
    }
  })();

  await inflightRun;
}
