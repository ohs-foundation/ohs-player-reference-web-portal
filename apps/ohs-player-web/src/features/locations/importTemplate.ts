/** Column contract of POST /api/bulk-import/locations — mirrors BulkLocationImportServlet (name is the
 *  only required column; parents link via parent_id (FHIR id) or source_parent_id (source id in-batch). */
export const EXPECTED_COLUMNS: { key: string; required?: boolean }[] = [
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
];

/** Example rows use backend-accepted values (level codes, physical-type words) and demonstrate
 *  in-batch parent chaining via source_parent_id. */
const TEMPLATE_EXAMPLE_ROWS = [
  ['Kenya', '', 'jurisdiction', 'country', '', '', 'KE', '', '', '', ''],
  ['Nairobi County', '', 'area', 'county', '-1.286389', '36.817223', 'NBO', '', 'KE', '', ''],
  ['Kenyatta National Hospital', '', 'building', 'facility', '-1.301089', '36.807223', 'KNH', '', 'NBO', '', ''],
];

export function buildImportTemplateCsv(): string {
  const header = EXPECTED_COLUMNS.map((c) => c.key).join(',');
  const rows = TEMPLATE_EXAMPLE_ROWS.map((r) => r.join(','));
  return [header, ...rows].join('\n') + '\n';
}

export function downloadImportTemplate(): void {
  const blob = new Blob([buildImportTemplateCsv()], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'locations-import-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}
