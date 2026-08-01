<?php

namespace forumaker\Rolevaya\Repository;

use Carbon\CarbonImmutable;
use Flarum\Post\Post;
use forumaker\Rolevaya\Model\UserActivitySnapshot;
use Illuminate\Support\LazyCollection;

class ActivitySnapshotRepository
{
    public function scanPosts(string $roleTag, int $period, CarbonImmutable $now): LazyCollection
    {
        $postsQ = Post::query()
            ->join('discussion_tag', 'discussion_tag.discussion_id', '=', 'posts.discussion_id')
            ->join('tags', 'tags.id', '=', 'discussion_tag.tag_id')
            ->where('tags.slug', '=', $roleTag)
            ->where('posts.type', '=', 'comment')
            ->whereNull('posts.hidden_at')
            ->where('posts.number', '>', 1)
            ->orderBy('posts.created_at', 'asc')
            ->select([
                'posts.id',
                'posts.user_id',
                'posts.created_at',
                'posts.content',
            ]);

        if ($period > 0) {
            $since = $now->subDays($period)->toDateTimeString();
            $postsQ->where('posts.created_at', '>=', $since);
        }

        return $postsQ->cursor();
    }

    public function replaceSnapshots(int $period, string $roleTag, array $payload): void
    {
        UserActivitySnapshot::query()->getConnection()->transaction(function () use ($period, $roleTag, $payload) {
            UserActivitySnapshot::query()
                ->where('period_days', '=', $period)
                ->where('scope_tag', '=', $roleTag)
                ->delete();

            if (count($payload)) {
                foreach (array_chunk($payload, 1000) as $chunk) {
                    UserActivitySnapshot::query()->insert($chunk);
                }
            }
        });
    }
}
