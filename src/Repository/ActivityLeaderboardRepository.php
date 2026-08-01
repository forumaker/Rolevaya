<?php

namespace forumaker\Rolevaya\Repository;

use forumaker\Rolevaya\Model\CompletedArc;
use forumaker\Rolevaya\Model\CompletedEpisode;
use forumaker\Rolevaya\Model\UserActivitySnapshot;
use forumaker\Rolevaya\RoleplayTags;
use Illuminate\Support\Collection;

class ActivityLeaderboardRepository
{
    public function __construct(
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

        $arcCounts = CompletedArc::query()
            ->select('user_id')
            ->selectRaw('COUNT(*) as cnt')
            ->groupBy('user_id');

        $episodeCounts = CompletedEpisode::query()
            ->select('user_id')
            ->selectRaw('COUNT(*) as cnt')
            ->groupBy('user_id');

        $q = UserActivitySnapshot::query()
            ->leftJoin('users as u', 'u.id', '=', 'user_activity_snapshots.user_id')
            ->leftJoinSub($arcCounts, 'ac', 'ac.user_id', '=', 'user_activity_snapshots.user_id')
            ->leftJoinSub($episodeCounts, 'ec', 'ec.user_id', '=', 'user_activity_snapshots.user_id')
            ->where('user_activity_snapshots.period_days', '=', $period)
            ->where('user_activity_snapshots.scope_tag', '=', $roleTag);

        if ($excludeCurators && count($excludeUserIds)) {
            $q->whereNotIn('user_activity_snapshots.user_id', $excludeUserIds);
        }

        if ($minPosts > 0) {
            $q->where('user_activity_snapshots.posts_count', '>=', $minPosts);
        }

        switch ($sort) {
            case 'posts_count':
                $q->orderByDesc('user_activity_snapshots.posts_count')
                  ->orderByDesc('user_activity_snapshots.stability_ratio');
                break;

            case 'avg_chars':
                $q->orderByDesc('user_activity_snapshots.avg_chars')
                  ->orderByDesc('user_activity_snapshots.posts_count');
                break;

            case 'completed_arcs_count':
                $q->orderByRaw('COALESCE(ac.cnt, 0) DESC')
                  ->orderByDesc('user_activity_snapshots.posts_count');
                break;

            case 'completed_episodes_count':
                $q->orderByRaw('COALESCE(ec.cnt, 0) DESC')
                  ->orderByDesc('user_activity_snapshots.posts_count');
                break;

            default:
                $q->orderByDesc('user_activity_snapshots.stability_ratio')
                  ->orderByDesc('user_activity_snapshots.posts_count');
                break;
        }

        $q->select([
                'user_activity_snapshots.user_id',
                'u.username',
                'u.nickname',
                'u.avatar_url',
                'user_activity_snapshots.period_days',
                'user_activity_snapshots.scope_tag',
                'user_activity_snapshots.posts_count',
                'user_activity_snapshots.total_chars',
                'user_activity_snapshots.avg_chars',
                'user_activity_snapshots.active_weeks',
                'user_activity_snapshots.stability_ratio',
                'user_activity_snapshots.calculated_at',
                'user_activity_snapshots.updated_at',
            ])
            ->selectRaw('COALESCE(ac.cnt, 0) as completed_arcs_count')
            ->selectRaw('COALESCE(ec.cnt, 0) as completed_episodes_count');

        return $q->limit($limit)->get();
    }
}
