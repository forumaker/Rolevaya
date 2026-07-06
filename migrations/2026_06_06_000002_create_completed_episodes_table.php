<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\Builder;

return [
    'up' => function (Builder $schema) {
        $schema->create('completed_episodes', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('discussion_id');
            $table->unsignedBigInteger('source_post_id');
            $table->timestamp('parsed_at')->nullable();
            $table->timestamps();

            $table->unique(['source_post_id', 'user_id'], 'completed_episodes_post_user_unique');
            $table->index(['user_id'], 'completed_episodes_user_idx');
            $table->index(['discussion_id'], 'completed_episodes_discussion_idx');
        });
    },

    'down' => function (Builder $schema) {
        $schema->dropIfExists('completed_episodes');
    },
];
