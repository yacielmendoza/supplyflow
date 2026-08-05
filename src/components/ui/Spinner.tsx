import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

/**
 * Accessible loading spinner. Announces itself to assistive tech and stops
 * spinning under prefers-reduced-motion (the global media query neutralizes the
 * animation).
 */
export const Spinner: React.FC<{ className?: string; label?: string }> = ({
  className,
  label = 'Cargando',
}) => (
  <Loader2
    role="status"
    aria-label={label}
    className={cn('animate-spin', className)}
  />
);
