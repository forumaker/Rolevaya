<?php

namespace forumaker\Rolevaya\Repository;

use Flarum\User\User;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Collection;

class ArenaLeaderboardRepository
{
    protected ConnectionInterface $db;

    public function __construct(User $model)
    {
        $this->db = $model->getConnection();
    }

    public function topArena(string $sort, int $limit, bool $excludeCurators, array $excludeUserIds): Collection
    {
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
