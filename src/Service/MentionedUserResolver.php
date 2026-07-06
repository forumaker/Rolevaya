<?php

namespace forumaker\Rolevaya\Service;

use Flarum\Post\Post;
use Flarum\User\User;

/**
 * Resolves the Flarum user referenced by a parsed @mention.
 *
 * Mentions are resolved primarily by the numeric id captured from the
 * mention markup (a post id for post mentions such as @"name"#p123, a
 * user id for plain user mentions such as @"name"#123), since the
 * mentioned display name can differ from the actual username (custom
 * nicknames, stylized Unicode text, renamed accounts, etc.). Matching
 * against username/nickname text is used only as a fallback when no
 * mention id is available or it no longer resolves to anything (e.g. the
 * mentioned post or user was deleted).
 */
class MentionedUserResolver
{
    /**
     * @param array{username: string, mention_type?: string|null, mention_id?: int|null} $mention
     */
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
