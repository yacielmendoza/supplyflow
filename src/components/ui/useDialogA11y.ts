import React, { useCallback, useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

/**
 * Shared accessible-dialog behavior: focus the first focusable element on open,
 * trap Tab within the panel, close on Escape, lock body scroll, and restore focus
 * to the previously focused element on close. Attach the returned `onKeyDown` to
 * the dialog container.
 */
export function useDialogA11y(
  open: boolean,
  onClose: () => void,
  panelRef: React.RefObject<HTMLElement | null>
) {
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
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
  }, [open, panelRef]);

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
    [onClose, panelRef]
  );

  return { onKeyDown };
}
