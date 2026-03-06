'use client';

import { useMemo } from 'react';
import { SearchFilterBar, type FilterDropdownConfig } from '@/components/common';

interface TravelGrantsFilterBarProps {
  search: string;
  setSearch: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
}

export function TravelGrantsFilterBar({
  search,
  setSearch,
  status,
  setStatus,
}: TravelGrantsFilterBarProps) {
  const filters: FilterDropdownConfig[] = useMemo(
    () => [
      {
        key: 'status',
        value: status,
        onChange: setStatus,
        placeholder: 'Status',
        width: 'w-[160px]',
        options: [
          { value: 'all', label: 'All Status' },
          { value: 'pending', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' },
        ],
      },
    ],
    [status, setStatus]
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

export default TravelGrantsFilterBar;
