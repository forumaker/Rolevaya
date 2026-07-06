<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\Builder;

return [
    'up' => function (Builder $schema) {
        $schema->table('completed_arcs', function (Blueprint $table) {
            $table->dropUnique('completed_arcs_post_title_unique');
            $table->unique(['source_post_id', 'arc_title', 'user_id'], 'completed_arcs_post_title_user_unique');
        });
    },

    'down' => function (Builder $schema) {
        $schema->table('completed_arcs', function (Blueprint $table) {
            $table->dropUnique('completed_arcs_post_title_user_unique');
            $table->unique(['source_post_id', 'arc_title'], 'completed_arcs_post_title_unique');
        });
    },
];
