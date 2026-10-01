import * as Dialog from '@radix-ui/react-dialog';
import { useRef, type ReactNode } from 'react';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  /** Accessible dialog title (visually hidden; the visible heading lives in `header`). */
  title: string;
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Right-anchored, full-height overlay drawer: fixed header, scrolling body, fixed footer. On close,
 * focus returns to the element that had it when the drawer opened (the row link or button).
 */
export function Drawer({
  open,
  onClose,
  title,
  header,
  footer,
  children,
}: Readonly<DrawerProps>): React.ReactElement {
  const opener = useRef<HTMLElement | null>(null);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="ohs-drawer-overlay" />
        <Dialog.Content
          className="ohs-drawer"
          aria-describedby={undefined}
          onOpenAutoFocus={() => {
            opener.current =
              document.activeElement instanceof HTMLElement ? document.activeElement : null;
          }}
          // Drawers open from page state, not a Dialog.Trigger, so Radix has nothing to return focus to.
          onCloseAutoFocus={(event) => {
            if (!opener.current?.isConnected) return;
            event.preventDefault();
            opener.current.focus();
          }}
        >
          <Dialog.Title className="ohs-visually-hidden">{title}</Dialog.Title>
          {header ? <div className="ohs-drawer__header">{header}</div> : null}
          <div className="ohs-drawer__body">{children}</div>
          {footer ? <div className="ohs-drawer__footer">{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
