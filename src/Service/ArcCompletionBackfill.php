<?php

namespace forumaker\Rolevaya\Service;

use Carbon\CarbonImmutable;
use forumaker\Rolevaya\Model\CompletedArc;
use forumaker\Rolevaya\Repository\RoleplayScanRepository;
use forumaker\Rolevaya\RoleplayTags;

class ArcCompletionBackfill
{
    public function __construct(
        protected RoleplayScanRepository $scanRepository,
        protected ArcCompletionParser $parser,
        protected MentionedUserResolver $resolver,
        protected RoleplayTags $tags
    ) {}

    public function run(?int $limit = null, ?int $discussionIdMin = null, ?int $discussionIdMax = null): int
    {
        $roleTag = $this->tags->role();

        $now = CarbonImmutable::now()->toDateTimeString();

        $discussionIds = $this->scanRepository->discussionIdsForTag($roleTag, $limit, $discussionIdMin, $discussionIdMax);
        if (!count($discussionIds)) {
            return 0;
        }

        $userIdCache = [];
        $saved = 0;

        foreach (array_chunk($discussionIds, 200) as $chunk) {
            $posts = $this->scanRepository->completionCandidatePosts($chunk);

            foreach ($posts as $post) {
                $arcs = $this->parser->parse((string) $post->content);
                if (!$arcs) {
                    continue;
                }

                foreach ($arcs as $arc) {
                    $userId = $this->resolveUserId($arc, $userIdCache);
                    if ($userId === null) {
                        continue;
                    }

                    CompletedArc::updateOrCreate(
                        [
                            'source_post_id' => (int) $post->id,
                            'arc_title'      => $arc['arc_title'],
                            'user_id'        => $userId,
                        ],
                        [
                            'discussion_id' => (int) $post->discussion_id,
                            'experience'    => $arc['experience'],
                            'gold'          => $arc['gold'],
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
