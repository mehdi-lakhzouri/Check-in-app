'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface AnimatedInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  suffix?: string;
  icon?: React.ReactNode;
}

const AnimatedInput = React.forwardRef<HTMLInputElement, AnimatedInputProps>(
  ({ className, type, label, description, suffix, icon, id, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(
      props.value !== undefined && props.value !== ''
    );
    const inputId = id || React.useId();

    React.useEffect(() => {
      setHasValue(props.value !== undefined && props.value !== '');
    }, [props.value]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      props.onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(e.target.value !== '');
      props.onChange?.(e);
    };

    const isFloating = isFocused || hasValue;

    return (
      <div className="space-y-1">
        <div className="relative">
          {/* Floating Label */}
          {label && (
            <label
              htmlFor={inputId}
              className={cn(
                'absolute left-3 pointer-events-none z-10',
                'flex items-center gap-1.5',
                'transition-all duration-200 ease-out',
                isFloating
                  ? '-top-2 text-[10px] font-medium bg-background px-1 text-blue-600'
                  : 'top-1/2 -translate-y-1/2 text-sm text-muted-foreground',
                icon && !isFloating && 'left-9'
              )}
            >
              {label}
            </label>
          )}

          {/* Icon */}
          {icon && (
            <div
              className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2',
                'transition-colors duration-200',
                isFocused ? 'text-blue-600' : 'text-muted-foreground'
              )}
            >
              {icon}
            </div>
          )}

          {/* Input Field */}
          <input
            id={inputId}
            type={type}
            ref={ref}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            className={cn(
              'flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm',
              'transition-colors duration-200',
              'ring-offset-background',
              'file:border-0 file:bg-transparent file:text-sm file:font-medium',
              'placeholder:text-muted-foreground',
              'focus-visible:outline-none',
              // Light blue border styling
              isFocused
                ? 'border-blue-400 ring-1 ring-blue-100'
                : 'border-blue-200 hover:border-blue-300',
              'disabled:cursor-not-allowed disabled:opacity-50',
              icon && 'pl-9',
              suffix && 'pr-10',
              className
            )}
            {...props}
          />

          {/* Suffix */}
          {suffix && (
            <div
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2',
                'text-xs font-medium',
                'transition-colors duration-200',
                isFocused ? 'text-blue-600' : 'text-muted-foreground'
              )}
            >
              {suffix}
            </div>
          )}
        </div>

        {/* Description */}
        {description && (
          <p className="text-[11px] text-muted-foreground ml-0.5">
            {description}
          </p>
        )}
      </div>
    );
  }
);

AnimatedInput.displayName = 'AnimatedInput';

export { AnimatedInput };
