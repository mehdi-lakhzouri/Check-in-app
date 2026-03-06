'use client';

import { useMemo } from 'react';
import { SearchFilterBar, type FilterDropdownConfig } from '@/components/common';

interface RegistrationsFilterBarProps {
  search: string;
  setSearch: (v: string) => void;
  sessionFilter: string;
  setSessionFilter: (v: string) => void;
  organizationFilter: string;
  setOrganizationFilter: (v: string) => void;
  dateRangePreset: string;
  setDateRangePreset: (v: string) => void;
  sessions: { _id: string; name: string }[];
  organizations: string[];
}

export function RegistrationsFilterBar({
  search,
  setSearch,
  sessionFilter,
  setSessionFilter,
  organizationFilter,
  setOrganizationFilter,
  dateRangePreset,
  setDateRangePreset,
  sessions,
  organizations,
}: RegistrationsFilterBarProps) {
  const filters: FilterDropdownConfig[] = useMemo(() => [
    {
      key: 'session',
      value: sessionFilter,
      onChange: setSessionFilter,
      placeholder: 'All sessions',
      width: 'w-[220px]',
      options: [
        { value: 'all', label: 'All sessions' },
        ...sessions.map((s) => ({ value: s._id, label: s.name })),
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
    {
      key: 'dateRange',
      value: dateRangePreset,
      onChange: setDateRangePreset,
      placeholder: 'All time',
      width: 'w-[160px]',
      options: [
        { value: 'all', label: 'All time' },
        { value: 'today', label: 'Today' },
        { value: 'week', label: 'Last 7 days' },
        { value: 'month', label: 'Last 30 days' },
      ],
    },
  ], [sessionFilter, setSessionFilter, organizationFilter, setOrganizationFilter, dateRangePreset, setDateRangePreset, sessions, organizations]);

  return (
    <SearchFilterBar
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search by name, email, session..."
      filters={filters}
    />
  );
}

export default RegistrationsFilterBar;
