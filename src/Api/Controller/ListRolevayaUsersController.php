<?php

namespace forumaker\Rolevaya\Api\Controller;

use Flarum\Api\Controller\AbstractListController;
use Flarum\Api\Serializer\UserSerializer;
use Flarum\User\User;
use Illuminate\Support\Arr;
use Psr\Http\Message\ServerRequestInterface as Request;
use Tobscure\JsonApi\Document;

/**
 * Batch-fetches users by ID for the leaderboard tabs' avatar/nickname
 * hydration (see ensureUsersLoaded() in statsShared.tsx). Flarum core's
 * GET /api/users list endpoint has no "fetch exactly these IDs" filter and
 * additionally requires the `searchUsers` permission (often denied to
 * guests), so a leaderboard with up to 200 rows previously had to fire one
 * GET /api/users/{id} request per user, batched 4 at a time — up to ~13
 * sequential round-trips for a full 50-row board. This endpoint returns all
 * of them in a single JSON:API response instead.
 *
 * Deliberately a real AbstractListController + UserSerializer (unlike this
 * extension's leaderboard controllers, which return a custom JsonResponse
 * envelope — see CharacterLeaderboardController) so the response is genuine
 * JSON:API and the frontend can push it straight into app.store via
 * app.store.pushPayload(), the same way app.store.find('users', id) would.
 * That keeps avatar-frame decoration from companion extensions working,
 * since those hook into the real User frontend model.
 */
class ListRolevayaUsersController extends AbstractListController
{
    public $serializer = UserSerializer::class;

    /** Matches the frontend's own per-call cap in ensureUsersLoaded(). */
    private const MAX_IDS = 200;

    protected function data(Request $request, Document $document)
    {
        $raw = (string) Arr::get($request->getQueryParams(), 'ids', '');

        $ids = array_slice(
            array_values(array_unique(array_filter(
                array_map('intval', explode(',', $raw)),
                static function (int $id) {
                    return $id > 0;
                }
            ))),
            0,
            self::MAX_IDS
        );

        return User::query()->whereIn('id', $ids)->get();
    }
}
