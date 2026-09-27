import React from 'react';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional card header content or string title */
  header?: React.ReactNode;
  /** Card title if header not explicitly provided */
  title?: string;
  /** Optional secondary subtitle text in header */
  subtitle?: string;
  /** Optional action element rendered in top right of header */
  action?: React.ReactNode;
  /** Optional card footer content */
  footer?: React.ReactNode;
  /** Internal padding scale: none (0), sm (12px), md (20px), lg (32px) */
  padding?: CardPadding;
  /** Raised panel styling using elevated background and medium shadow */
  elevated?: boolean;
  /** Border only, zero shadow */
  flat?: boolean;
  /** Semantic HTML wrapper element */
  as?: 'div' | 'section' | 'article';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      header,
      title,
      subtitle,
      action,
      footer,
      padding = 'md',
      elevated = false,
      flat = false,
      as: Component = 'div',
      className = '',
      children,
      ...rest
    },
    ref
  ) => {
    const classNames = [
      'osm-card',
      'osm-card--p-' + padding,
      elevated ? 'osm-card--elevated' : '',
      flat ? 'osm-card--flat' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const hasHeader = Boolean(header || title || action);

    return (
      <Component ref={ref} className={classNames} {...rest}>
        {hasHeader && (
          <div className="osm-card__header">
            {header ? (
              header
            ) : (
              <div className="osm-card__header-content">
                {title && <h3 className="osm-card__title">{title}</h3>}
                {subtitle && <p className="osm-card__subtitle">{subtitle}</p>}
              </div>
            )}
            {action && <div className="osm-card__action">{action}</div>}
          </div>
        )}

        <div className="osm-card__body">{children}</div>

        {footer && <div className="osm-card__footer">{footer}</div>}
      </Component>
    );
  }
);

Card.displayName = 'Card';
