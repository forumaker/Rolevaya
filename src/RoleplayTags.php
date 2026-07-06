<?php

namespace forumaker\Rolevaya;

/**
 * Slugs of the tags used to scope roleplay tracking (arcs, episodes, character
 * sheets). These are fixed for this forum and are intentionally not
 * configurable through the admin settings page.
 */
final class RoleplayTags
{
    public const CHARACTERS = 'characters';

    public const ROLE = 'role';

    public const EPISODES = 'episodes';
}
