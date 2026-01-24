'use client';

import React from 'react';
import {
  QrCode,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { DataTableColumn } from '@/components/ui/data-table';
import type { Participant } from '@/lib/schemas';

interface ParticipantActionsProps {
  participant: Participant;
  tableQRCodes: Record<string, string>;
  onViewQR: (participant: Participant) => void;
  onViewDetails: (participant: Participant) => void;
  onEdit: (participant: Participant) => void;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

export function createParticipantColumns(
  actions: ParticipantActionsProps & { isDeleting?: boolean }
): DataTableColumn<Participant>[] {
  const { tableQRCodes, onViewQR, onViewDetails, onEdit, onDelete, isDeleting } = actions;

  return [
    {
      id: 'qr',
      header: 'QR',
      align: 'center',
      className: 'w-[60px]',
      cell: (row) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onViewQR(row)}
                className="block rounded-md border border-transparent hover:border-primary/30 hover:shadow-sm transition-all p-0.5"
              >
                {tableQRCodes[row.qrCode] ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={tableQRCodes[row.qrCode]}
                    alt={`QR: ${row.qrCode}`}
                    className="w-10 h-10 rounded"
                  />
                ) : (
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                    <QrCode className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-mono text-xs">
              {row.qrCode}
              <br />
              <span className="text-muted-foreground">Click to enlarge</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
    {
      id: 'name',
      header: 'Name',
      cell: (row) => (
        <div className="min-w-[180px]">
          <p className="font-medium truncate">{row.name}</p>
          <p className="text-sm text-muted-foreground truncate">{row.email}</p>
        </div>
      ),
    },
    {
      id: 'organization',
      header: 'Organization',
      cell: (row) => (
        <div className="min-w-[120px]">
          {row.organization ? (
            <Badge variant="outline" className="font-normal bg-lavender-light/50 text-indigo-700 border-indigo/20">
              {row.organization}
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      align: 'center',
      cell: (row) => (
        <Badge
          variant={
            row.status === 'ambassador'
              ? 'default'
              : row.status === 'travel_grant'
              ? 'secondary'
              : 'outline'
          }
          className={cn(
            'capitalize',
            row.status === 'ambassador' && 'bg-indigo text-white',
            row.status === 'travel_grant' && 'bg-cerulean/10 text-cerulean border-cerulean/30',
            row.status === 'regular' && 'bg-muted text-muted-foreground border-border'
          )}
        >
          {row.status === 'travel_grant' ? 'Travel Grant' : row.status}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      align: 'center',
      className: 'w-[140px]',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Actions">
              <MoreVertical className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(row.status === 'ambassador' || row.status === 'travel_grant') && (
              <DropdownMenuItem onClick={() => onViewDetails(row)}>
                <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
                View Details
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onViewQR(row)}>
              <QrCode className="h-4 w-4 mr-2" aria-hidden="true" />
              View QR Code
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(row)}>
              <Pencil className="h-4 w-4 mr-2" aria-hidden="true" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(row._id)}
              disabled={isDeleting}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}
