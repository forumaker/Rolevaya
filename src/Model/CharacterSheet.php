<?php

namespace forumaker\Rolevaya\Model;

use Flarum\Database\AbstractModel;

class CharacterSheet extends AbstractModel
{
    protected $table = 'character_sheets';

                public $timestamps = true;

    protected $fillable = [
        'discussion_id',
        'user_id',
        'physiology',
        'dexterity',
        'magic',
        'charisma',
        'sum',
        'roleplay_experience',
        'source_post_id',
        'source_post_number',
        'parsed_at',
    ];

    protected $casts = [
        'physiology' => 'int',
        'dexterity'  => 'int',
        'magic'      => 'int',
        'charisma'   => 'int',
        'sum'        => 'int',
        'roleplay_experience' => 'int',
        'source_post_number' => 'int',
        'parsed_at'  => 'datetime',
    ];
}