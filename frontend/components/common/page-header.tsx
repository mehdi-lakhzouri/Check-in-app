'use client';

import React from 'react';
import { LucideIcon, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { cardVariants } from '@/lib/animations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface PageHeaderAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive';
  disabled?: boolean;
  loading?: boolean;
}

export interface PageHeaderProps {
  /** Icon to display in the header */
  icon: LucideIcon;
  /** Main title */
  title: string;
  /** Description text */
  description?: string;
  /** Optional badge content (e.g., "3 of 10 shown") */
  badge?: React.ReactNode;
  /** Show refresh button */
  onRefresh?: () => void;
  /** Is data currently refreshing */
  isRefreshing?: boolean;
  /** Real-time connection status */
  connectionStatus?: {
    isConnected: boolean;
    connectedLabel?: string;
    disconnectedLabel?: string;
  };
  /** Additional action buttons */
  actions?: PageHeaderAction[];
  /** Custom content on the right side */
  rightContent?: React.ReactNode;
  /** Additional className */
  className?: string;
  /** Use gradient background */
  gradient?: boolean;
  /** Animate entrance */
  animate?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function PageHeader({
  icon: Icon,
  title,
  description,
  badge,
  onRefresh,
  isRefreshing = false,
  connectionStatus,
  actions = [],
  rightContent,
  className,
  gradient = false,
  animate = true,
}: PageHeaderProps) {
  const Wrapper = animate ? motion.div : 'div';
  const wrapperProps = animate ? { variants: cardVariants } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        'flex flex-col gap-4 md:flex-row md:items-center md:justify-between',
        gradient && 'p-6 -mx-6 -mt-6 mb-4 bg-gradient-to-r from-indigo-50 to-lavender-light border-b border-border/50',
        className
      )}
    >
      {/* Left: Title and Description */}
      <div className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          {title}

          {/* Connection Status Badge */}
          {connectionStatus && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors',
                    connectionStatus.isConnected
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  )}
                >
                  {connectionStatus.isConnected ? (
                    <Wifi className="h-3 w-3" aria-hidden="true" />
                  ) : (
                    <WifiOff className="h-3 w-3" aria-hidden="true" />
                  )}
                  <span>
                    {connectionStatus.isConnected
                      ? connectionStatus.connectedLabel || 'Live'
                      : connectionStatus.disconnectedLabel || 'Offline'}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {connectionStatus.isConnected
                  ? 'Real-time updates active - changes will appear automatically'
                  : 'Real-time connection lost - refresh to see latest changes'}
              </TooltipContent>
            </Tooltip>
          )}
        </h2>

        {/* Description with optional badge */}
        {(description || badge) && (
          <p className="text-muted-foreground">
            {description}
            {badge && (
              <Badge variant="secondary" className="ml-2">
                {badge}
              </Badge>
            )}
          </p>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Custom right content */}
        {rightContent}

        {/* Action buttons */}
        {actions.map((action, index) => {
          const ActionIcon = action.icon;
          return (
            <Button
              key={index}
              variant={action.variant || 'outline'}
              size="sm"
              onClick={action.onClick}
              disabled={action.disabled || action.loading}
              className="gap-2"
            >
              {action.loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : ActionIcon ? (
                <ActionIcon className="h-4 w-4" aria-hidden="true" />
              ) : null}
              {action.label}
            </Button>
          );
        })}

        {/* Refresh button */}
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw
              className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
              aria-hidden="true"
            />
            Refresh
          </Button>
        )}
      </div>
    </Wrapper>
  );
}

export default PageHeader;
