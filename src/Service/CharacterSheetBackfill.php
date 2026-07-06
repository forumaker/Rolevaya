<?php

namespace forumaker\Rolevaya\Service;

use Carbon\CarbonImmutable;
use Flarum\Settings\SettingsRepositoryInterface;
use forumaker\Rolevaya\Model\CharacterSheet;
use forumaker\Rolevaya\RoleplayTags;
use Illuminate\Database\ConnectionInterface;

class CharacterSheetBackfill
{
    public function __construct(
        protected ConnectionInterface $db,
        protected SettingsRepositoryInterface $settings,
        protected CharacterSheetParser $parser
    ) {}

    public function run(?int $limit = null, ?int $discussionIdMin = null, ?int $discussionIdMax = null): int
    {
        $charactersTag = RoleplayTags::CHARACTERS;
        $targetNumber  = (int) $this->settings->get('forumaker-rolevaya.charactersPostNumber', 3);

        $excludeDiscussionIds = [33];

        $scanLimit = 10;

        $now = CarbonImmutable::now()->toDateTimeString();

        $q = $this->db->table('discussion_tag as dt')
            ->join('tags as t', 't.id', '=', 'dt.tag_id')
            ->where('t.slug', '=', $charactersTag)
            ->whereNotIn('dt.discussion_id', $excludeDiscussionIds)
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

        $updated = 0;

        foreach (array_chunk($discussionIds, 500) as $chunk) {
            $posts = $this->db->table('posts')
                ->whereIn('discussion_id', $chunk)
                ->where('type', '=', 'comment')
                ->whereNull('hidden_at')
                ->whereBetween('number', [1, $scanLimit])
                ->orderBy('discussion_id', 'asc')
                ->orderByRaw('CASE WHEN number = ? THEN 0 ELSE 1 END', [$targetNumber])
                ->orderBy('number', 'asc')
                ->get([
                    'id',
                    'discussion_id',
                    'user_id',
                    'number',
                    'content',
                ]);

            $byDiscussion = [];
            foreach ($posts as $p) {
                $did = (int) $p->discussion_id;
                $byDiscussion[$did][] = $p;
            }

            foreach ($byDiscussion as $did => $list) {
                $picked = null;
                $parsed = null;

                foreach ($list as $p) {
                    $parsedTry = $this->parser->parse((string) $p->content);
                    if ($parsedTry) {
                        $picked = $p;
                        $parsed = $parsedTry;
                        break;
                    }
                }

                if (!$picked || !$parsed) {
                    continue;
                }

                CharacterSheet::updateOrCreate(
                    ['discussion_id' => $did],
                    array_merge($parsed, [
                        'user_id'            => (int) $picked->user_id,
                        'source_post_id'     => (int) $picked->id,
                        'source_post_number' => (int) $picked->number,
                        'parsed_at'          => $now,
                    ])
                );

                $updated++;
            }
        }

        return $updated;
    }
}