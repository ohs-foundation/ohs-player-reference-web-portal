import { type HTMLAttributes, type ReactNode } from 'react';

type StackGap = 1 | 2 | 3 | 4 | 5 | 6;

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  gap?: StackGap;
}

/** Vertical flex container. `gap` maps to spacing tokens 1..6. */
export function Stack({ gap = 3, className, ...rest }: StackProps): React.ReactElement {
  return (
    <div
      className={['ohs-stack', className].filter(Boolean).join(' ')}
      data-gap={String(gap)}
      {...rest}
    />
  );
}

export interface InlineProps extends HTMLAttributes<HTMLDivElement> {
  justify?: 'start' | 'between' | 'end';
}

/** Horizontal flex container with sensible defaults. */
export function Inline({ justify = 'start', className, ...rest }: InlineProps): React.ReactElement {
  return (
    <div
      className={['ohs-inline', className].filter(Boolean).join(' ')}
      data-justify={justify === 'start' ? undefined : justify}
      {...rest}
    />
  );
}

export interface PageProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Page({ children, className, ...rest }: PageProps): React.ReactElement {
  return (
    <div className={['ohs-page', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </div>
  );
}

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  lastUpdated?: ReactNode;
}

export function PageHeader({
  title,
  description,
  actions,
  lastUpdated,
}: PageHeaderProps): React.ReactElement {
  return (
    <header className="ohs-page-header">
      <div>
        <h2 className="ohs-page-header__title">{title}</h2>
        {description ? <p className="ohs-page-header__description">{description}</p> : null}
        {lastUpdated ? <p className="ohs-page-header__last-updated">{lastUpdated}</p> : null}
      </div>
      {actions ? <div className="ohs-page-header__actions">{actions}</div> : null}
    </header>
  );
}
