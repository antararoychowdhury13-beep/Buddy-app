import { Breadcrumb, BreadcrumbItem } from '@carbon/react';
import { Link } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumb?: string;
}

/**
 * Consistent page title block using Carbon type tokens (via the .page classes)
 * and an optional Carbon Breadcrumb for wayfinding.
 */
export function PageHeader({ title, subtitle, breadcrumb }: PageHeaderProps) {
  return (
    <header>
      <Breadcrumb noTrailingSlash aria-label="Breadcrumb">
        <BreadcrumbItem>
          <Link to="/home">Buddy</Link>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>{breadcrumb ?? title}</BreadcrumbItem>
      </Breadcrumb>
      <h1 className="page__heading">{title}</h1>
      {subtitle ? <p className="page__subheading">{subtitle}</p> : null}
    </header>
  );
}
