<?php

namespace forumaker\Rolevaya\Api\Controller;

use Carbon\CarbonImmutable;
use forumaker\Rolevaya\RoleplayTags;
use Illuminate\Database\ConnectionInterface;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

class RecalculateActivityController implements RequestHandlerInterface
{
    private const PERIOD_DAYS = 0;
    private const MIN_POST_LENGTH = 400;

    public function __construct(
        protected ConnectionInterface $db
    ) {}

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $roleTag = RoleplayTags::ROLE;
        $period  = (int) self::PERIOD_DAYS;

        $now   = CarbonImmutable::now();
        $nowTs = $now->toDateTimeString();

        $postsQ = $this->db->table('posts')
            ->join('discussion_tag', 'discussion_tag.discussion_id', '=', 'posts.discussion_id')
            ->join('tags', 'tags.id', '=', 'discussion_tag.tag_id')
            ->where('tags.slug', '=', $roleTag)
            ->where('posts.type', '=', 'comment')
            ->whereNull('posts.hidden_at')
            ->where('posts.number', '>', 1)
            ->orderBy('posts.created_at', 'asc')
            ->select([
                'posts.id',
                'posts.user_id',
                'posts.created_at',
                'posts.content',
            ]);

        if ($period > 0) {
            $since = $now->subDays($period)->toDateTimeString();
            $postsQ->where('posts.created_at', '>=', $since);
        }

        $posts = $postsQ->get();

        $stats = [];

        foreach ($posts as $post) {
            $userId = (int) ($post->user_id ?? 0);
            if ($userId <= 0) {
                continue;
            }

            $plain = $this->plainText((string) ($post->content ?? ''));
            $length = mb_strlen($plain);

            if ($length < self::MIN_POST_LENGTH) {
                continue;
            }

            if (!isset($stats[$userId])) {
                $stats[$userId] = [
                    'user_id' => $userId,
                    'posts_count' => 0,
                    'total_chars' => 0,
                    'active_weeks' => [],
                ];
            }

            $stats[$userId]['posts_count']++;
            $stats[$userId]['total_chars'] += $length;

            $weekKey = CarbonImmutable::parse((string) $post->created_at)->format('o-W');
            $stats[$userId]['active_weeks'][$weekKey] = true;
        }

        $payload = [];

        foreach ($stats as $row) {
            $postsCount = (int) $row['posts_count'];
            $totalChars = (int) $row['total_chars'];
            $activeWeeks = count($row['active_weeks']);
            $avgChars = $postsCount > 0 ? (int) round($totalChars / $postsCount) : 0;

            $payload[] = [
                'user_id' => (int) $row['user_id'],
                'period_days' => (int) $period,
                'scope_tag' => $roleTag,
                'posts_count' => $postsCount,
                'total_chars' => $totalChars,
                'avg_chars' => $avgChars,
                'active_weeks' => $activeWeeks,
                'stability_ratio' => 0.0,
                'calculated_at' => $nowTs,
                'created_at' => $nowTs,
                'updated_at' => $nowTs,
            ];
        }

        $this->db->transaction(function () use ($period, $roleTag, $payload) {
            $this->db->table('user_activity_snapshots')
                ->where('period_days', '=', $period)
                ->where('scope_tag', '=', $roleTag)
                ->delete();

            if (count($payload)) {
                foreach (array_chunk($payload, 1000) as $chunk) {
                    $this->db->table('user_activity_snapshots')->insert($chunk);
                }
            }
        });

        return new JsonResponse([
            'ok' => true,
            'rows' => count($payload),
            'calculated_at' => $nowTs,
        ]);
    }

    private function plainText(string $content): string
    {
        $text = html_entity_decode($content, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        $text = preg_replace('~\[dice[^\]]*].*?\[/dice]~isu', ' ', $text);
        $text = preg_replace('~\[roll[^\]]*].*?\[/roll]~isu', ' ', $text);

        $text = preg_replace('~\[(?:/?)(?:img|url|email|media|attach|quote|spoiler|code|php|html|markdown|list|\*|center|left|right|justify|size|color|font|sub|sup|indent|plain|user|post|discussion|thread|topic|site|iframe|video|audio)[^\]]*]~isu', ' ', $text);

        $text = preg_replace('/<br\s*\/?>/iu', "\n", $text);
        $text = strip_tags($text);

        $text = preg_replace('/https?:\/\/\S+/iu', ' ', $text);
        $text = preg_replace('/\s+/u', ' ', $text);

        return trim($text);
    }
}