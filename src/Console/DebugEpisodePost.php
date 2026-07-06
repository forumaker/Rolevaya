<?php

namespace forumaker\Rolevaya\Console;

use Illuminate\Console\Command;
use Illuminate\Database\ConnectionInterface;
use forumaker\Rolevaya\Service\EpisodeCompletionParser;

class DebugEpisodePost extends Command
{
    protected $signature = 'rolevaya:debug-episode {discussion_id : ID of the discussion to inspect}';

    protected $description = 'Debug episode parsing for a specific discussion';

    public function __construct(
        protected ConnectionInterface $db,
        protected EpisodeCompletionParser $parser
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $discussionId = (int) $this->argument('discussion_id');

        $this->info("=== Discussion #{$discussionId} ===");

        $posts = $this->db->table('posts')
            ->where('discussion_id', $discussionId)
            ->where('type', 'comment')
            ->orderBy('number', 'asc')
            ->get(['id', 'number', 'hidden_at', 'content']);

        $this->info("Total comment posts: " . count($posts));

        foreach ($posts as $post) {
            $hidden = $post->hidden_at ? ' [HIDDEN]' : '';
            $content = (string) $post->content;
            $len = strlen($content);

            $hasSuccessBBCode = str_contains($content, '[success') || str_contains($content, '[SUCCESS');
            $hasSuccessXml    = str_contains($content, '<SUCCESS') || str_contains($content, '<success');

            $this->line("--- Post #{$post->number} (id={$post->id}){$hidden} ---");
            $this->line("  Content length: {$len}");
            $this->line("  Has [success: " . ($hasSuccessBBCode ? 'YES' : 'NO'));
            $this->line("  Has <SUCCESS: " . ($hasSuccessXml ? 'YES' : 'NO'));
            $this->line("  Content preview (first 400 chars):");
            $this->line("  " . substr($content, 0, 400));

            if ($hasSuccessBBCode || $hasSuccessXml) {
                $entries = $this->parser->parse($content);
                $this->line("  Parser found " . count($entries) . " entries:");
                foreach ($entries as $entry) {
                    $this->line("    username={$entry['username']}");
                }
            }

            $this->line('');
        }

        return 0;
    }
}
