<?php

namespace forumaker\Rolevaya\Repository;

use Illuminate\Support\Collection;

/**
 * Reads the Arena extension's own `arena_stats` table directly at request
 * time — same approach as before, kept isolated in a repository rather than
 * injecting ConnectionInterface straight into the controller. This still
 * keeps working (returning an empty list) even if the Arena extension is
 * ever disabled, since it doesn't depend on Arena's PHP classes.
 */
class ArenaLeaderboardRepository extends DatabaseRepository
{
    /**
     * @param int[] $excludeUserIds
     */
    public function topArena(string $sort, int $limit, bool $excludeCurators, array $excludeUserIds): Collection
    {
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

        if ($excludeCurators && count($excludeUserIds)) {
            $q->whereNotIn('arena_stats.user_id', $excludeUserIds);
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

        return $q->limit($limit)->get([
            'arena_stats.user_id',
            'u.username',
            'u.nickname',
            'u.avatar_url',
            'arena_stats.wins',
            'arena_stats.losses',
            'arena_stats.draws',
            $this->db->raw("{$winRateExpr} as win_rate"),
        ]);
    }
}
