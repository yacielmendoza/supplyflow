import React from 'react';
import { cn } from '../../lib/cn';

export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-elevated text-text-secondary border-border-default',
  accent: 'bg-accent/15 text-accent border-accent/30',
  success: 'bg-success/15 text-success border-success/30',
  warning: 'bg-warning/15 text-warning border-warning/30',
  danger: 'bg-danger/15 text-danger border-danger/30',
  info: 'bg-info/15 text-info border-info/30',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  /** Solid, high-emphasis count bubble (e.g. nav counters). */
  solid?: boolean;
}

const solidClasses: Record<Tone, string> = {
  neutral: 'bg-elevated text-text-primary',
  accent: 'bg-accent text-accent-contrast',
  success: 'bg-success text-accent-contrast',
  warning: 'bg-warning text-accent-contrast',
  danger: 'bg-danger text-white',
  info: 'bg-info text-white',
};

export const Badge: React.FC<BadgeProps> = ({
  tone = 'neutral',
  solid,
  className,
  children,
  ...props
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-chip text-xs font-bold leading-none',
      solid ? solidClasses[tone] : cn('border', toneClasses[tone]),
      className
    )}
    {...props}
  >
    {children}
  </span>
);
