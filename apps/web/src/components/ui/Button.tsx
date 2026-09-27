import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant conforming to Design Contract §15 */
  variant?: ButtonVariant;
  /** Size tier: sm (32px), md (44px min touch target), lg (48px) */
  size?: ButtonSize;
  /** When true, displays an accessible spinner and disables interaction */
  loading?: boolean;
  /** Optional icon prefix or suffix */
  icon?: React.ReactNode;
  /** Position of the icon relative to children text */
  iconPosition?: 'left' | 'right';
  /** Expand to 100% of container width */
  fullWidth?: boolean;
}

const SpinnerSvg: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg
    className="osm-btn__spinner"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="3"
      strokeOpacity="0.25"
    />
    <path
      d="M12 2a10 10 0 0 1 10 10"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      className = '',
      children,
      type = 'button',
      ...rest
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const spinnerSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;

    const classNames = [
      'osm-btn',
      'osm-btn--' + variant,
      'osm-btn--' + size,
      fullWidth ? 'osm-btn--full-width' : '',
      loading ? 'osm-btn--loading' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading ? 'true' : undefined}
        className={classNames}
        {...rest}
      >
        {loading && <SpinnerSvg size={spinnerSize} />}
        {!loading && icon && iconPosition === 'left' && (
          <span className="osm-btn__icon osm-btn__icon--left" aria-hidden="true">
            {icon}
          </span>
        )}
        {children && <span className="osm-btn__text">{children}</span>}
        {!loading && icon && iconPosition === 'right' && (
          <span className="osm-btn__icon osm-btn__icon--right" aria-hidden="true">
            {icon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
