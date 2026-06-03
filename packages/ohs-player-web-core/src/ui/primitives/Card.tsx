import { type HTMLAttributes, type ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  flush?: boolean;
}

export function Card({ flush, className, ...rest }: CardProps): React.ReactElement {
  return (
    <div
      className={['ohs-card', className].filter(Boolean).join(' ')}
      data-flush={flush ? 'true' : undefined}
      {...rest}
    />
  );
}

export interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function CardHeader({
  title,
  description,
  actions,
}: CardHeaderProps): React.ReactElement {
  return (
    <header className="ohs-card-header">
      <div className="ohs-inline" data-justify="between">
        <div>
          <div className="ohs-card-header__title">{title}</div>
          {description ? (
            <p className="ohs-card-header__description">{description}</p>
          ) : null}
        </div>
        {actions ?? null}
      </div>
    </header>
  );
}
