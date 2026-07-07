<?php

namespace forumaker\Rolevaya\Listener;

use Flarum\Post\Event\Saved;
use forumaker\Rolevaya\Model\CompletedArc;
use forumaker\Rolevaya\RoleplayTags;
use forumaker\Rolevaya\Service\ArcCompletionParser;
use forumaker\Rolevaya\Service\MentionedUserResolver;

class ParseArcCompletion
{
    public function __construct(
        protected ArcCompletionParser $parser,
        protected MentionedUserResolver $resolver,
        protected RoleplayTags $tags
    ) {}

    public function handle(Saved $event): void
    {
        $post = $event->post;

        if ((string) $post->type !== 'comment' || $post->hidden_at !== null) {
            return;
        }

        $discussion = $post->discussion;
        if (!$discussion) {
            return;
        }

        if (!$discussion->tags()->where('slug', $this->tags->role())->exists()) {
            return;
        }

        $arcs = $this->parser->parse((string) $post->content);
        if (!$arcs) {
            return;
        }

        $now = now();

        // Mirrors ArcCompletionBackfill::resolveUserId(): a single
        // completion post can name several participants, and
        // MentionedUserResolver::resolve() can issue up to 3 sequential
        // queries per unique mention. Caching within this one post's
        // participants avoids re-resolving the same name/mention twice.
        $userIdCache = [];

        foreach ($arcs as $arc) {
            $userId = $this->resolveUserId($arc, $userIdCache);
            if ($userId === null) {
                continue;
            }

            // Match key must include user_id: a single completion post can
            // name several participants under the same arc_title, and the
            // table's unique index is (source_post_id, arc_title, user_id)
            // — see migration 2026_06_07_000003_fix_completed_arcs_unique_index.
            // Without user_id here, the second participant's row would
            // overwrite the first instead of inserting alongside it.
            CompletedArc::updateOrCreate(
                [
                    'source_post_id' => (int) $post->id,
                    'arc_title'      => $arc['arc_title'],
                    'user_id'        => $userId,
                ],
                [
                    'discussion_id' => (int) $discussion->id,
                    'experience'    => $arc['experience'],
                    'gold'          => $arc['gold'],
                    'parsed_at'     => $now,
                ]
            );
        }
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
