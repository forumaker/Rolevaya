<?php

namespace forumaker\Rolevaya\Model;

use Flarum\Database\AbstractModel;

class UserActivitySnapshot extends AbstractModel
{
    protected $table = 'user_activity_snapshots';

                public $timestamps = true;

    protected $fillable = [
        'user_id',
        'period_days',
        'scope_tag',
        'posts_count',
        'total_chars',
        'avg_chars',
        'active_weeks',
        'stability_ratio',
        'calculated_at',
    ];

    protected $casts = [
        'user_id' => 'int',
        'period_days' => 'int',
        'posts_count' => 'int',
        'total_chars' => 'int',
        'avg_chars' => 'int',
        'active_weeks' => 'int',
        'stability_ratio' => 'float',
        'calculated_at' => 'datetime',
    ];
}