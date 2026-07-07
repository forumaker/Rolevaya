<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\Builder;

/**
 * `sum` (physiology+dexterity+magic+charisma, each clamped 0-99 => max 396)
 * and `roleplay_experience` (clamped 0-999 in
 * CharacterSheetParser::extractRoleplayExperience) were originally stored as
 * TINYINT UNSIGNED (max 255). Values above 255 either throw in MySQL strict
 * mode or get silently capped, corrupting leaderboard ordering. Widen both
 * to SMALLINT UNSIGNED (max 65535).
 *
 * Uses the schema builder's ->change() uniformly across drivers (backed by
 * doctrine/dbal, already part of flarum/core's dependency tree) rather than
 * a raw MySQL-specific ALTER TABLE statement, so this doesn't silently fail
 * or throw on other Flarum-supported drivers (e.g. PostgreSQL).
 */
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
