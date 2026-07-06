<?php

namespace forumaker\Rolevaya\Console;

use Illuminate\Console\Command;
use forumaker\Rolevaya\Service\ArcCompletionBackfill;

class RecalculateCompletedArcs extends Command
{
    protected $signature = 'rolevaya:recalculate-arcs
        {--limit= : Limit number of discussions to process}
        {--min= : Minimal discussion_id (inclusive)}
        {--max= : Maximal discussion_id (inclusive)}';

    protected $description = 'Scan roleplay discussions for completed arc announcements (backfill)';

    public function __construct(
        protected ArcCompletionBackfill $backfill
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

        $this->info('Scanning for completed arcs...');

        $count = $this->backfill->run($limit, $min, $max);

        $this->info("Done. Saved rows: {$count}");

        return 0;
    }
}
