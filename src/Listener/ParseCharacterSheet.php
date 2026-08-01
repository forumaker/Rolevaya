<?php

namespace forumaker\Rolevaya\Listener;

use Flarum\Post\Event\Saved;
use forumaker\Rolevaya\Model\CharacterSheet;
use forumaker\Rolevaya\RoleplayTags;
use forumaker\Rolevaya\Service\CharacterSheetParser;
use Psr\Log\LoggerInterface;
use Throwable;

class ParseCharacterSheet
{
    public function __construct(
        protected CharacterSheetParser $parser,
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
        if (!$discussion->tags->contains('slug', $this->tags->characters())) {
            return;
        }

        $parsed = $this->parser->parse((string) $post->content);
        if (!$parsed) {
            return;
        }

        try {
            CharacterSheet::updateOrCreate(
                ['discussion_id' => (int) $discussion->id],
                array_merge($parsed, [
                    'user_id'            => (int) $post->user_id,
                    'source_post_id'     => (int) $post->id,
                    'source_post_number' => (int) $post->number,
                    'parsed_at'          => now(),
                ])
            );
        } catch (Throwable $e) {
            $this->logger->error('[forumaker-rolevaya] Failed to save character sheet for discussion #' . $discussion->id . ': ' . $e->getMessage(), ['exception' => $e]);
        }
    }
}
