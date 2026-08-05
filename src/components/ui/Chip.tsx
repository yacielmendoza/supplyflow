import React from 'react';
import { cn } from '../../lib/cn';

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Renders with a struck-through, de-emphasized look (e.g. purchased items). */
  done?: boolean;
}

export const Chip: React.FC<ChipProps> = ({ done, className, children, ...props }) => (
  <span
    className={cn(
      'inline-flex items-center max-w-full truncate rounded-chip border ' +
        'px-2.5 py-1 text-xs font-medium',
      done
        ? 'bg-success/10 border-success/30 text-success line-through'
        : 'bg-inset border-border-default text-text-primary',
      className
    )}
    {...props}
  >
    {children}
  </span>
);
