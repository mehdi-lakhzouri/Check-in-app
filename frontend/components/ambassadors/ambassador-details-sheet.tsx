'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Users,
  TrendingUp,
  Trophy,
  RefreshCw,
  Trash2,
  Plus,
  Mail,
  Building2,
  Calendar,
  CheckCircle2,
  XCircle,
  UserMinus,
  Loader2,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { MiniStatCard } from '@/components/common';
import type { AmbassadorDetails, ReferredParticipant } from './types';

// =============================================================================
// Types
// =============================================================================

export interface AmbassadorDetailsSheetProps {
  /** Whether the sheet is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Ambassador details data */
  details: AmbassadorDetails | null;
  /** Loading state */
  isLoading?: boolean;
  /** Callback to sync referrals */
  onSyncReferrals?: () => void;
  /** Is syncing referrals */
  isSyncing?: boolean;
  /** Callback to add a referral */
  onAddReferral?: () => void;
  /** Callback to remove a referral */
  onRemoveReferral?: (referral: ReferredParticipant) => void;
  /** Callback to demote ambassador */
  onDemote?: () => void;
  /** Is demoting */
  isDemoting?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function AmbassadorDetailsSheet({
  open,
  onOpenChange,
  details,
  isLoading = false,
  onSyncReferrals,
  isSyncing = false,
  onAddReferral,
  onRemoveReferral,
  onDemote,
  isDemoting = false,
}: AmbassadorDetailsSheetProps) {
  const ambassador = details?.ambassador;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {isLoading ? (
          <AmbassadorDetailsSheetSkeleton />
        ) : !details || !ambassador ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">No ambassador selected</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <SheetHeader className="space-y-4 pb-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={undefined} alt={ambassador.name} />
                  <AvatarFallback className="text-lg">
                    {ambassador.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-xl">{ambassador.name}</SheetTitle>
                  <SheetDescription className="flex flex-col gap-1 mt-1">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {ambassador.email}
                    </span>
                    {ambassador.organization && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {ambassador.organization}
                      </span>
                    )}
                  </SheetDescription>
                </div>
                <Badge variant={ambassador.isActive ? 'default' : 'secondary'}>
                  {ambassador.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2">
                {onSyncReferrals && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onSyncReferrals}
                    disabled={isSyncing}
                  >
                    {isSyncing ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-1" />
                    )}
                    Sync Referrals
                  </Button>
                )}
                {onAddReferral && (
                  <Button variant="outline" size="sm" onClick={onAddReferral}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Referral
                  </Button>
                )}
                {onDemote && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={onDemote}
                    disabled={isDemoting}
                  >
                    {isDemoting ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <UserMinus className="h-4 w-4 mr-1" />
                    )}
                    Demote
                  </Button>
                )}
              </div>
            </SheetHeader>

            <Separator className="my-4" />

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <MiniStatCard
                title="Points"
                value={details.stats.points}
                icon={TrendingUp}
                variant="primary"
              />
              <MiniStatCard
                title="Total Referrals"
                value={details.stats.totalReferrals}
                icon={Users}
                variant="info"
              />
              <MiniStatCard
                title="Active"
                value={details.stats.activeReferrals}
                icon={CheckCircle2}
                variant="success"
              />
            </div>

            {/* Referred Participants List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Referred Participants</h3>
                <span className="text-xs text-muted-foreground">
                  {details.referredParticipants.length} total
                </span>
              </div>

              {details.referredParticipants.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No referrals yet</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px] pr-4">
                  <AnimatePresence mode="popLayout">
                    {details.referredParticipants.map((referral, index) => (
                      <motion.div
                        key={referral._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-3 p-3 rounded-lg border mb-2 hover:bg-muted/30 transition-colors"
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-xs">
                            {referral.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {referral.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {referral.email}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge
                            variant={referral.isActive ? 'default' : 'outline'}
                            className="text-xs"
                          >
                            {referral.isActive ? (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            ) : (
                              <XCircle className="h-3 w-3 mr-1" />
                            )}
                            {referral.isActive ? 'Active' : 'Inactive'}
                          </Badge>

                          {onRemoveReferral && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => onRemoveReferral(referral)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </ScrollArea>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// =============================================================================
// Skeleton
// =============================================================================

function AmbassadorDetailsSheetSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      <div className="flex gap-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-24" />
      </div>

      <Skeleton className="h-px w-full" />

      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>

      <div className="space-y-2">
        <Skeleton className="h-4 w-36" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default AmbassadorDetailsSheet;
