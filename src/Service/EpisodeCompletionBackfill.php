<?php

namespace forumaker\Rolevaya\Service;

use Carbon\CarbonImmutable;
use forumaker\Rolevaya\Model\CompletedEpisode;
use forumaker\Rolevaya\Repository\RoleplayScanRepository;
use forumaker\Rolevaya\RoleplayTags;

class EpisodeCompletionBackfill
{
    public function __construct(
        protected RoleplayScanRepository $scanRepository,
        protected EpisodeCompletionParser $parser,
        protected MentionedUserResolver $resolver,
        protected RoleplayTags $tags
    ) {}

    public function run(?int $limit = null, ?int $discussionIdMin = null, ?int $discussionIdMax = null): int
    {
        $episodesTag = $this->tags->episodes();

        $now = CarbonImmutable::now()->toDateTimeString();

        $discussionIds = $this->scanRepository->discussionIdsForTag($episodesTag, $limit, $discussionIdMin, $discussionIdMax);
        if (!count($discussionIds)) {
            return 0;
        }

        $userIdCache = [];
        $saved = 0;

        foreach (array_chunk($discussionIds, 200) as $chunk) {
            $posts = $this->scanRepository->completionCandidatePosts($chunk);

            foreach ($posts as $post) {
                $entries = $this->parser->parse((string) $post->content);
                if (!$entries) {
                    continue;
                }

                foreach ($entries as $entry) {
                    $userId = $this->resolveUserId($entry, $userIdCache);
                    if ($userId === null) {
                        continue;
                    }

                    CompletedEpisode::updateOrCreate(
                        [
                            'source_post_id' => (int) $post->id,
                            'user_id'        => $userId,
                        ],
                        [
                            'discussion_id' => (int) $post->discussion_id,
                            'parsed_at'     => $now,
                        ]
                    );

                    $saved++;
                }
            }
        }

        return $saved;
    }

    private function resolveUserId(array $mention, array &$cache): ?int
    {
        $key = ($mention['mention_type'] ?? null) . ':' . ($mention['mention_id'] ?? '') . ':' . mb_strtolower($mention['username']);

        if (array_key_exists($key, $cache)) {
            return $cache[$key];
        }

        return $cache[$key] = $this->resolver->resolve($mention);
    }
}
