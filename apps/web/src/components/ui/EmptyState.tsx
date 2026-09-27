import React from 'react';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional icon (component or string emoji/symbol) */
  icon?: React.ReactNode;
  /** Primary title heading */
  title: string;
  /** Contextual description text or elements */
  description?: React.ReactNode;
  /** Optional call-to-action button or interactive element */
  action?: React.ReactNode;
  /** Additional custom class names */
  className?: string;
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      icon,
      title,
      description,
      action,
      className = '',
      ...rest
    },
    ref
  ) => {
    const classNames = [
      'osm-empty-state',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div
        ref={ref}
        role="status"
        className={classNames}
        {...rest}
      >
        {icon && (
          <div className="osm-empty-state__icon" aria-hidden="true">
            {icon}
          </div>
        )}

        <h4 className="osm-empty-state__title">{title}</h4>

        {description && (
          <p className="osm-empty-state__desc">{description}</p>
        )}

        {action && (
          <div className="osm-empty-state__action">{action}</div>
        )}
      </div>
    );
  }
);

EmptyState.displayName = 'EmptyState';
