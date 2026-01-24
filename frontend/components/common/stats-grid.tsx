'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cardVariants, staggerContainer } from '@/lib/animations';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface StatsGridProps {
  /** Number of columns on different breakpoints */
  columns?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };
  /** Children (StatsCard components) */
  children: React.ReactNode;
  /** Additional className */
  className?: string;
  /** Animate the grid */
  animate?: boolean;
  /** Gap between items */
  gap?: number;
}

export interface StatsGridItemProps {
  /** Children content */
  children: React.ReactNode;
  /** Additional className */
  className?: string;
}

// =============================================================================
// Components
// =============================================================================

export function StatsGrid({
  columns = { default: 1, sm: 2, md: 2, lg: 4 },
  children,
  className,
  animate = true,
  gap = 4,
}: StatsGridProps) {
  const gridCols = cn(
    'grid',
    `gap-${gap}`,
    columns.default && `grid-cols-${columns.default}`,
    columns.sm && `sm:grid-cols-${columns.sm}`,
    columns.md && `md:grid-cols-${columns.md}`,
    columns.lg && `lg:grid-cols-${columns.lg}`
  );

  if (animate) {
    return (
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className={cn(gridCols, className)}
      >
        {React.Children.map(children, (child, index) => (
          <motion.div key={index} variants={cardVariants}>
            {child}
          </motion.div>
        ))}
      </motion.div>
    );
  }

  return <div className={cn(gridCols, className)}>{children}</div>;
}

export function StatsGridItem({ children, className }: StatsGridItemProps) {
  return <div className={className}>{children}</div>;
}

export default StatsGrid;
