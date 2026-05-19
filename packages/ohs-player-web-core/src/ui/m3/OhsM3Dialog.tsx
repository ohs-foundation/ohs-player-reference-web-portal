import {
  useCallback,
  useLayoutEffect,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';

/** Host element for `@material/web` `md-dialog` (Lit; not a native `HTMLDialogElement`). */
export interface MdDialogHost extends HTMLElement {
  open: boolean;
  show: () => Promise<void>;
  close: (returnValue?: string) => Promise<void>;
}

export interface OhsM3DialogProps {
  /** When true, opens the Material Web dialog (`md-dialog.open`, which drives the inner native `<dialog>`). */
  open: boolean;
  /** Called when the user dismisses via Escape, scrim, or native cancel. */
  onClose?: () => void;
  headline: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  /** Applied as `minWidth` on the dialog surface (e.g. `480` or `'min(96vw, 520px)'`). */
  minWidth?: number | string;
  contentStyle?: CSSProperties;
}

function whenMdDialogReady(run: () => void): () => void {
  if (typeof customElements === 'undefined') {
    return () => {};
  }
  if (customElements.get('md-dialog') !== undefined) {
    run();
    return () => {};
  }
  let cancelled = false;
  void customElements.whenDefined('md-dialog').then(() => {
    if (!cancelled) run();
  });
  return () => {
    cancelled = true;
  };
}

/**
 * Wrapper around Material Web `md-dialog` with slots for headline, content, and actions.
 * Waits for `md-dialog` to be defined before setting `open`, so Lit's property setter runs.
 * @public
 */
export function OhsM3Dialog({
  open,
  onClose,
  headline,
  children,
  actions,
  minWidth,
  contentStyle,
}: OhsM3DialogProps): ReactElement {
  const [host, setHost] = useState<MdDialogHost | null>(null);

  const setHostRef = useCallback((node: HTMLElement | null) => {
    setHost(node as MdDialogHost | null);
  }, []);

  useLayoutEffect(() => {
    if (!host) return;
    const el = host;
    const apply = (): void => {
      el.open = open;
    };
    return whenMdDialogReady(apply);
  }, [host, open]);

  useLayoutEffect(() => {
    if (!host || !onClose) return;

    const handler = (): void => {
      onClose();
    };

    const attach = (): void => {
      host.addEventListener('cancel', handler);
    };

    if (typeof customElements !== 'undefined' && customElements.get('md-dialog') !== undefined) {
      attach();
      return () => host.removeEventListener('cancel', handler);
    }

    let cancelled = false;
    void customElements.whenDefined('md-dialog').then(() => {
      if (!cancelled) attach();
    });

    return () => {
      cancelled = true;
      host.removeEventListener('cancel', handler);
    };
  }, [host, onClose]);

  const mw =
    minWidth === undefined
      ? undefined
      : typeof minWidth === 'number'
        ? `${minWidth}px`
        : minWidth;

  return (
    <md-dialog ref={setHostRef} style={mw ? { minWidth: mw } : undefined}>
      <div slot="headline">{headline}</div>
      <div slot="content" style={{ ...contentStyle }}>
        {children}
      </div>
      {actions ? <div slot="actions">{actions}</div> : null}
    </md-dialog>
  );
}
