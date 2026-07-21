<?php

namespace forumaker\Rolevaya\Repository;

use Illuminate\Database\ConnectionInterface;

abstract class DatabaseRepository
{
    public function __construct(
        protected ConnectionInterface $db
    ) {}
}
