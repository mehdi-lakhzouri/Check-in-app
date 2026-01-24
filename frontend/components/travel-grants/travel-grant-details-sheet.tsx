'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  MapPin,
  Plane,
  History,
  FileCheck,
  Loader2,
  RefreshCw,
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { MiniStatCard } from '@/components/common';
import type { TravelGrantDetails, TravelGrantStatus, CheckInRecord } from './types';
import { formatStatus, getStatusBadgeVariant } from './types';

// =============================================================================
// Types
// =============================================================================

export interface TravelGrantDetailsSheetProps {
  /** Whether the sheet is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Travel grant details data */
  details: TravelGrantDetails | null;
  /** Loading state */
  isLoading?: boolean;
  /** Callback to approve */
  onApprove?: () => void;
  /** Is approving */
  isApproving?: boolean;
  /** Callback to reject */
  onReject?: () => void;
  /** Is rejecting */
  isRejecting?: boolean;
  /** Callback to reset decision */
  onReset?: () => void;
  /** Is resetting */
  isResetting?: boolean;
}

// =============================================================================
// Status Icon Component
// =============================================================================

function StatusIcon({ status }: { status: TravelGrantStatus }) {
  switch (status) {
    case 'approved':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'rejected':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'pending':
    default:
      return <Clock className="h-4 w-4 text-yellow-500" />;
  }
}

// =============================================================================
// Component
// =============================================================================

export function TravelGrantDetailsSheet({
  open,
  onOpenChange,
  details,
  isLoading = false,
  onApprove,
  isApproving = false,
  onReject,
  isRejecting = false,
  onReset,
  isResetting = false,
}: TravelGrantDetailsSheetProps) {
  const participant = details?.participant;
  const status = details?.stats.applicationStatus || 'pending';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {isLoading ? (
          <TravelGrantDetailsSheetSkeleton />
        ) : !details || !participant ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">No applicant selected</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <SheetHeader className="space-y-4 pb-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-lg">
                    {participant.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-xl">{participant.name}</SheetTitle>
                  <SheetDescription className="flex flex-col gap-1 mt-1">
                    <span>{participant.email}</span>
                    {participant.organization && (
                      <span className="text-primary">{participant.organization}</span>
                    )}
                  </SheetDescription>
                </div>
                <Badge variant={getStatusBadgeVariant(status)} className="gap-1">
                  <StatusIcon status={status} />
                  {formatStatus(status)}
                </Badge>
              </div>

              {/* Decision Actions */}
              <div className="flex flex-wrap gap-2">
                {status === 'pending' ? (
                  <>
                    {onApprove && (
                      <Button
                        onClick={onApprove}
                        disabled={isApproving || isRejecting}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isApproving ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                        )}
                        Approve
                      </Button>
                    )}
                    {onReject && (
                      <Button
                        variant="destructive"
                        onClick={onReject}
                        disabled={isApproving || isRejecting}
                      >
                        {isRejecting ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-1" />
                        )}
                        Reject
                      </Button>
                    )}
                  </>
                ) : (
                  onReset && (
                    <Button
                      variant="outline"
                      onClick={onReset}
                      disabled={isResetting}
                    >
                      {isResetting ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-1" />
                      )}
                      Reset Decision
                    </Button>
                  )
                )}
              </div>
            </SheetHeader>

            <Separator className="my-4" />

            {/* Check-in Progress */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Check-in Progress</h3>
                <span className="text-sm text-muted-foreground">
                  {details.checkInProgress.completed} / {details.checkInProgress.total} sessions
                </span>
              </div>
              <Progress value={details.checkInProgress.percentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {details.checkInProgress.percentage}% attendance rate
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <MiniStatCard
                title="Total Check-ins"
                value={details.stats.totalCheckIns}
                icon={CheckCircle2}
                variant="success"
              />
              <MiniStatCard
                title="Registered Sessions"
                value={details.stats.totalRegisteredSessions}
                icon={Calendar}
                variant="info"
              />
            </div>

            {/* Application Timeline */}
            {(details.stats.appliedAt || details.stats.decidedAt) && (
              <div className="mb-6 p-3 bg-muted/50 rounded-lg space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Timeline
                </h3>
                {details.stats.appliedAt && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileCheck className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Applied:</span>
                    <span>
                      {new Date(details.stats.appliedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {details.stats.decidedAt && (
                  <div className="flex items-center gap-2 text-sm">
                    <StatusIcon status={status} />
                    <span className="text-muted-foreground">Decision:</span>
                    <span>
                      {new Date(details.stats.decidedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Recent Check-ins */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Recent Check-ins</h3>

              {details.lastCheckIns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No check-ins yet</p>
                </div>
              ) : (
                <ScrollArea className="h-[200px] pr-4">
                  <AnimatePresence mode="popLayout">
                    {details.lastCheckIns.map((checkIn, index) => (
                      <motion.div
                        key={checkIn._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-start gap-3 p-3 rounded-lg border mb-2"
                      >
                        <div
                          className={cn(
                            'flex items-center justify-center h-8 w-8 rounded-full shrink-0',
                            checkIn.isLate
                              ? 'bg-yellow-100 dark:bg-yellow-900/30'
                              : 'bg-green-100 dark:bg-green-900/30'
                          )}
                        >
                          <CheckCircle2
                            className={cn(
                              'h-4 w-4',
                              checkIn.isLate
                                ? 'text-yellow-600'
                                : 'text-green-600'
                            )}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {checkIn.sessionName}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{checkIn.sessionLocation}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground">
                            {new Date(checkIn.checkInTime).toLocaleTimeString()}
                          </p>
                          {checkIn.isLate && (
                            <Badge variant="outline" className="text-xs mt-1">
                              Late
                            </Badge>
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

function TravelGrantDetailsSheetSkeleton() {
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
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>

      <Skeleton className="h-px w-full" />

      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-3 w-20" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-4 w-36" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default TravelGrantDetailsSheet;
