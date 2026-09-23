import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Drawer } from './Drawer';

function Harness({ unmountOnClose }: Readonly<{ unmountOnClose: boolean }>): React.ReactElement {
  const [open, setOpen] = useState(false);
  const drawer = (
    <Drawer open={open} onClose={() => setOpen(false)} title="Details">
      <button type="button">Inside</button>
    </Drawer>
  );
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open details
      </button>
      {unmountOnClose ? (open ? drawer : null) : drawer}
    </>
  );
}

describe('Drawer focus', () => {
  it.each([true, false])(
    'returns focus to the control that opened it when closed with Escape (unmounted on close: %s)',
    async (unmountOnClose) => {
      render(<Harness unmountOnClose={unmountOnClose} />);
      const opener = screen.getByRole('button', { name: 'Open details' });
      opener.focus();
      fireEvent.click(opener);

      const dialog = await screen.findByRole('dialog', { name: 'Details' });
      await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));

      fireEvent.keyDown(dialog, { key: 'Escape' });

      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      await waitFor(() => expect(opener).toHaveFocus());
    },
  );
});
