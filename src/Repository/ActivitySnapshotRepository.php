<?php

namespace forumaker\Rolevaya\Repository;

use Carbon\CarbonImmutable;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\LazyCollection;

/**
 * Confines the raw query-builder access needed to scan roleplay posts and
 * replace user_activity_snapshots rows to a single dedicated class, so
 * ActivitySnapshotCalculator doesn't need to depend on ConnectionInterface
 * directly.
 */
class ActivitySnapshotRepository
{
    public function __construct(
        protected ConnectionInterface $db
    ) {}

    /**
     * Streams matching posts via a cursor rather than loading them all into
     * memory at once (see ActivitySnapshotCalculator for why that matters).
     */
    public function scanPosts(string $roleTag, int $period, CarbonImmutable $now): LazyCollection
    {
        $postsQ = $this->db->table('posts')
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

    /**
     * Replaces all snapshot rows for the given period/scope in a single
     * transaction: delete then chunked bulk insert.
     *
     * @param array<int, array<string, mixed>> $payload
     */
    public function replaceSnapshots(int $period, string $roleTag, array $payload): void
    {
        $this->db->transaction(function () use ($period, $roleTag, $payload) {
            $this->db->table('user_activity_snapshots')
                ->where('period_days', '=', $period)
                ->where('scope_tag', '=', $roleTag)
                ->delete();

            if (count($payload)) {
                foreach (array_chunk($payload, 1000) as $chunk) {
                    $this->db->table('user_activity_snapshots')->insert($chunk);
                }
            }
        });
    }
}
