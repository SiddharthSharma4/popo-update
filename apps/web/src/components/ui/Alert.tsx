import React from 'react';

export type AlertType = 'info' | 'success' | 'warning' | 'danger' | 'error';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Alert intent: info, success, warning, danger, error */
  type?: AlertType;
  /** Optional bold title above message */
  title?: string;
  /** Main alert message */
  message?: React.ReactNode;
  /** Whether alert can be dismissed by user */
  dismissible?: boolean;
  /** Callback fired when dismiss button is clicked */
  onDismiss?: () => void;
  /** Custom icon overriding default semantic icon */
  icon?: React.ReactNode;
  /** Action button or element rendered on the right */
  action?: React.ReactNode;
}

const AlertIcon: React.FC<{ type: AlertType }> = ({ type }) => {
  const normType = type === 'error' ? 'danger' : type;

  if (normType === 'success') {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
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
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
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
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  // Default: info
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        clipRule="evenodd"
      />
    </svg>
  );
};

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      type = 'info',
      title,
      message,
      dismissible = false,
      onDismiss,
      icon,
      action,
      className = '',
      children,
      ...rest
    },
    ref
  ) => {
    const [visible, setVisible] = React.useState(true);

    if (!visible) return null;

    const normType = type === 'error' ? 'danger' : type;
    const isAssertive = normType === 'danger';

    const handleDismiss = () => {
      setVisible(false);
      onDismiss?.();
    };

    const classNames = [
      'osm-alert',
      'osm-alert--' + normType,
      dismissible ? 'osm-alert--dismissible' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div
        ref={ref}
        role="alert"
        aria-live={isAssertive ? 'assertive' : 'polite'}
        className={classNames}
        {...rest}
      >
        <div className="osm-alert__icon" aria-hidden="true">
          {icon || <AlertIcon type={normType} />}
        </div>

        <div className="osm-alert__content">
          {title && <h4 className="osm-alert__title">{title}</h4>}
          <div className="osm-alert__message">
            {message}
            {children}
          </div>
        </div>

        {action && <div className="osm-alert__action">{action}</div>}

        {dismissible && (
          <button
            type="button"
            className="osm-alert__close"
            onClick={handleDismiss}
            aria-label="Dismiss alert"
            title="Dismiss"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';
