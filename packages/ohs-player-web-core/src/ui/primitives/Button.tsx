import {
  forwardRef,
  useCallback,
  type ButtonHTMLAttributes,
  type MutableRefObject,
  type ReactNode,
  type Ref,
} from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outlined' | 'elevated' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLElement>, 'type'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
}

type MdButtonHost = HTMLElement & { disabled: boolean };

function assignRef<T>(r: Ref<T | null> | undefined, value: T | null): void {
  if (r == null) return;
  if (typeof r === 'function') r(value);
  else (r as MutableRefObject<T | null>).current = value;
}

/**
 * Material 3 button (`md-*-button`). Public API matches the previous primitive;
 * `ref` attaches to the underlying Material Web host element.
 */
export const Button = forwardRef<MdButtonHost, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading,
    iconLeft,
    iconRight,
    children,
    type = 'button',
    className,
    style,
    disabled,
    ...rest
  },
  ref,
) {
  const mergedRef = useCallback(
    (node: MdButtonHost | null) => {
      assignRef(ref, node);
    },
    [ref],
  );

  const cls = [
    'ohs-m3-button',
    size === 'sm' ? 'ohs-m3-button--sm' : '',
    variant === 'danger' ? 'ohs-m3-button--danger' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const common = {
    ref: mergedRef,
    className: cls,
    style,
    ...rest,
  } as const;
  const disabledProp = disabled ? { disabled: true } : {};

  const inner = (
    <>
      {loading ? (
        <md-circular-progress
          slot="icon"
          indeterminate
          style={{ width: '18px', height: '18px', display: 'inline-block' }}
          aria-hidden="true"
        />
      ) : (
        iconLeft
      )}
      {children}
      {iconRight}
    </>
  );

  if (variant === 'ghost') {
    return (
      <md-text-button {...common} {...disabledProp} type={type}>
        {inner}
      </md-text-button>
    );
  }
  if (variant === 'secondary') {
    return (
      <md-filled-tonal-button {...common} {...disabledProp} type={type}>
        {inner}
      </md-filled-tonal-button>
    );
  }
  if (variant === 'outlined') {
    return (
      <md-outlined-button {...common} {...disabledProp} type={type}>
        {inner}
      </md-outlined-button>
    );
  }
  if (variant === 'elevated') {
    return (
      <md-elevated-button {...common} {...disabledProp} type={type}>
        {inner}
      </md-elevated-button>
    );
  }
  return (
    <md-filled-button {...common} {...disabledProp} type={type}>
      {inner}
    </md-filled-button>
  );
});

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLElement>, 'type'> {
  label: string;
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
  toggle?: boolean;
  selected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
}

export const IconButton = forwardRef<MdButtonHost, IconButtonProps>(function IconButton(
  { label, children, className, style, disabled, type = 'button', toggle, selected, onSelectedChange, ...rest },
  ref,
) {
  const mergedRef = useCallback(
    (node: MdButtonHost | null) => {
      assignRef(ref, node);
    },
    [ref],
  );

  const handleChange = onSelectedChange
    ? (e: React.ChangeEvent<HTMLElement>): void => {
        const el = e.target as HTMLElement & { selected: boolean };
        onSelectedChange(el.selected);
      }
    : undefined;

  return (
    <md-icon-button
      ref={mergedRef}
      className={className}
      style={style}
      aria-label={label}
      {...(disabled ? { disabled: true } : {})}
      {...(toggle ? { toggle: true } : {})}
      {...(selected !== undefined ? { selected } : {})}
      type={type}
      onChange={handleChange}
      {...rest}
    >
      {children}
    </md-icon-button>
  );
});
