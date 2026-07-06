<?php

namespace forumaker\Rolevaya\Console;

use Illuminate\Console\Command;
use forumaker\Rolevaya\Service\CharacterSheetBackfill;

class RecalculateCharacterSheets extends Command
{
    protected $signature = 'rolevaya:recalculate-characters
        {--limit= : Limit number of discussions to process}
        {--min= : Minimal discussion_id (inclusive)}
        {--max= : Maximal discussion_id (inclusive)}';

    protected $description = 'Recalculate character sheets from existing character discussions (backfill)';

    public function __construct(
        protected CharacterSheetBackfill $backfill
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $limit = $this->option('limit');
        $min   = $this->option('min');
        $max   = $this->option('max');

        $limit = $limit !== null ? (int) $limit : null;
        $min   = $min !== null ? (int) $min : null;
        $max   = $max !== null ? (int) $max : null;

        $this->info('Recalculating character sheets...');

        $count = $this->backfill->run($limit, $min, $max);

        $this->info("Done. Parsed rows: {$count}");

        return 0;
    }
}