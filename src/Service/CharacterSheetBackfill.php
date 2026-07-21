<?php

namespace forumaker\Rolevaya\Service;

use Carbon\CarbonImmutable;
use Flarum\Settings\SettingsRepositoryInterface;
use forumaker\Rolevaya\Model\CharacterSheet;
use forumaker\Rolevaya\Repository\RoleplayScanRepository;
use forumaker\Rolevaya\RoleplayTags;
use forumaker\Rolevaya\Support\SettingsIdList;

class CharacterSheetBackfill
{
    public function __construct(
        protected RoleplayScanRepository $scanRepository,
        protected SettingsRepositoryInterface $settings,
        protected CharacterSheetParser $parser,
        protected RoleplayTags $tags
    ) {}

    public function run(?int $limit = null, ?int $discussionIdMin = null, ?int $discussionIdMax = null): int
    {
        $charactersTag = $this->tags->characters();
        $targetNumber  = (int) $this->settings->get('forumaker-rolevaya.charactersPostNumber', 3);

                                        $excludeDiscussionIds = SettingsIdList::read(
            $this->settings,
            'forumaker-rolevaya.excludeCharacterDiscussionIds',
            []
        );

        $scanLimit = 10;

        $now = CarbonImmutable::now()->toDateTimeString();

        $discussionIds = $this->scanRepository->discussionIdsForTag(
            $charactersTag,
            $limit,
            $discussionIdMin,
            $discussionIdMax,
            $excludeDiscussionIds
        );

        if (!count($discussionIds)) {
            return 0;
        }

        $updated = 0;

        foreach (array_chunk($discussionIds, 500) as $chunk) {
            $posts = $this->scanRepository->characterSheetCandidatePosts($chunk, $scanLimit, $targetNumber);

            $byDiscussion = [];
            foreach ($posts as $p) {
                $did = (int) $p->discussion_id;
                $byDiscussion[$did][] = $p;
            }

            $rows = [];

            foreach ($byDiscussion as $did => $list) {
                $picked = null;
                $parsed = null;

                foreach ($list as $p) {
                    $parsedTry = $this->parser->parse((string) $p->content);
                    if ($parsedTry) {
                        $picked = $p;
                        $parsed = $parsedTry;
                        break;
                    }
                }

                if (!$picked || !$parsed) {
                    continue;
                }

                $rows[] = array_merge($parsed, [
                    'discussion_id'      => $did,
                    'user_id'            => (int) $picked->user_id,
                    'source_post_id'     => (int) $picked->id,
                    'source_post_number' => (int) $picked->number,
                    'parsed_at'          => $now,
                    'created_at'         => $now,
                    'updated_at'         => $now,
                ]);
            }

            if ($rows) {
                                                                                                CharacterSheet::query()->upsert(
                    $rows,
                    ['discussion_id'],
                    [
                        'user_id',
                        'physiology',
                        'dexterity',
                        'magic',
                        'charisma',
                        'sum',
                        'roleplay_experience',
                        'source_post_id',
                        'source_post_number',
                        'parsed_at',
                        'updated_at',
                    ]
                );

                $updated += count($rows);
            }
        }

        return $updated;
    }
}
