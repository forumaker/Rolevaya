<?php

namespace forumaker\Rolevaya\Listener;

use Flarum\Post\Event\Saved;
use forumaker\Rolevaya\Model\CharacterSheet;
use forumaker\Rolevaya\RoleplayTags;
use forumaker\Rolevaya\Service\CharacterSheetParser;

class ParseCharacterSheet
{
    public function __construct(
        protected CharacterSheetParser $parser
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

        if (!$discussion->tags()->where('slug', RoleplayTags::CHARACTERS)->exists()) {
            return;
        }

        $parsed = $this->parser->parse((string) $post->content);
        if (!$parsed) {
            return;
        }

        CharacterSheet::updateOrCreate(
            ['discussion_id' => (int) $discussion->id],
            array_merge($parsed, [
                'user_id'            => (int) $post->user_id,
                'source_post_id'     => (int) $post->id,
                'source_post_number' => (int) $post->number,
                'parsed_at'          => now(),
            ])
        );
    }
}
