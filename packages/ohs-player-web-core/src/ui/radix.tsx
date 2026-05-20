import { type CSSProperties, type ReactElement, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Tabs from '@radix-ui/react-tabs';
import * as Toast from '@radix-ui/react-toast';
import * as Tooltip from '@radix-ui/react-tooltip';

// ─── Dialog ──────────────────────────────────────────────────────────────────

export interface OhsDialogProps {
  open: boolean;
  onClose?: () => void;
  headline: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  minWidth?: number | string;
  contentStyle?: CSSProperties;
}

export function OhsDialog({
  open,
  onClose,
  headline,
  children,
  actions,
  minWidth,
  contentStyle,
}: Readonly<OhsDialogProps>): ReactElement {
  let mw: string | undefined;
  if (minWidth !== undefined) {
    mw = typeof minWidth === 'number' ? `${minWidth}px` : minWidth;
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="ohs-dialog-overlay" />
        <Dialog.Content
          className="ohs-dialog-content"
          style={mw ? { minWidth: mw } : undefined}
          onEscapeKeyDown={() => onClose?.()}
          onInteractOutside={() => onClose?.()}
        >
          <Dialog.Title className="ohs-dialog-title">{headline}</Dialog.Title>
          <div className="ohs-dialog-body" style={contentStyle}>
            {children}
          </div>
          {actions ? <div className="ohs-dialog-actions">{actions}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── DropdownMenu ─────────────────────────────────────────────────────────────

export const OhsDropdownMenu = {
  Root: DropdownMenu.Root,
  Trigger: DropdownMenu.Trigger,
  Portal: DropdownMenu.Portal,
  Content: DropdownMenu.Content,
  Item: DropdownMenu.Item,
  Label: DropdownMenu.Label,
  Separator: DropdownMenu.Separator,
};

// ─── Tabs ─────────────────────────────────────────────────────────────────────

export const OhsTabs = {
  Root: Tabs.Root,
  List: Tabs.List,
  Trigger: Tabs.Trigger,
  Content: Tabs.Content,
};

// ─── Toast / Tooltip (pass-through) ──────────────────────────────────────────

export { Toast as OhsToast, Tooltip as OhsTooltip };
