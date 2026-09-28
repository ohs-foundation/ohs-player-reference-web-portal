import { type ImportCompletion } from './importStream';

export interface ImportColumn {
  key: string;
  required?: boolean;
}

export interface ImportTemplate {
  id: 'user' | 'organization' | 'location';
  alias: string;
  auditResourceType: 'Practitioner' | 'Organization' | 'Location';
  titleKey: string;
  warningKey?: string;
  fileName: string;
  columns: readonly ImportColumn[];
  exampleRows: readonly (readonly string[])[];
  completion: ImportCompletion;
}

export const locationTemplate: ImportTemplate = {
  id: 'location',
  alias: 'locationsBulkImport',
  auditResourceType: 'Location',
  titleKey: 'locationsImportTitle',
  fileName: 'locations-import-template.csv',
  columns: [
    { key: 'name', required: true },
    { key: 'id' },
    { key: 'physical_type' },
    { key: 'level' },
    { key: 'latitude' },
    { key: 'longitude' },
    { key: 'source_id' },
    { key: 'parent_id' },
    { key: 'source_parent_id' },
    { key: 'org_id' },
    { key: 'source_org_id' },
  ],
  exampleRows: [
    ['Kenya', '', 'jurisdiction', 'country', '', '', 'KE', '', '', '', ''],
    ['Nairobi County', '', 'area', 'county', '-1.286389', '36.817223', 'NBO', '', 'KE', '', ''],
    [
      'Kenyatta National Hospital',
      '',
      'building',
      'facility',
      '-1.301089',
      '36.807223',
      'KNH',
      '',
      'NBO',
      '',
      '',
    ],
  ],
  completion: 'done',
};

export const userTemplate: ImportTemplate = {
  id: 'user',
  alias: 'usersBulkImport',
  auditResourceType: 'Practitioner',
  titleKey: 'usersImportTitle',
  warningKey: 'usersImportWarning',
  fileName: 'users-import-template.csv',
  columns: [
    { key: 'id' },
    { key: 'username', required: true },
    { key: 'first_name' },
    { key: 'last_name' },
    { key: 'email', required: true },
    { key: 'group' },
    { key: 'password' },
    { key: 'is_password_temp' },
    { key: 'dob' },
    { key: 'gender' },
    { key: 'national_id' },
    { key: 'phone' },
    { key: 'source_id' },
  ],
  exampleRows: [
    [
      '',
      'jdoe',
      'Jane',
      'Doe',
      'jane.doe@example.org',
      '',
      '',
      'true',
      '1990-04-12',
      'female',
      '12345678',
      '+254700000001',
      'HR-001',
    ],
  ],
  completion: 'close',
};

export const organizationTemplate: ImportTemplate = {
  id: 'organization',
  alias: 'organizationsBulkImport',
  auditResourceType: 'Organization',
  titleKey: 'organizationsImportTitle',
  fileName: 'organizations-import-template.csv',
  columns: [
    { key: 'id' },
    { key: 'name', required: true },
    { key: 'source_id' },
    { key: 'is_team' },
    { key: 'parent_id' },
    { key: 'parent_name' },
    { key: 'source_parent_id' },
    { key: 'phone' },
    { key: 'email' },
    { key: 'physical_address' },
    { key: 'postal_address' },
  ],
  exampleRows: [
    [
      '',
      'Ministry of Health',
      'MOH',
      'false',
      '',
      '',
      '',
      '+254200000000',
      'info@health.example.org',
      'Afya House Nairobi',
      'PO Box 30016 Nairobi',
    ],
    ['', 'Nairobi Health Team', 'NHT', 'true', '', '', 'MOH', '', '', '', ''],
  ],
  completion: 'done',
};

export function requiredColumns(template: ImportTemplate): string[] {
  return template.columns.filter((column) => column.required).map((column) => column.key);
}

export function buildImportTemplateCsv(template: ImportTemplate): string {
  const header = template.columns.map((column) => column.key).join(',');
  const rows = template.exampleRows.map((row) => row.join(','));
  return [header, ...rows].join('\n') + '\n';
}

export function downloadImportTemplate(template: ImportTemplate): void {
  const blob = new Blob([buildImportTemplateCsv(template)], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = template.fileName;
  a.click();
  URL.revokeObjectURL(url);
}
