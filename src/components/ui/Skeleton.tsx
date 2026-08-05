import React from 'react';
import { cn } from '../../lib/cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  rounded?: 'chip' | 'control' | 'card' | 'full';
}

const roundedMap = {
  chip: 'rounded-chip',
  control: 'rounded-control',
  card: 'rounded-card',
  full: 'rounded-full',
};

/**
 * Loading placeholder. The pulse animation is automatically stilled under
 * prefers-reduced-motion by the global media query. Marked aria-hidden — pair a
 * visible "Cargando" status elsewhere for assistive tech.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  rounded = 'control',
  className,
  ...props
}) => (
  <div
    aria-hidden="true"
    className={cn('animate-pulse bg-elevated', roundedMap[rounded], className)}
    {...props}
  />
);
