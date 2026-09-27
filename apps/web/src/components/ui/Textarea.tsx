import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Label text rendered above the textarea */
  label?: string;
  /** Error message rendered below the textarea */
  error?: string;
  /** Informational help text rendered below the textarea */
  helpText?: string;
  /** When true and maxLength is set, displays "current / max" character counter */
  showCount?: boolean;
  /** Expand wrapper to 100% of container width */
  fullWidth?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      id,
      label,
      error,
      helpText,
      maxLength,
      showCount = true,
      fullWidth = false,
      required,
      disabled,
      className = '',
      rows = 3,
      value,
      defaultValue,
      onChange,
      ...rest
    },
    ref
  ) => {
    const generatedId = React.useId();
    const textareaId = id || generatedId;
    const errorId = error ? textareaId + '-error' : undefined;
    const helpId = helpText ? textareaId + '-help' : undefined;
    const counterId = maxLength && showCount ? textareaId + '-counter' : undefined;

    // Track character length for counter
    const [charCount, setCharCount] = React.useState<number>(() => {
      if (typeof value === 'string') return value.length;
      if (typeof defaultValue === 'string') return defaultValue.length;
      return 0;
    });

    // Synchronize character count if controlled value changes
    React.useEffect(() => {
      if (typeof value === 'string') {
        setCharCount(value.length);
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (value === undefined) {
        setCharCount(e.target.value.length);
      }
      onChange?.(e);
    };

    const describedBy = [errorId, helpId, counterId].filter(Boolean).join(' ') || undefined;

    const textareaClasses = [
      'osm-textarea',
      error ? 'osm-textarea--error' : '',
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

    const isAtLimit = maxLength !== undefined && charCount >= maxLength;

    return (
      <div className={wrapperClasses}>
        {label && (
          <label htmlFor={textareaId} className="osm-form-label">
            {label}
            {required && (
              <span className="osm-form-required" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        <div className="osm-textarea-container">
          <textarea
            ref={ref}
            id={textareaId}
            rows={rows}
            maxLength={maxLength}
            disabled={disabled}
            required={required}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={describedBy}
            className={textareaClasses}
            value={value}
            defaultValue={defaultValue}
            onChange={handleChange}
            {...rest}
          />
        </div>

        <div className="osm-form-footer">
          <div className="osm-form-footer-left">
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

          {maxLength !== undefined && showCount && (
            <span
              id={counterId}
              className={'osm-form-counter ' + (isAtLimit ? 'osm-form-counter--limit' : '')}
              aria-live="polite"
              aria-atomic="true"
            >
              {charCount} / {maxLength}
            </span>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
