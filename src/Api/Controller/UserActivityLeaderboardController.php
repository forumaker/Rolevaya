<?php

namespace forumaker\Rolevaya\Api\Controller;

use forumaker\Rolevaya\RoleplayTags;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Arr;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

class UserActivityLeaderboardController implements RequestHandlerInterface
{
    private const PERIOD_DAYS = 0;

    public function __construct(
        protected ConnectionInterface $db
    ) {}

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $query = $request->getQueryParams();

        $period = (int) self::PERIOD_DAYS;

        $sort = (string) Arr::get($query, 'sort', 'stability');
        if (!in_array($sort, ['posts_count', 'avg_chars', 'stability', 'completed_arcs_count', 'completed_episodes_count'], true)) {
            $sort = 'stability';
        }

        $minPosts = (int) Arr::get($query, 'min_posts', 0);
        if ($minPosts < 0) $minPosts = 0;
        if ($minPosts > 500) $minPosts = 500;

        $limit = (int) Arr::get($query, 'limit', 50);
        if ($limit < 1) $limit = 1;
        if ($limit > 200) $limit = 200;

        $excludeCurators = (int) Arr::get($query, 'exclude_curators', 0) === 1;
        $curatorUserIds = [10, 27, 14];

        $roleTag = RoleplayTags::ROLE;

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

        if ($excludeCurators) {
            $q->whereNotIn('uas.user_id', $curatorUserIds);
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

            case 'stability':
            default:
                $q->orderByDesc('uas.stability_ratio')
                  ->orderByDesc('uas.posts_count');
                break;
        }

        $rows = $q->limit($limit)->get([
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

        $res = new JsonResponse([
            'period' => $period,
            'scope_tag' => $roleTag,
            'sort' => $sort,
            'min_posts' => $minPosts,
            'limit' => $limit,
            'exclude_curators' => $excludeCurators,
            'data' => $rows,
        ]);

        return $res
            ->withHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->withHeader('Pragma', 'no-cache');
    }
}