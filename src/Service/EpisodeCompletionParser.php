<?php

namespace forumaker\Rolevaya\Service;

class EpisodeCompletionParser
{
    public function parse(string $content): array
    {
        $bodies = $this->extractEpisodeBlocks($content);
        if (!$bodies) {
            return [];
        }

        $result = [];

        foreach ($bodies as $body) {
            foreach ($this->extractMentionedParticipants($body) as $participant) {
                $result[] = $participant;
            }
        }

        return $result;
    }

    private function extractEpisodeBlocks(string $content): array
    {
        $bodies = [];

        if (preg_match_all('/\[success\b([^\]]*)\](.*?)\[\/success\]/isu', $content, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $m) {
                if (!preg_match('/\btitle\s*=\s*(.*?)(?:\s+(?:font|bg|border)\s*=|$)/isu', $m[1], $tm)) {
                    continue;
                }

                $title = trim($tm[1], "\"' \t\r\n");

                if (!preg_match('/ЭПИЗОД\s*ЗАВЕРШ(?:ЁН|ЕН|ЕНА|ЕНЫ)/iu', $title)) {
                    continue;
                }

                $bodies[] = $m[2];
            }
        }

        if (empty($bodies) && preg_match_all('/<SUCCESS\b[^>]*\btitle="([^"]*)"[^>]*>(.*?)<\/SUCCESS>/isu', $content, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $m) {
                $title = trim($m[1]);

                if (!preg_match('/ЭПИЗОД\s*ЗАВЕРШ(?:ЁН|ЕН|ЕНА|ЕНЫ)/iu', $title)) {
                    continue;
                }

                $bodies[] = $m[2];
            }
        }

        return $bodies;
    }

    /**
     * Extracts every mentioned participant, keeping the raw mention
     * identity (post id or user id) alongside the display name so the
     * caller can resolve the real Flarum user rather than trusting the
     * mentioned text, which can differ from the actual username.
     *
     * @return array<int, array{username: string, mention_type: ?string, mention_id: ?int}>
     */
    private function extractMentionedParticipants(string $body): array
    {
        $participants = [];
        $seen = [];

        $addParticipant = function (string $username, ?string $mentionType, ?int $mentionId) use (&$participants, &$seen) {
            $username = trim($username);
            if ($username === '') {
                return;
            }

            $dedupeKey = ($mentionType !== null && $mentionId !== null)
                ? $mentionType . ':' . $mentionId
                : 'text:' . mb_strtolower($username);

            if (isset($seen[$dedupeKey])) {
                return;
            }

            $seen[$dedupeKey] = true;
            $participants[] = [
                'username'     => $username,
                'mention_type' => $mentionType,
                'mention_id'   => $mentionId,
            ];
        };

        if (preg_match_all('/@"([^"]+)"\s*#\s*(p)?(\d+)/iu', $body, $mentions) && !empty($mentions[1])) {
            foreach ($mentions[1] as $i => $username) {
                $mentionType = $mentions[2][$i] !== '' ? 'post' : 'user';
                $addParticipant($username, $mentionType, (int) $mentions[3][$i]);
            }

            return $participants;
        }

        if (preg_match_all('/<(USERMENTION|POSTMENTION)\b([^>]*)>/iu', $body, $xmlMentions)) {
            foreach ($xmlMentions[2] as $i => $attributes) {
                if (!preg_match('/\bdisplayname="([^"]*)"/iu', $attributes, $dn)) {
                    continue;
                }

                $mentionId = null;
                if (preg_match('/\bid="(\d+)"/iu', $attributes, $idm)) {
                    $mentionId = (int) $idm[1];
                }

                $mentionType = strtoupper($xmlMentions[1][$i]) === 'POSTMENTION' ? 'post' : 'user';
                $addParticipant($dn[1], $mentionType, $mentionId);
            }
        }

        return $participants;
    }
}
