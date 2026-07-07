<?php

namespace forumaker\Rolevaya\Repository;

use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Collection;

class CompletedArcsRepository
{
    public function __construct(
        protected ConnectionInterface $db
    ) {}

    public function forUser(int $userId, int $limit): Collection
    {
        return $this->db->table('completed_arcs as ca')
            ->join('discussions as d', 'd.id', '=', 'ca.discussion_id')
            ->leftJoin('posts as p', 'p.id', '=', 'ca.source_post_id')
            ->where('ca.user_id', '=', $userId)
            ->orderByDesc('ca.parsed_at')
            ->orderByDesc('ca.id')
            ->limit($limit)
            ->get([
                'ca.id',
                'ca.arc_title',
                'ca.experience',
                'ca.gold',
                'ca.discussion_id',
                'd.title as discussion_title',
                'd.slug as discussion_slug',
                'ca.source_post_id',
                'p.number as source_post_number',
                'ca.parsed_at',
            ]);
    }
}
