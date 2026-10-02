import { useTranslation } from 'ohs-player-web-core';
import type { ReactNode } from 'react';

export interface BarPoint {
  /** Axis label and table row header, such as a month. */
  label: string;
  value: number;
}

export interface BarChartProps {
  points: readonly BarPoint[];
  /** Names the chart; also the caption of the table that carries the values for assistive tech. */
  ariaLabel: string;
  /** Header of the table's label column. */
  labelHeader: string;
  /** Header of the table's value column. */
  valueHeader: string;
  /** CSS colour (a token var) for the columns. Defaults to the primary role. */
  color?: string;
}

const WIDTH = 320;
const HEIGHT = 168;
const TOP = 20;
const BOTTOM = 24;
const MAX_BAR = 24;
const CORNER = 4;

function columnPath(x: number, y: number, width: number, base: number): string {
  const r = Math.min(CORNER, width / 2, base - y);
  return [
    `M${x},${base}`,
    `V${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `H${x + width - r}`,
    `Q${x + width},${y} ${x + width},${y + r}`,
    `V${base}`,
    'Z',
  ].join(' ');
}

/**
 * A dependency-free SVG column chart, one column per point from a shared baseline, with each value
 * on its cap. The drawing is hidden from assistive tech, which reads a visually hidden table instead.
 */
export function BarChart({
  points,
  ariaLabel,
  labelHeader,
  valueHeader,
  color = 'var(--ohs-sys-color-primary)',
}: Readonly<BarChartProps>): ReactNode {
  const { formatNumber } = useTranslation();
  const base = HEIGHT - BOTTOM;
  const plot = base - TOP;
  const band = WIDTH / Math.max(points.length, 1);
  const barWidth = Math.min(MAX_BAR, band * 0.6);
  const max = Math.max(1, ...points.map((point) => point.value));

  return (
    <figure className="ohs-bar-chart">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" aria-hidden="true" focusable="false">
        <line className="ohs-bar-chart__baseline" x1={0} x2={WIDTH} y1={base} y2={base} />
        {points.map((point, index) => {
          const center = band * index + band / 2;
          const x = center - barWidth / 2;
          const y = base - (Math.max(0, point.value) / max) * plot;
          return (
            <g key={point.label} className="ohs-bar-chart__point">
              <title>{`${point.label}: ${formatNumber(point.value)}`}</title>
              <rect
                className="ohs-bar-chart__hit"
                x={band * index}
                y={0}
                width={band}
                height={base}
              />
              <rect
                className="ohs-bar-chart__track"
                x={x}
                y={TOP}
                width={barWidth}
                height={plot}
                rx={CORNER}
              />
              {point.value > 0 ? (
                <path
                  className="ohs-bar-chart__bar"
                  d={columnPath(x, y, barWidth, base)}
                  style={{ fill: color }}
                />
              ) : null}
              <text className="ohs-bar-chart__value" x={center} y={y - 6} textAnchor="middle">
                {formatNumber(point.value)}
              </text>
              <text className="ohs-bar-chart__label" x={center} y={HEIGHT - 6} textAnchor="middle">
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
      <table className="ohs-visually-hidden">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">{labelHeader}</th>
            <th scope="col">{valueHeader}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.label}>
              <th scope="row">{point.label}</th>
              <td>{formatNumber(point.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
