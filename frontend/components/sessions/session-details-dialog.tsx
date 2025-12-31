'use client';

import { Clock, MapPin, Users, Pencil } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import type { Session } from '@/lib/schemas';
import { formatDateTime } from './utils';

interface SessionDetailsDialogProps {
  session: Session | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (session: Session) => void;
}

export function SessionDetailsDialog({
  session,
  open,
  onOpenChange,
  onEdit,
}: SessionDetailsDialogProps) {
  if (!session) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{session.name}</DialogTitle>
          <DialogDescription>
            Session details and information
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {session.description && (
            <div>
              <Label className="text-muted-foreground">Description</Label>
              <p className="mt-1">{session.description}</p>
            </div>
          )}
          
          <Separator />
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-4 w-4" /> Start Time
              </Label>
              <p className="mt-1 font-medium">{formatDateTime(session.startTime)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-4 w-4" /> End Time
              </Label>
              <p className="mt-1 font-medium">{formatDateTime(session.endTime)}</p>
            </div>
          </div>
          
          {session.location && (
            <div>
              <Label className="text-muted-foreground flex items-center gap-1">
                <MapPin className="h-4 w-4" /> Location
              </Label>
              <p className="mt-1 font-medium">{session.location}</p>
            </div>
          )}
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant={session.isOpen ? 'default' : 'secondary'}>
                  {session.isOpen ? 'Open for Check-in' : 'Closed'}
                </Badge>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground flex items-center gap-1">
                <Users className="h-4 w-4" /> Check-ins
              </Label>
              <p className="mt-1 font-medium">
                {session.checkInsCount || 0}
                {session.capacity && ` / ${session.capacity}`}
              </p>
            </div>
          </div>
          
          <Separator />
          
          <div className="text-xs text-muted-foreground">
            Created: {formatDateTime(session.createdAt)}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {onEdit && (
            <Button onClick={() => {
              onOpenChange(false);
              onEdit(session);
            }}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Session
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
