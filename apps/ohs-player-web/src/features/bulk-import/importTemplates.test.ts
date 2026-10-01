import { describe, expect, it } from 'vitest';
import {
  buildImportTemplateCsv,
  locationTemplate,
  organizationTemplate,
  requiredColumns,
  userTemplate,
} from './importTemplates';

function headerOf(csv: string): string {
  return csv.split('\n')[0];
}

describe('import templates', () => {
  it('matches the columns BulkUserImportServlet reads', () => {
    expect(headerOf(buildImportTemplateCsv(userTemplate))).toBe(
      'id,username,first_name,last_name,email,group,password,is_password_temp,dob,gender,national_id,phone,source_id',
    );
    expect(requiredColumns(userTemplate)).toEqual(['username', 'email']);
  });

  it('matches the columns BulkOrgImportServlet reads', () => {
    expect(headerOf(buildImportTemplateCsv(organizationTemplate))).toBe(
      'id,name,source_id,is_team,parent_id,parent_name,source_parent_id,phone,email,physical_address,postal_address',
    );
    expect(requiredColumns(organizationTemplate)).toEqual(['name']);
  });

  it('keeps every example row the width of its header and free of commas', () => {
    for (const template of [userTemplate, organizationTemplate, locationTemplate]) {
      for (const row of template.exampleRows) {
        expect(row).toHaveLength(template.columns.length);
        expect(row.some((cell) => cell.includes(','))).toBe(false);
      }
    }
  });

  it('declares how each backend stream ends', () => {
    expect(userTemplate.completion).toBe('close');
    expect(organizationTemplate.completion).toBe('done');
    expect(locationTemplate.completion).toBe('done');
  });
});
