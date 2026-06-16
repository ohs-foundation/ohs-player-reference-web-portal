export interface OrgTypeOption {
  value: string;
  label: string;
}

export const ORGANIZATION_TYPE_OPTIONS: readonly OrgTypeOption[] = [
  { value: 'prov', label: 'Healthcare provider' },
  { value: 'dept', label: 'Hospital department' },
  { value: 'team', label: 'Organizational team' },
  { value: 'govt', label: 'Government' },
  { value: 'ins', label: 'Insurance company' },
  { value: 'pay', label: 'Payer' },
  { value: 'edu', label: 'Educational institute' },
  { value: 'reli', label: 'Religious institution' },
  { value: 'crs', label: 'Clinical research sponsor' },
  { value: 'cg', label: 'Community group' },
  { value: 'bus', label: 'Non-healthcare business' },
  { value: 'other', label: 'Other' },
];
