<?php

namespace forumaker\Rolevaya\Job;

use Flarum\Queue\AbstractJob;
use forumaker\Rolevaya\Service\EpisodeCompletionBackfill;

class RecalculateEpisodesJob extends AbstractJob
{
    public function handle(EpisodeCompletionBackfill $backfill): void
    {
        $backfill->run();
    }
}
