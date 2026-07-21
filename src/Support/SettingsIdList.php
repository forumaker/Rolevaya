<?php

namespace forumaker\Rolevaya\Support;

use Flarum\Settings\SettingsRepositoryInterface;

final class SettingsIdList
{

    public static function read(SettingsRepositoryInterface $settings, string $key, array $default = []): array
    {
        $raw = $settings->get($key);

        if ($raw === null || $raw === '') {
            return $default;
        }

        $decoded = json_decode((string) $raw, true);

        if (!is_array($decoded)) {
            return $default;
        }

        return array_values(array_unique(array_map('intval', $decoded)));
    }
}
