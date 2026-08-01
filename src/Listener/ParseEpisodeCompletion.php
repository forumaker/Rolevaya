<?php

namespace forumaker\Rolevaya\Listener;

use Flarum\Post\Event\Saved;
use forumaker\Rolevaya\Model\CompletedEpisode;
use forumaker\Rolevaya\RoleplayTags;
use forumaker\Rolevaya\Service\EpisodeCompletionParser;
use forumaker\Rolevaya\Service\MentionedUserResolver;
use Psr\Log\LoggerInterface;
use Throwable;

class ParseEpisodeCompletion
{
    public function __construct(
        protected EpisodeCompletionParser $parser,
        protected MentionedUserResolver $resolver,
        protected RoleplayTags $tags,
        protected LoggerInterface $logger
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

        // Relies on Flarum core's post-save pipeline having already loaded the
        // discussion's `tags` relation onto $discussion by this point; Eloquent
        // caches it on the model instance, so this lazy-loads it once (not once
        // per listener) if that assumption ever stops holding.
        if (!$discussion->tags->contains('slug', $this->tags->episodes())) {
            return;
        }

        $entries = $this->parser->parse((string) $post->content);
        if (!$entries) {
            return;
        }

        $now = now();

                                                $userIdCache = [];

        foreach ($entries as $entry) {
            $userId = $this->resolver->resolveWithCache($entry, $userIdCache);
            if ($userId === null) {
                continue;
            }

            try {
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
            } catch (Throwable $e) {
                $this->logger->error('[forumaker-rolevaya] Failed to save completed episode for post #' . $post->id . ': ' . $e->getMessage(), ['exception' => $e]);
            }
        }
    }
}
