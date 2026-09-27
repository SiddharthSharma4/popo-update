import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Label text rendered above the input */
  label?: string;
  /** Error message rendered below the input */
  error?: string;
  /** Informational help text rendered below the input */
  helpText?: string;
  /** Optional icon rendered inside the left side of the input */
  prefixIcon?: React.ReactNode;
  /** Optional icon rendered inside the right side of the input */
  suffixIcon?: React.ReactNode;
  /** Optional static text suffix (e.g. "/ 10 pts") */
  suffixText?: string;
  /** Expand wrapper to 100% of container width */
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      id,
      label,
      error,
      helpText,
      prefixIcon,
      suffixIcon,
      suffixText,
      fullWidth = false,
      required,
      disabled,
      className = '',
      type = 'text',
      ...rest
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = error ? inputId + '-error' : undefined;
    const helpId = helpText ? inputId + '-help' : undefined;

    const describedBy = [errorId, helpId].filter(Boolean).join(' ') || undefined;

    const isNumber = type === 'number';

    const inputClasses = [
      'osm-input',
      isNumber ? 'osm-input--number' : '',
      error ? 'osm-input--error' : '',
      prefixIcon ? 'osm-input--has-prefix' : '',
      suffixIcon || suffixText ? 'osm-input--has-suffix' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const wrapperClasses = [
      'osm-form-group',
      fullWidth ? 'osm-form-group--full-width' : '',
      disabled ? 'osm-form-group--disabled' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={wrapperClasses}>
        {label && (
          <label htmlFor={inputId} className="osm-form-label">
            {label}
            {required && (
              <span className="osm-form-required" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        <div className="osm-input-container">
          {prefixIcon && (
            <span className="osm-input-icon osm-input-icon--prefix" aria-hidden="true">
              {prefixIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            type={type}
            disabled={disabled}
            required={required}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={describedBy}
            className={inputClasses}
            {...rest}
          />

          {suffixText && (
            <span className="osm-input-suffix-text" aria-hidden="true">
              {suffixText}
            </span>
          )}

          {suffixIcon && (
            <span className="osm-input-icon osm-input-icon--suffix" aria-hidden="true">
              {suffixIcon}
            </span>
          )}
        </div>

        {error && (
          <p id={errorId} className="osm-form-error" role="alert">
            {error}
          </p>
        )}

        {!error && helpText && (
          <p id={helpId} className="osm-form-help">
            {helpText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
