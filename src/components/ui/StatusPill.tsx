import React from 'react';
import { cn } from '../../lib/cn';
import type { Tone } from './Badge';

export interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  /** Icon renders alongside the label so status is never conveyed by color alone
   *  (WCAG 1.4.1). */
  icon?: React.ReactNode;
}

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-elevated text-text-secondary border-border-default',
  accent: 'bg-accent/15 text-accent border-accent/30',
  success: 'bg-success/15 text-success border-success/30',
  warning: 'bg-warning/15 text-warning border-warning/30',
  danger: 'bg-danger/15 text-danger border-danger/30',
  info: 'bg-info/15 text-info border-info/30',
};

export const StatusPill: React.FC<StatusPillProps> = ({
  tone = 'neutral',
  icon,
  className,
  children,
  ...props
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ' +
        'text-xs font-bold uppercase tracking-wide',
      toneClasses[tone],
      className
    )}
    {...props}
  >
    {icon && <span className="flex-shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">{icon}</span>}
    {children}
  </span>
);
