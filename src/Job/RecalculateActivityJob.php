<?php

namespace forumaker\Rolevaya\Job;

use Flarum\Queue\AbstractJob;
use forumaker\Rolevaya\Service\ActivitySnapshotCalculator;

class RecalculateActivityJob extends AbstractJob
{
    public function handle(ActivitySnapshotCalculator $calculator): void
    {
        $calculator->calculate();
    }
}
