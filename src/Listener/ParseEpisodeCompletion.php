<?php

namespace forumaker\Rolevaya\Listener;

use Flarum\Post\Event\Saved;
use forumaker\Rolevaya\Model\CompletedEpisode;
use forumaker\Rolevaya\RoleplayTags;
use forumaker\Rolevaya\Service\EpisodeCompletionParser;
use forumaker\Rolevaya\Service\MentionedUserResolver;

class ParseEpisodeCompletion
{
    public function __construct(
        protected EpisodeCompletionParser $parser,
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

        // Accessing the `tags` relation property (rather than `tags()->where(...)->exists()`)
        // loads and caches the collection on the Discussion model. ParseCharacterSheet and
        // ParseArcCompletion listen on the same Post\Event\Saved and receive the same
        // $post/$discussion instances, so whichever of the three listeners runs first pays
        // for the query and the other two reuse the cached collection — one query instead
        // of three per post save.
        if (!$discussion->tags->contains('slug', $this->tags->episodes())) {
            return;
        }

        $entries = $this->parser->parse((string) $post->content);
        if (!$entries) {
            return;
        }

        $now = now();

        // Mirrors EpisodeCompletionBackfill::resolveUserId(): a single
        // completion post can name several participants, and
        // MentionedUserResolver::resolve() can issue up to 3 sequential
        // queries per unique mention. Caching within this one post's
        // participants avoids re-resolving the same name/mention twice.
        $userIdCache = [];

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
                    'discussion_id' => (int) $discussion->id,
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
