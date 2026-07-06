import { type HTMLAttributes, type ReactNode } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/cn';

const card = cva('ohs-card bg-surface border border-border rounded shadow-sm', {
  variants: { flush: { true: 'p-0', false: 'p-6' } },
  defaultVariants: { flush: false },
});

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  flush?: boolean;
}

export function Card({ flush, className, ...rest }: Readonly<CardProps>): React.ReactElement {
  return <div className={cn(card({ flush: flush ?? false }), className)} {...rest} />;
}

export interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function CardHeader({ title, description, actions }: Readonly<CardHeaderProps>): React.ReactElement {
  return (
    <header className="mb-4">
      <div className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <div className="ohs-card-header__title">{title}</div>
          {description ? <p className="ohs-card-header__description">{description}</p> : null}
        </div>
        {actions ?? null}
      </div>
    </header>
  );
}
