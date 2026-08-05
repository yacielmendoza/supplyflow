import React from 'react';
import { cn } from '../../lib/cn';
import { Spinner } from './Spinner';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const base =
  'inline-flex items-center justify-center gap-2 font-bold whitespace-nowrap ' +
  'rounded-control select-none touch-manipulation transition ' +
  'duration-[var(--duration-fast)] ease-[var(--ease-standard)] ' +
  'active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none';

const variants: Record<ButtonVariant, string> = {
  // On-accent foreground uses the accent-contrast token (readable in both themes).
  primary: 'bg-accent text-accent-contrast hover:bg-accent-hover shadow-sm',
  secondary:
    'bg-elevated text-text-primary border border-border-default hover:border-border-strong',
  ghost: 'text-text-secondary hover:bg-elevated hover:text-text-primary',
  danger: 'bg-danger text-white hover:opacity-90 shadow-sm',
  success: 'bg-success text-accent-contrast hover:opacity-90 shadow-sm',
};

// Heights meet the 44px primary-touch target (md) recommended by HIG / WCAG 2.5.8.
const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-xs',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth,
      loading,
      leftIcon,
      rightIcon,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        base,
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? (
        <Spinner className="w-4 h-4" />
      ) : (
        leftIcon && <span className="flex-shrink-0">{leftIcon}</span>
      )}
      {children && <span className="min-w-0 truncate">{children}</span>}
      {!loading && rightIcon && (
        <span className="flex-shrink-0">{rightIcon}</span>
      )}
    </button>
  )
);

Button.displayName = 'Button';
