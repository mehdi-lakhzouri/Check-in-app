'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { cardVariants } from '@/lib/animations';

// =============================================================================
// Types
// =============================================================================

export interface StatCardProps {
  /** Card title/label */
  title: string;
  /** Main value to display */
  value: string | number;
  /** Icon component */
  icon?: LucideIcon;
  /** Description or subtitle */
  description?: string;
  /** Trend indicator */
  trend?: {
    value: number;
    label?: string;
    isPositive?: boolean;
  };
  /** Color variant */
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  /** Loading state */
  isLoading?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Additional className */
  className?: string;
  /** Disable animation */
  disableAnimation?: boolean;
}

// =============================================================================
// Variant Styles
// =============================================================================

const variantStyles = {
  default: {
    iconBg: 'bg-muted',
    iconColor: 'text-muted-foreground',
  },
  primary: {
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  success: {
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600 dark:text-green-400',
  },
  warning: {
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
  },
  danger: {
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
  },
  info: {
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
};

// =============================================================================
// Component
// =============================================================================

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  variant = 'default',
  isLoading = false,
  onClick,
  className,
  disableAnimation = false,
}: StatCardProps) {
  const styles = variantStyles[variant];

  const CardWrapper = disableAnimation ? 'div' : motion.div;
  const animationProps = disableAnimation ? {} : cardVariants;

  if (isLoading) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <CardWrapper
      {...animationProps}
      className={cn(onClick && 'cursor-pointer')}
      onClick={onClick}
    >
      <Card
        className={cn(
          'overflow-hidden transition-shadow',
          onClick && 'hover:shadow-md',
          className
        )}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            {/* Content */}
            <div className="space-y-1 min-w-0 flex-1">
              <p className="text-sm font-medium text-muted-foreground truncate">
                {title}
              </p>
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              {description && (
                <p className="text-xs text-muted-foreground truncate">
                  {description}
                </p>
              )}
              {trend && (
                <div className="flex items-center gap-1 pt-1">
                  <span
                    className={cn(
                      'text-xs font-medium',
                      trend.isPositive !== undefined
                        ? trend.isPositive
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                        : 'text-muted-foreground'
                    )}
                  >
                    {trend.isPositive !== undefined && (
                      <span>{trend.isPositive ? '↑' : '↓'}</span>
                    )}
                    {trend.value > 0 ? '+' : ''}
                    {trend.value}%
                  </span>
                  {trend.label && (
                    <span className="text-xs text-muted-foreground">
                      {trend.label}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Icon */}
            {Icon && (
              <div
                className={cn(
                  'flex items-center justify-center h-10 w-10 rounded-lg shrink-0',
                  styles.iconBg
                )}
              >
                <Icon className={cn('h-5 w-5', styles.iconColor)} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </CardWrapper>
  );
}

// =============================================================================
// Mini Stat Card (Compact Version)
// =============================================================================

export interface MiniStatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export function MiniStatCard({
  title,
  value,
  icon: Icon,
  variant = 'default',
  className,
}: MiniStatCardProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg bg-muted/50',
        className
      )}
    >
      {Icon && (
        <div
          className={cn(
            'flex items-center justify-center h-8 w-8 rounded-md shrink-0',
            styles.iconBg
          )}
        >
          <Icon className={cn('h-4 w-4', styles.iconColor)} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-lg font-semibold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{title}</p>
      </div>
    </div>
  );
}

export default StatCard;
