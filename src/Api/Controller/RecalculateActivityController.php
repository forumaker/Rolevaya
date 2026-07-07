<?php

namespace forumaker\Rolevaya\Api\Controller;

use Flarum\Http\RequestUtil;
use forumaker\Rolevaya\Service\ActivitySnapshotCalculator;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

class RecalculateActivityController implements RequestHandlerInterface
{
    public function __construct(
        protected ActivitySnapshotCalculator $calculator
    ) {}

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);
        $actor->assertAdmin();

        $result = $this->calculator->calculate();

        return new JsonResponse([
            'ok' => true,
            'rows' => $result['rows'],
            'calculated_at' => $result['calculated_at'],
        ]);
    }
}
