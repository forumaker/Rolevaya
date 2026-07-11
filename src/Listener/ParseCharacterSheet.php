<?php

namespace forumaker\Rolevaya\Listener;

use Flarum\Post\Event\Saved;
use forumaker\Rolevaya\Model\CharacterSheet;
use forumaker\Rolevaya\RoleplayTags;
use forumaker\Rolevaya\Service\CharacterSheetParser;

class ParseCharacterSheet
{
    public function __construct(
        protected CharacterSheetParser $parser,
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
        // loads and caches the collection on the Discussion model. ParseArcCompletion and
        // ParseEpisodeCompletion listen on the same Post\Event\Saved and receive the same
        // $post/$discussion instances, so whichever of the three listeners runs first pays
        // for the query and the other two reuse the cached collection — one query instead
        // of three per post save.
        if (!$discussion->tags->contains('slug', $this->tags->characters())) {
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
