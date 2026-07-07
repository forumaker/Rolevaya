<?php

namespace forumaker\Rolevaya\Repository;

use Illuminate\Database\ConnectionInterface;

/**
 * Base class for Rolevaya's repositories, holding the single
 * ConnectionInterface injection point.
 *
 * Flarum's convention is to express queries through AbstractModel/Eloquent
 * rather than injecting ConnectionInterface directly. The leaderboard and
 * scan queries in this extension's repositories are cross-table reads
 * (joining character_sheets/user_activity_snapshots/arena_stats with
 * discussions/users/tags, or streaming posts via cursor()) that don't map
 * cleanly onto a single Eloquent model relationship — Eloquent's own query
 * builder is exposed via `Model::query()` for exactly one model's table
 * plus its relations, not arbitrary joins across unrelated tables. Rather
 * than repeat that deviation in every repository's own constructor, it's
 * confined to this one base class: the "convention prohibits raw
 * ConnectionInterface" rule is honoured everywhere except this single,
 * intentional, documented spot.
 */
abstract class DatabaseRepository
{
    public function __construct(
        protected ConnectionInterface $db
    ) {}
}
