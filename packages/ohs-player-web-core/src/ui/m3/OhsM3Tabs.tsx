import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

interface TabsCtx {
  value: string;
  setValue: (v: string) => void;
}

const TabsCtx = createContext<TabsCtx | null>(null);

function useTabsCtx(): TabsCtx {
  const c = useContext(TabsCtx);
  if (!c) throw new Error('OhsTabs.* must be used within OhsTabs.Root');
  return c;
}

function Root({
  value: controlledValue,
  defaultValue,
  onValueChange,
  children,
  ...rest
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  children: ReactNode;
} & React.ComponentPropsWithoutRef<'div'>): React.ReactElement {
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? '');
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? (controlledValue ?? '') : uncontrolled;
  const setValue = (v: string): void => {
    if (!isControlled) setUncontrolled(v);
    onValueChange?.(v);
  };
  const ctx = useMemo(() => ({ value, setValue }), [value, setValue]);
  return (
    <TabsCtx.Provider value={ctx}>
      <div {...rest}>{children}</div>
    </TabsCtx.Provider>
  );
}

/** Marker child for `List` — renders nothing; `List` reads props to build `md-tabs`. */
function Trigger(props: { value: string; children?: ReactNode }): null {
  void props;
  return null;
}

function List({ children, ...rest }: { children: ReactNode } & React.ComponentPropsWithoutRef<'div'>): React.ReactElement {
  const { value, setValue } = useTabsCtx();
  const hostRef = useRef<(HTMLElement & { activeTabIndex: number }) | null>(null);

  const triggers = Children.toArray(children).filter(
    (c): c is ReactElement<{ value: string; children?: ReactNode }> =>
      isValidElement(c) && c.type === Trigger,
  );

  const values = triggers.map((t) => t.props.value);
  const activeIndex = Math.max(0, values.indexOf(value));

  useEffect(() => {
    const el = hostRef.current;
    if (el) el.activeTabIndex = activeIndex;
  }, [activeIndex]);

  return (
    <div {...rest}>
      <md-tabs
        ref={(el) => {
          hostRef.current = el as HTMLElement & { activeTabIndex: number };
        }}
        auto-activate
        onChange={(e) => {
          const target = e.target as HTMLElement & { activeTabIndex?: number };
          const idx = target.activeTabIndex ?? 0;
          const v = values[idx];
          if (v !== undefined) setValue(v);
        }}
      >
        {triggers.map((t) => (
          <md-primary-tab key={t.props.value} id={`tab-${t.props.value}`}>
            {t.props.children}
          </md-primary-tab>
        ))}
      </md-tabs>
    </div>
  );
}

function Content({
  value,
  children,
  forceMount,
  ...rest
}: {
  value: string;
  children: ReactNode;
  forceMount?: true;
} & React.ComponentPropsWithoutRef<'div'>): React.ReactElement | null {
  const { value: active } = useTabsCtx();
  if (active !== value && !forceMount) return null;
  return (
    <div role="tabpanel" aria-labelledby={`tab-${value}`} hidden={active !== value} {...rest}>
      {children}
    </div>
  );
}

/** Material 3 tabs (`md-tabs`) with a Radix-tabs-shaped compound API. */
export const OhsM3Tabs = {
  Root,
  List,
  Trigger,
  Content,
};
