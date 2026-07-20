import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { BadgeLevel } from '../../shared';
import { StatusBadge } from '../StatusBadge/StatusBadge';
import styles from './MetricCard.module.css';

export const CHART_WINDOW = 40;
const CHART_W = 300;
const CHART_H = 100;

export interface MetricSeriesConfig {
  color: string;
  label?: string;
}

export interface MetricPoint {
  measuredAt: string;
  values: number[];
}

export interface MetricCardProps {
  label: string;
  unit: string;
  decimals: number;
  series: MetricSeriesConfig[];
  points: MetricPoint[];
  badge?: { level: BadgeLevel; text: string };
}

function relativeLabel(pointTime: string, latestTime: string): string {
  const diffMs = new Date(latestTime).getTime() - new Date(pointTime).getTime();
  if (diffMs <= 500) return '지금';
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return `-${sec}초`;
  const min = Math.round(sec / 60);
  if (min < 60) return `-${min}분`;
  const hr = Math.round(min / 60);
  return `-${hr}시간`;
}

export function MetricCard({ label, unit, decimals, series, points, badge }: MetricCardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const trimmed = points.slice(-CHART_WINDOW);
  const last = trimmed[trimmed.length - 1] as MetricPoint | undefined;

  const allValues = trimmed.flatMap((p) => p.values);
  let lo = allValues.length ? Math.min(...allValues) : 0;
  let hi = allValues.length ? Math.max(...allValues) : 1;
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  const pad = (hi - lo) * 0.2 || 1;
  lo -= pad;
  hi += pad;

  const stepFull = CHART_W / (CHART_WINDOW - 1);
  const offset = (CHART_WINDOW - trimmed.length) * stepFull;
  const xAt = (i: number) => offset + i * stepFull;
  const yAt = (v: number) => CHART_H - ((v - lo) / (hi - lo)) * CHART_H;

  const fmt = (v: number) => v.toFixed(decimals);

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>): void {
    if (trimmed.length < 2 || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const xRatio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const svgX = xRatio * CHART_W;
    const idx = Math.min(trimmed.length - 1, Math.max(0, Math.round((svgX - offset) / stepFull)));
    setHoverIndex(idx);
  }

  const hoverPoint = hoverIndex !== null ? trimmed[hoverIndex] : undefined;

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <div>
          <div className={styles.label}>{label}</div>
          {badge && <StatusBadge level={badge.level} text={badge.text} />}
        </div>
        <div className={styles.value}>
          <span className={styles.num}>{last ? fmt(last.values[0]) : '--'}</span>
          <span className={styles.unit}>{unit}</span>
        </div>
      </div>

      <div className={styles.chartWrap}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          preserveAspectRatio="none"
          className={styles.svg}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
        >
          <line className={styles.gridLine} x1={0} y1={25} x2={CHART_W} y2={25} />
          <line className={styles.gridLine} x1={0} y1={75} x2={CHART_W} y2={75} />
          {series.map((s, si) => {
            const d = trimmed
              .map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(p.values[si]).toFixed(1)}`)
              .join(' ');
            return <path key={s.label ?? si} className={styles.seriesPath} d={d} stroke={s.color} />;
          })}
          {last &&
            series.map((s, si) => (
              <circle
                key={s.label ?? si}
                className={styles.endDot}
                r={4}
                fill={s.color}
                cx={xAt(trimmed.length - 1)}
                cy={yAt(last.values[si])}
              />
            ))}
          {hoverPoint && hoverIndex !== null && (
            <line
              className={styles.crosshairLine}
              x1={xAt(hoverIndex)}
              x2={xAt(hoverIndex)}
              y1={0}
              y2={CHART_H}
            />
          )}
        </svg>
        <div className={`${styles.axisLabel} ${styles.axisTop}`}>{fmt(hi)}</div>
        <div className={`${styles.axisLabel} ${styles.axisBottom}`}>{fmt(lo)}</div>
        {hoverPoint && last && (
          <div className={styles.tooltip}>
            {series.map((s, si) => (
              <span key={s.label ?? si}>
                <strong>{fmt(hoverPoint.values[si])}</strong>
                {unit && ` ${unit}`}
                {s.label && ` (${s.label})`}
                {si < series.length - 1 ? ' · ' : ''}
              </span>
            ))}
            <br />
            <span style={{ opacity: 0.7 }}>{relativeLabel(hoverPoint.measuredAt, last.measuredAt)}</span>
          </div>
        )}
      </div>

      {series.length > 1 && last && (
        <div className={styles.legend}>
          {series.map((s, si) => (
            <span key={s.label ?? si} className={styles.legendItem}>
              <span className={styles.legendKey} style={{ background: s.color }} />
              {s.label} <strong>{fmt(last.values[si])}</strong>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
