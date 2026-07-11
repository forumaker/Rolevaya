<?php

namespace forumaker\Rolevaya\Api\Controller;

use Flarum\User\User;
use Illuminate\Support\Arr;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

/**
 * Batch-fetches users by ID for the leaderboard tabs' avatar/nickname
 * hydration (see ensureUsersLoaded() in statsShared.tsx). Flarum core's
 * GET /api/users list endpoint has no "fetch exactly these IDs" filter and
 * additionally requires the `searchUsers` permission (often denied to
 * guests), so a leaderboard with up to 200 rows previously had to fire one
 * GET /api/users/{id} request per user, batched 4 at a time — up to ~13
 * sequential round-trips for a full 50-row board. This endpoint returns all
 * of them in a single request instead.
 *
 * IMPORTANT: this deliberately hand-builds a minimal JSON:API-shaped body
 * (`data: [{type, id, attributes}, ...]`) instead of going through Flarum's
 * actual serializer/resource machinery. An earlier version of this class
 * extended `Flarum\Api\Controller\AbstractListController` with
 * `Flarum\Api\Serializer\UserSerializer` — the 1.x API layer — which no
 * longer exists in Flarum 2.x (replaced by the
 * `Flarum\Api\Resource\AbstractResource` + Endpoint system) and caused a 500
 * on this forum (running flarum/core ^2.0, see composer.json). Rather than
 * chase the exact 2.x Resource API (which could easily shift again in a
 * later minor release), this only relies on stable, long-lived Eloquent
 * *model* accessors (User::$username, User::getDisplayNameAttribute(),
 * User::getAvatarUrlAttribute()) and hand-emits just the handful of
 * attributes this extension's own frontend code actually reads
 * (username/displayName/avatarUrl — see avatarUrl()/playerName() in
 * statsShared.tsx and the Avatar component in RoleplaySlider/ArenaSlider).
 * The response shape is still a valid enough JSON:API document for
 * app.store.pushPayload() to turn into real frontend User models.
 */
class ListRolevayaUsersController implements RequestHandlerInterface
{
    /** Matches the frontend's own per-call cap in ensureUsersLoaded(). */
    private const MAX_IDS = 200;

    public function handle(ServerRequestInterface $request): ResponseInterface
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

        // whereIn() with an empty array is safe — Eloquent adds its own
        // always-false clause and returns an empty collection, no special
        // case needed here.
        $users = User::query()->whereIn('id', $ids)->get();

        $data = $users->map(function (User $user) {
            return [
                'type' => 'users',
                'id' => (string) $user->id,
                'attributes' => [
                    'username' => $user->username,
                    'displayName' => $user->display_name,
                    'avatarUrl' => $user->avatar_url,
                ],
            ];
        })->values()->all();

        return new JsonResponse(['data' => $data]);
    }
}
