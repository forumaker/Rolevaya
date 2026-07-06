<?php

namespace forumaker\Rolevaya\Api\Controller;

use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Arr;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

/**
 * "Арена" tab of the Зал Славы page (see StatsTabs.tsx) and the Арена tab of
 * the homepage widget (see HomepageActivitySlider.tsx). Reads the Arena
 * extension's own `arena_stats` table directly at request time — same
 * approach as CharacterLeaderboardController/UserActivityLeaderboardController
 * reading their own tables — rather than depending on Arena's PHP classes, so
 * this keeps working (returning an empty list) even if the Arena extension is
 * ever disabled. Win rate mirrors GetTopStatsController's convention in the
 * Arena extension: wins / (wins + losses), draws excluded from the
 * denominator, rounded to the nearest percent.
 */
class ArenaLeaderboardController implements RequestHandlerInterface
{
    public function __construct(
        protected ConnectionInterface $db
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
        $curatorUserIds = [10, 27, 14];

        // Floating-point division forced via "* 1.0" so SQLite (which
        // truncates integer division to 0 or 1) computes the same result as
        // MySQL/PostgreSQL; the CASE avoids a division-by-zero for players
        // who've only ever drawn.
        $winRateExpr = "CASE WHEN (arena_stats.wins + arena_stats.losses) = 0 THEN 0 "
            . "ELSE ROUND((arena_stats.wins * 1.0 / (arena_stats.wins + arena_stats.losses)) * 100) END";

        $q = $this->db->table('arena_stats')
            ->leftJoin('users as u', 'u.id', '=', 'arena_stats.user_id')
            ->where(function ($w) {
                $w->where('arena_stats.wins', '>', 0)
                  ->orWhere('arena_stats.losses', '>', 0)
                  ->orWhere('arena_stats.draws', '>', 0);
            });

        if ($excludeCurators) {
            $q->whereNotIn('arena_stats.user_id', $curatorUserIds);
        }

        switch ($sort) {
            case 'losses':
                $q->orderByDesc('arena_stats.losses')->orderByDesc('arena_stats.wins');
                break;

            case 'draws':
                $q->orderByDesc('arena_stats.draws')->orderByDesc('arena_stats.wins');
                break;

            case 'winrate':
                $q->orderByRaw("{$winRateExpr} DESC")->orderByDesc('arena_stats.wins');
                break;

            case 'wins':
            default:
                $q->orderByDesc('arena_stats.wins')->orderByRaw("{$winRateExpr} DESC");
                break;
        }

        $rows = $q->limit($limit)->get([
            'arena_stats.user_id',
            'u.username',
            'u.nickname',
            'u.avatar_url',
            'arena_stats.wins',
            'arena_stats.losses',
            'arena_stats.draws',
            $this->db->raw("{$winRateExpr} as win_rate"),
        ]);

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
