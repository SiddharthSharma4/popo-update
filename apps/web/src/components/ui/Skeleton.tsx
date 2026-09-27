import React from 'react';

export type SkeletonVariant = 'text' | 'rectangle' | 'circle';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Shape variant: text (rounded line), rectangle (box/card), circle (avatar/badge) */
  variant?: SkeletonVariant;
  /** Custom width (e.g. '100%', '120px', 24) */
  width?: string | number;
  /** Custom height (e.g. '24px', '1em', 40) */
  height?: string | number;
  /** Additional CSS class names */
  className?: string;
  /** Inline style overrides */
  style?: React.CSSProperties;
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      variant = 'text',
      width,
      height,
      className = '',
      style,
      ...rest
    },
    ref
  ) => {
    const customStyle: React.CSSProperties = {
      ...(width !== undefined ? { width: typeof width === 'number' ? `${width}px` : width } : {}),
      ...(height !== undefined ? { height: typeof height === 'number' ? `${height}px` : height } : {}),
      ...style,
    };

    const classNames = [
      'osm-skeleton',
      'osm-skeleton--' + variant,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div
        ref={ref}
        role="status"
        aria-busy="true"
        aria-hidden="true"
        className={classNames}
        style={customStyle}
        {...rest}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';
