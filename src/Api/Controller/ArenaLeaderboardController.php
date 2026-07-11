<?php

namespace forumaker\Rolevaya\Api\Controller;

use Flarum\Settings\SettingsRepositoryInterface;
use forumaker\Rolevaya\Repository\ArenaLeaderboardRepository;
use forumaker\Rolevaya\Support\SettingsIdList;
use Illuminate\Support\Arr;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

/**
 * "Арена" tab of the Зал Славы page (see StatsTabs.tsx) and the Арена tab of
 * the homepage widget (see HomepageActivitySlider.tsx). Win rate mirrors
 * GetTopStatsController's convention in the Arena extension: wins / (wins +
 * losses), draws excluded from the denominator, rounded to the nearest
 * percent.
 *
 * Like CharacterLeaderboardController, this deliberately returns a plain
 * JsonResponse envelope instead of a Flarum JSON:API document — not visible
 * to app.store, not decoratable via Extend\ApiSerializer, and not a stable
 * third-party contract.
 */
class ArenaLeaderboardController implements RequestHandlerInterface
{
    public function __construct(
        protected ArenaLeaderboardRepository $repository,
        protected SettingsRepositoryInterface $settings
    ) {}

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $query = $request->getQueryParams();

        $sort = (string) Arr::get($query, 'sort', 'wins');
        if (!in_array($sort, ['wins', 'losses', 'draws', 'winrate'], true)) {
            $sort = 'wins';
        }

        $limit = (int) Arr::get($query, 'limit', 50);
        if ($limit < 1) $limit = 1;
        if ($limit > 200) $limit = 200;

        $excludeCurators = (int) Arr::get($query, 'exclude_curators', 0) === 1;
        // Empty by default: forum-specific IDs an admin must configure
        // themselves (see admin settings page).
        $curatorUserIds = SettingsIdList::read(
            $this->settings,
            'forumaker-rolevaya.curatorUserIds',
            []
        );

        $rows = $this->repository->topArena($sort, $limit, $excludeCurators, $curatorUserIds);

        $res = new JsonResponse([
            'sort' => $sort,
            'limit' => $limit,
            'exclude_curators' => $excludeCurators,
            'data' => $rows,
        ]);

        return $res
            ->withHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->withHeader('Pragma', 'no-cache');
    }
}
