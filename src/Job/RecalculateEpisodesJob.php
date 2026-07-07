<?php

namespace forumaker\Rolevaya\Job;

use Flarum\Queue\AbstractJob;
use forumaker\Rolevaya\Service\EpisodeCompletionBackfill;

/**
 * Queued equivalent of `rolevaya:recalculate-episodes`. Dispatched from
 * RecalculateEpisodesController so the HTTP request doesn't have to hold
 * the connection open while every episode discussion is scanned
 * synchronously.
 */
class RecalculateEpisodesJob extends AbstractJob
{
    public function handle(EpisodeCompletionBackfill $backfill): void
    {
        $backfill->run();
    }
}
