<?php

namespace forumaker\Rolevaya\Console;

use Illuminate\Console\Command;
use forumaker\Rolevaya\Service\EpisodeCompletionBackfill;

class RecalculateCompletedEpisodes extends Command
{
    protected $signature = 'rolevaya:recalculate-episodes
        {--limit= : Limit number of discussions to process}
        {--min= : Minimal discussion_id (inclusive)}
        {--max= : Maximal discussion_id (inclusive)}';

    protected $description = 'Scan episode discussions for completed episode announcements (backfill)';

    public function __construct(
        protected EpisodeCompletionBackfill $backfill
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

        $this->info('Scanning for completed episodes...');

        $count = $this->backfill->run($limit, $min, $max);

        $this->info("Done. Saved rows: {$count}");

        return 0;
    }
}
