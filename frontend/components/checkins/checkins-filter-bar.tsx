'use client';

import { Search, X, Calendar, Users, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CheckinsFilterBarProps {
  search: string;
  setSearch: (v: string) => void;
  sessionFilter: string;
  setSessionFilter: (v: string) => void;
  dateFilter: string;
  setDateFilter: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  methodFilter: string;
  setMethodFilter: (v: string) => void;
  sessions: { _id: string; name: string }[];
}

export function CheckinsFilterBar({
  search,
  setSearch,
  sessionFilter,
  setSessionFilter,
  dateFilter,
  setDateFilter,
  statusFilter,
  setStatusFilter,
  methodFilter,
  setMethodFilter,
  sessions,
}: CheckinsFilterBarProps) {
  const hasFilters = search !== '' || sessionFilter !== 'all' || dateFilter !== 'all' || statusFilter !== 'all' || methodFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setSessionFilter('all');
    setDateFilter('all');
    setStatusFilter('all');
    setMethodFilter('all');
  };

  return (
    <Card className="border-dashed">
      <CardContent className="py-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by participant name, email, or session..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background"
              />
              {search && (
                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearch('')}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex items-center gap-2">
              <Select value={sessionFilter} onValueChange={setSessionFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All sessions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sessions</SelectItem>
                  {sessions.map((s) => (
                    <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="last7days">Last 7 days</SelectItem>
                  <SelectItem value="last30days">Last 30 days</SelectItem>
                  <SelectItem value="thisMonth">This month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="ontime">On Time</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All methods</SelectItem>
                  <SelectItem value="qr">QR Code</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground">
                <X className="mr-1 h-4 w-4" />
                Clear filters
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default CheckinsFilterBar;
