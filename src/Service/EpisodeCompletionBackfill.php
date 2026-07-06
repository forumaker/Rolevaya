<?php

namespace forumaker\Rolevaya\Service;

use Carbon\CarbonImmutable;
use forumaker\Rolevaya\Model\CompletedEpisode;
use forumaker\Rolevaya\RoleplayTags;
use Illuminate\Database\ConnectionInterface;

class EpisodeCompletionBackfill
{
    public function __construct(
        protected ConnectionInterface $db,
        protected EpisodeCompletionParser $parser,
        protected MentionedUserResolver $resolver
    ) {}

    public function run(?int $limit = null, ?int $discussionIdMin = null, ?int $discussionIdMax = null): int
    {
        $episodesTag = RoleplayTags::EPISODES;

        $now = CarbonImmutable::now()->toDateTimeString();

        $q = $this->db->table('discussion_tag as dt')
            ->join('tags as t', 't.id', '=', 'dt.tag_id')
            ->where('t.slug', '=', $episodesTag)
            ->select('dt.discussion_id')
            ->orderBy('dt.discussion_id', 'asc');

        if ($discussionIdMin !== null) {
            $q->where('dt.discussion_id', '>=', $discussionIdMin);
        }
        if ($discussionIdMax !== null) {
            $q->where('dt.discussion_id', '<=', $discussionIdMax);
        }
        if ($limit !== null && $limit > 0) {
            $q->limit($limit);
        }

        $discussionIds = $q->pluck('discussion_id')->all();
        if (!count($discussionIds)) {
            return 0;
        }

        $userIdCache = [];
        $saved = 0;

        foreach (array_chunk($discussionIds, 200) as $chunk) {
            $posts = $this->db->table('posts')
                ->whereIn('discussion_id', $chunk)
                ->where('type', '=', 'comment')
                ->whereNull('hidden_at')
                ->where(function ($q) {
                    $q->where('content', 'like', '%[success%')
                      ->orWhere('content', 'like', '%<SUCCESS%');
                })
                ->orderBy('discussion_id', 'asc')
                ->orderBy('number', 'asc')
                ->get(['id', 'discussion_id', 'content']);

            foreach ($posts as $post) {
                $entries = $this->parser->parse((string) $post->content);
                if (!$entries) {
                    continue;
                }

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
                            'discussion_id' => (int) $post->discussion_id,
                            'parsed_at'     => $now,
                        ]
                    );

                    $saved++;
                }
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
