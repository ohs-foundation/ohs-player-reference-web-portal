import { useTranslation } from 'ohs-player-web-core';
import type { ReactNode } from 'react';

export interface StackedBarSegment {
  /** Legend entry and table column header. Every row lists the same segments in the same order. */
  label: string;
  value: number;
  /** CSS colour (a token var) for the segment and its legend swatch. */
  color: string;
}

export interface StackedBarRow {
  label: string;
  segments: readonly StackedBarSegment[];
}

export interface StackedBarProps {
  rows: readonly StackedBarRow[];
  /** Names the chart; also the caption of the table that carries the values for assistive tech. */
  ariaLabel: string;
  /** Header of the table's row label column. */
  labelHeader: string;
}

function percent(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

/**
 * One horizontal bar per row, each split into its segments' shares of the row total, with the first
 * segment's share at the end and a legend below. Assistive tech reads a visually hidden table instead.
 */
export function StackedBar({ rows, ariaLabel, labelHeader }: Readonly<StackedBarProps>): ReactNode {
  const { formatNumber } = useTranslation();
  const legend = rows[0]?.segments ?? [];

  return (
    <figure className="ohs-stacked-bar">
      <div aria-hidden="true">
        {rows.map((row) => {
          const total = row.segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
          return (
            <div key={row.label} className="ohs-stacked-bar__row">
              <span className="ohs-stacked-bar__label">{row.label}</span>
              <span className="ohs-stacked-bar__track">
                {row.segments
                  .filter((segment) => segment.value > 0)
                  .map((segment) => (
                    <span
                      key={segment.label}
                      className="ohs-stacked-bar__segment"
                      title={`${row.label}, ${segment.label}: ${formatNumber(segment.value)}`}
                      style={{ flexGrow: segment.value, background: segment.color }}
                    />
                  ))}
              </span>
              <span className="ohs-stacked-bar__share">
                {`${percent(row.segments[0]?.value ?? 0, total)}%`}
              </span>
            </div>
          );
        })}
        <div className="ohs-donut-legend ohs-stacked-bar__legend">
          {legend.map((segment) => (
            <div key={segment.label} className="ohs-donut-legend__row">
              <span className="ohs-donut-legend__swatch" style={{ background: segment.color }} />
              <span>{segment.label}</span>
            </div>
          ))}
        </div>
      </div>
      <table className="ohs-visually-hidden">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">{labelHeader}</th>
            {legend.map((segment) => (
              <th key={segment.label} scope="col">
                {segment.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              {row.segments.map((segment) => (
                <td key={segment.label}>{formatNumber(segment.value)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
