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

        if (!$discussion->tags()->where('slug', $this->tags->episodes())->exists()) {
            return;
        }

        $entries = $this->parser->parse((string) $post->content);
        if (!$entries) {
            return;
        }

        $now = now();

        foreach ($entries as $entry) {
            $userId = $this->resolver->resolve($entry);
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
}
