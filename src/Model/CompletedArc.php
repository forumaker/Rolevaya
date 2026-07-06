<?php

namespace forumaker\Rolevaya\Model;

use Illuminate\Database\Eloquent\Model;

class CompletedArc extends Model
{
    protected $table = 'completed_arcs';

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
