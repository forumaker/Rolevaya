<?php

namespace forumaker\Rolevaya\Service;

use Flarum\Post\Post;
use Flarum\User\User;

class MentionedUserResolver
{

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

        $user = User::query()->where('username', $username)->first();

        if (!$user) {
            $key = mb_strtolower($username);
            $user = User::query()->whereRaw('LOWER(username) = ?', [$key])->first();
        }

        if (!$user) {
            $key ??= mb_strtolower($username);
            $user = User::query()->whereRaw('LOWER(nickname) = ?', [$key])->first();
        }

        return $user ? (int) $user->id : null;
    }
}
