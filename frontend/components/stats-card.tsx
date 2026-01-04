'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { 
  statsCardVariants, 
  cardHover, 
  cardTap, 
  TIMING, 
  EASING,
  SPRING 
} from '@/lib/animations';

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  index?: number;
  accentColor?: string;
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
  index = 0,
  accentColor,
}: StatsCardProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const [displayValue, setDisplayValue] = useState<string | number>(0);
  const [hasAnimated, setHasAnimated] = useState(false);

  // Animate number count-up
  useEffect(() => {
    if (isInView && !hasAnimated && typeof value === 'number') {
      setHasAnimated(true);
      const duration = 1500;
      const startTime = Date.now();
      const startValue = 0;
      const endValue = value;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth deceleration
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const current = Math.round(startValue + (endValue - startValue) * easeOutQuart);
        
        setDisplayValue(current);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    } else if (typeof value === 'string') {
      setDisplayValue(value);
    }
  }, [isInView, value, hasAnimated]);

  return (
    <motion.div
      ref={ref}
      variants={statsCardVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      whileHover="hover"
      whileTap={{ scale: 0.98 }}
      custom={index}
      className="h-full"
    >
      <Card 
        className={cn(
          'relative overflow-hidden h-full transition-shadow duration-300',
          'hover:shadow-lg hover:shadow-primary/5',
          className
        )}
      >
        {/* Subtle gradient accent */}
        <div 
          className={cn(
            'absolute top-0 left-0 right-0 h-1 bg-gradient-to-r',
            accentColor || 'from-primary/50 to-primary/20'
          )}
        />
        
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={isInView ? { scale: 1, rotate: 0 } : {}}
            transition={{ 
              delay: index * 0.1 + 0.2, 
              ...SPRING.bouncy 
            }}
          >
            <div className="rounded-full bg-primary/10 p-2">
              <Icon className="h-4 w-4 text-primary" />
            </div>
          </motion.div>
        </CardHeader>
        
        <CardContent>
          <motion.div 
            className="text-3xl font-bold tracking-tight"
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: index * 0.1 + 0.1, duration: TIMING.normal }}
          >
            {displayValue}
          </motion.div>
          
          {description && (
            <motion.p 
              className="text-xs text-muted-foreground mt-1"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: index * 0.1 + 0.3, duration: TIMING.normal }}
            >
              {description}
            </motion.p>
          )}
          
          <AnimatePresence>
            {trend && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ delay: index * 0.1 + 0.4, duration: TIMING.fast }}
                className="mt-2"
              >
                <span
                  className={cn(
                    'inline-flex items-center text-xs font-medium rounded-full px-2 py-0.5',
                    trend.isPositive 
                      ? 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30' 
                      : 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30'
                  )}
                >
                  <motion.span
                    initial={{ rotate: trend.isPositive ? 45 : -45 }}
                    animate={{ rotate: 0 }}
                    transition={{ duration: TIMING.fast }}
                  >
                    {trend.isPositive ? '↑' : '↓'}
                  </motion.span>
                  <span className="ml-1">
                    {Math.abs(trend.value)}% from last period
                  </span>
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
