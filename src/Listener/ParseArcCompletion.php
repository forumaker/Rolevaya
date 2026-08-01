<?php

namespace forumaker\Rolevaya\Listener;

use Flarum\Post\Event\Saved;
use forumaker\Rolevaya\Model\CompletedArc;
use forumaker\Rolevaya\RoleplayTags;
use forumaker\Rolevaya\Service\ArcCompletionParser;
use forumaker\Rolevaya\Service\MentionedUserResolver;
use Psr\Log\LoggerInterface;
use Throwable;

class ParseArcCompletion
{
    public function __construct(
        protected ArcCompletionParser $parser,
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
        if (!$discussion->tags->contains('slug', $this->tags->role())) {
            return;
        }

        $arcs = $this->parser->parse((string) $post->content);
        if (!$arcs) {
            return;
        }

        $now = now();

                                                $userIdCache = [];

        foreach ($arcs as $arc) {
            $userId = $this->resolver->resolveWithCache($arc, $userIdCache);
            if ($userId === null) {
                continue;
            }

            try {
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
            } catch (Throwable $e) {
                $this->logger->error('[forumaker-rolevaya] Failed to save completed arc for post #' . $post->id . ': ' . $e->getMessage(), ['exception' => $e]);
            }
        }
    }
}
