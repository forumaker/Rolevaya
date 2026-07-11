<?php

namespace forumaker\Rolevaya\Repository;

use forumaker\Rolevaya\Model\CompletedArc;
use Illuminate\Support\Collection;

/**
 * Unlike the leaderboard repositories, this join (completed_arcs joined
 * with discussions/posts) has a natural anchor model — CompletedArc — so
 * it's expressed as an Eloquent query scope (CompletedArc::scopeForUser())
 * instead of a raw ConnectionInterface query. This class stays a thin
 * wrapper (rather than querying the model directly from the controller) so
 * ListCompletedArcsController keeps depending on a repository abstraction
 * like its siblings, but it no longer needs ConnectionInterface at all.
 */
class CompletedArcsRepository
{
    public function forUser(int $userId, int $limit): Collection
    {
        return CompletedArc::query()->forUser($userId, $limit)->get();
    }
}
