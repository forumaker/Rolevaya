<?php

namespace forumaker\Rolevaya\Api\Controller;

use Flarum\Http\RequestUtil;
use forumaker\Rolevaya\Job\RecalculateArcsJob;
use Illuminate\Contracts\Queue\Queue;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

class RecalculateArcsController implements RequestHandlerInterface
{
    public function __construct(
        protected Queue $queue
    ) {}

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);
        $actor->assertAdmin();

        // Scanning every roleplay discussion can take a while on a large
        // forum, so this is queued rather than run synchronously inside the
        // HTTP request (see RecalculateArcsJob). With the default "sync"
        // queue driver this still runs immediately; with a database or
        // Redis driver configured it's picked up by the queue worker.
        $this->queue->push(new RecalculateArcsJob());

        return new JsonResponse([
            'ok' => true,
            'queued' => true,
        ], 202);
    }
}
