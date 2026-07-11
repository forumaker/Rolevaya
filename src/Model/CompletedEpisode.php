<?php

namespace forumaker\Rolevaya\Model;

use Flarum\Database\AbstractModel;

class CompletedEpisode extends AbstractModel
{
    protected $table = 'completed_episodes';

    // AbstractModel turns Eloquent's timestamp handling off by default; this
    // table has created_at/updated_at columns that need to keep being set
    // automatically.
    public $timestamps = true;

    protected $fillable = [
        'user_id',
        'discussion_id',
        'source_post_id',
        'parsed_at',
    ];

    protected $casts = [
        'user_id'        => 'int',
        'discussion_id'  => 'int',
        'source_post_id' => 'int',
        'parsed_at'      => 'datetime',
    ];

    /**
     * Rows for the "Эпизоды" list button on the activity leaderboard —
     * mirrors CompletedArc::scopeForUser(), see there for the rationale for
     * using a query scope instead of a raw ConnectionInterface query.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     */
    public function scopeForUser($query, int $userId, int $limit)
    {
        return $query
            ->join('discussions as d', 'd.id', '=', 'completed_episodes.discussion_id')
            ->leftJoin('posts as p', 'p.id', '=', 'completed_episodes.source_post_id')
            ->where('completed_episodes.user_id', '=', $userId)
            ->orderByDesc('completed_episodes.parsed_at')
            ->orderByDesc('completed_episodes.id')
            ->limit($limit)
            ->select([
                'completed_episodes.id',
                'completed_episodes.discussion_id',
                'd.title as discussion_title',
                'd.slug as discussion_slug',
                'completed_episodes.source_post_id',
                'p.number as source_post_number',
                'completed_episodes.parsed_at',
            ]);
    }
}
