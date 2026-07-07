<?php

namespace forumaker\Rolevaya\Job;

use Flarum\Queue\AbstractJob;
use forumaker\Rolevaya\Service\CharacterSheetBackfill;

/**
 * Queued equivalent of `rolevaya:recalculate-characters`. Dispatched from
 * RecalculateCharactersController so the HTTP request doesn't have to hold
 * the connection open while every character discussion is scanned
 * synchronously.
 */
class RecalculateCharacterSheetsJob extends AbstractJob
{
    public function handle(CharacterSheetBackfill $backfill): void
    {
        $backfill->run();
    }
}
