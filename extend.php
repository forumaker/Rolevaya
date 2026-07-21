<?php

namespace forumaker\Rolevaya;

use Flarum\Api\Resource;
use Flarum\Extend;
use forumaker\Rolevaya\Api\Controller\CharacterLeaderboardController;
use forumaker\Rolevaya\Api\Controller\UserActivityLeaderboardController;
use forumaker\Rolevaya\Api\Controller\ArenaLeaderboardController;
use forumaker\Rolevaya\Api\Controller\RecalculateCharactersController;
use forumaker\Rolevaya\Api\Controller\RecalculateActivityController;
use forumaker\Rolevaya\Api\Controller\ListCompletedArcsController;
use forumaker\Rolevaya\Api\Controller\RecalculateArcsController;
use forumaker\Rolevaya\Api\Controller\ListCompletedEpisodesController;
use forumaker\Rolevaya\Api\Controller\RecalculateEpisodesController;
use forumaker\Rolevaya\Console\RecalculateUserActivity;
use forumaker\Rolevaya\Console\RecalculateCharacterSheets;
use forumaker\Rolevaya\Console\RecalculateCompletedArcs;
use forumaker\Rolevaya\Console\RecalculateCompletedEpisodes;
use forumaker\Rolevaya\Listener\ParseCharacterSheet;
use forumaker\Rolevaya\Listener\ParseArcCompletion;
use forumaker\Rolevaya\Listener\ParseEpisodeCompletion;

return [

    (new Extend\Frontend('admin'))
        ->js(__DIR__ . '/js/dist/admin.js')
        ->css(__DIR__ . '/resources/less/admin.less'),

    (new Extend\Frontend('forum'))
        ->js(__DIR__ . '/js/dist/forum.js')
        ->css(__DIR__ . '/resources/less/forum.less')
        ->route('/top', 'top'),

    new Extend\Locales(__DIR__ . '/resources/locale'),

    (new Extend\ApiResource(Resource\ForumResource::class))
        ->fields(Api\ForumResourceFields::class),

    (new Extend\Routes('api'))
        ->get(
            '/rolevaya/characters',
            'rolevaya.characters',
            CharacterLeaderboardController::class
        )
        ->get(
            '/rolevaya/activity',
            'rolevaya.activity',
            UserActivityLeaderboardController::class
        )
        ->get(
            '/rolevaya/arena-leaderboard',
            'rolevaya.arenaLeaderboard',
            ArenaLeaderboardController::class
        )
        ->post(
            '/rolevaya/recalculate-characters',
            'rolevaya.recalculate.characters',
            RecalculateCharactersController::class
        )
        ->post(
            '/rolevaya/recalculate-activity',
            'rolevaya.recalculate.activity',
            RecalculateActivityController::class
        )
        ->get(
            '/rolevaya/completed-arcs',
            'rolevaya.completedArcs',
            ListCompletedArcsController::class
        )
        ->post(
            '/rolevaya/recalculate-arcs',
            'rolevaya.recalculate.arcs',
            RecalculateArcsController::class
        )
        ->get(
            '/rolevaya/completed-episodes',
            'rolevaya.completedEpisodes',
            ListCompletedEpisodesController::class
        )
        ->post(
            '/rolevaya/recalculate-episodes',
            'rolevaya.recalculate.episodes',
            RecalculateEpisodesController::class
        ),

    (new Extend\Event())
        ->listen(\Flarum\Post\Event\Saved::class, ParseCharacterSheet::class)
        ->listen(\Flarum\Post\Event\Saved::class, ParseArcCompletion::class)
        ->listen(\Flarum\Post\Event\Saved::class, ParseEpisodeCompletion::class),

    (new Extend\Settings())
        ->default(
            'forumaker-rolevaya.bestBonus',
            json_encode([
                'enabled' => true,
                'label' => 'Бонус Лучшего',
                'icon' => 'fa-solid fa-stars',
                'description' => 'Один раз за арку получите доброе предсказание, которое точно сбудется в ближайшем будущем. Его форма может быть туманной: намёк, образ, фраза или случайная деталь. Персонаж не знает как именно это произойдёт и когда.',
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
        )
        ->default(
            'forumaker-rolevaya.manualPerks',
            json_encode([], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
        )
        ->default(
            'forumaker-rolevaya.guardianDiscussionIds',
            json_encode([])
        )
        ->default(
            'forumaker-rolevaya.curatorUserIds',
            json_encode([])
        )
        ->default(
            'forumaker-rolevaya.excludeCharacterDiscussionIds',
            json_encode([])
        )
        ->default(
            'forumaker-rolevaya.activityPeriodDays',
            '0'
        )
        ->default(
            'forumaker-rolevaya.tagCharacters',
            RoleplayTags::DEFAULT_CHARACTERS
        )
        ->default(
            'forumaker-rolevaya.tagRole',
            RoleplayTags::DEFAULT_ROLE
        )
        ->default(
            'forumaker-rolevaya.tagEpisodes',
            RoleplayTags::DEFAULT_EPISODES
        )
        ->default(
            'forumaker-rolevaya.arenaTagSlug',
            'arena'
        )
        ->serializeToForum(
            'forumaker-rolevaya.bestBonus',
            'forumaker-rolevaya.bestBonus'
        )
        ->serializeToForum(
            'forumaker-rolevaya.manualPerks',
            'forumaker-rolevaya.manualPerks'
        )
        // Tag slugs are public taxonomy (not sensitive like the guardian/
        // curator ID lists above), and the forum widget needs them to build
        // links to the characters/arena tag pages without a hardcoded
        // third-party domain baked into the compiled JS.
        ->serializeToForum(
            'forumaker-rolevaya.tagCharacters',
            'forumaker-rolevaya.tagCharacters'
        )
        ->serializeToForum(
            'forumaker-rolevaya.tagRole',
            'forumaker-rolevaya.tagRole'
        )
        ->serializeToForum(
            'forumaker-rolevaya.tagEpisodes',
            'forumaker-rolevaya.tagEpisodes'
        )
        ->serializeToForum(
            'forumaker-rolevaya.arenaTagSlug',
            'forumaker-rolevaya.arenaTagSlug'
        ),
        // guardianDiscussionIds and curatorUserIds are deliberately NOT
        // serialized to the forum frontend: they're internal moderation
        // role assignments, not something anonymous visitors need to see.
        // The server-side controllers already read them straight from
        // settings, and the client-side exclude toggles only need to send
        // exclude_guardians/exclude_curators — the actual ID lists never
        // need to reach the browser.

    (new Extend\Console())
        ->command(RecalculateUserActivity::class)
        ->command(RecalculateCharacterSheets::class)
        ->command(RecalculateCompletedArcs::class)
        ->command(RecalculateCompletedEpisodes::class),
];