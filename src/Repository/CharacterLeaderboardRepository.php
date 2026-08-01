<?php

namespace forumaker\Rolevaya\Repository;

use forumaker\Rolevaya\Model\CharacterSheet;
use forumaker\Rolevaya\RoleplayTags;
use Illuminate\Support\Collection;

class CharacterLeaderboardRepository
{
    public function __construct(
        protected RoleplayTags $tags
    ) {
    }

    public function topCharacters(string $sort, int $limit, bool $excludeGuardians, array $excludeDiscussionIds): Collection
    {
        $charactersTag = $this->tags->characters();

        $q = CharacterSheet::query()
            ->join('discussions as d', 'd.id', '=', 'character_sheets.discussion_id')
            ->leftJoin('users as u', 'u.id', '=', 'character_sheets.user_id')
            ->join('discussion_tag as dt', 'dt.discussion_id', '=', 'd.id')
            ->join('tags as t', 't.id', '=', 'dt.tag_id')
            ->where('t.slug', '=', $charactersTag);

        if ($excludeGuardians && count($excludeDiscussionIds)) {
            $q->whereNotIn('character_sheets.discussion_id', $excludeDiscussionIds);
        }

        return $q->orderByDesc('character_sheets.' . $sort)
            ->orderByDesc('character_sheets.sum')
            ->limit($limit)
            ->get([
                'character_sheets.discussion_id',
                'd.title as discussion_title',
                'd.slug as discussion_slug',
                'character_sheets.user_id',
                'u.username',
                'u.nickname',
                'u.avatar_url',
                'character_sheets.physiology',
                'character_sheets.dexterity',
                'character_sheets.magic',
                'character_sheets.charisma',
                'character_sheets.sum',
                'character_sheets.roleplay_experience',
                'character_sheets.source_post_id',
                'character_sheets.parsed_at',
                'character_sheets.updated_at',
            ]);
    }
}
