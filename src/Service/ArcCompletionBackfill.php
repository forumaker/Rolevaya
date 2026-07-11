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

            $rows = [];

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

                    // Keyed by the same columns as the unique index, so a
                    // repeated arc/user pair within this chunk overwrites
                    // in-memory (last one wins, matching updateOrCreate()'s
                    // prior behaviour) instead of appearing twice in a single
                    // upsert() call — Postgres errors if ON CONFLICT hits the
                    // same row twice within one statement.
                    $key = $post->id . '|' . $arc['arc_title'] . '|' . $userId;

                    $rows[$key] = [
                        'source_post_id' => (int) $post->id,
                        'arc_title'      => $arc['arc_title'],
                        'user_id'        => $userId,
                        'discussion_id'  => (int) $post->discussion_id,
                        'experience'     => $arc['experience'],
                        'gold'           => $arc['gold'],
                        'parsed_at'      => $now,
                        'created_at'     => $now,
                        'updated_at'     => $now,
                    ];
                }
            }

            if ($rows) {
                // One upsert per chunk (against the (source_post_id,
                // arc_title, user_id) unique index) instead of one
                // SELECT+INSERT/UPDATE per arc completion via
                // updateOrCreate(). created_at/updated_at are set explicitly
                // because upsert() bypasses Eloquent's automatic timestamp
                // handling.
                CompletedArc::query()->upsert(
                    array_values($rows),
                    ['source_post_id', 'arc_title', 'user_id'],
                    ['discussion_id', 'experience', 'gold', 'parsed_at', 'updated_at']
                );

                $saved += count($rows);
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
