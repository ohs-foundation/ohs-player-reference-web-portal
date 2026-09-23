import * as RadixPopover from '@radix-ui/react-popover';
import type { ReactElement, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface PopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The control that toggles the panel. Rendered with `asChild`, so it must forward its ref and props. */
  trigger: ReactElement;
  /** Id of the element inside the panel that names it. */
  labelledBy?: string;
  align?: 'start' | 'center' | 'end';
  className?: string;
  children: ReactNode;
}

/** A non-modal panel anchored below its trigger. Escape and an outside click request `onOpenChange(false)`. */
export function Popover({
  open,
  onOpenChange,
  trigger,
  labelledBy,
  align = 'end',
  className,
  children,
}: Readonly<PopoverProps>): React.ReactElement {
  return (
    <RadixPopover.Root open={open} onOpenChange={onOpenChange}>
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          align={align}
          sideOffset={8}
          aria-labelledby={labelledBy}
          className={cn('ohs-popover', className)}
        >
          {children}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
