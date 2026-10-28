import { useId, type ReactNode } from 'react';
import { Card } from 'ohs-player-web-shell';

interface ConfigSectionProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function ConfigSection({
  title,
  description,
  actions,
  children,
}: Readonly<ConfigSectionProps>) {
  const headingId = useId();
  return (
    <Card>
      <section aria-labelledby={headingId} className="flex flex-col gap-4">
        <header className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id={headingId} className="ohs-card-header__title m-0 text-text">
              {title}
            </h2>
            {description ? <p className="ohs-card-header__description">{description}</p> : null}
          </div>
          {actions}
        </header>
        {children}
      </section>
    </Card>
  );
}
