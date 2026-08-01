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
        // Deliberately does NOT restore the old ['source_post_id', 'arc_title']
        // unique index: it was wrong (missing user_id, allowing only one
        // participant per arc per post) and re-adding it on rollback could
        // fail outright — or silently corrupt the schema — once rows for
        // multiple participants on the same arc/post exist.
        $schema->table('completed_arcs', function (Blueprint $table) {
            $table->dropUnique('completed_arcs_post_title_user_unique');
        });
    },
];
