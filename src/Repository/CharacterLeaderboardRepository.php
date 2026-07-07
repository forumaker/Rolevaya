<?php

namespace forumaker\Rolevaya\Repository;

use forumaker\Rolevaya\RoleplayTags;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Collection;

/**
 * Confines the raw query-builder access needed for the character
 * leaderboard to a single dedicated class. This is a cross-table read
 * (character_sheets joined with discussions/users/tags) that doesn't map
 * cleanly onto a single Eloquent model relationship, so it stays on the
 * query builder rather than Eloquent scopes — but it's isolated here
 * instead of being injected directly into the controller.
 */
class CharacterLeaderboardRepository
{
    public function __construct(
        protected ConnectionInterface $db,
        protected RoleplayTags $tags
    ) {}

    /**
     * @param int[] $excludeDiscussionIds
     */
    public function topCharacters(string $sort, int $limit, bool $excludeGuardians, array $excludeDiscussionIds): Collection
    {
        $charactersTag = $this->tags->characters();

        $q = $this->db->table('character_sheets as cs')
            ->join('discussions as d', 'd.id', '=', 'cs.discussion_id')
            ->leftJoin('users as u', 'u.id', '=', 'cs.user_id')
            ->join('discussion_tag as dt', 'dt.discussion_id', '=', 'd.id')
            ->join('tags as t', 't.id', '=', 'dt.tag_id')
            ->where('t.slug', '=', $charactersTag);

        if ($excludeGuardians && count($excludeDiscussionIds)) {
            $q->whereNotIn('cs.discussion_id', $excludeDiscussionIds);
        }

        return $q->orderByDesc('cs.' . $sort)
            ->orderByDesc('cs.sum')
            ->limit($limit)
            ->get([
                'cs.discussion_id',
                'd.title as discussion_title',
                'd.slug as discussion_slug',
                'cs.user_id',
                'u.username',
                'u.nickname',
                'u.avatar_url',
                'cs.physiology',
                'cs.dexterity',
                'cs.magic',
                'cs.charisma',
                'cs.sum',
                'cs.roleplay_experience',
                'cs.source_post_id',
                'cs.parsed_at',
                'cs.updated_at',
            ]);
    }
}
