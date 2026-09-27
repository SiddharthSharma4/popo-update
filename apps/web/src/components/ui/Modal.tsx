import React, { useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';

export type ModalSize = 'sm' | 'md' | 'lg';

export interface ModalProps {
  /** Primary title rendered in the dialog header */
  title: React.ReactNode;
  /** Optional secondary subtitle or description */
  description?: React.ReactNode;
  /** Whether the modal is currently open */
  open: boolean;
  /** Callback fired when the modal requests closure (Esc, backdrop, or close button) */
  onClose: () => void;
  /** Width size tier: sm (440px), md (580px), lg (800px). Defaults to 'md' */
  size?: ModalSize;
  /** Optional footer content (e.g. action buttons) */
  footer?: React.ReactNode;
  /** Whether clicking the backdrop overlay closes the modal. Defaults to true */
  closeOnBackdropClick?: boolean;
  /** Whether pressing Escape closes the modal. Defaults to true */
  closeOnEsc?: boolean;
  /** Additional custom class names for the modal card container */
  className?: string;
  /** Modal body content */
  children: React.ReactNode;
  /** Optional custom id for ARIA association */
  id?: string;
}

export const Modal: React.FC<ModalProps> = ({
  title,
  description,
  open,
  onClose,
  size = 'md',
  footer,
  closeOnBackdropClick = true,
  closeOnEsc = true,
  className = '',
  children,
  id: explicitId,
}) => {
  const generatedId = useId();
  const baseId = explicitId || generatedId;
  const titleId = `${baseId}-title`;
  const descId = `${baseId}-desc`;

  const backdropRef = useRef<HTMLDivElement>(null);
  const modalCardRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  // --------------------------------------------------------------------------
  // Focus Management & Keyboard Trap
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!open) return;

    // 1. Capture previously focused element so we can restore on close
    previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;

    // 2. Prevent background body scrolling while modal is open
    const originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // 3. Find focusable elements inside the modal
    const getFocusables = (): HTMLElement[] => {
      if (!modalCardRef.current) return [];
      const selector =
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      return Array.from(modalCardRef.current.querySelectorAll<HTMLElement>(selector)).filter(
        (el) => el.offsetParent !== null // ensure visible
      );
    };

    // 4. Set initial focus
    const focusables = getFocusables();
    if (focusables.length > 0) {
      // Focus first element, giving React a frame to paint
      requestAnimationFrame(() => {
        focusables[0]?.focus();
      });
    } else {
      modalCardRef.current?.focus();
    }

    // 5. Keydown listener for Esc and Tab cycling
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (closeOnEsc) {
          e.preventDefault();
          onClose();
        }
        return;
      }

      if (e.key === 'Tab') {
        const elements = getFocusables();
        if (elements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = elements[0];
        const lastElement = elements[elements.length - 1];

        if (e.shiftKey) {
          // Backward tab: if at first, wrap to last
          if (document.activeElement === firstElement || document.activeElement === modalCardRef.current) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Forward tab: if at last, wrap to first
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // 6. Cleanup: restore scroll and previous focus
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocusedElementRef.current && typeof previouslyFocusedElementRef.current.focus === 'function') {
        previouslyFocusedElementRef.current.focus();
      }
    };
  }, [open, closeOnEsc, onClose]);

  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && e.target === backdropRef.current) {
      onClose();
    }
  };

  const modalClassNames = [
    'osm-modal',
    'osm-modal--' + size,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <div
      ref={backdropRef}
      className="osm-modal-backdrop"
      onClick={handleBackdropClick}
      data-testid="modal-backdrop"
    >
      <div
        ref={modalCardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={modalClassNames}
      >
        <div className="osm-modal__header">
          <div className="osm-modal__header-content">
            <h3 id={titleId} className="osm-modal__title">
              {title}
            </h3>
            {description && (
              <p id={descId} className="osm-modal__desc">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            className="osm-modal__close"
            onClick={onClose}
            aria-label="Close dialog"
            title="Close"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="osm-modal__body">{children}</div>

        {footer && <div className="osm-modal__footer">{footer}</div>}
      </div>
    </div>
  );

  // Use createPortal to mount directly into document.body to avoid clipping
  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }

  return content;
};

Modal.displayName = 'Modal';
