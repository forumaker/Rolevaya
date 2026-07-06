<?php

namespace forumaker\Rolevaya\Api\Controller;

use forumaker\Rolevaya\Service\EpisodeCompletionBackfill;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

class RecalculateEpisodesController implements RequestHandlerInterface
{
    public function __construct(
        protected EpisodeCompletionBackfill $backfill
    ) {}

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $saved = $this->backfill->run();

        return new JsonResponse([
            'ok' => true,
            'saved' => $saved,
        ]);
    }
}
