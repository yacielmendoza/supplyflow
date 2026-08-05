import React from 'react';
import { cn } from '../../lib/cn';

export type IconButtonVariant = 'solid' | 'ghost' | 'accent';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required accessible name — icon-only controls must be labelled (WCAG 4.1.2). */
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
}

const variants: Record<IconButtonVariant, string> = {
  solid:
    'bg-elevated text-text-secondary hover:text-text-primary border border-border-default',
  ghost: 'text-text-secondary hover:bg-elevated hover:text-text-primary',
  accent: 'bg-elevated text-accent hover:bg-accent hover:text-accent-contrast',
};

// All sizes keep a ≥40px box (md/lg ≥44px) for comfortable touch targets.
const sizes: Record<IconButtonSize, string> = {
  sm: 'w-10 h-10',
  md: 'w-11 h-11',
  lg: 'w-12 h-12',
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, variant = 'solid', size = 'md', className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-control ' +
          'touch-manipulation transition duration-[var(--duration-fast)] ' +
          'active:scale-[0.95] disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);

IconButton.displayName = 'IconButton';
