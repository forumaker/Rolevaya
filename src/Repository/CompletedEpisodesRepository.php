<?php

namespace forumaker\Rolevaya\Repository;

use forumaker\Rolevaya\Model\CompletedEpisode;
use Illuminate\Support\Collection;

/**
 * See CompletedArcsRepository for why this is a thin wrapper around an
 * Eloquent query scope (CompletedEpisode::scopeForUser()) instead of a raw
 * ConnectionInterface query.
 */
class CompletedEpisodesRepository
{
    public function forUser(int $userId, int $limit): Collection
    {
        return CompletedEpisode::query()->forUser($userId, $limit)->get();
    }
}
