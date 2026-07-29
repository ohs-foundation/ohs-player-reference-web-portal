import { type HTMLAttributes, type ReactNode } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/cn';

type StackGap = 1 | 2 | 3 | 4 | 5 | 6;

const GAP_CLASS: Record<StackGap, string> = {
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  5: 'gap-6',
  6: 'gap-8',
};

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  gap?: StackGap;
}

export function Stack({ gap = 3, className, ...rest }: Readonly<StackProps>): React.ReactElement {
  return <div className={cn('flex flex-col', GAP_CLASS[gap], className)} {...rest} />;
}

const inline = cva('flex flex-row flex-wrap items-center gap-3', {
  variants: { justify: { start: '', between: 'justify-between', end: 'justify-end' } },
  defaultVariants: { justify: 'start' },
});

export interface InlineProps extends HTMLAttributes<HTMLDivElement> {
  justify?: 'start' | 'between' | 'end';
}

export function Inline({ justify = 'start', className, ...rest }: Readonly<InlineProps>): React.ReactElement {
  return <div className={cn(inline({ justify }), className)} {...rest} />;
}

export interface PageProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Page({ children, className, ...rest }: Readonly<PageProps>): React.ReactElement {
  return (
    <div
      className={cn(
        'flex w-full flex-col box-border bg-transparent gap-12 p-10',
        'max-[900px]:gap-6 max-[900px]:p-6',
        className,
      )}
      {...rest}
    >
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

export function PageHeader({ title, description, actions, lastUpdated }: Readonly<PageHeaderProps>): React.ReactElement {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="ohs-page-header__title m-0 text-text">{title}</h2>
        {description ? (
          <p className="ohs-page-header__description mt-2 text-text-quaternary">{description}</p>
        ) : null}
        {lastUpdated ? <p className="mt-1 text-sm text-text-muted">{lastUpdated}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </header>
  );
}
