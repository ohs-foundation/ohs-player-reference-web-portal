import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigErrorNotice } from './ConfigErrorNotice';

interface StatusEvent {
  tone: string;
  title: string;
  description?: string;
}

const mockNotify = vi.fn<(event: StatusEvent) => void>();

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useStatusBar: () => ({ notify: mockNotify }),
    useTranslation: () => ({ t: (key: string) => key }),
  };
});

describe('ConfigErrorNotice', () => {
  beforeEach(() => {
    mockNotify.mockClear();
  });

  it('shows the invalid-document error once, naming the failing field', () => {
    const error = '✖ Invalid input: expected boolean, received string\n  → at flags.userMgmt';
    const { rerender } = render(<ConfigErrorNotice error={error} />);
    rerender(<ConfigErrorNotice error={error} />);

    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockNotify.mock.calls[0][0]).toEqual({
      tone: 'error',
      title: 'configDocumentInvalid',
      description: error,
    });
  });

  it('shows nothing when the document was valid', () => {
    render(<ConfigErrorNotice />);

    expect(mockNotify).not.toHaveBeenCalled();
  });
});
