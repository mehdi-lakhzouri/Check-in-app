'use client';

import React, { useState } from 'react';
import { Search, Loader2, UserPlus, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Participant } from '@/lib/schemas';

// =============================================================================
// Types
// =============================================================================

export interface AddReferralDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Ambassador name (for display) */
  ambassadorName: string;
  /** Search callback */
  onSearch: (query: string) => void;
  /** Search results */
  searchResults: Participant[];
  /** Is searching */
  isSearching?: boolean;
  /** Add referral callback */
  onAddReferral: (participantId: string) => void;
  /** Is adding */
  isAdding?: boolean;
  /** Already referred participant IDs */
  existingReferralIds?: string[];
}

// =============================================================================
// Component
// =============================================================================

export function AddReferralDialog({
  open,
  onOpenChange,
  ambassadorName,
  onSearch,
  searchResults,
  isSearching = false,
  onAddReferral,
  isAdding = false,
  existingReferralIds = [],
}: AddReferralDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);

  // Handle search
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (value.length >= 2) {
      onSearch(value);
    }
  };

  // Handle add
  const handleAdd = () => {
    if (selectedParticipant) {
      onAddReferral(selectedParticipant._id);
    }
  };

  // Reset on close
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSearchQuery('');
      setSelectedParticipant(null);
    }
    onOpenChange(newOpen);
  };

  // Filter out already referred participants
  const availableParticipants = searchResults.filter(
    (p) => !existingReferralIds.includes(p._id)
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Referral</DialogTitle>
          <DialogDescription>
            Search for a participant to add as a referral for {ambassadorName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="pl-9"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Selected Participant */}
          {selectedParticipant && (
            <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarFallback>
                  {selectedParticipant.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedParticipant.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {selectedParticipant.email}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSelectedParticipant(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Search Results */}
          {searchQuery.length >= 2 && !selectedParticipant && (
            <ScrollArea className="h-[200px] border rounded-lg">
              {availableParticipants.length === 0 ? (
                <div className="flex items-center justify-center h-full p-4 text-muted-foreground">
                  <p className="text-sm">
                    {isSearching ? 'Searching...' : 'No participants found'}
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {availableParticipants.map((participant) => (
                    <button
                      key={participant._id}
                      onClick={() => setSelectedParticipant(participant)}
                      className={cn(
                        'w-full flex items-center gap-3 p-2 rounded-md text-left',
                        'hover:bg-muted transition-colors'
                      )}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {participant.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {participant.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {participant.email}
                        </p>
                      </div>
                      {participant.organization && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          {participant.organization}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!selectedParticipant || isAdding}
          >
            {isAdding ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4 mr-2" />
            )}
            Add Referral
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddReferralDialog;
