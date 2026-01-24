'use client';

import React from 'react';
import {
  CalendarDays,
  CalendarX,
  Clock,
  History,
  Mail,
  Building2,
  Plane,
  X,
  CreditCard,
  MapPin,
  MoreHorizontal,
  Download,
  Share2,
} from 'lucide-react';
import { format } from 'date-fns';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Participant, ParticipantDetails } from '@/lib/schemas';

interface ParticipantProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participant: Participant | null;
  details: ParticipantDetails | null;
  isLoading: boolean;
}

export function ParticipantProfileModal({
  open,
  onOpenChange,
  participant,
  details,
  isLoading,
}: ParticipantProfileModalProps) {
  if (!participant) return null;

  // Derive initials for avatar
  const initials = participant.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Determine status color
  const statusColor =
    participant.status === 'ambassador'
      ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
      : participant.status === 'travel_grant'
      ? 'bg-blue-100 text-blue-700 border-blue-200'
      : 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden sm:rounded-xl">
        {/* Header Section */}
        <div className="relative p-6 pt-8 bg-muted/30 border-b">
          <DialogClose className="absolute right-4 top-4 rounded-full opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>

          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20 border-4 border-background shadow-lg shadow-black/5">
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${participant.name}`} />
              <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-2xl font-bold leading-none tracking-tight">
                  {participant.name}
                </DialogTitle>
                <Badge variant="outline" className={cn("ml-1 font-normal capitalize shadow-none", statusColor)}>
                  {participant.status === 'travel_grant' ? 'Travel Grant' : participant.status}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Mail className="h-3.5 w-3.5" />
                <span>{participant.email}</span>
              </div>
              
              {participant.organization && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>{participant.organization}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="max-h-[60vh]">
          <div className="p-6 space-y-6">
            
            {/* Travel Grant / Ambassador Status Card */}
            {(isLoading || details?.scores) && (
              <div className="grid gap-4">
                {isLoading ? (
                  <Skeleton className="h-24 w-full rounded-lg" />
                ) : details?.scores ? (
                  <Card className="shadow-sm border-indigo-100 bg-indigo-50/30">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm font-medium text-indigo-900 flex items-center gap-2">
                        {details.scores.type === 'travel_grant' ? (
                          <>
                            <Plane className="h-4 w-4 text-indigo-500" />
                            Travel Grant Information
                          </>
                        ) : (
                          <>
                            <Share2 className="h-4 w-4 text-indigo-500" />
                            Ambassador Program
                          </>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      {details.scores.type === 'travel_grant' ? (
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                          <div className="flex flex-col">
                            <span className="text-muted-foreground text-xs">Application Status</span>
                            <div className="flex items-center mt-1">
                              {details.scores.approved ? (
                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 shadow-none gap-1 pl-1.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                  Approved
                                </Badge>
                              ) : details.scores.applied ? (
                                <Badge variant="secondary" className="gap-1 pl-1.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                                  Pending Review
                                </Badge>
                              ) : (
                                <span className="font-medium text-muted-foreground">—</span>
                              )}
                            </div>
                          </div>
                          {details.scores.approved && (
                            <div className="flex flex-col">
                              <span className="text-muted-foreground text-xs">Grant Code</span>
                              <span className="font-mono font-medium mt-1">TG-{participant._id.slice(-6).toUpperCase()}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-8 text-sm">
                          <div>
                            <span className="block text-2xl font-bold text-indigo-700">{details.scores.points || 0}</span>
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Points</span>
                          </div>
                          <div>
                            <span className="block text-2xl font-bold text-indigo-700">{details.scores.referralCount || 0}</span>
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Referrals</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            )}

            {/* Registered Sessions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <h3>Registered Sessions</h3>
                </div>
                {details?.registrations && details.registrations.length > 0 && (
                  <Badge variant="secondary" className="rounded-full px-2.5 text-xs font-normal">
                    {details.registrations.length}
                  </Badge>
                )}
              </div>

              {isLoading ? (
                <div className="space-y-3">
                   <Skeleton className="h-14 w-full rounded-lg" />
                   <Skeleton className="h-14 w-full rounded-lg" />
                </div>
              ) : !details?.registrations || details.registrations.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 flex flex-col items-center text-center bg-muted/5">
                  <CalendarX className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-foreground">No sessions registered</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-[200px]">
                    This participant has not confirmed for any activities yet.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {details.registrations.map((reg) => {
                    const session = reg.sessionId as any; // Using any for simplicity if strict type is complex
                    return (
                      <div key={reg._id} className="flex items-start gap-3 rounded-lg border bg-card p-3 shadow-sm transition-colors hover:bg-muted/30">
                        <div className="rounded-md bg-indigo-50 p-2 text-indigo-600">
                           <CalendarDays className="h-4 w-4" />
                        </div>
                        <div className="space-y-1 flex-1 min-w-0">
                          <p className="font-medium text-sm leading-none truncate">
                            {session?.name || 'Unknown Session'}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-2">
                             {session?.startTime ? format(new Date(session.startTime), 'MMM d, h:mm a') : 'Time TBD'}
                             <span className="inline-block w-1 h-1 rounded-full bg-border" />
                             {session?.location || 'No location'}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 uppercase tracking-wide bg-background">
                          {reg.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Check-in History */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <h3>Recent Check-ins</h3>
                </div>
                {details?.checkIns && details.checkIns.length > 0 && (
                  <Badge variant="secondary" className="rounded-full px-2.5 text-xs font-normal">
                    {details.checkIns.length}
                  </Badge>
                )}
              </div>

              {isLoading ? (
                <div className="space-y-3">
                   <Skeleton className="h-12 w-full rounded-lg" />
                </div>
              ) : !details?.checkIns || details.checkIns.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 flex flex-col items-center text-center bg-muted/5">
                  <History className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-foreground">No check-ins recorded</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-[200px]">
                    History will appear here once the participant scans their QR code.
                  </p>
                </div>
              ) : (
                <div className="relative border-l-2 border-muted ml-3 pl-6 space-y-6 my-2">
                  {details.checkIns.slice(0, 5).map((checkIn) => {
                     const session = checkIn.sessionId as any;
                     return (
                      <div key={checkIn._id} className="relative">
                        <span className={cn(
                          "absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-background",
                          checkIn.isLate ? "bg-amber-400" : "bg-green-500"
                        )} />
                        <div className="flex flex-col gap-1">
                          <p className="text-sm font-medium leading-none">
                            {session?.name || 'Session Check-in'}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(checkIn.checkInTime), 'MMM d, h:mm a')}
                            </span>
                            {checkIn.isLate && (
                               <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">
                                 Late
                               </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                     );
                  })}
                </div>
              )}
            </div>

          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t bg-muted/10 p-4 flex items-center justify-between">
          <div className="flex gap-2">
             <Button variant="ghost" size="sm" className="hidden sm:flex text-muted-foreground">
               <Download className="mr-2 h-4 w-4" />
               Export
             </Button>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="mr-2 h-4 w-4" />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Edit Profile</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">Revoke Access</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
