<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\Builder;

return [
    'up' => function (Builder $schema) {
        if (!$schema->hasTable('character_sheets')) {
            return;
        }

        if ($schema->hasColumn('character_sheets', 'source_post_number')) {
            return;
        }

        $schema->table('character_sheets', function (Blueprint $table) {
            $table->unsignedSmallInteger('source_post_number')->default(3)->after('source_post_id');
            $table->index('source_post_number', 'character_sheets_source_post_number_idx');
        });
    },

    'down' => function (Builder $schema) {
        if (!$schema->hasTable('character_sheets')) {
            return;
        }

        if (!$schema->hasColumn('character_sheets', 'source_post_number')) {
            return;
        }

        $schema->table('character_sheets', function (Blueprint $table) {
            $table->dropIndex('character_sheets_source_post_number_idx');
            $table->dropColumn('source_post_number');
        });
    },
];