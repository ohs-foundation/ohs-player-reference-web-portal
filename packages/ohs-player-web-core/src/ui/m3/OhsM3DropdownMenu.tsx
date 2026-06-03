import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

interface DropdownCtx {
  anchorId: string;
  open: boolean;
  setOpen: (v: boolean) => void;
}

const DropdownCtx = createContext<DropdownCtx | null>(null);

function useDropdown(): DropdownCtx {
  const c = useContext(DropdownCtx);
  if (!c) throw new Error('OhsDropdownMenu.* must be used within OhsDropdownMenu.Root');
  return c;
}

function Root({ children }: { children: ReactNode }): React.ReactElement {
  const reactId = useId().replace(/:/g, '');
  const anchorId = `ohs-dd-anchor-${reactId}`;
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ anchorId, open, setOpen }), [anchorId, open]);
  return <DropdownCtx.Provider value={value}>{children}</DropdownCtx.Provider>;
}

function Trigger({
  asChild: _asChild,
  children,
}: {
  asChild?: boolean;
  children: ReactElement<ComponentProps<'button'>>;
}): React.ReactElement | null {
  const { anchorId, open, setOpen } = useDropdown();
  if (!isValidElement(children)) return null;
  return cloneElement(children, {
    id: anchorId,
    'aria-haspopup': 'menu',
    'aria-expanded': open,
    onClick: (e: React.MouseEvent) => {
      (children.props as { onClick?: (ev: React.MouseEvent) => void }).onClick?.(e);
      setOpen(!open);
    },
  } as Partial<ComponentProps<'button'>>);
}

function Portal({ children }: { children: ReactNode }): React.ReactElement {
  return <>{children}</>;
}

function Content({
  className,
  sideOffset,
  align: _align,
  children,
}: {
  className?: string;
  sideOffset?: number;
  align?: string;
  children: ReactNode;
}): React.ReactElement | null {
  const { anchorId, open, setOpen } = useDropdown();
  const menuRef = useRef<(HTMLElement & { open: boolean }) | null>(null);

  useEffect(() => {
    const el = menuRef.current;
    if (el) el.open = open;
  }, [open]);

  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const onClosed = (): void => {
      setOpen(false);
    };
    el.addEventListener('closed', onClosed);
    return (): void => {
      el.removeEventListener('closed', onClosed);
    };
  }, [setOpen]);

  const xOffset = typeof sideOffset === 'number' ? sideOffset : 0;

  const menu = (
    <md-menu
      ref={(el) => {
        menuRef.current = el as HTMLElement & { open: boolean };
      }}
      className={className}
      anchor={anchorId}
      open={open}
      positioning="popover"
      quick
      x-offset={xOffset}
    >
      {children}
    </md-menu>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(menu, document.body);
}

function Label({ className, children }: { className?: string; children: ReactNode }): React.ReactElement {
  return (
    <div className={['ohs-m3-menu-label', className].filter(Boolean).join(' ')} role="presentation">
      {children}
    </div>
  );
}

function Separator({ className }: { className?: string }): React.ReactElement {
  return <md-divider className={className} />;
}

function Item({
  className,
  onSelect,
  children,
}: {
  className?: string;
  onSelect?: (event: Event) => void;
  children: ReactNode;
}): React.ReactElement {
  const { setOpen } = useDropdown();
  return (
    <md-menu-item
      className={className}
      type="menuitem"
      onClick={() => {
        onSelect?.(new Event('select'));
        setOpen(false);
      }}
    >
      <span slot="headline">{children}</span>
    </md-menu-item>
  );
}

/**
 * Material 3 menu (`md-menu`) with a Radix-like compound API for backwards
 * compatibility with existing reference-app code.
 */
export const OhsDropdownMenu = {
  Root,
  Trigger,
  Portal,
  Content,
  Label,
  Separator,
  Item,
};
