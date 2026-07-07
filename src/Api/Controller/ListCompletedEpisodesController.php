<?php

namespace forumaker\Rolevaya\Api\Controller;

use forumaker\Rolevaya\Repository\CompletedEpisodesRepository;
use Illuminate\Support\Arr;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

class ListCompletedEpisodesController implements RequestHandlerInterface
{
    public function __construct(
        protected CompletedEpisodesRepository $repository
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

        $rows = $this->repository->forUser($userId, $limit);

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
