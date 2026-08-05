import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { IconButton } from './IconButton';
import { useDialogA11y } from './useDialogA11y';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  /** Accessible name when `title` is not a plain string. */
  ariaLabel?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  /** Max width of the panel on larger screens. */
  size?: 'sm' | 'md' | 'lg';
}

const sizes = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' };

/**
 * Accessible modal / bottom-sheet dialog. Focus trap, Escape-to-close, focus
 * restore, body scroll-lock, `aria-modal`, backdrop dismissal, and safe areas
 * (shared via useDialogA11y). Rendered through a portal on document.body. Exit
 * animation plays while `open` is controlled by the parent.
 */
export const Sheet: React.FC<SheetProps> = ({
  open,
  onClose,
  title,
  ariaLabel,
  children,
  footer,
  className,
  size = 'md',
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const { onKeyDown } = useDialogA11y(open, onClose, panelRef);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-center items-end sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onKeyDown={onKeyDown}
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : ariaLabel}
            tabIndex={-1}
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
            className={cn(
              'relative w-full flex flex-col outline-none',
              'max-h-[92vh] bg-surface border border-border-default',
              'rounded-t-sheet sm:rounded-sheet shadow-2xl',
              sizes[size],
              className
            )}
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="flex items-center justify-between gap-3 p-4 border-b border-border-default">
              <h2 className="text-base font-bold text-text-primary truncate">{title}</h2>
              <IconButton label="Cerrar" variant="ghost" size="sm" onClick={onClose}>
                <X className="w-5 h-5" />
              </IconButton>
            </div>

            <div className="flex-1 overflow-y-auto p-4">{children}</div>

            {footer && (
              <div className="p-4 border-t border-border-default">{footer}</div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
