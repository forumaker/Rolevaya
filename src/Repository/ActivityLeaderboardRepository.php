<?php

namespace forumaker\Rolevaya\Repository;

use forumaker\Rolevaya\RoleplayTags;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Collection;

class ActivityLeaderboardRepository
{
    public function __construct(
        protected ConnectionInterface $db,
        protected RoleplayTags $tags
    ) {
    }

    public function topActivity(
        int $period,
        string $sort,
        int $minPosts,
        int $limit,
        bool $excludeCurators,
        array $excludeUserIds
    ): Collection {
        $roleTag = $this->tags->role();

        $arcCounts = $this->db->table('completed_arcs')
            ->select('user_id', $this->db->raw('COUNT(*) as cnt'))
            ->groupBy('user_id');

        $episodeCounts = $this->db->table('completed_episodes')
            ->select('user_id', $this->db->raw('COUNT(*) as cnt'))
            ->groupBy('user_id');

        $q = $this->db->table('user_activity_snapshots as uas')
            ->leftJoin('users as u', 'u.id', '=', 'uas.user_id')
            ->leftJoinSub($arcCounts, 'ac', 'ac.user_id', '=', 'uas.user_id')
            ->leftJoinSub($episodeCounts, 'ec', 'ec.user_id', '=', 'uas.user_id')
            ->where('uas.period_days', '=', $period)
            ->where('uas.scope_tag', '=', $roleTag);

        if ($excludeCurators && count($excludeUserIds)) {
            $q->whereNotIn('uas.user_id', $excludeUserIds);
        }

        if ($minPosts > 0) {
            $q->where('uas.posts_count', '>=', $minPosts);
        }

        switch ($sort) {
            case 'posts_count':
                $q->orderByDesc('uas.posts_count')
                  ->orderByDesc('uas.stability_ratio');
                break;

            case 'avg_chars':
                $q->orderByDesc('uas.avg_chars')
                  ->orderByDesc('uas.posts_count');
                break;

            case 'completed_arcs_count':
                $q->orderByDesc($this->db->raw('COALESCE(ac.cnt, 0)'))
                  ->orderByDesc('uas.posts_count');
                break;

            case 'completed_episodes_count':
                $q->orderByDesc($this->db->raw('COALESCE(ec.cnt, 0)'))
                  ->orderByDesc('uas.posts_count');
                break;

            default:
                                                                                $q->orderByDesc('uas.stability_ratio')
                  ->orderByDesc('uas.posts_count');
                break;
        }

        return $q->limit($limit)->get([
            'uas.user_id',
            'u.username',
            'u.nickname',
            'u.avatar_url',
            'uas.period_days',
            'uas.scope_tag',
            'uas.posts_count',
            'uas.total_chars',
            'uas.avg_chars',
            'uas.active_weeks',
            'uas.stability_ratio',
            'uas.calculated_at',
            'uas.updated_at',
            $this->db->raw('COALESCE(ac.cnt, 0) as completed_arcs_count'),
            $this->db->raw('COALESCE(ec.cnt, 0) as completed_episodes_count'),
        ]);
    }
}
