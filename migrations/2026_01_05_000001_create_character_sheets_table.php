<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\Builder;

return [
    'up' => function (Builder $schema) {
        if ($schema->hasTable('character_sheets')) {
            return;
        }

        $schema->create('character_sheets', function (Blueprint $table) {
            $table->bigIncrements('id');

            $table->unsignedBigInteger('discussion_id')->unique();
            $table->unsignedBigInteger('user_id');

            $table->unsignedTinyInteger('physiology');
            $table->unsignedTinyInteger('dexterity');
            $table->unsignedTinyInteger('magic');
            $table->unsignedTinyInteger('charisma');
                                    $table->unsignedSmallInteger('sum');

            $table->unsignedBigInteger('source_post_id');
            $table->timestamp('parsed_at')->nullable();

            $table->timestamps();

            $table->index(['sum'], 'character_sheets_sum_idx');
            $table->index(['physiology'], 'character_sheets_phys_idx');
            $table->index(['dexterity'], 'character_sheets_dex_idx');
            $table->index(['magic'], 'character_sheets_magic_idx');
            $table->index(['charisma'], 'character_sheets_cha_idx');
        });
    },

    'down' => function (Builder $schema) {
        $schema->dropIfExists('character_sheets');
    },
];