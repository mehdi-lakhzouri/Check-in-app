'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Award, TrendingUp, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { cardVariants } from '@/lib/animations';
import type { Participant } from '@/lib/schemas';

// =============================================================================
// Types
// =============================================================================

export interface AmbassadorLeaderboardProps {
  /** List of top ambassadors */
  ambassadors: Participant[];
  /** Loading state */
  isLoading?: boolean;
  /** Maximum number to display */
  limit?: number;
  /** Callback when an ambassador is clicked */
  onSelect?: (ambassador: Participant) => void;
  /** Additional className */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

const rankConfig = [
  {
    icon: Trophy,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    label: '1st',
  },
  {
    icon: Medal,
    color: 'text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800/50',
    label: '2nd',
  },
  {
    icon: Award,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    label: '3rd',
  },
];

export function AmbassadorLeaderboard({
  ambassadors,
  isLoading = false,
  limit = 5,
  onSelect,
  className,
}: AmbassadorLeaderboardProps) {
  const displayAmbassadors = ambassadors.slice(0, limit);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top Ambassadors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (displayAmbassadors.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top Ambassadors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No ambassadors yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div {...cardVariants}>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top Ambassadors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {displayAmbassadors.map((ambassador, index) => {
                const rank = rankConfig[index];
                const RankIcon = rank?.icon || Star;

                return (
                  <motion.div
                    key={ambassador._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      'flex items-center gap-3 p-2 rounded-lg transition-colors',
                      onSelect && 'cursor-pointer hover:bg-muted/50'
                    )}
                    onClick={() => onSelect?.(ambassador)}
                  >
                    {/* Rank */}
                    <div
                      className={cn(
                        'flex items-center justify-center h-8 w-8 rounded-full shrink-0',
                        rank?.bgColor || 'bg-muted'
                      )}
                    >
                      {index < 3 ? (
                        <RankIcon
                          className={cn('h-4 w-4', rank?.color || 'text-muted-foreground')}
                        />
                      ) : (
                        <span className="text-xs font-bold text-muted-foreground">
                          {index + 1}
                        </span>
                      )}
                    </div>

                    {/* Avatar */}
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={undefined} alt={ambassador.name} />
                      <AvatarFallback className="text-xs">
                        {ambassador.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Name & Organization */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {ambassador.name}
                      </p>
                      {ambassador.organization && (
                        <p className="text-xs text-muted-foreground truncate">
                          {ambassador.organization}
                        </p>
                      )}
                    </div>

                    {/* Points */}
                    <Badge variant="secondary" className="shrink-0">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {ambassador.ambassadorPoints || 0}
                    </Badge>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default AmbassadorLeaderboard;
