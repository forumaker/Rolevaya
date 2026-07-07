<?php

namespace forumaker\Rolevaya;

use Flarum\Settings\SettingsRepositoryInterface;

/**
 * Resolves the slugs of the tags used to scope roleplay tracking (arcs,
 * episodes, character sheets). Configurable via admin settings
 * (forumaker-rolevaya.tagCharacters/.tagRole/.tagEpisodes) so a forum whose
 * tagging taxonomy differs from the defaults below doesn't silently end up
 * with an empty leaderboard.
 */
class RoleplayTags
{
    public const DEFAULT_CHARACTERS = 'characters';

    public const DEFAULT_ROLE = 'role';

    public const DEFAULT_EPISODES = 'episodes';

    public function __construct(
        protected SettingsRepositoryInterface $settings
    ) {}

    public function characters(): string
    {
        return $this->read('forumaker-rolevaya.tagCharacters', self::DEFAULT_CHARACTERS);
    }

    public function role(): string
    {
        return $this->read('forumaker-rolevaya.tagRole', self::DEFAULT_ROLE);
    }

    public function episodes(): string
    {
        return $this->read('forumaker-rolevaya.tagEpisodes', self::DEFAULT_EPISODES);
    }

    private function read(string $key, string $default): string
    {
        $value = $this->settings->get($key);

        return ($value === null || trim((string) $value) === '') ? $default : trim((string) $value);
    }
}
