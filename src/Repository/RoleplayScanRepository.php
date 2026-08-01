<?php

namespace forumaker\Rolevaya\Repository;

use Flarum\Discussion\Discussion;
use Flarum\Post\Post;
use Illuminate\Support\Collection;

class RoleplayScanRepository
{
    public function discussionIdsForTag(
        string $tagSlug,
        ?int $limit = null,
        ?int $discussionIdMin = null,
        ?int $discussionIdMax = null,
        array $excludeDiscussionIds = []
    ): array {
        $q = Discussion::query()
            ->join('discussion_tag as dt', 'dt.discussion_id', '=', 'discussions.id')
            ->join('tags as t', 't.id', '=', 'dt.tag_id')
            ->where('t.slug', '=', $tagSlug)
            ->select('dt.discussion_id')
            ->orderBy('dt.discussion_id', 'asc');

        if (count($excludeDiscussionIds)) {
            $q->whereNotIn('dt.discussion_id', $excludeDiscussionIds);
        }

        if ($discussionIdMin !== null) {
            $q->where('dt.discussion_id', '>=', $discussionIdMin);
        }
        if ($discussionIdMax !== null) {
            $q->where('dt.discussion_id', '<=', $discussionIdMax);
        }
        if ($limit !== null && $limit > 0) {
            $q->limit($limit);
        }

        return $q->pluck('discussion_id')->all();
    }

    public function completionCandidatePosts(array $discussionIdChunk): Collection
    {
        return Post::query()
            ->whereIn('discussion_id', $discussionIdChunk)
            ->where('type', '=', 'comment')
            ->whereNull('hidden_at')
            ->where(function ($q) {
                $q->where('content', 'like', '%[success%')
                  ->orWhere('content', 'like', '%<SUCCESS%');
            })
            ->orderBy('discussion_id', 'asc')
            ->orderBy('number', 'asc')
            ->get(['id', 'discussion_id', 'content']);
    }

    public function characterSheetCandidatePosts(array $discussionIdChunk, int $scanLimit, int $targetNumber): Collection
    {
        return Post::query()
            ->whereIn('discussion_id', $discussionIdChunk)
            ->where('type', '=', 'comment')
            ->whereNull('hidden_at')
            ->whereBetween('number', [1, $scanLimit])
            ->orderBy('discussion_id', 'asc')
            ->orderByRaw('CASE WHEN number = ? THEN 0 ELSE 1 END', [$targetNumber])
            ->orderBy('number', 'asc')
            ->get(['id', 'discussion_id', 'user_id', 'number', 'content']);
    }
}
