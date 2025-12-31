'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { forwardRef, type ComponentProps } from 'react';

interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export function LoadingState({
  message = 'Loading...',
  className,
  size = 'md',
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        'flex h-full items-center justify-center',
        className
      )}
    >
      <div className="text-center">
        <Loader2
          className={cn(
            'animate-spin text-primary mx-auto mb-4',
            sizeClasses[size]
          )}
        />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export function InlineLoading({ className }: { className?: string }) {
  return (
    <Loader2
      className={cn('h-4 w-4 animate-spin text-muted-foreground', className)}
    />
  );
}

export function LoadingSpinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-4 w-4 animate-spin', className)} />;
}

interface ButtonLoadingProps extends ComponentProps<typeof Button> {
  loading?: boolean;
}

export const ButtonLoading = forwardRef<HTMLButtonElement, ButtonLoadingProps>(
  ({ children, loading, disabled, className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        disabled={loading || disabled}
        className={className}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </Button>
    );
  }
);
ButtonLoading.displayName = 'ButtonLoading';

