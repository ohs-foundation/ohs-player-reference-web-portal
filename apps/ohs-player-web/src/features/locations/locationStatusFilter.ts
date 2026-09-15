export type LocationStatusFilter = 'all' | 'active' | 'suspended' | 'inactive';

export const LOCATION_STATUS_FILTERS: readonly { value: LocationStatusFilter; labelKey: string }[] = [
  { value: 'all', labelKey: 'locationsFilterAll' },
  { value: 'active', labelKey: 'locationStatusActive' },
  { value: 'suspended', labelKey: 'locationStatusSuspended' },
  { value: 'inactive', labelKey: 'locationStatusInactive' },
];
