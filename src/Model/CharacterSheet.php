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

    /**
     * Highest roleplay_experience among this user's character sheets — a
     * user can have several (one per character discussion, keyed by
     * discussion_id — see ParseCharacterSheet), each with its own
     * self-reported experience value. Used by fof/badges' RoleplayExperienceMetric
     * (badge "На опыте") as the read point for a user's roleplay experience,
     * the same way forumaker\Arena\ArenaStats::forUser() is for Arena badges —
     * best/most-developed character represents the player here, not a sum
     * across characters.
     */
    public static function maxExperienceForUser(int $userId): int
    {
        return (int) (static::where('user_id', $userId)->max('roleplay_experience') ?? 0);
    }
}