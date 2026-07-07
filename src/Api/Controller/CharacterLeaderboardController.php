<?php

namespace forumaker\Rolevaya\Api\Controller;

use Flarum\Settings\SettingsRepositoryInterface;
use forumaker\Rolevaya\Repository\CharacterLeaderboardRepository;
use forumaker\Rolevaya\RoleplayTags;
use forumaker\Rolevaya\Support\SettingsIdList;
use Illuminate\Support\Arr;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

class CharacterLeaderboardController implements RequestHandlerInterface
{
    public function __construct(
        protected CharacterLeaderboardRepository $repository,
        protected SettingsRepositoryInterface $settings
    ) {}

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $query = $request->getQueryParams();

        $sort = (string) Arr::get($query, 'sort', 'sum');

        $allowedSorts = ['sum', 'physiology', 'dexterity', 'magic', 'charisma', 'roleplay_experience'];
        if (!in_array($sort, $allowedSorts, true)) {
            $sort = 'sum';
        }

        $limit = (int) Arr::get($query, 'limit', 50);
        if ($limit < 1) $limit = 1;
        if ($limit > 200) $limit = 200;

        $excludeGuardians = (int) Arr::get($query, 'exclude_guardians', 0) === 1;
        $guardianDiscussionIds = SettingsIdList::read(
            $this->settings,
            'forumaker-rolevaya.guardianDiscussionIds',
            [52, 61, 55, 59]
        );

        $rows = $this->repository->topCharacters($sort, $limit, $excludeGuardians, $guardianDiscussionIds);

        return new JsonResponse([
            'sort' => $sort,
            'limit' => $limit,
            'tag' => RoleplayTags::CHARACTERS,
            'exclude_guardians' => $excludeGuardians,
            'data' => $rows,
        ]);
    }
}
