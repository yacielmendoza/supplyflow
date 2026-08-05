import React from 'react';
import { cn } from '../../lib/cn';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/** Consistent empty / zero-data state for lists and panels. */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => (
  <div
    className={cn(
      'rounded-card border border-border-default bg-surface ' +
        'p-8 text-center flex flex-col items-center gap-2',
      className
    )}
  >
    {icon && (
      <div className="text-text-muted [&_svg]:w-10 [&_svg]:h-10 mb-1">{icon}</div>
    )}
    <div className="font-bold text-base text-text-primary">{title}</div>
    {description && (
      <p className="text-sm text-text-secondary max-w-sm">{description}</p>
    )}
    {action && <div className="mt-3">{action}</div>}
  </div>
);
