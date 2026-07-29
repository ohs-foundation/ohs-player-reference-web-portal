import { type IconComponent } from './icons';

/**
 * M3 12-sided "cookie": the polar curve r(t) = 18.8 + 1.2·cos(12t) over a 40×40 box, sampled on its
 * peaks and valleys so every segment is one cubic with analytic tangents — smooth, never pointed.
 */
const COOKIE_PATH =
  'M40 20C40 21.745 37.398 23.072 37 24.555C36.603 26.039 38.193 28.489 37.321 30C36.448 31.511 33.531 31.359 32.445 32.445C31.359 33.531 31.511 36.448 30 37.321C28.489 38.193 26.039 36.603 24.555 37C23.072 37.398 21.745 40 20 40C18.255 40 16.928 37.398 15.445 37C13.961 36.603 11.511 38.193 10 37.321C8.489 36.448 8.641 33.531 7.555 32.445C6.469 31.359 3.552 31.511 2.679 30C1.807 28.489 3.397 26.039 3 24.555C2.602 23.072 0 21.745 0 20C0 18.255 2.602 16.928 3 15.445C3.397 13.961 1.807 11.511 2.679 10C3.552 8.489 6.469 8.641 7.555 7.555C8.641 6.469 8.489 3.552 10 2.679C11.511 1.807 13.961 3.397 15.445 3C16.928 2.602 18.255 0 20 0C21.745 0 23.072 2.602 24.555 3C26.039 3.397 28.489 1.807 30 2.679C31.511 3.552 31.359 6.469 32.445 7.555C33.531 8.641 36.448 8.489 37.321 10C38.193 11.511 36.603 13.961 37 15.445C37.398 16.928 40 18.255 40 20Z';

export interface KpiBadgeProps {
  /** Badge fill. The glyph is always painted in the surface tone on top. */
  color: string;
  glyph: IconComponent;
}

/** A 40×40 scalloped tile carrying a centred 20×20 glyph — the KPI card's leading mark. */
export function KpiBadge({ color, glyph: Glyph }: Readonly<KpiBadgeProps>): React.ReactElement {
  return (
    <span className="ohs-kpi-badge" aria-hidden="true">
      <svg className="ohs-kpi-badge__shape" width={40} height={40} viewBox="0 0 40 40" focusable="false">
        <path d={COOKIE_PATH} fill={color} />
      </svg>
      <Glyph size={20} className="ohs-kpi-badge__glyph" />
    </span>
  );
}
