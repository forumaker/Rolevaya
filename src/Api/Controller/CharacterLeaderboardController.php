<?php

namespace forumaker\Rolevaya\Api\Controller;

use forumaker\Rolevaya\RoleplayTags;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Arr;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

class CharacterLeaderboardController implements RequestHandlerInterface
{
    public function __construct(
        protected ConnectionInterface $db
    ) {}

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $query = $request->getQueryParams();

        $sort = (string) Arr::get($query, 'sort', 'sum');

        $allowedSorts = ['sum', 'physiology', 'dexterity', 'magic', 'charisma', 'roleplay_experience'];
        if (!in_array($sort, $allowedSorts, true)) {
            $sort = 'sum';
        }

        $limit = (int) Arr::get($query, 'limit', 50);
        if ($limit < 1) $limit = 1;
        if ($limit > 200) $limit = 200;

        $excludeGuardians = (int) Arr::get($query, 'exclude_guardians', 0) === 1;
        $guardianDiscussionIds = [52, 61, 55, 59];

        $charactersTag = RoleplayTags::CHARACTERS;

        $q = $this->db->table('character_sheets as cs')
            ->join('discussions as d', 'd.id', '=', 'cs.discussion_id')
            ->leftJoin('users as u', 'u.id', '=', 'cs.user_id')
            ->join('discussion_tag as dt', 'dt.discussion_id', '=', 'd.id')
            ->join('tags as t', 't.id', '=', 'dt.tag_id')
            ->where('t.slug', '=', $charactersTag);

        if ($excludeGuardians) {
            $q->whereNotIn('cs.discussion_id', $guardianDiscussionIds);
        }

        $rows = $q->orderByDesc('cs.' . $sort)
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

        return new JsonResponse([
            'sort' => $sort,
            'limit' => $limit,
            'tag' => $charactersTag,
            'exclude_guardians' => $excludeGuardians,
            'data' => $rows,
        ]);
    }
}