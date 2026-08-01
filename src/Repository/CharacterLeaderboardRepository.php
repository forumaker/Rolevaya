<?php

namespace forumaker\Rolevaya\Repository;

use forumaker\Rolevaya\RoleplayTags;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Collection;

class CharacterLeaderboardRepository
{
    public function __construct(
        protected ConnectionInterface $db,
        protected RoleplayTags $tags
    ) {
    }

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
