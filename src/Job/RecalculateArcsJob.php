<?php

namespace forumaker\Rolevaya\Job;

use Flarum\Queue\AbstractJob;
use forumaker\Rolevaya\Service\ArcCompletionBackfill;

/**
 * Queued equivalent of `rolevaya:recalculate-arcs`. Dispatched from
 * RecalculateArcsController so the HTTP request doesn't have to hold the
 * connection open while every roleplay discussion is scanned synchronously.
 */
class RecalculateArcsJob extends AbstractJob
{
    public function handle(ArcCompletionBackfill $backfill): void
    {
        $backfill->run();
    }
}
