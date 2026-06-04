import * as Dialog from '@radix-ui/react-dialog';
import { type ReactNode } from 'react';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  /** Accessible dialog title (visually hidden; the visible heading lives in `header`). */
  title: string;
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

/** Right-anchored, full-height overlay drawer: fixed header, scrolling body, fixed footer. */
export function Drawer({ open, onClose, title, header, footer, children }: Readonly<DrawerProps>): React.ReactElement {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="ohs-drawer-overlay" />
        <Dialog.Content className="ohs-drawer" aria-describedby={undefined}>
          <Dialog.Title className="ohs-visually-hidden">{title}</Dialog.Title>
          {header ? <div className="ohs-drawer__header">{header}</div> : null}
          <div className="ohs-drawer__body">{children}</div>
          {footer ? <div className="ohs-drawer__footer">{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
