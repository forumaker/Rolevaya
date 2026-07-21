<?php

namespace forumaker\Rolevaya\Service;

class ArcCompletionParser
{
    public function parse(string $content): array
    {
        $blocks = $this->extractSuccessBlocks($content);
        if (!$blocks) {
            return [];
        }

        $result = [];

        foreach ($blocks as $block) {
            $title = $this->matchArcTitle($block['title']);
            if ($title === null) {
                continue;
            }

            foreach ($this->extractParticipants($block['body']) as $p) {
                $result[] = [
                    'arc_title'    => $title,
                    'username'     => $p['username'],
                    'mention_type' => $p['mention_type'],
                    'mention_id'   => $p['mention_id'],
                    'experience'   => $p['experience'],
                    'gold'         => $p['gold'],
                ];
            }
        }

        return $result;
    }

    private function extractSuccessBlocks(string $content): array
    {
        $blocks = [];

        if (preg_match_all('/\[success\b([^\]]*)\](.*?)\[\/success\]/isu', $content, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $m) {
                if (!preg_match('/\btitle\s*=\s*(.*?)(?:\s+(?:font|bg|border)\s*=|$)/isu', $m[1], $tm)) {
                    continue;
                }

                $blocks[] = [
                    'title' => trim($tm[1], "\"' \t\r\n"),
                    'body'  => $m[2],
                ];
            }
        }

        if (empty($blocks) && preg_match_all('/<SUCCESS\b[^>]*\btitle="([^"]*)"[^>]*>(.*?)<\/SUCCESS>/isu', $content, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $m) {
                $blocks[] = [
                    'title' => trim($m[1]),
                    'body'  => $m[2],
                ];
            }
        }

        return $blocks;
    }

    private function matchArcTitle(string $title): ?string
    {
        if (!preg_match('/АРКА\s*[«"]([^»"]+)[»"]\s*ЗАВЕРШ(?:ЕНА|ЕНЫ|ЁН)/iu', $title, $m)) {
            return null;
        }

        return trim($m[1]);
    }

    private function extractParticipants(string $body): array
    {
        $participants = [];

        if (preg_match_all('/@"([^"]+)"\s*#\s*(p)?(\d+)/iu', $body, $mentions, PREG_OFFSET_CAPTURE)) {
            $count = count($mentions[0]);

            for ($i = 0; $i < $count; $i++) {
                $username = trim($mentions[1][$i][0]);
                if ($username === '') {
                    continue;
                }

                $segment = $this->segmentAfter($body, $mentions[0], $i, $count);
                [$experience, $gold] = $this->extractRewards($segment);

                $participants[] = [
                    'username'     => $username,
                    'mention_type' => $mentions[2][$i][0] !== '' ? 'post' : 'user',
                    'mention_id'   => (int) $mentions[3][$i][0],
                    'experience'   => $experience,
                    'gold'         => $gold,
                ];
            }

            return $participants;
        }

        if (preg_match_all('/<(USERMENTION|POSTMENTION)\b([^>]*)>/iu', $body, $xmlMentions, PREG_OFFSET_CAPTURE)) {
            $count = count($xmlMentions[0]);

            for ($i = 0; $i < $count; $i++) {
                if (!preg_match('/\bdisplayname="([^"]*)"/iu', $xmlMentions[2][$i][0], $dn)) {
                    continue;
                }

                $username = trim($dn[1]);
                if ($username === '') {
                    continue;
                }

                $mentionId = null;
                if (preg_match('/\bid="(\d+)"/iu', $xmlMentions[2][$i][0], $idm)) {
                    $mentionId = (int) $idm[1];
                }

                $segment = $this->segmentAfter($body, $xmlMentions[0], $i, $count);
                [$experience, $gold] = $this->extractRewards($segment);

                $participants[] = [
                    'username'     => $username,
                    'mention_type' => strtoupper($xmlMentions[1][$i][0]) === 'POSTMENTION' ? 'post' : 'user',
                    'mention_id'   => $mentionId,
                    'experience'   => $experience,
                    'gold'         => $gold,
                ];
            }
        }

        return $participants;
    }

    private function segmentAfter(string $body, array $offsetMatches, int $index, int $count): string
    {
        $start = $offsetMatches[$index][1] + strlen($offsetMatches[$index][0]);
        $end   = ($index + 1 < $count) ? $offsetMatches[$index + 1][1] : strlen($body);

        return substr($body, $start, $end - $start);
    }

    private function extractRewards(string $segment): array
    {
        $experience = 0;
        $gold       = 0;

        if (preg_match('/(\d{1,5})\s*опыт/iu', $segment, $xp)) {
            $experience = (int) $xp[1];
        }

        if (preg_match('/(-?\d{1,5})\s*золот/iu', $segment, $g)) {
            $gold = (int) $g[1];
        }

        return [$experience, $gold];
    }
}
