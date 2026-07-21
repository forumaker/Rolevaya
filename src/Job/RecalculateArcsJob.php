<?php

namespace forumaker\Rolevaya\Job;

use Flarum\Queue\AbstractJob;
use forumaker\Rolevaya\Service\ArcCompletionBackfill;

class RecalculateArcsJob extends AbstractJob
{
    public function handle(ArcCompletionBackfill $backfill): void
    {
        $backfill->run();
    }
}
