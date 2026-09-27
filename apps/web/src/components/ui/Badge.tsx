import React from 'react';

export type BadgeVariant = 'info' | 'success' | 'warning' | 'danger' | 'muted' | 'ai';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Visual variant matching OSM design tokens */
  variant?: BadgeVariant;
  /** Size tier: sm (compact, 20px) or md (standard, 24px) */
  size?: BadgeSize;
  /** When true, renders a small colored status dot before children */
  dot?: boolean;
  /** Optional icon prefix */
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'muted',
  size = 'md',
  dot = false,
  icon,
  className = '',
  children,
  ...rest
}) => {
  const classNames = [
    'osm-badge',
    'osm-badge--' + variant,
    'osm-badge--' + size,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classNames} {...rest}>
      {dot && <span className="osm-badge__dot" aria-hidden="true" />}
      {icon && <span className="osm-badge__icon" aria-hidden="true">{icon}</span>}
      <span className="osm-badge__content">{children}</span>
    </span>
  );
};

Badge.displayName = 'Badge';
