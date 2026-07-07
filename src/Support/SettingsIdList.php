<?php

namespace forumaker\Rolevaya\Support;

use Flarum\Settings\SettingsRepositoryInterface;

/**
 * Reads a JSON-encoded array of integer IDs from a setting, e.g. the
 * guardian/curator/excluded-discussion exclusion lists that used to be
 * hardcoded directly in controllers and services.
 */
final class SettingsIdList
{
    /**
     * @return int[]
     */
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
