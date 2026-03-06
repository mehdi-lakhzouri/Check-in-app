'use client';

import { useMemo } from 'react';
import { SearchFilterBar, type FilterDropdownConfig } from '@/components/common';

interface ParticipantsFilterBarProps {
  search: string;
  setSearch: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  organizationFilter: string;
  setOrganizationFilter: (v: string) => void;
  organizations: string[];
}

export function ParticipantsFilterBar({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  organizationFilter,
  setOrganizationFilter,
  organizations,
}: ParticipantsFilterBarProps) {
  const filters: FilterDropdownConfig[] = useMemo(
    () => [
      {
        key: 'status',
        value: statusFilter,
        onChange: setStatusFilter,
        placeholder: 'All statuses',
        width: 'w-[160px]',
        options: [
          { value: 'all', label: 'All statuses' },
          { value: 'regular', label: 'Regular' },
          { value: 'ambassador', label: 'Ambassador' },
          { value: 'travel_grant', label: 'Travel Grant' },
        ],
      },
      {
        key: 'organization',
        value: organizationFilter,
        onChange: setOrganizationFilter,
        placeholder: 'All organizations',
        width: 'w-[200px]',
        options: [
          { value: 'all', label: 'All organizations' },
          ...organizations.map((org) => ({ value: org, label: org })),
        ],
      },
    ],
    [statusFilter, setStatusFilter, organizationFilter, setOrganizationFilter, organizations]
  );

  return (
    <SearchFilterBar
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search by name, email, organization, or QR code..."
      filters={filters}
    />
  );
}

export default ParticipantsFilterBar;
