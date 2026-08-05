import React, { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { IconButton } from './IconButton';

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

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal / bottom-sheet dialog. Handles focus trap, Escape-to-close,
 * focus restore, body scroll-lock, `aria-modal`, backdrop dismissal, and safe
 * areas. Rendered through a portal on document.body. Exit animation plays while
 * `open` is controlled by the parent.
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
  const restoreRef = useRef<HTMLElement | null>(null);

  // Save/restore focus and lock scroll while open.
  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Focus the first focusable element (or the panel) once mounted.
    const id = window.setTimeout(() => {
      const panel = panelRef.current;
      const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panel)?.focus();
    }, 0);
    return () => {
      window.clearTimeout(id);
      document.body.style.overflow = prevOverflow;
      restoreRef.current?.focus?.();
    };
  }, [open]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const all = Array.from(panel.querySelectorAll(FOCUSABLE)) as HTMLElement[];
      const nodes = all.filter((n) => n.offsetParent !== null);
      if (nodes.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

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
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
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
              <h2 className="text-base font-bold text-text-primary truncate">
                {title}
              </h2>
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
