<?php

namespace forumaker\Rolevaya\Model;

use Illuminate\Database\Eloquent\Model;

class CompletedEpisode extends Model
{
    protected $table = 'completed_episodes';

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
}
