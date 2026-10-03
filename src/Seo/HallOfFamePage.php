<?php

declare(strict_types=1);

namespace forumaker\Rolevaya\Seo;

use FoF\Seo\Page\PageDriverInterface;
use FoF\Seo\SeoProperties;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * Server-rendered title/description for the Hall of Fame (/top), registered
 * with fof/seo so share-preview bots and search engines see it without JS.
 */
class HallOfFamePage implements PageDriverInterface
{
    private const TITLE = 'Зал Славы';
    private const DESCRIPTION = 'Топ ролевиков и аренеров';

    public function extensionDependencies(): array
    {
        return [];
    }

    public function handleRoutes(): array
    {
        return ['top'];
    }

    public function handle(Request $request, SeoProperties $properties): void
    {
        $properties
            ->setTitle(self::TITLE)
            ->setDescription(self::DESCRIPTION)
            ->setUrl('/top')
            ->setCanonicalUrl('/top')
            ->setSchemaJson('@type', 'WebPage');
    }
}
