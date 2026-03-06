'use client';

import { useMemo } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchFilterBar, type FilterDropdownConfig } from '@/components/common';

interface AmbassadorsFilterBarProps {
  search: string;
  setSearch: (v: string) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (v: 'asc' | 'desc') => void;
}

export function AmbassadorsFilterBar({
  search,
  setSearch,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
}: AmbassadorsFilterBarProps) {
  const filters: FilterDropdownConfig[] = useMemo(
    () => [
      {
        key: 'sortBy',
        value: sortBy,
        onChange: setSortBy,
        placeholder: 'Sort by',
        width: 'w-[200px]',
        options: [
          { value: 'ambassadorPoints', label: 'Points' },
          { value: 'name', label: 'Name' },
        ],
      },
      {
        key: 'sortOrder',
        value: sortOrder,
        onChange: (v) => setSortOrder(v as 'asc' | 'desc'),
        placeholder: 'Order',
        width: 'w-[120px]',
        options: [
          { value: 'desc', label: 'Desc' },
          { value: 'asc', label: 'Asc' },
        ],
      },
    ],
    [sortBy, setSortBy, sortOrder, setSortOrder]
  );

  return (
    <SearchFilterBar
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search by name, email..."
      filters={filters}
    />
  );
}

export default AmbassadorsFilterBar;
