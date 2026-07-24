'use client';

import {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent,
  ReactNode,
  useEffect,
  useRef,
} from 'react';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  labelledBy: string;
  describedBy?: string;
  children: ReactNode;
  role?: 'dialog' | 'alertdialog';
  closeOnBackdrop?: boolean;
  className?: string;
}

/**
 * Native modal-dialog foundation. `showModal()` provides focus containment and
 * makes the rest of the document inert; this wrapper adds body locking,
 * Escape/backdrop behavior, and explicit focus restoration.
 */
export function Dialog({
  isOpen,
  onClose,
  labelledBy,
  describedBy,
  children,
  role = 'dialog',
  closeOnBackdrop = true,
  className = '',
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDialogClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (closeOnBackdrop && event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdrop && event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== 'Tab') return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter(
      (element) =>
        !element.hasAttribute('hidden')
        && element.getAttribute('aria-hidden') !== 'true'
    );

    if (focusable.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || !dialog.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      role={role}
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      tabIndex={-1}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={handleKeyDown}
      onClick={handleDialogClick}
      className={`m-auto max-h-[100dvh] w-full max-w-none overflow-y-auto bg-transparent p-0 text-inherit backdrop:bg-black/70 backdrop:backdrop-blur-sm ${className}`}
    >
      <div
        className="flex min-h-[100dvh] items-center justify-center p-4"
        onClick={handleBackdropClick}
      >
        {children}
      </div>
    </dialog>
  );
}
