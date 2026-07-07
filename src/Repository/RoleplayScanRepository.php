<?php

namespace forumaker\Rolevaya\Repository;

use Illuminate\Support\Collection;

/**
 * Shared discussion/post scanning queries used by the character-sheet, arc-
 * completion, and episode-completion backfill services. Confines
 * ConnectionInterface usage to the repository layer (per Flarum convention)
 * instead of injecting it into the service classes directly.
 */
class RoleplayScanRepository extends DatabaseRepository
{
    /**
     * @param int[] $excludeDiscussionIds
     * @return int[]
     */
    public function discussionIdsForTag(
        string $tagSlug,
        ?int $limit = null,
        ?int $discussionIdMin = null,
        ?int $discussionIdMax = null,
        array $excludeDiscussionIds = []
    ): array {
        $q = $this->db->table('discussion_tag as dt')
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

    /**
     * Posts likely to contain a completion announcement ("[success" or
     * "<SUCCESS" markers), for the given chunk of discussion IDs. Shared by
     * ArcCompletionBackfill and EpisodeCompletionBackfill.
     *
     * @param int[] $discussionIdChunk
     */
    public function completionCandidatePosts(array $discussionIdChunk): Collection
    {
        return $this->db->table('posts')
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

    /**
     * Character-sheet candidate posts: within the first $scanLimit posts of
     * each discussion, ordered so the configured target post number is
     * tried first.
     *
     * @param int[] $discussionIdChunk
     */
    public function characterSheetCandidatePosts(array $discussionIdChunk, int $scanLimit, int $targetNumber): Collection
    {
        return $this->db->table('posts')
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
