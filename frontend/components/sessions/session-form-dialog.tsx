'use client';

import { useState, useEffect } from 'react';
import { Clock, MapPin, Users, UserCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ButtonLoading } from '@/components/ui/loading-state';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

import { useCreateSession, useUpdateSession } from '@/lib/hooks/use-sessions';
import type { Session, CreateSessionDto, UpdateSessionDto } from '@/lib/schemas';
import type { SessionFormData } from './types';
import { getDefaultFormData, formatDateTimeForInput } from './utils';

interface SessionFormDialogProps {
  session?: Session | null;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SessionFormDialog({
  session,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: SessionFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [formData, setFormData] = useState<SessionFormData>(getDefaultFormData());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const isEditing = !!session;

  const createMutation = useCreateSession({
    onSuccess: () => {
      setIsOpen(false);
      resetForm();
    },
  });

  const updateMutation = useUpdateSession({
    onSuccess: () => {
      setIsOpen(false);
      resetForm();
    },
  });

  const isMutating = createMutation.isPending || updateMutation.isPending;

  // Initialize form when dialog opens or session changes
  useEffect(() => {
    if (isOpen) {
      // Schedule state updates via setTimeout to avoid React Compiler cascade warning
      setTimeout(() => {
        if (session) {
          setFormData({
            name: session.name,
            description: session.description || '',
            startTime: formatDateTimeForInput(session.startTime),
            endTime: formatDateTimeForInput(session.endTime),
            location: session.location || '',
            isOpen: session.isOpen,
            capacity: session.capacity,
            requiresRegistration: session.requiresRegistration ?? false,
            // Timing settings are now managed in Settings page
            autoOpenMinutesBefore: undefined,
            autoEndGraceMinutes: undefined,
            lateThresholdMinutes: undefined,
          });
        } else {
          setFormData(getDefaultFormData());
        }
        setFormErrors({});
      }, 0);
    }
  }, [isOpen, session]);

  function resetForm() {
    setFormData(getDefaultFormData());
    setFormErrors({});
  }

  function initializeForm() {
    if (session) {
      setFormData({
        name: session.name,
        description: session.description || '',
        startTime: formatDateTimeForInput(session.startTime),
        endTime: formatDateTimeForInput(session.endTime),
        location: session.location || '',
        isOpen: session.isOpen,
        capacity: session.capacity,
        requiresRegistration: session.requiresRegistration ?? false,
        // Per-session timing (undefined/null means use system defaults)
        autoOpenMinutesBefore: session.autoOpenMinutesBefore ?? undefined,
        autoEndGraceMinutes: session.autoEndGraceMinutes ?? undefined,
        lateThresholdMinutes: session.lateThresholdMinutes ?? undefined,
      });
    } else {
      resetForm();
    }
    setFormErrors({});
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Session name is required';
    } else if (formData.name.length > 200) {
      errors.name = 'Name must be less than 200 characters';
    }
    
    if (!formData.startTime) {
      errors.startTime = 'Start time is required';
    }
    
    if (!formData.endTime) {
      errors.endTime = 'End time is required';
    }
    
    if (formData.startTime && formData.endTime) {
      const start = new Date(formData.startTime);
      const end = new Date(formData.endTime);
      if (end <= start) {
        errors.endTime = 'End time must be after start time';
      }
    }
    
    if (formData.description && formData.description.length > 1000) {
      errors.description = 'Description must be less than 1000 characters';
    }
    
    if (formData.location && formData.location.length > 200) {
      errors.location = 'Location must be less than 200 characters';
    }
    
    if (formData.capacity !== undefined && formData.capacity < 0) {
      errors.capacity = 'Capacity must be a positive number';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const submitData: CreateSessionDto = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      startTime: new Date(formData.startTime).toISOString(),
      endTime: new Date(formData.endTime).toISOString(),
      location: formData.location.trim() || undefined,
      isOpen: formData.isOpen,
      capacity: formData.capacity,
      requiresRegistration: formData.requiresRegistration,
      // Per-session timing configuration (undefined = use system defaults)
      autoOpenMinutesBefore: formData.autoOpenMinutesBefore,
      autoEndGraceMinutes: formData.autoEndGraceMinutes,
      lateThresholdMinutes: formData.lateThresholdMinutes,
    };

    if (session) {
      const updateData: UpdateSessionDto = submitData;
      updateMutation.mutate({ id: session._id, data: updateData });
    } else {
      createMutation.mutate(submitData);
    }
  }

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (open) {
      initializeForm();
    } else {
      resetForm();
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Session' : 'Create New Session'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Update the session details below.'
                : 'Add a new conference session with all required details.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-6">
            {/* Session Name */}
            <div className="grid gap-2">
              <Label htmlFor="name" className="flex items-center gap-1">
                Session Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                }}
                placeholder="e.g., Opening Ceremony, Workshop A"
                className={cn(formErrors.name && 'border-destructive')}
                disabled={isMutating}
              />
              {formErrors.name && (
                <p className="text-sm text-destructive">{formErrors.name}</p>
              )}
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                  setFormData({ ...formData, description: e.target.value });
                  if (formErrors.description) setFormErrors({ ...formErrors, description: '' });
                }}
                placeholder="Brief description of the session..."
                rows={3}
                className={cn(formErrors.description && 'border-destructive')}
                disabled={isMutating}
              />
              <p className="text-xs text-muted-foreground">
                {formData.description.length}/1000 characters
              </p>
              {formErrors.description && (
                <p className="text-sm text-destructive">{formErrors.description}</p>
              )}
            </div>

            {/* Date/Time Row */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="startTime" className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Start Time <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => {
                    setFormData({ ...formData, startTime: e.target.value });
                    if (formErrors.startTime) setFormErrors({ ...formErrors, startTime: '' });
                  }}
                  className={cn(formErrors.startTime && 'border-destructive')}
                  disabled={isMutating}
                />
                {formErrors.startTime && (
                  <p className="text-sm text-destructive">{formErrors.startTime}</p>
                )}
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="endTime" className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  End Time <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => {
                    setFormData({ ...formData, endTime: e.target.value });
                    if (formErrors.endTime) setFormErrors({ ...formErrors, endTime: '' });
                  }}
                  className={cn(formErrors.endTime && 'border-destructive')}
                  disabled={isMutating}
                />
                {formErrors.endTime && (
                  <p className="text-sm text-destructive">{formErrors.endTime}</p>
                )}
              </div>
            </div>

            {/* Location and Capacity Row */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="location" className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  Location
                </Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => {
                    setFormData({ ...formData, location: e.target.value });
                    if (formErrors.location) setFormErrors({ ...formErrors, location: '' });
                  }}
                  placeholder="e.g., Main Hall, Room 101"
                  className={cn(formErrors.location && 'border-destructive')}
                  disabled={isMutating}
                />
                {formErrors.location && (
                  <p className="text-sm text-destructive">{formErrors.location}</p>
                )}
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="capacity" className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Capacity
                </Label>
                <Input
                  id="capacity"
                  type="number"
                  min={0}
                  value={formData.capacity ?? ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : undefined;
                    setFormData({ ...formData, capacity: value });
                    if (formErrors.capacity) setFormErrors({ ...formErrors, capacity: '' });
                  }}
                  placeholder="Maximum attendees"
                  className={cn(formErrors.capacity && 'border-destructive')}
                  disabled={isMutating}
                />
                {formErrors.capacity && (
                  <p className="text-sm text-destructive">{formErrors.capacity}</p>
                )}
              </div>
            </div>

            {/* Check-in Open Switch */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="isOpen" className="text-base">Check-in Open</Label>
                <p className="text-sm text-muted-foreground">
                  Allow participants to check in to this session
                </p>
              </div>
              <Switch
                id="isOpen"
                checked={formData.isOpen}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isOpen: checked })
                }
                disabled={isMutating}
              />
            </div>

            {/* Requires Registration Switch */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="requiresRegistration" className="text-base flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Requires Registration
                </Label>
                <p className="text-sm text-muted-foreground">
                  Only registered participants can check in to this session
                </p>
              </div>
              <Switch
                id="requiresRegistration"
                checked={formData.requiresRegistration}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, requiresRegistration: checked })
                }
                disabled={isMutating}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isMutating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isMutating}>
              {isMutating && <ButtonLoading className="mr-2" />}
              {isEditing ? 'Update Session' : 'Create Session'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
