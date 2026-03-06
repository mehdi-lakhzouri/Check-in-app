'use client';

import { useMemo } from 'react';
import { SearchFilterBar, type FilterDropdownConfig } from '@/components/common';

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
  const filters: FilterDropdownConfig[] = useMemo(() => [
    {
      key: 'session',
      value: sessionFilter,
      onChange: setSessionFilter,
      placeholder: 'All sessions',
      width: 'w-[200px]',
      options: [
        { value: 'all', label: 'All sessions' },
        ...sessions.map((s) => ({ value: s._id, label: s.name })),
      ],
    },
    {
      key: 'date',
      value: dateFilter,
      onChange: setDateFilter,
      placeholder: 'All time',
      width: 'w-[160px]',
      options: [
        { value: 'all', label: 'All time' },
        { value: 'today', label: 'Today' },
        { value: 'yesterday', label: 'Yesterday' },
        { value: 'last7days', label: 'Last 7 days' },
        { value: 'last30days', label: 'Last 30 days' },
        { value: 'thisMonth', label: 'This month' },
      ],
    },
    {
      key: 'status',
      value: statusFilter,
      onChange: setStatusFilter,
      placeholder: 'All statuses',
      width: 'w-[160px]',
      options: [
        { value: 'all', label: 'All statuses' },
        { value: 'ontime', label: 'On Time' },
        { value: 'late', label: 'Late' },
      ],
    },
    {
      key: 'method',
      value: methodFilter,
      onChange: setMethodFilter,
      placeholder: 'All methods',
      width: 'w-[140px]',
      options: [
        { value: 'all', label: 'All methods' },
        { value: 'qr', label: 'QR Code' },
        { value: 'manual', label: 'Manual' },
      ],
    },
  ], [sessionFilter, setSessionFilter, dateFilter, setDateFilter, statusFilter, setStatusFilter, methodFilter, setMethodFilter, sessions]);

  return (
    <SearchFilterBar
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search by participant name, email, or session..."
      filters={filters}
    />
  );
}

export default CheckinsFilterBar;
