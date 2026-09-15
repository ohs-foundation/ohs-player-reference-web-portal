import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FhirJsonEditor } from './FhirJsonEditor';

const resource = { resourceType: 'Organization', id: 'o1', name: 'Acme' };

const labels = {
  label: 'FHIR Resource (JSON)',
  invalidJsonMessage: 'Invalid JSON',
  immutableFieldsMessage: 'resourceType and id cannot change',
};

afterEach(cleanup);

function edit(value: string) {
  fireEvent.change(screen.getByLabelText('FHIR Resource (JSON)'), { target: { value } });
}

describe('FhirJsonEditor', () => {
  it('seeds the textarea with pretty JSON of the resource', () => {
    render(<FhirJsonEditor value={resource} {...labels} />);
    const ta = screen.getByLabelText<HTMLTextAreaElement>('FHIR Resource (JSON)');
    expect(ta.value).toBe(JSON.stringify(resource, null, 2));
  });

  it('emits the parsed resource and stays valid on a benign edit', () => {
    const onChange = vi.fn();
    const onValidity = vi.fn();
    render(
      <FhirJsonEditor value={resource} {...labels} onChange={onChange} onValidityChange={onValidity} />,
    );
    edit(JSON.stringify({ ...resource, name: 'Beta' }));

    expect(onValidity).toHaveBeenLastCalledWith(true);
    const [parsed] = onChange.mock.calls.at(-1) as [unknown, string];
    expect(parsed).toMatchObject({ resourceType: 'Organization', id: 'o1', name: 'Beta' });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('marks invalid and null-parses on unparseable JSON', () => {
    const onChange = vi.fn();
    const onValidity = vi.fn();
    render(
      <FhirJsonEditor value={resource} {...labels} onChange={onChange} onValidityChange={onValidity} />,
    );
    edit('{ not json');

    expect(onValidity).toHaveBeenLastCalledWith(false);
    expect(onChange.mock.calls.at(-1)?.[0]).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid JSON');
  });

  it('rejects a changed resourceType', () => {
    const onValidity = vi.fn();
    render(<FhirJsonEditor value={resource} {...labels} onValidityChange={onValidity} />);
    edit(JSON.stringify({ ...resource, resourceType: 'Location' }));

    expect(onValidity).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole('alert')).toHaveTextContent('resourceType and id cannot change');
  });

  it('rejects a changed id', () => {
    const onValidity = vi.fn();
    render(<FhirJsonEditor value={resource} {...labels} onValidityChange={onValidity} />);
    edit(JSON.stringify({ ...resource, id: 'o2' }));

    expect(onValidity).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole('alert')).toHaveTextContent('resourceType and id cannot change');
  });
});
