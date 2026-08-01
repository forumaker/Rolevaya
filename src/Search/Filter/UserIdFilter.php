<?php

/*
 * This file is part of forumaker\Rolevaya.
 *
 * For detailed copyright and license information, please view the
 * LICENSE file that was distributed with this source code.
 */

namespace forumaker\Rolevaya\Search\Filter;

use Flarum\Search\Database\DatabaseSearchState;
use Flarum\Search\Filter\FilterInterface;
use Flarum\Search\SearchState;
use Flarum\Search\ValidateFilterTrait;

/**
 * Adds `filter[id]=1,2,3` support to GET /api/users.
 *
 * Flarum core does not register an id filter for users out of the box
 * (only email and group are supported), so batched lookups like
 * `app.store.find('users', { filter: { id: '1,2,3' } })` silently fall
 * back to the default unfiltered listing instead of throwing — which
 * means only whichever users happen to land on that default page ever
 * get loaded into the frontend store. This filter makes the id lookup
 * actually work.
 *
 * @implements FilterInterface<DatabaseSearchState>
 */
class UserIdFilter implements FilterInterface
{
    use ValidateFilterTrait;

    public function getFilterKey(): string
    {
        return 'id';
    }

    public function filter(SearchState $state, string|array $value, bool $negate): void
    {
        $ids = $this->asIntArray($value);

        /** @var DatabaseSearchState $state */
        $state->getQuery()->whereIn('users.id', $ids, 'and', $negate);
    }
}
