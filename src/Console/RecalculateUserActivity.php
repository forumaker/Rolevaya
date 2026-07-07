<?php

namespace forumaker\Rolevaya\Console;

use forumaker\Rolevaya\Service\ActivitySnapshotCalculator;
use Illuminate\Console\Command;

class RecalculateUserActivity extends Command
{
    protected $signature = 'rolevaya:recalculate-activity';
    protected $description = 'Recalculate user activity snapshots for Rolevaya';

    public function __construct(
        protected ActivitySnapshotCalculator $calculator
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $this->info('Recalculating activity...');

        $result = $this->calculator->calculate();

        $this->info("Recalculated for period={$result['period_days']} (0 = all-time), scope_tag={$result['scope_tag']}.");
        $this->info('Done. Rows: ' . $result['rows']);

        return 0;
    }
}
