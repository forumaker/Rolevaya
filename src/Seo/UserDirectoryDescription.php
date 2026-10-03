<?php

declare(strict_types=1);

namespace forumaker\Rolevaya\Seo;

use FoF\Seo\Page\PageDriverInterface;
use FoF\Seo\SeoProperties;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * fof/seo's own UserDirectoryPage sets the title and canonical URL of /users
 * but leaves the sitewide description in place. Runs after it (drivers are
 * called in registration order) and only adds the description.
 */
class UserDirectoryDescription implements PageDriverInterface
{
    private const DESCRIPTION = 'Пользователи форума';

    public function extensionDependencies(): array
    {
        return ['fof-user-directory'];
    }

    public function handleRoutes(): array
    {
        return ['fof_user_directory'];
    }

    public function handle(Request $request, SeoProperties $properties): void
    {
        $properties->setDescription(self::DESCRIPTION);
    }
}
