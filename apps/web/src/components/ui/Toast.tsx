import React from 'react';

export type ToastType = 'info' | 'success' | 'warning' | 'danger' | 'error';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: React.ReactNode;
  title?: string;
  /** Duration in milliseconds. 0 = persistent */
  duration?: number;
}

export interface ToastProps extends ToastItem {
  onDismiss: (id: string) => void;
  className?: string;
}

const ToastIcon: React.FC<{ type: ToastType }> = ({ type }) => {
  const normType = type === 'error' ? 'danger' : type;

  if (normType === 'success') {
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  if (normType === 'warning') {
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  if (normType === 'danger') {
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        clipRule="evenodd"
      />
    </svg>
  );
};

/**
 * Returns default duration based on Design Contract §4.6:
 * - Success: 4000ms (4s)
 * - Warning: 8000ms (8s)
 * - Danger/Error: 0 (persistent until user dismissed)
 * - Info: 5000ms
 */
function getDefaultDuration(type: ToastType): number {
  const normType = type === 'error' ? 'danger' : type;
  switch (normType) {
    case 'success':
      return 4000;
    case 'warning':
      return 8000;
    case 'danger':
      return 0; // persistent
    case 'info':
    default:
      return 5000;
  }
}

export const Toast: React.FC<ToastProps> = ({
  id,
  type = 'info',
  title,
  message,
  duration,
  onDismiss,
  className = '',
}) => {
  const normType = type === 'error' ? 'danger' : type;
  const timeoutMs = duration !== undefined ? duration : getDefaultDuration(normType);

  React.useEffect(() => {
    if (timeoutMs <= 0) return;
    const timer = setTimeout(() => {
      onDismiss(id);
    }, timeoutMs);
    return () => clearTimeout(timer);
  }, [id, timeoutMs, onDismiss]);

  const classNames = [
    'osm-toast',
    'osm-toast--' + normType,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      role="status"
      aria-live={normType === 'danger' ? 'assertive' : 'polite'}
      className={classNames}
    >
      <div className="osm-toast__icon" aria-hidden="true">
        <ToastIcon type={normType} />
      </div>

      <div className="osm-toast__content">
        {title && <h5 className="osm-toast__title">{title}</h5>}
        <div className="osm-toast__message">{message}</div>
      </div>

      <button
        type="button"
        className="osm-toast__close"
        onClick={() => onDismiss(id)}
        aria-label="Dismiss notification"
        title="Dismiss"
      >
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
};

Toast.displayName = 'Toast';

// ============================================================================
// Toast Container & Context
// ============================================================================

export interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  className?: string;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
  className = '',
}) => {
  // Enforce max 3 stacked toasts per Design Contract §4.6
  const visibleToasts = toasts.slice(-3);

  if (visibleToasts.length === 0) return null;

  return (
    <div
      className={'osm-toast-container ' + className}
      aria-live="polite"
      aria-label="Notifications"
    >
      {visibleToasts.map((toast) => (
        <Toast key={toast.id} {...toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

ToastContainer.displayName = 'ToastContainer';

// Context for global imperative useToast
export interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'> & { id?: string }) => string;
  dismissToast: (id: string) => void;
  success: (message: React.ReactNode, options?: { title?: string; duration?: number }) => string;
  error: (message: React.ReactNode, options?: { title?: string; duration?: number }) => string;
  warning: (message: React.ReactNode, options?: { title?: string; duration?: number }) => string;
  info: (message: React.ReactNode, options?: { title?: string; duration?: number }) => string;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const dismissToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = React.useCallback(
    (toast: Omit<ToastItem, 'id'> & { id?: string }) => {
      const id = toast.id || 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { ...toast, id };
      setToasts((prev) => {
        // Deduplicate in case an existing toast with this id exists
        const filtered = prev.filter((t) => t.id !== id);
        // Retain at most 2 previous toasts so that with newToast, total never exceeds 3 (Design Contract §4.6)
        // This avoids zombie toast resurrection and unbounded state accumulation
        return [...filtered.slice(-2), newToast];
      });
      return id;
    },
    []
  );

  const success = React.useCallback(
    (message: React.ReactNode, options?: { title?: string; duration?: number }) =>
      addToast({ type: 'success', message, ...options }),
    [addToast]
  );

  const error = React.useCallback(
    (message: React.ReactNode, options?: { title?: string; duration?: number }) =>
      addToast({ type: 'danger', message, ...options }),
    [addToast]
  );

  const warning = React.useCallback(
    (message: React.ReactNode, options?: { title?: string; duration?: number }) =>
      addToast({ type: 'warning', message, ...options }),
    [addToast]
  );

  const info = React.useCallback(
    (message: React.ReactNode, options?: { title?: string; duration?: number }) =>
      addToast({ type: 'info', message, ...options }),
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        dismissToast,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
