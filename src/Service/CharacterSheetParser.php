<?php

namespace forumaker\Rolevaya\Service;

class CharacterSheetParser
{
    public function parse(string $content): ?array
    {
        $segment = $this->extractStatsSegment($content);
        if ($segment === null) {
            return null;
        }

        $values = $this->extractBoldNumbers($segment);

        if (count($values) < 4) {
            $values = $this->extractNumbersFallback($segment);
        }

        if (count($values) < 4) {
            return null;
        }

        $physiology = $this->clamp((int) $values[0], 0, 99);
        $dexterity  = $this->clamp((int) $values[1], 0, 99);
        $magic      = $this->clamp((int) $values[2], 0, 99);
        $charisma   = $this->clamp((int) $values[3], 0, 99);

        $roleplayExperience = $this->extractRoleplayExperience($content);
        if ($roleplayExperience === null) {
            $roleplayExperience = 0;
        }

        return [
            'physiology' => $physiology,
            'dexterity'  => $dexterity,
            'magic'      => $magic,
            'charisma'   => $charisma,
            'sum'        => $physiology + $dexterity + $magic + $charisma,
            'roleplay_experience' => $roleplayExperience,
        ];
    }

    private function extractStatsSegment(string $content): ?string
    {
        $start = mb_stripos($content, 'ФИЗИОЛОГИЯ');
        if ($start === false) {
            return null;
        }

        $tail = mb_substr($content, $start);

        $end = mb_stripos($tail, 'ОПЫТ');
        if ($end !== false) {
            $tail = mb_substr($tail, 0, $end);
        }

        return $tail;
    }

    private function extractRoleplayExperience(string $content): ?int
    {
        $pos = mb_stripos($content, 'ОПЫТ ПЕРСОНАЖА');
        if ($pos === false) {
            return null;
        }

        $window = mb_substr($content, $pos, 6000);

        if (mb_stripos($window, 'ОПЫТ РОЛЕВИКА') === false) {
            return null;
        }

        $s = str_replace(["\r\n", "\r"], "\n", $window);

        $s = preg_replace('/\*\*(\d{1,3})\*\*/u', '$1', $s);

        $s = preg_replace('/<br\s*\/?>/iu', "\n", $s);
        $s = preg_replace('/<[^>]+>/u', ' ', $s);

        $s = preg_replace('/\[\s*\/?\s*center\s*\]/iu', ' ', $s);
        $s = preg_replace('/\[\s*\/?\s*size[^\]]*\]/iu', ' ', $s);
        $s = preg_replace('/\[\s*\/?\s*b\s*\]/iu', ' ', $s);
        $s = preg_replace('/\[\s*\/?\s*strong\s*\]/iu', ' ', $s);

        $s = preg_replace('/[ \t]+/u', ' ', $s);

        $lines = preg_split("/\n/u", $s) ?: [];
        $headerIdx = null;

        foreach ($lines as $i => $line) {
            if (
                preg_match('/ОПЫТ\s*ПЕРСОНАЖА/iu', $line) &&
                preg_match('/ОПЫТ\s*РОЛЕВИКА/iu', $line) &&
                strpos($line, '|') !== false
            ) {
                $headerIdx = $i;
                break;
            }
        }

        if ($headerIdx === null) {
            return null;
        }

        for ($j = $headerIdx + 1; $j <= min($headerIdx + 12, count($lines) - 1); $j++) {
            $line = trim((string) $lines[$j]);
            if ($line === '' || strpos($line, '|') === false) {
                continue;
            }

            if (preg_match('/^\s*\|\s*[-: ]+\|\s*[-: ]+\|\s*[-: ]+\|\s*$/u', $line)) {
                continue;
            }
            if (preg_match('/^\s*\|\s*-{3,}/u', $line)) {
                continue;
            }

            if (preg_match_all('/(?<!\d)(\d{1,3})(?!\d)/u', $line, $m) && !empty($m[1])) {
                $nums = array_map('intval', $m[1]);

                if (count($nums) >= 3) {
                    return $this->clamp((int) $nums[2], 0, 999);
                }
            }
        }

        return null;
    }

    private function extractBoldNumbers(string $segment): array
    {
        $out = [];

        if (preg_match_all('/\*\*(\d{1,3})\*\*/u', $segment, $m) && !empty($m[1])) {
            foreach ($m[1] as $v) {
                $out[] = (int) $v;
                if (count($out) >= 4) return $out;
            }
        }

        if (preg_match_all('/<strong>\s*(\d{1,3})\s*<\/strong>/iu', $segment, $m2) && !empty($m2[1])) {
            foreach ($m2[1] as $v) {
                $out[] = (int) $v;
                if (count($out) >= 4) return $out;
            }
        }

        if (preg_match_all('/<b>\s*(\d{1,3})\s*<\/b>/iu', $segment, $m3) && !empty($m3[1])) {
            foreach ($m3[1] as $v) {
                $out[] = (int) $v;
                if (count($out) >= 4) return $out;
            }
        }

        return $out;
    }

    private function extractNumbersFallback(string $segment): array
    {
        $s = preg_replace('/size\s*=\s*\d+/iu', ' ', $segment);
        $s = preg_replace('/\[\s*size\s*=\s*\d+\s*\]/iu', ' ', $s);
        $s = preg_replace('/<[^>]+>/', ' ', $s);

        $nums = [];
        if (preg_match_all('/(?<!\d)(\d{1,3})(?!\d)/u', $s, $m) && !empty($m[1])) {
            foreach ($m[1] as $v) {
                $nums[] = (int) $v;
            }
        }

        return array_slice($nums, 0, 4);
    }

    private function clamp(int $v, int $min, int $max): int
    {
        if ($v < $min) return $min;
        if ($v > $max) return $max;
        return $v;
    }
}
