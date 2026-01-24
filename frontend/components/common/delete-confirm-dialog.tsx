'use client';

import React from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// =============================================================================
// Types
// =============================================================================

export interface DeleteConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Title of the dialog */
  title?: string;
  /** Description/message content */
  description?: React.ReactNode;
  /** Callback when delete is confirmed */
  onConfirm: () => void;
  /** Whether the delete operation is in progress */
  isDeleting?: boolean;
  /** Label for the delete button */
  deleteLabel?: string;
  /** Label for the cancel button */
  cancelLabel?: string;
  /** Show warning icon */
  showWarningIcon?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title = 'Delete Item',
  description = 'Are you sure you want to delete this item? This action cannot be undone.',
  onConfirm,
  isDeleting = false,
  deleteLabel = 'Delete',
  cancelLabel = 'Cancel',
  showWarningIcon = true,
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {showWarningIcon && (
              <AlertTriangle
                className="h-5 w-5 text-destructive"
                aria-hidden="true"
              />
            )}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              {typeof description === 'string' ? (
                <p>{description}</p>
              ) : (
                description
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2
                  className="mr-2 h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                {deleteLabel}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DeleteConfirmDialog;
