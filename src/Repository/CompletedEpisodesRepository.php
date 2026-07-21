<?php

namespace forumaker\Rolevaya\Repository;

use forumaker\Rolevaya\Model\CompletedEpisode;
use Illuminate\Support\Collection;

class CompletedEpisodesRepository
{
    public function forUser(int $userId, int $limit): Collection
    {
        return CompletedEpisode::query()->forUser($userId, $limit)->get();
    }
}
