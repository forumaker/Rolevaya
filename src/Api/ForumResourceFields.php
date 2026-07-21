<?php

namespace forumaker\Rolevaya\Api;

use Flarum\Api\Context;
use Flarum\Api\Schema;

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
