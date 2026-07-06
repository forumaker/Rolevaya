<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\Builder;

return [
    'up' => function (Builder $schema) {
        if ($schema->hasTable('completed_arcs')) {
            return;
        }

        $schema->create('completed_arcs', function (Blueprint $table) {
            $table->bigIncrements('id');

            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('discussion_id');
            $table->unsignedBigInteger('source_post_id');

            $table->string('arc_title', 255);
            $table->unsignedInteger('experience')->default(0);
            $table->integer('gold')->default(0);

            $table->timestamp('parsed_at')->nullable();
            $table->timestamps();

            $table->unique(['source_post_id', 'arc_title'], 'completed_arcs_post_title_unique');
            $table->index(['user_id'], 'completed_arcs_user_idx');
            $table->index(['discussion_id'], 'completed_arcs_discussion_idx');
        });
    },

    'down' => function (Builder $schema) {
        $schema->dropIfExists('completed_arcs');
    },
];
