<?php

namespace forumaker\Rolevaya\Api\Controller;

use Flarum\Http\RequestUtil;
use forumaker\Rolevaya\Service\CharacterSheetBackfill;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

class RecalculateCharactersController implements RequestHandlerInterface
{
    public function __construct(
        protected CharacterSheetBackfill $backfill
    ) {}

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);
        $actor->assertAdmin();

        $updated = $this->backfill->run();

        return new JsonResponse([
            'ok' => true,
            'updated' => $updated,
        ]);
    }
}