<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\Builder;

return [
    'up' => function (Builder $schema) {
        if (!$schema->hasTable('character_sheets')) {
            return;
        }

        $schema->table('character_sheets', function (Blueprint $table) {
            $table->unsignedSmallInteger('sum')->change();
            $table->unsignedSmallInteger('roleplay_experience')->default(0)->change();
        });
    },

    'down' => function (Builder $schema) {
        if (!$schema->hasTable('character_sheets')) {
            return;
        }

        $schema->table('character_sheets', function (Blueprint $table) {
            $table->unsignedTinyInteger('sum')->change();
            $table->unsignedTinyInteger('roleplay_experience')->default(0)->change();
        });
    },
];
