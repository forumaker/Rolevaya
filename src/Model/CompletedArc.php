<?php

namespace forumaker\Rolevaya\Model;

use Flarum\Database\AbstractModel;

class CompletedArc extends AbstractModel
{
    protected $table = 'completed_arcs';

    // AbstractModel turns Eloquent's timestamp handling off by default; this
    // table has created_at/updated_at columns that need to keep being set
    // automatically.
    public $timestamps = true;

    protected $fillable = [
        'user_id',
        'discussion_id',
        'source_post_id',
        'arc_title',
        'experience',
        'gold',
        'parsed_at',
    ];

    protected $casts = [
        'user_id'        => 'int',
        'discussion_id'  => 'int',
        'source_post_id' => 'int',
        'experience'     => 'int',
        'gold'           => 'int',
        'parsed_at'      => 'datetime',
    ];

    /**
     * Rows for the "Арки" list button on the activity leaderboard: a user's
     * completions joined with their discussion (title/slug) and, if the
     * source post still exists, its post number (for deep-linking straight
     * to the completion post). This join has a natural anchor model
     * (CompletedArc), unlike the cross-table leaderboard aggregations, so
     * it's expressed here as a query scope instead of a raw
     * ConnectionInterface query — see CompletedArcsRepository.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     */
    public function scopeForUser($query, int $userId, int $limit)
    {
        return $query
            ->join('discussions as d', 'd.id', '=', 'completed_arcs.discussion_id')
            ->leftJoin('posts as p', 'p.id', '=', 'completed_arcs.source_post_id')
            ->where('completed_arcs.user_id', '=', $userId)
            ->orderByDesc('completed_arcs.parsed_at')
            ->orderByDesc('completed_arcs.id')
            ->limit($limit)
            ->select([
                'completed_arcs.id',
                'completed_arcs.arc_title',
                'completed_arcs.experience',
                'completed_arcs.gold',
                'completed_arcs.discussion_id',
                'd.title as discussion_title',
                'd.slug as discussion_slug',
                'completed_arcs.source_post_id',
                'p.number as source_post_number',
                'completed_arcs.parsed_at',
            ]);
    }
}
