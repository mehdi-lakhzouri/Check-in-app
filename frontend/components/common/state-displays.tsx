'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RefreshCw, WifiOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface EmptyStateProps {
  /** Icon to display */
  icon?: React.ReactNode;
  /** Main title */
  title: string;
  /** Description text */
  description?: string;
  /** Action button */
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  /** Additional className */
  className?: string;
}

export interface ErrorStateProps {
  /** Error title */
  title?: string;
  /** Error message */
  message?: string;
  /** Retry callback */
  onRetry?: () => void;
  /** Is retrying */
  isRetrying?: boolean;
  /** Additional className */
  className?: string;
}

export interface LoadingStateProps {
  /** Loading message */
  message?: string;
  /** Size of the loader */
  size?: 'sm' | 'md' | 'lg';
  /** Additional className */
  className?: string;
}

export interface NoConnectionStateProps {
  /** Custom title */
  title?: string;
  /** Custom message */
  message?: string;
  /** Retry callback */
  onRetry?: () => void;
  /** Is retrying */
  isRetrying?: boolean;
  /** Additional className */
  className?: string;
}

// =============================================================================
// Empty State
// =============================================================================

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      {icon && (
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-md mb-4">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.icon}
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}

// =============================================================================
// Error State
// =============================================================================

export function ErrorState({
  title = 'Something went wrong',
  message = 'An error occurred while loading the data. Please try again.',
  onRetry,
  isRetrying = false,
  className,
}: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
        <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-4">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" disabled={isRetrying}>
          {isRetrying ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {isRetrying ? 'Retrying...' : 'Try again'}
        </Button>
      )}
    </motion.div>
  );
}

// =============================================================================
// Loading State
// =============================================================================

const sizeClasses = {
  sm: {
    wrapper: 'py-6',
    icon: 'h-6 w-6',
    text: 'text-sm',
  },
  md: {
    wrapper: 'py-12',
    icon: 'h-8 w-8',
    text: 'text-base',
  },
  lg: {
    wrapper: 'py-20',
    icon: 'h-12 w-12',
    text: 'text-lg',
  },
};

export function LoadingState({
  message = 'Loading...',
  size = 'md',
  className,
}: LoadingStateProps) {
  const sizes = sizeClasses[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        sizes.wrapper,
        className
      )}
      role="status"
      aria-label={message}
    >
      <Loader2 className={cn('animate-spin text-primary mb-3', sizes.icon)} />
      <p className={cn('text-muted-foreground', sizes.text)}>{message}</p>
    </div>
  );
}

// =============================================================================
// No Connection State
// =============================================================================

export function NoConnectionState({
  title = 'No internet connection',
  message = 'Please check your internet connection and try again.',
  onRetry,
  isRetrying = false,
  className,
}: NoConnectionStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 mb-4">
        <WifiOff className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-4">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" disabled={isRetrying}>
          {isRetrying ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {isRetrying ? 'Retrying...' : 'Retry'}
        </Button>
      )}
    </motion.div>
  );
}

// =============================================================================
// Card Variants
// =============================================================================

export function EmptyStateCard(props: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <EmptyState {...props} />
      </CardContent>
    </Card>
  );
}

export function ErrorStateCard(props: ErrorStateProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <ErrorState {...props} />
      </CardContent>
    </Card>
  );
}

export default EmptyState;
