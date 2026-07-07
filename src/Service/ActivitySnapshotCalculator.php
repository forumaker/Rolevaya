<?php

namespace forumaker\Rolevaya\Service;

use Carbon\CarbonImmutable;
use Flarum\Settings\SettingsRepositoryInterface;
use forumaker\Rolevaya\Repository\ActivitySnapshotRepository;
use forumaker\Rolevaya\RoleplayTags;

/**
 * Shared implementation for recalculating user_activity_snapshots, used by
 * both RecalculateActivityController (HTTP) and RecalculateUserActivity
 * (console). Previously this logic was duplicated verbatim between the two
 * call sites.
 *
 * Posts are streamed via a cursor rather than loaded in bulk with get() so
 * that a forum with thousands of roleplay posts doesn't have to hold every
 * post's full content in PHP memory at once.
 */
class ActivitySnapshotCalculator
{
    private const MIN_POST_LENGTH = 400;

    public function __construct(
        protected ActivitySnapshotRepository $repository,
        protected SettingsRepositoryInterface $settings,
        protected RoleplayTags $tags
    ) {}

    /**
     * @return array{rows: int, calculated_at: string, period_days: int, scope_tag: string}
     */
    public function calculate(): array
    {
        $roleTag = $this->tags->role();

        // 0 = all-time. Configurable via forumaker-rolevaya.activityPeriodDays
        // so the rolling-window filter below can actually be exercised.
        $period = (int) $this->settings->get('forumaker-rolevaya.activityPeriodDays', 0);
        if ($period < 0) {
            $period = 0;
        }

        $now = CarbonImmutable::now();
        $nowTs = $now->toDateTimeString();

        $stats = [];

        // cursor() (via the repository) hydrates one row at a time instead
        // of materialising the whole result set (including the full post
        // content column) in memory up front.
        foreach ($this->repository->scanPosts($roleTag, $period, $now) as $post) {
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
                    'first_post_at' => (string) $post->created_at,
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
                'stability_ratio' => $this->stabilityRatio($row['first_post_at'], $activeWeeks, $now),
                'calculated_at' => $nowTs,
                'created_at' => $nowTs,
                'updated_at' => $nowTs,
            ];
        }

        $this->repository->replaceSnapshots($period, $roleTag, $payload);

        return [
            'rows' => count($payload),
            'calculated_at' => $nowTs,
            'period_days' => $period,
            'scope_tag' => $roleTag,
        ];
    }

    /**
     * Ratio of weeks the user was active (posted at least one qualifying
     * post) out of every week since their first qualifying post, capped at
     * 1.0. Gives a rough measure of how consistently someone has kept
     * posting since they started, rather than just a raw post count.
     */
    private function stabilityRatio(string $firstPostAt, int $activeWeeks, CarbonImmutable $now): float
    {
        $firstWeekStart = CarbonImmutable::parse($firstPostAt)->startOfWeek();
        $currentWeekStart = $now->startOfWeek();

        $totalWeeks = $firstWeekStart->diffInWeeks($currentWeekStart) + 1;
        if ($totalWeeks <= 0) {
            return 0.0;
        }

        $ratio = $activeWeeks / $totalWeeks;

        return round(min(1.0, $ratio), 4);
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
