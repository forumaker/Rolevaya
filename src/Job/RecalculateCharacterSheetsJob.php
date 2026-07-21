<?php

namespace forumaker\Rolevaya\Job;

use Flarum\Queue\AbstractJob;
use forumaker\Rolevaya\Service\CharacterSheetBackfill;

class RecalculateCharacterSheetsJob extends AbstractJob
{
    public function handle(CharacterSheetBackfill $backfill): void
    {
        $backfill->run();
    }
}
