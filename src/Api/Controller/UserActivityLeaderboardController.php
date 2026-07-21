<?php

namespace forumaker\Rolevaya\Api\Controller;

use Flarum\Settings\SettingsRepositoryInterface;
use forumaker\Rolevaya\Repository\ActivityLeaderboardRepository;
use forumaker\Rolevaya\RoleplayTags;
use forumaker\Rolevaya\Support\SettingsIdList;
use Illuminate\Support\Arr;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

class UserActivityLeaderboardController implements RequestHandlerInterface
{
    public function __construct(
        protected ActivityLeaderboardRepository $repository,
        protected SettingsRepositoryInterface $settings,
        protected RoleplayTags $tags
    ) {}

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $query = $request->getQueryParams();

        $period = (int) $this->settings->get('forumaker-rolevaya.activityPeriodDays', 0);
        if ($period < 0) {
            $period = 0;
        }

        $sort = (string) Arr::get($query, 'sort', 'posts_count');
        if (!in_array($sort, ['posts_count', 'avg_chars', 'completed_arcs_count', 'completed_episodes_count'], true)) {
            $sort = 'posts_count';
        }

        $minPosts = (int) Arr::get($query, 'min_posts', 0);
        if ($minPosts < 0) $minPosts = 0;
        if ($minPosts > 500) $minPosts = 500;

        $limit = (int) Arr::get($query, 'limit', 50);
        if ($limit < 1) $limit = 1;
        if ($limit > 200) $limit = 200;

        $excludeCurators = (int) Arr::get($query, 'exclude_curators', 0) === 1;
                        $curatorUserIds = SettingsIdList::read(
            $this->settings,
            'forumaker-rolevaya.curatorUserIds',
            []
        );

        $rows = $this->repository->topActivity($period, $sort, $minPosts, $limit, $excludeCurators, $curatorUserIds);

        $res = new JsonResponse([
            'period' => $period,
            'scope_tag' => $this->tags->role(),
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
