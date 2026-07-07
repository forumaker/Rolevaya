<?php

namespace forumaker\Rolevaya\Job;

use Flarum\Queue\AbstractJob;
use forumaker\Rolevaya\Service\ActivitySnapshotCalculator;

/**
 * Queued equivalent of `rolevaya:recalculate-activity`. Dispatched from
 * RecalculateActivityController so the HTTP request doesn't have to hold
 * the connection open while every roleplay post is scanned synchronously.
 */
class RecalculateActivityJob extends AbstractJob
{
    public function handle(ActivitySnapshotCalculator $calculator): void
    {
        $calculator->calculate();
    }
}
