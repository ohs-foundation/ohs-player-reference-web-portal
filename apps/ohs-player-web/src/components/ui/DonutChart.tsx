import { type ReactNode } from 'react';

export interface DonutSegment {
  /** Stable key + accessible label for the segment. */
  label: string;
  value: number;
  /** CSS color (token var) for the arc + legend swatch. */
  color: string;
}

export interface DonutChartProps {
  segments: readonly DonutSegment[];
  /** Outer diameter in px. */
  size?: number;
  /** Ring thickness in px. */
  thickness?: number;
  /** Accessible description of the whole chart. */
  ariaLabel: string;
  /** Optional content centred in the ring (e.g. the total). */
  center?: ReactNode;
}

/**
 * A dependency-free SVG donut (no chart library — keeps the bundle budget). Renders each segment as a
 * stroked circle arc via `stroke-dasharray`/`stroke-dashoffset`. All zero/empty segments render nothing;
 * a fully-empty dataset shows a single neutral track so the ring is never a void.
 */
export function DonutChart({
  segments,
  size = 160,
  thickness = 20,
  ariaLabel,
  center,
}: Readonly<DonutChartProps>): React.ReactElement {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);

  let offset = 0;
  const arcs =
    total > 0
      ? segments
          .filter((s) => s.value > 0)
          .map((s) => {
            const fraction = s.value / total;
            const dash = fraction * circumference;
            const arc = (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
              />
            );
            offset += dash;
            return arc;
          })
      : [];

  return (
    <div className="ohs-donut" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={ariaLabel}
      >
        {/* Track: the empty/background ring under the segments. */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--ohs-color-neutral-surface, #f0f0f0)"
          strokeWidth={thickness}
        />
        {/* Rotate -90deg so the first segment starts at 12 o'clock. */}
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>{arcs}</g>
      </svg>
      {center ? <span className="ohs-donut__center">{center}</span> : null}
    </div>
  );
}
