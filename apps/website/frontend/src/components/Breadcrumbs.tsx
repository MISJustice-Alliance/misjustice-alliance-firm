import { Link, useLocation } from 'react-router-dom';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';

interface BreadcrumbsProps {
  className?: string;
}

interface BreadcrumbItem {
  name: string;
  path: string;
}

/**
 * Breadcrumbs component for navigation
 * Automatically generates breadcrumbs based on the current URL path
 */
export const Breadcrumbs = ({ className = '' }: BreadcrumbsProps) => {
  const location = useLocation();

  // Generate breadcrumb items from pathname
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { name: 'Home', path: '/' }
    ];

    let currentPath = '';
    pathSegments.forEach((segment) => {
      currentPath += `/${segment}`;

      // Convert URL segments to readable names
      const name = getReadableName(segment);
      breadcrumbs.push({ name, path: currentPath });
    });

    return breadcrumbs;
  };

  // Convert URL segment to readable name
  const getReadableName = (segment: string): string => {
    const nameMap: Record<string, string> = {
      'cases': 'Cases',
      'contact': 'Contact',
      'about': 'About',
      'privacy': 'Privacy Policy',
      'login': 'Login',
      'register': 'Register',
      'admin': 'Admin',
    };

    // Check if it's a known route
    if (nameMap[segment]) {
      return nameMap[segment];
    }

    // Check if it looks like a UUID (case ID)
    if (segment.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return 'Case Details';
    }

    // Default: capitalize and replace hyphens with spaces
    return segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const breadcrumbs = getBreadcrumbs();

  // Don't render breadcrumbs on home page
  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center space-x-2 text-sm">
        {breadcrumbs.map((breadcrumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const isFirst = index === 0;

          return (
            <li key={breadcrumb.path} className="flex items-center">
              {index > 0 && (
                <ChevronRightIcon
                  className="h-4 w-4 text-slate-400 mx-2 flex-shrink-0"
                  aria-hidden="true"
                />
              )}

              {isLast ? (
                <span
                  className="text-slate-600 font-medium"
                  aria-current="page"
                >
                  {breadcrumb.name}
                </span>
              ) : (
                <Link
                  to={breadcrumb.path}
                  className="text-blue-600 hover:text-blue-800 hover:underline transition-colors flex items-center"
                >
                  {isFirst && (
                    <HomeIcon className="h-4 w-4 mr-1 flex-shrink-0" aria-hidden="true" />
                  )}
                  {breadcrumb.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
