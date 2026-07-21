<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\Builder;

return [
    'up' => function (Builder $schema) {
        if (!$schema->hasTable('character_sheets')) {
            return;
        }

        if (!$schema->hasColumn('character_sheets', 'roleplay_experience')) {
            $schema->table('character_sheets', function (Blueprint $table) {
                                                $table->unsignedSmallInteger('roleplay_experience')->default(0)->after('sum');
                $table->index(['roleplay_experience'], 'character_sheets_rpexp_idx');
            });
        }
    },

    'down' => function (Builder $schema) {
        if (!$schema->hasTable('character_sheets')) {
            return;
        }

        if ($schema->hasColumn('character_sheets', 'roleplay_experience')) {
            $schema->table('character_sheets', function (Blueprint $table) {
                $table->dropIndex('character_sheets_rpexp_idx');
                $table->dropColumn('roleplay_experience');
            });
        }
    },
];