'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// =============================================================================
// Types
// =============================================================================

export type ConnectionState = 'connected' | 'disconnected' | 'reconnecting';

export interface ConnectionStatusProps {
  /** Current connection state */
  status: ConnectionState;
  /** Custom labels for each state */
  labels?: {
    connected?: string;
    disconnected?: string;
    reconnecting?: string;
  };
  /** Show as a small dot indicator only */
  compact?: boolean;
  /** Additional className */
  className?: string;
  /** Aria label for screen readers */
  'aria-label'?: string;
}

// =============================================================================
// Component
// =============================================================================

const defaultLabels = {
  connected: 'Connected',
  disconnected: 'Disconnected',
  reconnecting: 'Reconnecting...',
};

const statusConfig: Record<
  ConnectionState,
  { color: string; bgColor: string; dotColor: string; pulseColor: string }
> = {
  connected: {
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    dotColor: 'bg-green-500',
    pulseColor: 'bg-green-400',
  },
  disconnected: {
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    dotColor: 'bg-red-500',
    pulseColor: 'bg-red-400',
  },
  reconnecting: {
    color: 'text-yellow-700 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    dotColor: 'bg-yellow-500',
    pulseColor: 'bg-yellow-400',
  },
};

export function ConnectionStatus({
  status,
  labels = defaultLabels,
  compact = false,
  className,
  'aria-label': ariaLabel,
}: ConnectionStatusProps) {
  const config = statusConfig[status];
  const label = labels[status] || defaultLabels[status];

  // Compact mode - just a dot with tooltip
  if (compact) {
    return (
      <div
        className={cn('relative', className)}
        title={label}
        role="status"
        aria-label={ariaLabel || `Connection status: ${label}`}
      >
        <span className={cn('flex h-2 w-2 relative')}>
          {/* Pulse animation for reconnecting */}
          {status === 'reconnecting' && (
            <motion.span
              className={cn(
                'absolute inline-flex h-full w-full rounded-full opacity-75',
                config.pulseColor
              )}
              animate={{ scale: [1, 1.5, 1], opacity: [0.75, 0, 0.75] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
          <span
            className={cn('relative inline-flex rounded-full h-2 w-2', config.dotColor)}
          />
        </span>
      </div>
    );
  }

  // Full badge mode
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        role="status"
        aria-label={ariaLabel || `Connection status: ${label}`}
      >
        <Badge
          variant="outline"
          className={cn(
            'gap-1.5 font-medium border-0 px-2 py-0.5',
            config.bgColor,
            config.color,
            className
          )}
        >
          {/* Status dot */}
          <span className="relative flex h-2 w-2">
            {status === 'reconnecting' && (
              <motion.span
                className={cn(
                  'absolute inline-flex h-full w-full rounded-full opacity-75',
                  config.pulseColor
                )}
                animate={{ scale: [1, 1.5, 1], opacity: [0.75, 0, 0.75] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
            <span
              className={cn('relative inline-flex rounded-full h-2 w-2', config.dotColor)}
            />
          </span>
          {label}
        </Badge>
      </motion.div>
    </AnimatePresence>
  );
}

export default ConnectionStatus;
