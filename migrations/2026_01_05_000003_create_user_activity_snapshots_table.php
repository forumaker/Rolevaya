<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\Builder;

return [
    'up' => function (Builder $schema) {
        if ($schema->hasTable('user_activity_snapshots')) {
            return;
        }

        $schema->create('user_activity_snapshots', function (Blueprint $table) {
            $table->bigIncrements('id');

            $table->unsignedBigInteger('user_id');

            $table->unsignedSmallInteger('period_days');
            $table->string('scope_tag', 50);

            $table->unsignedInteger('posts_count')->default(0);
            $table->unsignedBigInteger('total_chars')->default(0);
            $table->unsignedInteger('avg_chars')->default(0);

            $table->unsignedSmallInteger('active_weeks')->default(0);
            $table->decimal('stability_ratio', 6, 4)->default(0);

            $table->timestamp('calculated_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'period_days', 'scope_tag'], 'uas_user_period_scope_unique');

            $table->index(['period_days', 'scope_tag'], 'uas_period_scope_idx');
            $table->index(['scope_tag', 'avg_chars'], 'uas_scope_avg_idx');
            $table->index(['scope_tag', 'stability_ratio'], 'uas_scope_stability_idx');
        });
    },

    'down' => function (Builder $schema) {
        $schema->dropIfExists('user_activity_snapshots');
    },
];