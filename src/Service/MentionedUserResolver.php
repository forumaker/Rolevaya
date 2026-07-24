<?php

namespace forumaker\Rolevaya\Service;

use Flarum\Post\Post;
use Flarum\User\User;

class MentionedUserResolver
{

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

        $key = mb_strtolower($username);

                                                                        $candidates = User::query()
            ->where(function ($q) use ($username, $key) {
                $q->where('username', $username)
                  ->orWhereRaw('LOWER(username) = ?', [$key])
                  ->orWhereRaw('LOWER(nickname) = ?', [$key]);
            })
            ->limit(10)
            ->get();

        if ($candidates->isEmpty()) {
            return null;
        }

                                        $exact = $candidates->first(fn ($u) => (string) $u->username === $username)
            ?? $candidates->first(fn ($u) => mb_strtolower((string) $u->username) === $key)
            ?? $candidates->first();

        return (int) $exact->id;
    }
}
