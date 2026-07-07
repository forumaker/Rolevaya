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
 */
return [
    'up' => function (Builder $schema) {
        if (!$schema->hasTable('character_sheets')) {
            return;
        }

        $connection = $schema->getConnection();
        $driver = $connection->getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            $connection->statement(
                'ALTER TABLE character_sheets '
                . 'MODIFY COLUMN sum SMALLINT UNSIGNED NOT NULL, '
                . 'MODIFY COLUMN roleplay_experience SMALLINT UNSIGNED NOT NULL DEFAULT 0'
            );
        } else {
            // Non-MySQL drivers (e.g. SQLite, used in some test setups)
            // don't enforce the TINYINT ceiling the same way, but keep the
            // declared schema consistent for anything that introspects it.
            // Requires doctrine/dbal for ->change() on these drivers.
            $schema->table('character_sheets', function (Blueprint $table) {
                $table->unsignedSmallInteger('sum')->change();
                $table->unsignedSmallInteger('roleplay_experience')->default(0)->change();
            });
        }
    },

    'down' => function (Builder $schema) {
        if (!$schema->hasTable('character_sheets')) {
            return;
        }

        $connection = $schema->getConnection();
        $driver = $connection->getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            $connection->statement(
                'ALTER TABLE character_sheets '
                . 'MODIFY COLUMN sum TINYINT UNSIGNED NOT NULL, '
                . 'MODIFY COLUMN roleplay_experience TINYINT UNSIGNED NOT NULL DEFAULT 0'
            );
        } else {
            $schema->table('character_sheets', function (Blueprint $table) {
                $table->unsignedTinyInteger('sum')->change();
                $table->unsignedTinyInteger('roleplay_experience')->default(0)->change();
            });
        }
    },
];
