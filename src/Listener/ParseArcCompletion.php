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
