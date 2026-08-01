<?php

namespace forumaker\Rolevaya\Service;

use Flarum\Post\Post;
use Flarum\User\User;

class MentionedUserResolver
{
    /**
     * Lazily built map of lowercased username/nickname => user id, used as a
     * DB-portable fallback for case-insensitive matching (see resolveByText()).
     *
     * @var array<string,int>|null
     */
    private ?array $lowercaseIndex = null;

    /**
     * Resolve a mention reusing a caller-owned cache, so the same mention
     * is never resolved twice within one post / backfill run.
     */
    public function resolveWithCache(array $mention, array &$cache): ?int
    {
        $key = ($mention['mention_type'] ?? null)
            . ':' . ($mention['mention_id'] ?? '')
            . ':' . mb_strtolower((string) ($mention['username'] ?? ''));

        if (array_key_exists($key, $cache)) {
            return $cache[$key];
        }

        return $cache[$key] = $this->resolve($mention);
    }

    public function resolve(array $mention): ?int
    {
        $mentionId = $mention['mention_id'] ?? null;

        if ($mentionId !== null) {
            $userId = match ($mention['mention_type'] ?? null) {
                'user' => $this->resolveByUserId((int) $mentionId),
                'post' => $this->resolveByPostId((int) $mentionId),
                default => null,
            };

            if ($userId !== null) {
                return $userId;
            }
        }

        return $this->resolveByText((string) ($mention['username'] ?? ''));
    }

    private function resolveByUserId(int $userId): ?int
    {
        $user = User::query()->find($userId);

        return $user ? (int) $user->id : null;
    }

    private function resolveByPostId(int $postId): ?int
    {
        $post = Post::query()->find($postId);

        return ($post && $post->user_id) ? (int) $post->user_id : null;
    }

    private function resolveByText(string $username): ?int
    {
        $username = trim($username);
        if ($username === '') {
            return null;
        }

        $exact = User::query()
            ->where('username', $username)
            ->orWhere('nickname', $username)
            ->first();

        if ($exact) {
            return (int) $exact->id;
        }

        return $this->lowercaseIndex()[mb_strtolower($username)] ?? null;
    }

    /**
     * SQLite's built-in LOWER() only folds ASCII characters, so
     * `LOWER(username) = ?` silently never matches Cyrillic usernames there
     * (this forum's usernames/nicknames are Russian). Case-folding is done
     * in PHP with mb_strtolower() instead, against a small id/username/
     * nickname index built once per resolver instance rather than per
     * mention, so this stays cheap even across a large backfill run.
     *
     * @return array<string,int>
     */
    private function lowercaseIndex(): array
    {
        if ($this->lowercaseIndex !== null) {
            return $this->lowercaseIndex;
        }

        $index = [];

        User::query()
            ->select(['id', 'username', 'nickname'])
            ->cursor()
            ->each(function ($user) use (&$index) {
                if ($user->username) {
                    $index[mb_strtolower($user->username)] ??= (int) $user->id;
                }
                if ($user->nickname) {
                    $index[mb_strtolower($user->nickname)] ??= (int) $user->id;
                }
            });

        return $this->lowercaseIndex = $index;
    }
}
