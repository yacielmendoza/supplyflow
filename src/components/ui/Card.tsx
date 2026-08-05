import React from 'react';
import { cn } from '../../lib/cn';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';
export type CardTone = 'surface' | 'inset';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
  tone?: CardTone;
  /** Adds hover affordance + pointer cursor for clickable cards. */
  interactive?: boolean;
}

const paddings: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5 sm:p-6',
};

const tones: Record<CardTone, string> = {
  surface: 'bg-surface',
  inset: 'bg-inset',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    { padding = 'md', tone = 'surface', interactive, className, ...props },
    ref
  ) => (
    <div
      ref={ref}
      className={cn(
        'rounded-card border border-border-default',
        tones[tone],
        paddings[padding],
        interactive &&
          'transition duration-[var(--duration-fast)] hover:border-border-strong cursor-pointer',
        className
      )}
      {...props}
    />
  )
);

Card.displayName = 'Card';
