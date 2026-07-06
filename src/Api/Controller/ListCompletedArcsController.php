<?php

namespace forumaker\Rolevaya\Api\Controller;

use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Arr;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

class ListCompletedArcsController implements RequestHandlerInterface
{
    public function __construct(
        protected ConnectionInterface $db
    ) {}

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $query = $request->getQueryParams();

        $userId = (int) Arr::get($query, 'user_id', 0);
        if ($userId <= 0) {
            return new JsonResponse([
                'user_id' => $userId,
                'data' => [],
            ]);
        }

        $limit = (int) Arr::get($query, 'limit', 100);
        if ($limit < 1) $limit = 1;
        if ($limit > 200) $limit = 200;

        $rows = $this->db->table('completed_arcs as ca')
            ->join('discussions as d', 'd.id', '=', 'ca.discussion_id')
            ->leftJoin('posts as p', 'p.id', '=', 'ca.source_post_id')
            ->where('ca.user_id', '=', $userId)
            ->orderByDesc('ca.parsed_at')
            ->orderByDesc('ca.id')
            ->limit($limit)
            ->get([
                'ca.id',
                'ca.arc_title',
                'ca.experience',
                'ca.gold',
                'ca.discussion_id',
                'd.title as discussion_title',
                'd.slug as discussion_slug',
                'ca.source_post_id',
                'p.number as source_post_number',
                'ca.parsed_at',
            ]);

        $res = new JsonResponse([
            'user_id' => $userId,
            'limit' => $limit,
            'data' => $rows,
        ]);

        return $res
            ->withHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->withHeader('Pragma', 'no-cache');
    }
}
