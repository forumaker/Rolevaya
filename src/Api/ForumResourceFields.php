<?php

namespace forumaker\Rolevaya\Api;

use Flarum\Api\Context;
use Flarum\Api\Schema;

/**
 * Forum-wide permission flag read by the frontend to decide whether to show
 * the "Обновить" (recalculate) button in StatsTabs, matching Arena's
 * ForumResourceFields pattern (see forumaker/arena's own class of the same
 * name) instead of hardcoding an isAdmin check on the client.
 */
class ForumResourceFields
{
    public function __invoke(): array
    {
        return [
            Schema\Boolean::make('canRecalculateRolevaya')
                ->get(fn ($model, Context $context) => $context->getActor()->hasPermission('forumaker-rolevaya.recalculate')),
        ];
    }
}
