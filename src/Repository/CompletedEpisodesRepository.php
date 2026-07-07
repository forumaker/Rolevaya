<?php

namespace forumaker\Rolevaya\Repository;

use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Collection;

class CompletedEpisodesRepository
{
    public function __construct(
        protected ConnectionInterface $db
    ) {}

    public function forUser(int $userId, int $limit): Collection
    {
        return $this->db->table('completed_episodes as ce')
            ->join('discussions as d', 'd.id', '=', 'ce.discussion_id')
            ->leftJoin('posts as p', 'p.id', '=', 'ce.source_post_id')
            ->where('ce.user_id', '=', $userId)
            ->orderByDesc('ce.parsed_at')
            ->orderByDesc('ce.id')
            ->limit($limit)
            ->get([
                'ce.id',
                'ce.discussion_id',
                'd.title as discussion_title',
                'd.slug as discussion_slug',
                'ce.source_post_id',
                'p.number as source_post_number',
                'ce.parsed_at',
            ]);
    }
}
