<?php

namespace forumaker\Rolevaya\Api\Controller;

use Flarum\Http\RequestUtil;
use forumaker\Rolevaya\Job\RecalculateEpisodesJob;
use Illuminate\Contracts\Queue\Queue;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

class RecalculateEpisodesController implements RequestHandlerInterface
{
    public function __construct(
        protected Queue $queue
    ) {}

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);
        $actor->assertPermission('forumaker-rolevaya.recalculate');

                                                $this->queue->push(new RecalculateEpisodesJob());

        return new JsonResponse([
            'ok' => true,
            'queued' => true,
        ], 202);
    }
}
