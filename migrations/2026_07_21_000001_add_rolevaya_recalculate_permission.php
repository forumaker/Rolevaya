<?php

use Flarum\Database\Migration;
use Flarum\Group\Group;

return Migration::addPermissions([
    'forumaker-rolevaya.recalculate' => Group::ADMINISTRATOR_ID,
]);
