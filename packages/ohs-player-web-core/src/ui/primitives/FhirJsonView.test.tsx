import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FhirJsonView } from './FhirJsonView';

const resource = { resourceType: 'Patient', id: 'p1', active: true };

afterEach(cleanup);

describe('FhirJsonView', () => {
  it('pretty-prints the resource as stable, indented JSON', () => {
    render(<FhirJsonView resource={resource} copyLabel="Copy Code" copiedLabel="Copied" />);
    const pre = screen.getByText(/"resourceType": "Patient"/);
    expect(pre.textContent).toBe(JSON.stringify(resource, null, 2));
  });

  it('copies JSON to the clipboard and fires onCopy, swapping the label', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const onCopy = vi.fn();

    render(
      <FhirJsonView resource={resource} copyLabel="Copy Code" copiedLabel="Copied" onCopy={onCopy} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Copy Code' }));

    expect(writeText).toHaveBeenCalledWith(JSON.stringify(resource, null, 2));
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
    expect(onCopy).toHaveBeenCalledOnce();
  });

  it('reports clipboard failure through onCopyError', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.assign(navigator, { clipboard: { writeText } });
    const onCopyError = vi.fn();

    render(
      <FhirJsonView
        resource={resource}
        copyLabel="Copy Code"
        copiedLabel="Copied"
        onCopyError={onCopyError}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Copy Code' }));

    await waitFor(() => expect(onCopyError).toHaveBeenCalledOnce());
  });
});
