<?php

namespace forumaker\Rolevaya\Api\Controller;

use Flarum\Extension\ExtensionManager;
use Flarum\Settings\SettingsRepositoryInterface;
use forumaker\Rolevaya\Repository\ArenaLeaderboardRepository;
use forumaker\Rolevaya\Support\SettingsIdList;
use Illuminate\Support\Arr;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

class ArenaLeaderboardController implements RequestHandlerInterface
{
    /**
     * forumaker/arena is an optional dependency: without it the arena_stats
     * table does not exist and any query against it would throw.
     */
    private const ARENA_EXTENSION_ID = 'forumaker-arena';

    public function __construct(
        protected ArenaLeaderboardRepository $repository,
        protected SettingsRepositoryInterface $settings,
        protected ExtensionManager $extensions
    ) {}

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $query = $request->getQueryParams();

        $sort = (string) Arr::get($query, 'sort', 'rating');
        if (!in_array($sort, ['wins', 'losses', 'draws', 'winrate', 'rating'], true)) {
            $sort = 'rating';
        }

        $limit = (int) Arr::get($query, 'limit', 50);
        if ($limit < 1) $limit = 1;
        if ($limit > 200) $limit = 200;

        $excludeCurators = (int) Arr::get($query, 'exclude_curators', 0) === 1;
                        $curatorUserIds = SettingsIdList::read(
            $this->settings,
            'forumaker-rolevaya.curatorUserIds',
            []
        );

        $available = $this->extensions->isEnabled(self::ARENA_EXTENSION_ID);

        $rows = $available
            ? $this->repository->topArena($sort, $limit, $excludeCurators, $curatorUserIds)
            : [];

        $res = new JsonResponse([
            'sort' => $sort,
            'limit' => $limit,
            'exclude_curators' => $excludeCurators,
            'available' => $available,
            'data' => $rows,
        ]);

        return $res
            ->withHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->withHeader('Pragma', 'no-cache');
    }
}
