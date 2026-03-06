'use client';

import { useState } from 'react';
import { format, subDays, subMonths } from 'date-fns';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Session } from '@/lib/schemas';
import type { ReportFilters } from './types';

interface ReportFilterBarProps {
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  sessions?: Session[];
  showSessionFilter?: boolean;
  showOrganizationFilter?: boolean;
  showDateFilter?: boolean;
  className?: string;
}

type DatePreset = 'today' | 'week' | 'month' | '3months' | 'all';

const datePresets: { label: string; value: DatePreset }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 days', value: 'week' },
  { label: 'Last 30 days', value: 'month' },
  { label: 'Last 3 months', value: '3months' },
  { label: 'All time', value: 'all' },
];

export function ReportFilterBar({
  filters,
  onFiltersChange,
  sessions = [],
  showSessionFilter = true,
  showOrganizationFilter = true,
  showDateFilter = true,
  className,
}: ReportFilterBarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleDatePreset = (preset: DatePreset) => {
    const now = new Date();
    let startDate: string | undefined;
    let endDate: string | undefined = format(now, 'yyyy-MM-dd');

    switch (preset) {
      case 'today':
        startDate = format(now, 'yyyy-MM-dd');
        break;
      case 'week':
        startDate = format(subDays(now, 7), 'yyyy-MM-dd');
        break;
      case 'month':
        startDate = format(subMonths(now, 1), 'yyyy-MM-dd');
        break;
      case '3months':
        startDate = format(subMonths(now, 3), 'yyyy-MM-dd');
        break;
      case 'all':
        startDate = undefined;
        endDate = undefined;
        break;
    }

    onFiltersChange({ ...filters, startDate, endDate });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      sessionId: undefined,
      organization: undefined,
      startDate: undefined,
      endDate: undefined,
    });
  };

  const activeFilterCount = [
    filters.sessionId,
    filters.organization,
    filters.startDate || filters.endDate,
  ].filter(Boolean).length;

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      {/* Quick Date Presets */}
      {showDateFilter && (
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          {datePresets.map((preset) => (
            <Button
              key={preset.value}
              size="sm"
              variant={
                (preset.value === 'all' && !filters.startDate && !filters.endDate) ||
                (preset.value === 'today' && filters.startDate === format(new Date(), 'yyyy-MM-dd'))
                  ? 'default'
                  : 'ghost'
              }
              className="h-7 text-xs"
              onClick={() => handleDatePreset(preset.value)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      )}

      {/* Advanced Filters Popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Report Filters</h4>
              <p className="text-sm text-muted-foreground">
                Customize the report data range
              </p>
            </div>

            <div className="grid gap-3">
              {/* Session Filter */}
              {showSessionFilter && sessions.length > 0 && (
                <div className="grid gap-2">
                  <Label htmlFor="session">Session</Label>
                  <Select
                    value={filters.sessionId || 'all'}
                    onValueChange={(value) =>
                      onFiltersChange({
                        ...filters,
                        sessionId: value === 'all' ? undefined : value,
                      })
                    }
                  >
                    <SelectTrigger id="session">
                      <SelectValue placeholder="All sessions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All sessions</SelectItem>
                      {sessions.map((session) => (
                        <SelectItem key={session._id} value={session._id}>
                          {session.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Date Range */}
              {showDateFilter && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={filters.startDate || ''}
                      onChange={(e) =>
                        onFiltersChange({
                          ...filters,
                          startDate: e.target.value || undefined,
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={filters.endDate || ''}
                      onChange={(e) =>
                        onFiltersChange({
                          ...filters,
                          endDate: e.target.value || undefined,
                        })
                      }
                    />
                  </div>
                </>
              )}

              {/* Organization Filter */}
              {showOrganizationFilter && (
                <div className="grid gap-2">
                  <Label htmlFor="organization">Organization</Label>
                  <Input
                    id="organization"
                    placeholder="Filter by organization..."
                    value={filters.organization || ''}
                    onChange={(e) =>
                      onFiltersChange({
                        ...filters,
                        organization: e.target.value || undefined,
                      })
                    }
                  />
                </div>
              )}
            </div>

            {/* Clear Button */}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="w-full gap-2"
              >
                <X className="h-4 w-4" />
                Clear all filters
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filter Tags */}
      {filters.sessionId && (
        <Badge variant="secondary" className="gap-1">
          Session: {sessions.find((s) => s._id === filters.sessionId)?.name || filters.sessionId}
          <button
            onClick={() => onFiltersChange({ ...filters, sessionId: undefined })}
            className="ml-1 hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
      {filters.organization && (
        <Badge variant="secondary" className="gap-1">
          Org: {filters.organization}
          <button
            onClick={() => onFiltersChange({ ...filters, organization: undefined })}
            className="ml-1 hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
    </div>
  );
}
