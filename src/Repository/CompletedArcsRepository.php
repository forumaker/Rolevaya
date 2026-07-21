<?php

namespace forumaker\Rolevaya\Repository;

use forumaker\Rolevaya\Model\CompletedArc;
use Illuminate\Support\Collection;

class CompletedArcsRepository
{
    public function forUser(int $userId, int $limit): Collection
    {
        return CompletedArc::query()->forUser($userId, $limit)->get();
    }
}
