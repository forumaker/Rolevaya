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
}
