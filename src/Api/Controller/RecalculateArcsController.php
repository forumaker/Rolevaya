<?php

namespace forumaker\Rolevaya\Api\Controller;

use Flarum\Http\RequestUtil;
use forumaker\Rolevaya\Service\ArcCompletionBackfill;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

class RecalculateArcsController implements RequestHandlerInterface
{
    public function __construct(
        protected ArcCompletionBackfill $backfill
    ) {}

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);
        $actor->assertAdmin();

        $saved = $this->backfill->run();

        return new JsonResponse([
            'ok' => true,
            'saved' => $saved,
        ]);
    }
}
