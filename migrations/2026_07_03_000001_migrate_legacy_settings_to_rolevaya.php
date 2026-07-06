<?php

use Illuminate\Database\Schema\Builder;

return [
    'up' => function (Builder $schema) {
        $connection = $schema->getConnection();

        $keyMap = [
            'forumaker-magicstats.bestBonus' => 'forumaker-rolevaya.bestBonus',
            'forumaker-magicstats.manualPerks' => 'forumaker-rolevaya.manualPerks',
        ];

        foreach ($keyMap as $oldKey => $newKey) {
            $legacy = $connection->table('settings')->where('key', $oldKey)->first();

            if (!$legacy) {
                continue;
            }

            $exists = $connection->table('settings')->where('key', $newKey)->exists();

            if ($exists) {
                continue;
            }

            $connection->table('settings')->insert([
                'key' => $newKey,
                'value' => $legacy->value,
            ]);
        }

        $connection->table('settings')->where('key', 'like', 'forumaker-magicstats.%')->delete();
    },

    'down' => function (Builder $schema) {
        $connection = $schema->getConnection();

        $keyMap = [
            'forumaker-rolevaya.bestBonus' => 'forumaker-magicstats.bestBonus',
            'forumaker-rolevaya.manualPerks' => 'forumaker-magicstats.manualPerks',
        ];

        foreach ($keyMap as $newKey => $oldKey) {
            $current = $connection->table('settings')->where('key', $newKey)->first();

            if (!$current) {
                continue;
            }

            $exists = $connection->table('settings')->where('key', $oldKey)->exists();

            if ($exists) {
                continue;
            }

            $connection->table('settings')->insert([
                'key' => $oldKey,
                'value' => $current->value,
            ]);
        }
    },
];
